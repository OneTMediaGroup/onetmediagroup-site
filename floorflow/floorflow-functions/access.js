'use strict';
const admin = require('firebase-admin');
const {onRequest} = require('firebase-functions/v2/https');
const {FieldValue, Timestamp} = require('firebase-admin/firestore');
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const scrypt = promisify(crypto.scrypt);
const REGION = 'northamerica-northeast1';
const roles = ['operator','dieSetter','supervisor','admin','display'];
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const active = user => user && !['inactive','disabled'].includes(user.status) && user.isActive !== false;
const clean = (value, max=120) => String(value ?? '').trim().slice(0,max);
function fail(status,message){throw Object.assign(new Error(message),{status});}
function route(handler,options={}){
 return onRequest({region:REGION,...options},async(req,res)=>{
  const origin=req.headers.origin || '';
  const local=process.env.FUNCTIONS_EMULATOR==='true' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  res.set('Access-Control-Allow-Origin',local?origin:'https://onetmediagroup.ca');
  res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods','POST, OPTIONS');res.set('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).send('');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  try{await handler(req,res);}catch(error){console.error('Floor Flow request failed',error.status || error.code || 500);res.status(error.status || 500).json({error:error.status?error.message:'Could not complete this request. Please try again.'});}
 });
}
async function token(req){
 const header=String(req.headers.authorization || '');
 if(!header.startsWith('Bearer '))fail(401,'Sign in to continue.');
 try{return await admin.auth().verifyIdToken(header.slice(7),true);}catch{fail(401,'Your session expired. Sign in again.');}
}
async function member(req,plantId,allowed=roles){
 if(!safeId(plantId))fail(400,'Invalid Plant Code.');
 const claims=await token(req);
 if(claims.plantId!==plantId || !safeId(claims.userId) || !(claims.sessionExpiresAt>Date.now()))fail(403,'Access denied.');
 const snap=await admin.firestore().doc(`plants/${plantId}/users/${claims.userId}`).get();
 const user=snap.data();
 if(!active(user) || Number(user.authVersion || 0)!==Number(claims.authVersion || 0))fail(401,'Sign in again.');
 if(!allowed.includes(user.role))fail(403,'Your role cannot perform this action.');
 return {claims,user:{...user,id:snap.id},plantId};
}
async function owner(req,plantId){
 if(!safeId(plantId))fail(400,'Invalid Plant Code.');
 const claims=await token(req);
 const snap=await admin.firestore().doc(`plants/${plantId}`).get();
 if(!snap.exists)fail(404,'Plant not found.');
 if(snap.data().ownerUid===claims.uid && snap.data().setupComplete!==true)return {claims,plant:snap.data()};
 const access=await member(req,plantId,['admin']);return {...access,plant:snap.data()};
}
async function throttle(key,max=10){
 const db=admin.firestore(),ref=db.collection('_floorFlowAccessLimits').doc(crypto.createHash('sha256').update(key).digest('hex'));
 await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data()||{},now=Date.now(),fresh=now-Number(old.start||0)>15*60*1000,count=fresh?0:Number(old.count||0);if(count>=max)fail(429,'Too many attempts. Try again in 15 minutes.');tx.set(ref,{start:fresh?now:old.start,count:count+1,expiresAt:Timestamp.fromMillis(now+86400000)});});
}
async function hashPin(pin){
 if(typeof pin!=='string'||!/^\d{4,12}$/.test(pin))fail(400,'Use a PIN with 4 to 12 digits.');
 const salt=crypto.randomBytes(16).toString('hex');return {salt,hash:(await scrypt(pin,salt,64)).toString('hex')};
}
async function matchesPin(pin,credential){
 if(typeof pin!=='string'||pin.length>64||!credential?.hash||!credential?.salt)return false;
 const hash=await scrypt(pin,credential.salt,64),stored=Buffer.from(credential.hash,'hex');return hash.length===stored.length && crypto.timingSafeEqual(hash,stored);
}
function profile(input,id,plantId){
 const firstName=clean(input.firstName,40),lastName=clean(input.lastName,40),role=input.role||'operator';
 if(!roles.includes(role))fail(400,'Invalid role.');
 const employeeId=clean(input.employeeId,40);if(!employeeId)fail(400,'Employee ID is required.');
 const name=clean(input.name||`${firstName} ${lastName}`);if(!name)fail(400,'Name is required.');
 return {id,plantId,firstName,lastName,name,employeeId,badgeCode:clean(input.badgeCode||employeeId),role,status:['inactive','disabled'].includes(input.status)?input.status:'active'};
}
const plantSignIn=route(async(req,res)=>{
 const {plantId,userId,pin}=req.body || {};
 if(!safeId(plantId)||typeof userId!=='string'||userId.length>128)fail(400,'Enter your Plant Code, Employee ID and PIN.');
 await throttle('ip:'+String(req.ip||''),200);await throttle('login:'+plantId+':'+userId,10);
 const db=admin.firestore(),users=db.collection(`plants/${plantId}/users`);
 let snap=safeId(userId)?await users.doc(userId).get():null;
 if(!snap?.exists){const found=await users.where('employeeId','==',userId).limit(2).get();snap=found.size===1?found.docs[0]:null;}
 const u=snap?.data(),credential=snap?await db.doc(`plants/${plantId}/credentials/${snap.id}`).get():null;
 if(!active(u)||!await matchesPin(pin,credential?.data()))fail(401,'Employee ID or PIN was not found.');
 const claims={plantId,userId:snap.id,authVersion:Number(u.authVersion||0),sessionExpiresAt:Date.now()+(u.role==='display'?7*86400000:12*3600000)};
 const uid=crypto.createHash('sha256').update(plantId+'\0'+snap.id).digest('hex');
 res.json({token:await admin.auth().createCustomToken(uid,claims),user:{...u,id:snap.id}});
});
const plantSession=route(async(req,res)=>{const {user}=await member(req,req.body?.plantId);res.json({user});});
const savePlantUser=route(async(req,res)=>{
 const {plantId,userId,input={}}=req.body || {},{user:actor}=await member(req,plantId,['admin']);
 const db=admin.firestore(),plant=await db.doc(`plants/${plantId}`).get();if(plant.data().isDemo)fail(403,'Demo user setup is locked.');
 if(userId&&!safeId(userId))fail(400,'Invalid user.');
 const ref=userId?db.doc(`plants/${plantId}/users/${userId}`):db.collection(`plants/${plantId}/users`).doc();if(!safeId(ref.id))fail(400,'Invalid user.');
 const cleanUser=profile(input,ref.id,plantId),credential=input.pin?await hashPin(input.pin):null;
 await db.runTransaction(async tx=>{
  const old=await tx.get(ref),others=await tx.get(db.collection(`plants/${plantId}/users`));
  if(!old.exists&&!credential)fail(400,'A PIN is required for a new user.');
  if(others.docs.some(d=>d.id!==ref.id&&(d.data().employeeId===cleanUser.employeeId||d.data().badgeCode===cleanUser.badgeCode)))fail(409,'Employee ID or badge already exists.');
  if(old.data()?.role==='admin' && (!active(cleanUser)||cleanUser.role!=='admin') && !others.docs.some(d=>d.id!==ref.id&&d.data().role==='admin'&&active(d.data())))fail(409,'Keep at least one active administrator.');
  tx.set(ref,{...cleanUser,authVersion:Number(old.data()?.authVersion||0)+1,createdAt:old.data()?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
  if(credential)tx.set(db.doc(`plants/${plantId}/credentials/${ref.id}`),credential);
 });
 res.json({id:ref.id,reauthenticate:ref.id===actor.id});
});
const deletePlantUser=route(async(req,res)=>{
 const {plantId,userId}=req.body||{};await member(req,plantId,['admin']);if(!safeId(userId))fail(400,'Invalid user.');
 const db=admin.firestore();await db.runTransaction(async tx=>{const plant=await tx.get(db.doc(`plants/${plantId}`)),users=await tx.get(db.collection(`plants/${plantId}/users`));if(plant.data()?.isDemo)fail(403,'Demo user setup is locked.');const target=users.docs.find(d=>d.id===userId);if(target?.data().role==='admin'&&!users.docs.some(d=>d.id!==userId&&d.data().role==='admin'&&active(d.data())))fail(409,'Keep at least one active administrator.');tx.delete(db.doc(`plants/${plantId}/users/${userId}`));tx.delete(db.doc(`plants/${plantId}/credentials/${userId}`));});res.json({ok:true});
});
module.exports={route,token,member,owner,throttle,hashPin,matchesPin,profile,safeId,active,fail,plantSignIn,plantSession,savePlantUser,deletePlantUser};
