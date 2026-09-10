const admin=require('firebase-admin');
const crypto=require('node:crypto');
const access=require('./access');
const defaults=require('./plant-defaults');
const reservePlant=access.route(async(req,res)=>{
 const claims=await access.token(req),{requestId,mode,plantName}=req.body||{};
 if(!access.safeId(requestId)||!['demo','production'].includes(mode)||typeof plantName!=='string'||!plantName.trim())access.fail(400,'Plant name and mode are required.');
 await access.throttle('onboard:'+String(req.ip||''),30);
 const db=admin.firestore(),id=crypto.createHash('sha256').update(claims.uid+':'+requestId).digest('hex').slice(0,24),ref=db.doc(`plants/${id}`);
 await db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists){if(old.data().ownerUid!==claims.uid||old.data().mode!==mode)access.fail(409,'Plant setup does not match.');return;}tx.set(ref,{id,plantId:id,ownerUid:claims.uid,plantName:plantName.trim().slice(0,120),name:plantName.trim().slice(0,120),mode,environment:mode,isDemo:mode==='demo',setupComplete:false,pendingOnboarding:true,paid:false,productionUnlocked:false,billingStatus:'pending',subscriptionStatus:'pending',createdAt:new Date().toISOString()});});
 res.json({plantId:id});
});
const finishPlant=access.route(async(req,res)=>{
 const input=req.body||{},plantId=input.plantId;
 if(!access.safeId(plantId))access.fail(400,'Invalid Plant Code.');
 const claims=await access.token(req),existing=await admin.firestore().doc(`plants/${plantId}`).get();
 if(!existing.exists)access.fail(404,'Plant not found.');
 if(existing.data().ownerUid!==claims.uid)access.fail(403,'This setup belongs to another session.');
 if(existing.data().setupComplete){res.json({plantId,complete:true});return;}
 const authorization={claims,plant:existing.data()},isDemo=authorization.plant.mode==='demo';
 if(typeof input.adminPin!=='string'||!/^\d{4,12}$/.test(input.adminPin))access.fail(400,'Use an administrator PIN with 4 to 12 digits.');
 if(!input.adminName||!/^\S+@\S+\.\S+$/.test(input.adminEmail||''))access.fail(400,'Administrator name and email are required.');
 const areas=isDemo?defaults.buildDemoAreas():defaults.buildProductionAreas(String(input.areaName||'Main Floor').slice(0,120));
 const cells=isDemo?defaults.buildDemoWorkCells():defaults.buildProductionWorkCells(String(input.equipmentName||'First Work Cell').slice(0,120),String(input.areaName||'Main Floor').slice(0,120));
 const raw=isDemo?defaults.buildDemoUsers(input.adminName,input.adminPin,input.adminFirstName,input.adminLastName,input.adminEmail):defaults.buildProductionUsers(input.adminName,input.adminPin,'',input.adminFirstName,input.adminLastName,input.adminEmail);
 const users=await Promise.all(raw.map(async(u,index)=>{u.employeeId=index===0?String(input.adminEmployeeId||'').trim():u.employeeId;if(index===0)u.badgeCode=u.employeeId;const id=crypto.randomUUID();return {profile:access.profile(u,id,plantId),credential:await access.hashPin(u.pin)};}));
 if(new Set(users.map(u=>u.profile.employeeId)).size!==users.length)access.fail(409,'Choose an administrator Employee ID different from the demo employees.');
 const now=new Date().toISOString(),db=admin.firestore(),ref=db.doc(`plants/${plantId}`);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref),p=snap.data();
  const outboxRef=db.doc(`_floorFlowOutbox/welcome-${plantId}`),outbox=await tx.get(outboxRef);
  if(p?.ownerUid!==authorization.claims.uid)access.fail(403,'This setup belongs to another session.');
  if(p.setupComplete)return;
  if(!isDemo&&!(p.paid&&p.productionUnlocked&&['active','trialing'].includes(p.subscriptionStatus)))access.fail(409,'Payment is not confirmed yet. Please try again shortly.');
  if(!outbox.exists)tx.set(outboxRef,{plantId,kind:isDemo?'demo':'production',state:'pending'});
  const plantName=String(input.plantName||p.plantName).slice(0,120);
  tx.update(ref,{plantName,name:plantName,companyName:String(input.companyName||plantName).slice(0,120),setupComplete:true,pendingOnboarding:false,onboardingCompletedAt:now,updatedAt:now,onboardingContact:{firstName:String(input.adminFirstName||'').slice(0,40),lastName:String(input.adminLastName||'').slice(0,40),fullName:String(input.adminName).slice(0,120),email:String(input.adminEmail).toLowerCase().slice(0,254)}});
  tx.set(db.doc(`plants/${plantId}/settings/main`),{plantId,plantName,companyName:String(input.companyName||plantName).slice(0,120),brandText:String(input.brandText||plantName).slice(0,120),brandingMode:'text',logoUrl:'',timezone:String(input.timezone||'America/Toronto').slice(0,80),mode:p.mode,isDemo,createdAt:now,updatedAt:now});
  for(const area of areas)tx.set(db.doc(`plants/${plantId}/areas/${area.id}`),{...area,plantId,createdAt:now,updatedAt:now});
  for(const cell of cells)tx.set(db.doc(`plants/${plantId}/workCells/${cell.id}`),{...cell,plantId,createdAt:now,updatedAt:now});
  for(const u of users){tx.set(db.doc(`plants/${plantId}/users/${u.profile.id}`),{...u.profile,authVersion:1,createdAt:now,updatedAt:now});tx.set(db.doc(`plants/${plantId}/credentials/${u.profile.id}`),u.credential);}
  tx.set(db.doc(`plants/${plantId}/activityLogs/plant-onboarded`),{plantId,action:'plant_onboarded',message:`${plantName} setup completed.`,createdAt:now});
 });
 res.json({plantId,employeeId:String(input.adminEmployeeId||input.adminPin)});
});
module.exports={reservePlant,finishPlant};
