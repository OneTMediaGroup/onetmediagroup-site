import {auth,authReady} from './firebase-config.js';
import {signInAnonymously,signInWithCustomToken,signOut} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getActivePlantId} from './plant-session.js';
import {setSession} from './store.js';
import {setStoredSessionUser,clearStoredSessionUser} from './session-user.js';
const BASE='https://northamerica-northeast1-die-changeover-board.cloudfunctions.net/';
export async function serverRequest(name,body={},anonymous=false){
 await authReady;
 if(anonymous&&!auth.currentUser)await signInAnonymously(auth);
 const headers={'Content-Type':'application/json'};
 if(auth.currentUser)headers.Authorization='Bearer '+await auth.currentUser.getIdToken();
 const res=await fetch(BASE+name,{method:'POST',headers,body:JSON.stringify(body)});
 const value=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(value.error||'Could not complete this request.');
 return value;
}
export async function authenticateUser(userId,pin,plantId=getActivePlantId()){
 const result=await serverRequest('floorFlowSignIn',{plantId,userId,pin});
 await signInWithCustomToken(auth,result.token);
 setSession(result.user);setStoredSessionUser(result.user);return result.user;
}
export async function validateSession(){
 const result=await serverRequest('floorFlowSession',{plantId:getActivePlantId()});
 setSession(result.user);setStoredSessionUser(result.user);return result.user;
}
export async function logout(){setSession(null);clearStoredSessionUser();await signOut(auth);}
export async function saveServerUser(input,userId){return serverRequest('saveFloorFlowUser',{plantId:getActivePlantId(),userId,input});}
export async function deleteServerUser(userId){return serverRequest('deleteFloorFlowUser',{plantId:getActivePlantId(),userId});}
