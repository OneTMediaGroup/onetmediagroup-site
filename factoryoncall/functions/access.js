'use strict';
const crypto = require('crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');
const REGION = 'us-central1';
const ORIGIN = 'https://onetmediagroup.ca';
const PUBLIC_USER_FIELDS = ['uid','employeeNumber','badgeCode','firstName','lastName','name','fullName','role','dept','active','archived','admin','isAdmin'];
const PUBLIC_COMPANY_FIELDS = ['companyId','companyName','displayName','mode','isDemo','demoPlant','active','stripeStatus','subscriptionStatus','billingStatus','theme'];
const pick = (value, keys) => Object.fromEntries(keys.filter(k => value[k] !== undefined).map(k => [k,value[k]]));
const safeId = v => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\/\x00-\x1f]/.test(v);
const isActive = u => u.active !== false && u.archived !== true;
const isAdmin = u => u.admin === true || u.isAdmin === true || ['admin','administrator'].includes(String(u.role || '').toLowerCase());
function replyError(res, error) { if (!error.status) console.error('Access request failed', error.code || '', error.message); res.status(error.status || 500).json({error: error.status ? error.message : 'Could not complete this request.'}); }
function fail(status, message) { throw Object.assign(new Error(message), {status}); }
function route(handler) {
 return onRequest({region:REGION}, async(req,res)=>{
  const origin = process.env.FUNCTIONS_EMULATOR === 'true' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin || '') ? req.headers.origin : ORIGIN;
  res.set('Access-Control-Allow-Origin', origin); res.set('Vary','Origin');
  res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods','POST, OPTIONS'); res.set('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).send('');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  try { await handler(req,res); } catch(e) { replyError(res,e); }
 });
}
async function throttle(key, max=10) {
 const ref=admin.firestore().collection('_accessLimits').doc(crypto.createHash('sha256').update(key).digest('hex'));
 const now=Date.now();
 await admin.firestore().runTransaction(async tx=>{
  const snap=await tx.get(ref), old=snap.data() || {};
  const fresh=now-Number(old.start || 0)>15*60*1000;
  const count=fresh?0:Number(old.count || 0);
  if(count>=max)fail(429,'Too many attempts. Try again in 15 minutes.');
  tx.set(ref,{start:fresh?now:old.start,count:count+1,expiresAt:Timestamp.fromMillis(now+86400000)});
 });
}
async function findUser(companyId, userId) {
 const users=admin.firestore().collection('companies').doc(companyId).collection('users');
 let doc=await users.doc(userId).get();
 if(doc.exists)return doc;
 for(const field of ['uid','employeeNumber','badgeCode','userId','employeeId']){
  const result=await users.where(field,'==',userId).limit(2).get();
  if(result.size===1)return result.docs[0];
  if(result.size>1) return null;
 }
 return null;
}
async function findRole(companyId,u) {
 const roles=admin.firestore().collection('companies').doc(companyId).collection('roles');
 const result=await roles.where('name','==',String(u.role || '')).limit(2).get();
 return result.size===1 ? result.docs[0] : null;
}
async function verifyCredentials(req) {
 const {companyId,userId,pin}=req.body || {};
 if(!safeId(companyId)||!safeId(userId)||typeof pin!=='string'||pin.length<2||pin.length>64)fail(400,'Enter a valid Plant Code, User ID and PIN.');
 await throttle('ip:'+String(req.ip || 'unknown'),1000);
 await throttle('user:'+companyId+':'+userId,10);
 const doc=await findUser(companyId,userId),u=doc?.data();
 const stored=String(u?.pin ?? u?.userPin ?? u?.employeePin ?? '');
 const a=crypto.createHash('sha256').update(stored).digest(),b=crypto.createHash('sha256').update(pin).digest();
 if(!u||!stored||!isActive(u)||!crypto.timingSafeEqual(a,b))fail(401,'User ID or PIN was not found.');
 const company=await admin.firestore().doc('companies/'+companyId).get();
 if(!company.exists)fail(401,'User ID or PIN was not found.');
 const role=await findRole(companyId,u);
 const portal=String(req.body.portal || 'call');
 const roleData=role?.data() || {};
 if(portal==='admin'&&!isAdmin(u))fail(403,'Admin access is required.');
 if((portal==='supervisor'||portal==='viewer')&&!isAdmin(u)&&roleData.supervisorPortal!==true&&roleData.permissions?.supervisorPortal!==true)fail(403,'Supervisor access is required.');
 return {companyId,doc,u,role,company};
}
async function authenticatedUser(req, companyId) {
 if(!safeId(companyId))fail(400,'Invalid plant.');
 const bearer=String(req.headers.authorization || '');
 if(!bearer.startsWith('Bearer '))fail(401,'Sign in as a plant administrator.');
 let decoded;try{decoded=await admin.auth().verifyIdToken(bearer.slice(7),true);}catch{fail(401,'Sign in again.');}
 if(decoded.companyId!==companyId||!safeId(decoded.userDocId))fail(403,'Access denied.');
 const snap=await admin.firestore().doc(`companies/${companyId}/users/${decoded.userDocId}`).get();
 const u=snap.data();
 if(!u||!isActive(u)||Number(decoded.sessionExpiresAt || 0)<Date.now()||Number(decoded.authVersion || 0)!==Number(u.authVersion || 0))fail(401,'Sign in again.');
 return u;
}
async function projectCompany(companyId,data) {
 await admin.firestore().doc(`companies/${companyId}/public/main`).set(pick(data,PUBLIC_COMPANY_FIELDS));
}
const plantSignIn=route(async(req,res)=>{
 const {companyId,doc,u,role,company}=await verifyCredentials(req);
 const claims={companyId,userDocId:doc.id,authVersion:Number(u.authVersion || 0),roleId:role?.id || '_none',sessionExpiresAt:Date.now()+12*60*60*1000};
 const uid=crypto.createHash('sha256').update(companyId+'\0'+doc.id).digest('hex');
 const token=await admin.auth().createCustomToken(uid,claims);
 await projectCompany(companyId,company.data());
 await admin.firestore().doc(`companies/${companyId}/directory/${doc.id}`).set(pick(u,PUBLIC_USER_FIELDS));
 await admin.firestore().collection('_accessLimits').doc(crypto.createHash('sha256').update('user:'+companyId+':'+String(req.body.userId)).digest('hex')).delete();
 res.json({token,user:{id:doc.id,...pick(u,PUBLIC_USER_FIELDS)},companyId});
});
const syncPublicUser=onDocumentWritten({region:REGION,document:'companies/{companyId}/users/{userId}'},async event=>{
 // Read current state so delayed/out-of-order trigger delivery cannot restore old data.
 const ref=admin.firestore().doc(`companies/${event.params.companyId}/users/${event.params.userId}`);
 const current=await ref.get(),dest=admin.firestore().doc(`companies/${event.params.companyId}/directory/${event.params.userId}`);
 if(current.exists)await dest.set(pick(current.data(),PUBLIC_USER_FIELDS));else await dest.delete();
});
const syncPublicCompany=onDocumentWritten({region:REGION,document:'companies/{companyId}'},async event=>{
 const current=await admin.firestore().doc(`companies/${event.params.companyId}`).get();
 if(current.exists)await projectCompany(event.params.companyId,current.data());
 else await admin.firestore().doc(`companies/${event.params.companyId}/public/main`).delete();
});
async function authenticatedAdmin(req, companyId) {
 const u=await authenticatedUser(req,companyId);if(!isAdmin(u))fail(403,'Admin access is required.');return u;
}
const plantSession=route(async(req,res)=>{
 const companyId=req.body?.companyId;const u=await authenticatedUser(req,companyId);
 const portal=req.body?.portal;
 if(portal==='admin'&&!isAdmin(u))fail(403,'Admin access is required.');
 if(portal==='supervisor'||portal==='viewer'){const role=await findRole(companyId,u);const r=role?.data()||{};if(!isAdmin(u)&&!r.supervisorPortal&&!r.permissions?.supervisorPortal)fail(403,'Supervisor access is required.');}
 res.json({user:pick(u,PUBLIC_USER_FIELDS)});
});
module.exports={plantSession,plantSignIn,syncPublicUser,syncPublicCompany,authenticatedAdmin,route,throttle,fail,pick,PUBLIC_USER_FIELDS,PUBLIC_COMPANY_FIELDS};
