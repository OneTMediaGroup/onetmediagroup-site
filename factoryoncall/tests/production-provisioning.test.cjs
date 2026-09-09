const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(process.argv[2] || require('path').join(__dirname,'../functions/index.js'),'utf8');
const fn=source.slice(source.indexOf('async function seedProductionCompany('),source.indexOf('\nfunction normalizeStripeStatus('));
function setup(failure){
 const data=new Map();let writes=0;
 const ref=path=>({path,collection:n=>ref(path+'/'+n),doc:n=>ref(path+'/'+n),get:async()=>({exists:data.has(path)}),set:async value=>{if(++writes===failure)throw Error('injected failure');data.set(path,value);}});
 const db={collection:n=>ref(n),runTransaction:async cb=>{const pending=new Map();await cb({get:r=>r.get(),set:(r,v)=>{if(++writes===failure)throw Error('injected failure');pending.set(r.path,v);}});for(const [k,v]of pending)data.set(k,v);}};
 const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>123};
 const ctx={admin:{firestore},logger:{info:()=>{}}};vm.createContext(ctx);vm.runInContext(fn,ctx);
 return {data,run:()=>ctx.seedProductionCompany('plant',{companyName:'QA',adminPin:'1234'})};
}
(async()=>{
 const successful=setup();await successful.run();const baseline=JSON.stringify([...successful.data]);await successful.run();assert.equal(JSON.stringify([...successful.data]),baseline);assert.equal(successful.data.size,8);assert(successful.data.has('companies/plant/roles/Admin'));assert(successful.data.has('companies/plant/users/1234'));assert(![...successful.data.keys()].some(k=>/\/areas\/|\/stations\//.test(k)));
 for(let failure=1;failure<=8;failure++){
  const test=setup(failure);await assert.rejects(test.run(),/injected failure/);assert.equal(test.data.size,0,'Failure '+failure+' left partial plant');await test.run();assert.equal(JSON.stringify([...test.data]),baseline,'Retry did not complete setup');
 }
 console.log('PASS: clean Production defaults; duplicate delivery unchanged; all 8 write failure points roll back and retry successfully.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
