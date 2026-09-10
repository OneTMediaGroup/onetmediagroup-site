'use strict';
const admin=require('firebase-admin');
const {onRequest}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {FieldValue}=require('firebase-admin/firestore');
const Stripe=require('stripe');
const crypto=require('node:crypto');
const access=require('./access');
const config=require('./billing-config.json');
const KEY=defineSecret('STRIPE_SECRET_KEY'),WEBHOOK=defineSecret('STRIPE_WEBHOOK_SECRET'),MONTHLY=defineSecret('STRIPE_MONTHLY_PRICE_ID'),YEARLY=defineSecret('STRIPE_YEARLY_PRICE_ID');
const secrets=[KEY,MONTHLY,YEARLY];
const id=value=>typeof value==='string'?value:value?.id||'';
const plan=p=>p==='yearly'||p==='annual'?'yearly':'monthly';
const createCheckoutSession=access.route(async(req,res)=>{
 const {plantId}=req.body||{},p=plan(req.body?.plan),auth=await access.owner(req,plantId),stripe=new Stripe(KEY.value()),db=admin.firestore();
 if(auth.plant.isDemo)access.fail(400,'Create a Production plant for checkout.');
 await access.throttle('checkout:'+plantId,30);
 if(auth.plant.stripeSubscriptionId){const old=await stripe.subscriptions.retrieve(auth.plant.stripeSubscriptionId);if(!['canceled','incomplete_expired'].includes(old.status))access.fail(409,'This plant already has a subscription. Use Manage Billing.');}
 const price=await stripe.prices.retrieve(p==='yearly'?YEARLY.value():MONTHLY.value());
 if(!price.active||!price.livemode||price.currency!=='cad'||price.unit_amount!==(p==='yearly'?24999:2499)||price.recurring?.interval!==(p==='yearly'?'year':'month'))access.fail(503,'The selected plan is temporarily unavailable.');
 const ref=db.doc(`_floorFlowCheckouts/${plantId}`),plantRef=db.doc(`plants/${plantId}`);
 let checkout;
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref),old=snap.data(),now=Date.now();
  if(old&&old.expiresAt>now){if(old.plan!==p)access.fail(409,'An existing checkout is open. Complete or cancel it before changing plans.');checkout=old;return;}
  checkout={plan:p,generation:crypto.randomUUID(),expiresAt:now+31*60*1000};tx.set(ref,checkout);tx.update(plantRef,{billingGeneration:checkout.generation});
 });
 if(checkout.sessionId){const existing=await stripe.checkout.sessions.retrieve(checkout.sessionId);if(existing.status==='open')return res.json({url:existing.url});access.fail(409,'Checkout is already complete or expired. Refresh the plant status.');}
 const metadata={product:'floor_flow',plantId,plan:p,generation:checkout.generation};
 const session=await stripe.checkout.sessions.create({mode:'subscription',line_items:[{price:price.id,quantity:1}],metadata,subscription_data:{metadata},client_reference_id:plantId,...(auth.plant.stripeCustomerId?{customer:auth.plant.stripeCustomerId}:{}),success_url:`https://onetmediagroup.ca/floorflow/onboarding.html?mode=production&plantId=${plantId}&payment=success&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`https://onetmediagroup.ca/floorflow/onboarding.html?mode=production&plantId=${plantId}&checkout=cancelled`,expires_at:Math.floor(checkout.expiresAt/1000),billing_address_collection:'required',allow_promotion_codes:true},{idempotencyKey:'floorflow:'+plantId+':'+checkout.generation});
 await ref.set({sessionId:session.id},{merge:true});res.json({url:session.url,id:session.id});
},{secrets});
const createPortal=access.route(async(req,res)=>{
 const plantId=req.body?.plantId;await access.member(req,plantId,['admin']);
 const snap=await admin.firestore().doc(`plants/${plantId}`).get();
 if(!snap.data()?.stripeCustomerId)access.fail(409,'No subscription is linked to this plant yet.');
 if(!config.portalConfiguration)access.fail(503,'Billing management is not configured.');
 const session=await new Stripe(KEY.value()).billingPortal.sessions.create({customer:snap.data().stripeCustomerId,configuration:config.portalConfiguration,return_url:`https://onetmediagroup.ca/floorflow/admin.html?plantId=${plantId}`});res.json({url:session.url});
},{secrets:[KEY]});
async function reconcile(stripe,event){
 const object=event.data.object;
 let subscriptionId='';
 if(event.type.startsWith('checkout.session.')){if(object.mode!=='subscription')return;subscriptionId=id(object.subscription);}
 else if(event.type.startsWith('customer.subscription.'))subscriptionId=object.id;
 else if(event.type.startsWith('invoice.'))subscriptionId=id(object.subscription||object.parent?.subscription_details?.subscription);
 if(!subscriptionId)return;
 const initial=await stripe.subscriptions.retrieve(subscriptionId),plantId=initial.metadata?.plantId;
 if(initial.metadata?.product!=='floor_flow'||!access.safeId(plantId))return;
 const allowed=[MONTHLY.value(),YEARLY.value(),...(config.legacyPriceIds||[])];
 if(!initial.items.data.length||!initial.items.data.every(item=>allowed.includes(id(item.price))))return;
 if(initial.livemode!==true)return;
 const db=admin.firestore(),ref=db.doc(`plants/${plantId}`),eventRef=db.doc(`_floorFlowBillingEvents/${event.id}`);
 await db.runTransaction(async tx=>{
  const outboxRef=db.doc(`_floorFlowOutbox/welcome-${plantId}`);
  const [snap,processed,outbox]=await Promise.all([tx.get(ref),tx.get(eventRef),tx.get(outboxRef)]);if(processed.exists)return;
  if(!snap.exists)throw new Error('Billing plant is missing');
  const plant=snap.data();
  // Re-read Stripe within each retried transaction so a delayed event cannot restore old state.
  const subscription=await stripe.subscriptions.retrieve(subscriptionId);
  if(plant.billingGeneration!==subscription.metadata.generation || (plant.stripeCustomerId&&plant.stripeCustomerId!==id(subscription.customer)))return;
  const enabled=['active','trialing'].includes(subscription.status);
  tx.update(ref,{stripeCustomerId:id(subscription.customer),stripeSubscriptionId:subscriptionId,billingStatus:subscription.status,subscriptionStatus:subscription.status,paid:enabled,productionUnlocked:enabled,billingLockReason:enabled?'':`subscription_${subscription.status}`,billingPlan:plan(subscription.metadata.plan),billingUpdatedAt:FieldValue.serverTimestamp()});
  tx.set(eventRef,{plantId,subscriptionId,type:event.type,processedAt:FieldValue.serverTimestamp()});
  if(enabled&&!outbox.exists){tx.set(db.doc(`_floorFlowOutbox/welcome-${plantId}`),{plantId,kind:'production',state:'pending'},{merge:true});}
 });
}
const stripeWebhook=onRequest({region:access.REGION||'northamerica-northeast1',secrets:[...secrets,WEBHOOK]},async(req,res)=>{
 if(req.method!=='POST')return res.status(405).send('Method not allowed');
 const stripe=new Stripe(KEY.value());let event;
 try{event=stripe.webhooks.constructEvent(req.rawBody,req.headers['stripe-signature'],WEBHOOK.value());}catch{return res.status(400).send('Invalid signature');}
 const supported=['checkout.session.completed','checkout.session.async_payment_succeeded','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_succeeded','invoice.payment_failed'];
 if(!supported.includes(event.type))return res.json({received:true});
 try{await reconcile(stripe,event);return res.json({received:true});}catch(error){console.error('Billing reconciliation failed',error.code||'unknown');return res.status(500).send('Please retry');}
});
module.exports={createCheckoutSession,createPortal,stripeWebhook,reconcile};
