/** Paid status comes from the server. No ad SDK or checkout is enabled yet. */
export class AdAccess{
 constructor({call,onChange=()=>{},now=()=>Date.now()}){this.call=call;this.onChange=onChange;this.now=now;this.uid=null;this.linked=false;this.status='unchecked';this.generation=0;this.checkedAt=null;this.adsEnabled=false;this.consented=false}
 identity(user){const linked=!!user&&!user.isAnonymous;if(this.uid!==(user?.uid??null)||this.linked!==linked){this.generation++;this.uid=user?.uid??null;this.linked=!!user&&!user.isAnonymous;this.status='unchecked';this.checkedAt=null;this.onChange()}}
 get automaticAdsAllowed(){return this.adsEnabled&&this.consented&&this.status==='not-owned'&&this.checkedAt!=null&&this.now()-this.checkedAt<300000}
 async refresh(){if(!this.uid||!this.linked){this.status='sign-in-required';this.onChange();return}const uid=this.uid,generation=this.generation;this.status='checking';this.onChange();try{const r=await this.call('getWebEntitlement',{});if(uid!==this.uid||generation!==this.generation)return;if(r.status==='owned'&&r.removeAds===true)this.status='owned';else if(r.status==='not-owned'&&r.removeAds===false)this.status='not-owned';else this.status='unavailable';this.checkedAt=this.now()}catch{if(uid!==this.uid||generation!==this.generation)return;this.status='unavailable';this.checkedAt=null}this.onChange()}
}
