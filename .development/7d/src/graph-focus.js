// Work only with nodes the current session is already permitted to see.
export function graphFocus(nodes,circles,selection){
 const root=selection&&nodes.find(n=>n.kind===selection.kind&&n.id===selection.id);
 const related=new Set();if(!root)return {root:null,related};
 const add=(kind,id)=>{if(nodes.some(n=>n.kind===kind&&n.id===id))related.add(kind+':'+id);};
 add(root.kind,root.id);
 const circle=root.kind==='circle'?circles.find(c=>c.id===root.id):null;
 const memories=nodes.filter(n=>n.kind==='memory'&&(circle?n.circleId===circle.id:root.kind==='person'?n.personUid===root.id||n.ownerUid===root.id:root.kind==='pet'?n.petId===root.id:root.kind==='memory'?n.id===root.id:false));
 if(circle)for(const n of nodes){if(n.kind==='person'&&circle.memberUids.includes(n.id))add('person',n.id);if(n.kind==='pet'&&circle.memberUids.includes(n.ownerUid))add('pet',n.id);}
 if(root.kind==='person'){for(const n of nodes)if(n.kind==='pet'&&n.ownerUid===root.id)add('pet',n.id);for(const c of circles)if(c.memberUids.includes(root.id))add('circle',c.id);}
 if(root.kind==='pet')add('person',root.ownerUid);
 for(const m of memories){add('memory',m.id);add('person',m.personUid);add('person',m.ownerUid);add('pet',m.petId);add('circle',m.circleId);}
 return {root,related};
}
