const admin=require('firebase-admin');
const {defineSecret}=require('firebase-functions/params');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {Resend}=require('resend');
const {FieldValue}=require('firebase-admin/firestore');
const KEY=defineSecret('RESEND_API_KEY');
async function deliver(ref,send){
 const db=admin.firestore();let payload;
 await db.runTransaction(async tx=>{
  payload=undefined;
  const snap=await tx.get(ref),row=snap.data();if(!row||row.state==='sent'||row.state==='needs_review')return;
  const now=Date.now();if(row.leaseUntil>now)return;
  if(row.firstAttemptAt&&now-row.firstAttemptAt>23*3600000){tx.update(ref,{state:'needs_review'});return;}
  const plantSnap=await tx.get(db.doc(`plants/${row.plantId}`)),plant=plantSnap.data();
  if(!plant?.setupComplete||!plant.onboardingContact?.email)return;
  payload=row.payload||{to:plant.onboardingContact.email,subject:plant.isDemo?'Your Floor Flow demo is ready':'Welcome to Floor Flow',text:`Your ${plant.isDemo?'demo':'production'} plant is ready.\n\nPlant: ${plant.plantName}\nPlant Code: ${row.plantId}\n\nOpen Admin: https://onetmediagroup.ca/floorflow/admin.html?plantId=${row.plantId}\n\nSign in with the Employee ID and PIN you chose during setup.\n\nSupport: floorflow@onetmediagroup.ca`};
  tx.update(ref,{payload,state:'pending',leaseUntil:now+120000,firstAttemptAt:row.firstAttemptAt||now});
 });
 if(!payload)return;
 try{const result=await send(payload,ref.id);if(result?.error||!result?.data?.id)throw Error('Provider did not accept message');await ref.update({state:'sent',providerId:result.data.id,sentAt:FieldValue.serverTimestamp(),leaseUntil:0});}
 catch(error){await ref.update({leaseUntil:0,lastError:'Delivery not confirmed'});throw error;}
}
const processOutbox=onSchedule({schedule:'every 5 minutes',region:'northamerica-northeast1',secrets:[KEY]},async()=>{
 const rows=await admin.firestore().collection('_floorFlowOutbox').where('state','==','pending').limit(20).get(),resend=new Resend(KEY.value());
 for(const row of rows.docs){try{await deliver(row.ref,(payload,key)=>resend.emails.send({from:'Floor Flow <floorflow@onetmediagroup.ca>',replyTo:'floorflow@onetmediagroup.ca',...payload},{idempotencyKey:key}));}catch{console.warn('Outbox retry required',row.id);}}
});
module.exports={deliver,processOutbox};
