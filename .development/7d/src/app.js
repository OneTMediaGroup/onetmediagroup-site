import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,setPersistence,browserSessionPersistence,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendEmailVerification,sendPasswordResetEmail,updateProfile,reload} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,collection,query,where,orderBy,limit,onSnapshot,runTransaction,writeBatch,serverTimestamp,Timestamp} from 'firebase/firestore';
import {resizePhoto,portrait} from './photos.js';
import {createUniverseExtras} from './extras.js';
import {createMemories} from './memories.js';
import {firebaseConfig,useEmulators} from './config.js';
const $=id=>document.getElementById(id);
const colors={blue:'#234e82',violet:'#5c428d',teal:'#1d626d',rose:'#7b3c64',gold:'#82602c'};
let focusedCircle=null;
let extras,memories,photoDraft=null,photoBusy=false,photoRevision=0;
let auth,db,mode='signup',currentProfile=null,connections=[],received=[],sent=[],unsubs=[],sessionId=0,profileVersion=0;
const notice=(message='',error=false)=>{$('notice').textContent=message;$('notice').classList.toggle('error',error);};
function failure(error){
 const code=error?.code||'';
 if(code.includes('too-many-requests')||code.includes('resource-exhausted'))return 'Please wait a little before trying again.';
 if(code.includes('permission-denied'))return 'That action isn’t available. Check your verification, invitation status, or wait 30 seconds before creating another invitation.';
 if(code.includes('weak-password')||code.includes('password-does-not-meet-requirements'))return 'Use a password with at least 12 characters.';
 if(code.includes('network')||code.includes('unavailable'))return 'We couldn’t reach your universe. Check your connection and try again.';
 if(code.startsWith('7d/'))return error.message;
 return 'We couldn’t complete that action. Check your details and try again.';
}
function problem(message){const e=new Error(message);e.code='7d/input';throw e;}
function bind(id,event,fn){$(id).addEventListener(event,async e=>{e.preventDefault();const buttons=[...$(id).querySelectorAll('button')];if($(id).tagName==='BUTTON')buttons.push($(id));if(buttons.some(b=>b.disabled))return;buttons.forEach(b=>b.disabled=true);try{await fn(e);}catch(error){notice(failure(error),true);}finally{buttons.forEach(b=>b.disabled=false);}});}
function views(name){for(const id of ['auth-view','verify-view','dashboard'])$(id).hidden=id!==name;$('signout').hidden=!auth?.currentUser;}
function switchMode(next){mode=next;$('auth-title').textContent=next==='signup'?'Create your universe':'Welcome back';$('auth-submit').textContent=next==='signup'?'Create account':'Sign in';$('name-wrap').hidden=next!=='signup';$('signup-name').required=next==='signup';$('password').autocomplete=next==='signup'?'new-password':'current-password';$('password').minLength=next==='signup'?12:1;$('password-help').hidden=next!=='signup';$('reset-password').hidden=next!=='login';$('show-signup').setAttribute('aria-pressed',String(next==='signup'));$('show-login').setAttribute('aria-pressed',String(next==='login'));notice();}
function updateTheme(){const light=document.documentElement.dataset.guideTheme==='daylight';document.documentElement.dataset.guideTheme=light?'midnight':'daylight';$('theme').textContent=light?'Daylight':'Midnight';try{localStorage.setItem('7d-theme',light?'midnight':'daylight');}catch{}}
try{if(localStorage.getItem('7d-theme')==='daylight')updateTheme();}catch{}
bind('theme','click',updateTheme);
bind('show-signup','click',()=>switchMode('signup'));bind('show-login','click',()=>switchMode('login'));
const continueSettings=()=>({url:new URL('app.html',location.href).href});
bind('auth-form','submit',async()=>{
 if(!auth)problem('Accounts are not available yet. Please try again later.');
 const email=$('email').value.trim().toLowerCase(),password=$('password').value;
 if(mode==='signup'){
  const name=$('signup-name').value.trim();if(!name||name.length>60)problem('Enter a display name of 1 to 60 characters.');
  const credential=await createUserWithEmailAndPassword(auth,email,password);
  await updateProfile(credential.user,{displayName:name});
  await sendEmailVerification(credential.user,continueSettings());
  notice('Verification email sent. Check your inbox.');
 }else{await signInWithEmailAndPassword(auth,email,password);}
 $('password').value='';
});
bind('reset-password','click',async()=>{const email=$('email').value.trim();if(!$('email').checkValidity()||!email)problem('Enter your email address above first.');await sendPasswordResetEmail(auth,email,continueSettings());notice('If an account is registered with that address, a reset email will arrive shortly.');});
bind('signout','click',async()=>{await signOut(auth);notice('You’re signed out.');});
bind('resend-verification','click',async()=>{await sendEmailVerification(auth.currentUser,continueSettings());notice('Verification email sent. Check your inbox and spam folder.');});
bind('check-verification','click',async()=>{await reload(auth.currentUser);await auth.currentUser.getIdToken(true);if(!auth.currentUser.emailVerified)problem('Your email is not verified yet. Follow the link in the email, then try again.');await loadSession(auth.currentUser);});
function clearPrivateState(){focusedCircle=null;$('universe-focus').hidden=true;memories?.clear();extras?.clear();photoDraft=null;photoBusy=false;photoRevision++;$('profile-photo-input').value='';$('profile-photo-preview').replaceChildren();delete $('person-detail').dataset.personUid;unsubs.forEach(f=>f());unsubs=[];currentProfile=null;connections=[];received=[];sent=[];profileVersion++;$('greeting').textContent='Your Universe';$('connection-count').textContent='';$('verify-email').textContent='';for(const id of ['received-list','sent-list','connections-list','nodes','lines','person-detail'])$(id).replaceChildren();$('person-detail').hidden=true;$('profile-name').value='';$('profile-bio').value='';$('invite-email').value='';}
async function loadSession(user){
 const version=++sessionId;clearPrivateState();
 if(!user){$('email').value='';$('password').value='';$('signup-name').value='';views('auth-view');notice();return;}
 if(!user.emailVerified){views('verify-view');$('verify-email').textContent=user.email;notice('Verify your email to create your profile and connect with people.');return;}
 views('');notice('Opening your universe…');
 try{
  const ref=doc(db,'profiles',user.uid);let snap=await getDoc(ref);if(version!==sessionId)return;
  if(!snap.exists()){const name=(user.displayName||'Universe explorer').trim().slice(0,60)||'Universe explorer';await setDoc(ref,{uid:user.uid,name,bio:'',color:'blue',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastInviteAt:Timestamp.fromMillis(0)});snap=await getDoc(ref);}
  if(version!==sessionId)return;
  currentProfile=snap.data();populateProfile();views('dashboard');notice();extras.start(version);memories.start(version);
  const guarded=fn=>snap=>{if(version===sessionId)fn(snap);};
  const subscriptionError=()=>{if(version===sessionId){clearPrivateState();views('');notice('Your session or connection needs refreshing. Sign out and sign back in to continue.',true);}};
  unsubs.push(onSnapshot(query(collection(db,'members',user.uid,'connections'),limit(200)),guarded(s=>{connections=s.docs.map(d=>({id:d.id,...d.data()}));$('person-detail').hidden=true;renderConnections(version).catch(()=>notice('Could not refresh all profiles. Try Refresh universe.',true));}),subscriptionError));
  unsubs.push(onSnapshot(query(collection(db,'invitations'),where('recipientEmail','==',user.email.toLowerCase()),orderBy('createdAt','desc'),limit(50)),guarded(s=>{received=s.docs.map(d=>({id:d.id,...d.data()}));renderInvitations('received-list',received,true);}),subscriptionError));
  unsubs.push(onSnapshot(query(collection(db,'invitations'),where('senderUid','==',user.uid),orderBy('createdAt','desc'),limit(50)),guarded(s=>{sent=s.docs.map(d=>({id:d.id,...d.data()}));renderInvitations('sent-list',sent,false);}),subscriptionError));
 }catch(error){if(version===sessionId){views('');notice(failure(error),true);}}
}
function populateProfile(){photoDraft=null;$('profile-photo-preview').replaceChildren(portrait(currentProfile.photoData,currentProfile.name));$('profile-name').value=currentProfile.name;$('profile-bio').value=currentProfile.bio;$('profile-color').value=currentProfile.color;$('greeting').textContent=`${currentProfile.name}’s universe`;}
bind('profile-form','submit',async()=>{const version=sessionId;if(photoBusy)problem('Wait for your photo to finish processing.');const name=$('profile-name').value.trim();if(!name||name.length>60)problem('Enter a name of 1 to 60 characters.');const data={name,bio:$('profile-bio').value.trim(),color:$('profile-color').value,photoData:photoDraft??currentProfile.photoData??''};await updateDoc(doc(db,'profiles',auth.currentUser.uid),{...data,updatedAt:serverTimestamp()});if(version!==sessionId)return;currentProfile={...currentProfile,...data};photoDraft=null;$('greeting').textContent=`${name}’s universe`;drawGraph();notice('Profile saved.');});
bind('profile-photo-input','change',async()=>{const file=$('profile-photo-input').files[0];if(!file)return;const version=sessionId,revision=++photoRevision;photoBusy=true;try{const data=await resizePhoto(file);if(version===sessionId&&revision===photoRevision){photoDraft=data;$('profile-photo-preview').replaceChildren(portrait(data,'Your portrait preview'));notice('Portrait ready. Save your profile to keep it.');}}catch(error){problem(error.message);}finally{if(revision===photoRevision){photoBusy=false;$('profile-photo-input').value='';}}});
bind('remove-profile-photo','click',()=>{photoRevision++;photoBusy=false;photoDraft='';$('profile-photo-input').value='';$('profile-photo-preview').replaceChildren(portrait('',currentProfile?.name||'Your portrait'));notice('Photo removed from the draft. Save your profile to keep the change.');});
bind('invite-form','submit',async()=>{
 const user=auth.currentUser,email=$('invite-email').value.trim().toLowerCase();if(email===user.email.toLowerCase())problem('Invite someone else to join your universe.');
 const ref=doc(collection(db,'invitations'));const batch=writeBatch(db);
 batch.set(ref,{senderUid:user.uid,senderName:currentProfile.name,recipientEmail:email,recipientUid:'',relationship:$('invite-relationship').value,status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+7*86400000-60000)});
 batch.update(doc(db,'profiles',user.uid),{lastInviteAt:serverTimestamp(),updatedAt:serverTimestamp()});
 await batch.commit();$('invite-email').value='';notice('Invitation created. Share the 7D link with them; they’ll see your invitation after signing in with that verified email.');
});
$('share-url').value=new URL('app.html',location.href).href;
bind('copy-link','click',async()=>{try{await navigator.clipboard.writeText($('share-url').value);notice('7D link copied.');}catch{$('share-url').focus();$('share-url').select();notice('Select and copy the link shown.');}});
bind('refresh','click',()=>loadSession(auth.currentUser));
function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function action(label,fn){const b=element('button',label);b.type='button';b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;try{await fn();}catch(error){notice(failure(error),true);}finally{b.disabled=false;}});return b;}
function entry(title,subtitle){const row=element('div',undefined,'entry'),copy=element('div',undefined,'entry-info'),buttons=element('div',undefined,'entry-buttons');copy.append(element('strong',title),element('small',subtitle));row.append(copy,buttons);return {row,buttons};}
function renderInvitations(container,items,incoming){const parent=$(container);parent.replaceChildren();const active=items.filter(i=>i.status==='pending');if(!active.length){parent.append(element('p',incoming?'No invitations waiting.':'No pending invitations.','muted'));return;}for(const item of active){const expired=item.expiresAt.toMillis()<=Date.now();const {row,buttons}=entry(incoming?item.senderName:item.recipientEmail,`${item.relationship} · ${expired?'Expired':`Expires ${item.expiresAt.toDate().toLocaleDateString()}`}`);if(incoming&&!expired)buttons.append(action('Accept',()=>acceptInvitation(item.id)));buttons.append(action(incoming?'Decline':'Cancel',()=>updateDoc(doc(db,'invitations',item.id),{status:incoming?'declined':'cancelled',updatedAt:serverTimestamp()})));parent.append(row);}}
async function acceptInvitation(id){
 const uid=auth.currentUser.uid;
 await runTransaction(db,async transaction=>{const ref=doc(db,'invitations',id),snap=await transaction.get(ref);if(!snap.exists())problem('This invitation is no longer available.');const invite=snap.data();if(invite.status!=='pending'||invite.expiresAt.toMillis()<=Date.now())problem('This invitation is no longer pending.');
 const mine=doc(db,'members',uid,'connections',invite.senderUid),existing=await transaction.get(mine);if(existing.exists())problem('You’re already connected. You can decline this duplicate invitation.');
 transaction.update(ref,{status:'accepted',recipientUid:uid,updatedAt:serverTimestamp()});
 transaction.set(mine,{otherUid:invite.senderUid,invitationId:id,relationship:invite.relationship,createdAt:serverTimestamp()});
 transaction.set(doc(db,'members',invite.senderUid,'connections',uid),{otherUid:uid,invitationId:id,relationship:invite.relationship,createdAt:serverTimestamp()});
 });notice('Connection confirmed. Welcome to each other’s universe.');
}
async function removeConnection(other){const uid=auth.currentUser.uid;const b=writeBatch(db);b.delete(doc(db,'members',uid,'connections',other));b.delete(doc(db,'members',other,'connections',uid));await b.commit();notice('Connection removed for both people. Profile and pet access have been revoked. Shared circle memberships remain until you leave or the owner removes you.');}
async function renderConnections(version){
 const revision=++profileVersion,ids=connections.map(c=>c.otherUid);
 const results=await Promise.all(ids.map(async uid=>{try{const snap=await getDoc(doc(db,'profiles',uid));return snap.exists()?{uid,...snap.data()}:null;}catch{return null;}}));
 if(version!==sessionId||revision!==profileVersion)return;
 connections=connections.map((c,i)=>({...c,profile:results[i]}));const parent=$('connections-list');parent.replaceChildren();
 $('connection-count').textContent=connections.length?`${connections.length} confirmed connection${connections.length===1?'':'s'}${connections.length===200?' · Showing the first 200':''}`:'You’re the first star. Invite someone you know to grow your universe.';
 if(!connections.length)parent.append(element('p','No confirmed connections yet. Both people must accept before they appear here.','muted'));
 for(const c of connections){const {row,buttons}=entry(c.profile?.name||'Connection unavailable',c.relationship);if(c.profile)buttons.append(action('View profile',()=>showPerson(c.otherUid)));buttons.append(action('Remove',async()=>{buttons.replaceChildren(action('Confirm removal',()=>removeConnection(c.otherUid)),action('Keep connection',()=>renderConnections(sessionId)));}));parent.append(row);}
 extras.refreshLists();drawGraph();
}
async function showPerson(uid){extras.deselect();const version=sessionId;const snapshot=await getDoc(doc(db,'profiles',uid));if(version!==sessionId||!snapshot.exists()||(uid!==auth.currentUser.uid&&!connections.some(c=>c.otherUid===uid)))return;const p=snapshot.data();const panel=$('person-detail');panel.dataset.personUid=uid;panel.replaceChildren(portrait(p.photoData,p.name),element('h2',p.name),element('p',p.bio||'No bio yet.'),element('p',uid===auth.currentUser.uid?'Your profile':'Confirmed connection','fine'));panel.append(action(uid===auth.currentUser.uid?'Your memories':`Memories shared by ${p.name}`,()=>memories.browse('person',uid,p.name)));panel.hidden=false;if(uid!==auth.currentUser.uid)await extras.connectedPets(uid,panel);}
const ns='http://www.w3.org/2000/svg';
function svgEl(tag,attrs,parent,text){const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);if(text!==undefined)n.textContent=text;parent.append(n);return n;}
function drawGraph(){
 if(!currentProfile)return;$('nodes').replaceChildren();$('lines').replaceChildren();
 const people=connections.filter(c=>c.profile).map(c=>({...c.profile,id:c.otherUid,kind:'person'})),additional=[...(extras?.graphItems()||[]),...(memories?.graphItems()||[])],items=[...people,...additional];
 const petCount=additional.filter(p=>p.kind==='pet').length,circleCount=additional.filter(p=>p.kind==='circle').length,memoryCount=additional.filter(p=>p.kind==='memory').length;
 $('connection-count').textContent=items.length?`${connections.length} confirmed connection${connections.length===1?'':'s'} · ${petCount} pet${petCount===1?'':'s'} · ${circleCount} circle${circleCount===1?'':'s'} · ${memoryCount} memor${memoryCount===1?'y':'ies'}`:'You’re the first star. Add a pet, create a circle, or invite someone you know.';
 const companions=additional.filter(p=>p.kind!=='memory'),moments=additional.filter(p=>p.kind==='memory');
 const list=[{...currentProfile,id:currentProfile.uid,kind:'person',x:300,y:250,self:true},...people.map((p,i)=>{const angle=i/Math.max(people.length,1)*Math.PI*2-Math.PI/2;return {...p,x:300+Math.cos(angle)*210,y:250+Math.sin(angle)*145};}),...companions.map((p,i)=>({...p,x:610,y:100+(i+.5)*300/Math.max(companions.length,1)})),...moments.map((p,i)=>({...p,x:800,y:90+i*310/Math.max(moments.length-1,1)}))];
 const circle=extras.circles().find(c=>c.id===focusedCircle);if(!circle)focusedCircle=null;
 const related=new Set();if(circle){related.add('circle:'+circle.id);for(const p of list){if(p.kind==='person'&&circle.memberUids.includes(p.id))related.add('person:'+p.id);if(p.kind==='memory'&&p.circleId===circle.id){related.add('memory:'+p.id);for(const [kind,id]of [['person',p.personUid],['pet',p.petId]])if(list.some(n=>n.kind===kind&&n.id===id))related.add(kind+':'+id);}if(p.kind==='pet'&&circle.memberUids.includes(p.ownerUid))related.add('pet:'+p.id);}}
 $('space').classList.toggle('circle-focused',!!circle);$('universe-focus').hidden=!circle;if(circle){const counts=kind=>list.filter(p=>p.kind===kind&&related.has(kind+':'+p.id)).length;$('universe-focus-text').textContent=`${circle.title} · ${counts('person')} people · ${counts('pet')} pets · ${counts('memory')} memories`;}
 function connect(from,to,kind=''){const highlighted=circle&&related.has(from.kind+':'+from.id)&&related.has(to.kind+':'+to.id);svgEl('line',{x1:from.x,y1:from.y,x2:to.x,y2:to.y,class:`edge ${kind}${circle?(highlighted?' edge-highlight':' edge-muted'):''}`},$('lines'));}
 const self=list[0];for(const p of list)if(!p.self)connect(self,p,'self-edge');
 if(circle){const circleNode=list.find(p=>p.kind==='circle'&&p.id===circle.id);for(const p of list)if(p.kind==='person'&&circle.memberUids.includes(p.id))connect(circleNode,p,'circle-edge');}

 list.filter(p=>p.kind==='pet').forEach(pet=>{const owner=list.find(p=>p.kind==='person'&&p.id===pet.ownerUid);if(owner&&!owner.self)connect(pet,owner,'pet-edge');});
 list.filter(p=>p.kind==='memory').forEach(memory=>{for(const [kind,id]of [['person',memory.personUid],['pet',memory.petId],['circle',memory.circleId]]){const target=list.find(p=>p.kind===kind&&p.id===id);if(target&&!target.self)connect(memory,target,'memory-edge');}});
 list.forEach((p,index)=>{const radius=p.self?37:29;
 const g=svgEl('g',{class:`node${circle?(related.has(p.kind+':'+p.id)?' node-highlight':' node-muted'):''}${p.kind==='circle'&&p.id===focusedCircle?' node-selected':''}`,'data-kind':p.kind,'data-id':p.id,transform:`translate(${p.x} ${p.y})`,tabindex:0,role:'button','aria-label':`${p.name}${p.self?', you':p.kind==='pet'?', pet':p.kind==='circle'?', circle':p.kind==='memory'?', memory':''}`},$('nodes'));
 if(p.kind==='circle')g.setAttribute('aria-pressed',String(p.id===focusedCircle));svgEl('title',{},g,p.name);
 svgEl('circle',{r:radius,fill:colors[p.color]||colors.blue},g);
 if(p.photoData){const clip=svgEl('clipPath',{id:`portrait-${index}`},g);svgEl('circle',{r:radius-2},clip);svgEl('image',{href:p.photoData,x:-radius,y:-radius,width:radius*2,height:radius*2,preserveAspectRatio:'xMidYMid slice','clip-path':`url(#portrait-${index})`},g);}
 else svgEl('text',{y:p.kind==='person'?5:7,class:p.kind==='person'?'':'node-icon'},g,p.self?'YOU':p.kind==='pet'?'🐾':p.kind==='circle'?'◎':p.kind==='memory'?'✦':p.name.slice(0,10));
 const label=p.name.length>23?p.name.slice(0,22)+'…':p.name;svgEl('text',{y:radius+19,class:'node-label'},g,label);
 const open=()=>{if(p.kind==='person')showPerson(p.id).catch(e=>notice(failure(e),true));else if(p.kind==='memory')memories.open(p.id).catch(e=>notice(failure(e),true));else extras.open(p.kind,p.id);};g.addEventListener('click',open);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
 });
}

