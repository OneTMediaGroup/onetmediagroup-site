/* Verified Firebase sessions. Browser storage is never an authority for permissions. */
(() => {
 'use strict';
 const endpoint = 'https://us-central1-factoryoncall.cloudfunctions.net/';
 let auth, companyId, currentUser = null;
 const script = src => new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Could not load sign-in.'));document.head.append(s);});
 async function post(name, body, authenticated=false) {
  const headers={'Content-Type':'application/json'};
  if(authenticated){if(!auth?.currentUser)throw Error('Sign in again.');headers.Authorization='Bearer '+await auth.currentUser.getIdToken();}
  const response=await fetch(endpoint+name,{method:'POST',headers,body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error || 'Could not complete sign-in.');
  return data;
 }
 async function boot(app, plant) {
  companyId=plant;
  if(!firebase.auth)await script('https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js');
  auth=app.auth();
  await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
  await new Promise(resolve=>{const off=auth.onAuthStateChanged(()=>{off();resolve();});});
  if(auth.currentUser){
   try{const data=await post('plantSession',{companyId},true);currentUser=data.user;}
   catch{await auth.signOut();currentUser=null;}
  }
 }
 async function login(userId,pin,portal='call') {
  const data=await post('plantSignIn',{companyId,userId:String(userId).trim(),pin:String(pin).trim(),portal});
  await auth.signInWithCustomToken(data.token);
  currentUser=data.user;
  window.dispatchEvent(new CustomEvent("foc-verified-user",{detail:currentUser}));
  return currentUser;
 }
 const admin = u => u && (u.admin===true||u.isAdmin===true||['admin','administrator'].includes(String(u.role||'').toLowerCase()));
 async function requireAccess({portalKey='call',title='Plant Access',subtitle='Enter your User ID and PIN to continue.',requireAdmin=false}={}) {
  if(currentUser && (!requireAdmin||admin(currentUser))){
   try{const data=await post('plantSession',{companyId,portal:portalKey},true);currentUser=data.user;return currentUser;}catch{/* Show the same sign-in form when another role is required. */}
  }
  return new Promise(resolve=>{
   const overlay=document.createElement('div');overlay.className='foc-auth-overlay';
   const form=document.createElement('form');form.className='foc-auth-card';
   form.innerHTML='<div class="foc-auth-kicker">Factory On Call</div><h2></h2><p></p><div class="foc-auth-field"><label for="secureUserId">User ID</label><input id="secureUserId" autocomplete="username" required /></div><div class="foc-auth-field"><label for="securePin">PIN</label><input id="securePin" type="password" inputmode="numeric" autocomplete="current-password" required /></div><div class="foc-auth-error" role="alert"></div><div class="foc-auth-actions"><button type="submit">Unlock</button></div>';
   form.querySelector('h2').textContent=title;form.querySelector('p').textContent=subtitle;
   overlay.append(form);document.body.append(overlay);document.body.classList.add('foc-auth-locked');
   const id=form.querySelector('#secureUserId'),pin=form.querySelector('#securePin'),button=form.querySelector('button'),error=form.querySelector('[role="alert"]');id.focus();
   form.addEventListener('submit',async event=>{
    event.preventDefault();button.disabled=true;error.textContent='';
    try{const user=await login(id.value,pin.value,portalKey);pin.value='';overlay.remove();document.body.classList.remove('foc-auth-locked');resolve(user);}
    catch(e){error.textContent=e.message;pin.value='';pin.focus();}
    finally{button.disabled=false;}
   });
  });
 }
 async function logout(){currentUser=null;if(auth)await auth.signOut();location.reload();}
 window.FOCAccess={boot,login,requireAccess,logout,post,get user(){return currentUser;}};
})();
