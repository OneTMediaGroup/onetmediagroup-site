export function timelineDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?date:null;
}
export function timelineRows(memories,{scope='all',order='oldest',year='all'}={}){
 const [kind,id]=scope.split(':');
 return [...new Map(memories.map(m=>[m.id,m])).values()].filter(m=>scope==='all'||kind==='circle'&&m.circleId===id||kind==='pet'&&m.petId===id||kind==='person'&&(m.personUid===id||m.ownerUid===id)).filter(m=>year==='all'||timelineDate(m.happenedOn)?.getUTCFullYear().toString()===year).sort((a,b)=>{
  const ad=timelineDate(a.happenedOn),bd=timelineDate(b.happenedOn);if(!ad&&!bd)return a.id.localeCompare(b.id);if(!ad)return 1;if(!bd)return -1;
  return (ad-bd)*(order==='newest'?-1:1)||a.id.localeCompare(b.id);
 });
}