let zoom=1,panX=0,panY=0,drag=null;
function transform(){$('viewport').setAttribute('transform',`translate(${panX} ${panY}) translate(450 250) scale(${zoom}) translate(-450 -250)`);}
bind('zoom-in','click',()=>{zoom=Math.min(2,zoom+.2);transform();});bind('zoom-out','click',()=>{zoom=Math.max(.65,zoom-.2);transform();});bind('show-universe','click',()=>{focusedCircle=null;drawGraph();});
bind('reset-view','click',()=>{focusedCircle=null;drawGraph();zoom=1;panX=0;panY=0;transform();});
$('space').addEventListener('pointerdown',e=>{if(e.target.closest('.node'))return;drag=[e.clientX,e.clientY,panX,panY];$('space').setPointerCapture(e.pointerId);});$('space').addEventListener('pointermove',e=>{if(!drag)return;const r=$('space').getBoundingClientRect();panX=drag[2]+(e.clientX-drag[0])*900/r.width;panY=drag[3]+(e.clientY-drag[1])*500/r.height;transform();});for(const event of ['pointerup','pointercancel'])$('space').addEventListener(event,()=>drag=null);$('space').addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.65,Math.min(2,zoom+(e.deltaY<0?.1:-.1)));transform();},{passive:false});
if(firebaseConfig){try{const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);extras=createUniverseExtras({db,user:()=>auth.currentUser,version:()=>sessionId,profile:()=>currentProfile,connections:()=>connections,notice,drawGraph,selectCircle:id=>{focusedCircle=id;drawGraph();},element,entry,action,bind,problem,changed:()=>memories?.refreshOptions(),browseMemories:(...args)=>memories?.browse(...args)});memories=createMemories({db,user:()=>auth.currentUser,version:()=>sessionId,profile:()=>currentProfile,connections:()=>connections,pets:()=>extras.pets(),circles:()=>extras.circles(),notice,drawGraph,element,action,bind,problem,showPerson,openPet:pet=>extras.openPet(pet),openCircle:id=>extras.open('circle',id)});if(useEmulators&&location.hostname==='127.0.0.1'){connectAuthEmulator(auth,'http://127.0.0.1:9199',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8180);}await setPersistence(auth,browserSessionPersistence);onAuthStateChanged(auth,user=>loadSession(user));}catch(error){views('auth-view');$('auth-submit').disabled=true;notice('Accounts are temporarily unavailable. Please try again later.',true);}}else{views('auth-view');$('auth-submit').disabled=true;notice('Account setup is being connected. Please try again later.');}
