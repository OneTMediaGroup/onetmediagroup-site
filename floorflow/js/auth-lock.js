import {authenticateUser,validateSession,logout} from './server-access.js';
let loginPromise=null,timer=null;
const ALL=['operator','dieSetter','supervisor','admin','display'];
export async function requireRoleAccess(allowedRoles=ALL,force=false){
 if(!force){try{const user=await validateSession();if(allowedRoles.includes(user.role)){arm(user.role);return user;}}catch{}}
 if(loginPromise)return loginPromise;
 loginPromise=showLogin(allowedRoles).finally(()=>{loginPromise=null});return loginPromise;
}
async function showLogin(allowed){
 const dialog=document.createElement('dialog');dialog.className='floorflow-secure-login';
 dialog.style.cssText='width:min(420px,calc(100vw - 32px));padding:24px;border:1px solid #cbd5e1;border-radius:16px;background:white;color:#172538;';
 dialog.innerHTML='<form><h2>Sign in to your plant</h2><label style="display:block">Employee ID<input name="employee" autocomplete="username" required style="width:100%;margin:8px 0 16px"></label><label style="display:block">PIN<input name="pin" type="password" inputmode="numeric" autocomplete="current-password" required style="width:100%;margin:8px 0 16px"></label><p role="alert" data-error></p><button type="submit" class="button primary">Sign in</button><p><a href="onboarding.html">Create a plant</a></p></form>';
 document.body.append(dialog);dialog.addEventListener('cancel',e=>e.preventDefault());dialog.showModal();
 const form=dialog.querySelector('form'),error=dialog.querySelector('[data-error]'),button=form.querySelector('button');
 return new Promise(resolve=>{form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;error.textContent='';try{const user=await authenticateUser(form.elements.employee.value.trim(),form.elements.pin.value.trim());if(!allowed.includes(user.role)){await logout();throw new Error('This screen requires a different role.');}dialog.close();dialog.remove();arm(user.role);resolve(user);}catch(e){error.textContent=e.message;form.elements.pin.value='';button.disabled=false;}});});
}
function arm(role){
 if(timer)clearTimeout(timer);if(role==='display')return;
 timer=setTimeout(async()=>{await logout();await requireRoleAccess(ALL,true);location.reload();},10*60*1000);
}
for(const event of ['pointerdown','keydown'])window.addEventListener(event,()=>{if(timer)arm('operator')},{passive:true});
