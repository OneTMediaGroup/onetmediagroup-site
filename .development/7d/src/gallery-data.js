import {memoryAlbum} from './albums.js';
export function gallerySources(uid,connections,circles,kind,id){if(kind==='circle')return circles.some(c=>c.id===id)?[{key:'circle:'+id,filters:[['audienceKind','==','circle'],['audienceId','==',id]]}]:[];return [
 {key:'own',filters:[['ownerUid','==',uid]]},
 ...[...new Set(circles.map(c=>c.id))].map(id=>({key:'circle:'+id,filters:[['audienceKind','==','circle'],['audienceId','==',id]]})),
 ...[...new Set(connections.map(c=>c.otherUid))].filter(id=>id!==uid).map(id=>({key:'person:'+id,filters:[['ownerUid','==',id],['audienceKind','==','person'],['audienceId','==',uid]]}))
];}
export function galleryPhotos(memories,kind,id){
 const key=kind==='person'?'people':'pets';
 return [...new Map(memories.map(m=>[m.id,m])).values()].filter(m=>kind!=='circle'||m.audienceKind==='circle'&&m.audienceId===id).flatMap(m=>memoryAlbum(m).flatMap((p,index)=>kind==='circle'||p.tags[key].includes(id)?[{...p,index,memoryId:m.id,title:m.title,happenedOn:m.happenedOn||'',createdAt:m.createdAt}]:[]))
  .sort((a,b)=>b.happenedOn.localeCompare(a.happenedOn)||(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)||a.memoryId.localeCompare(b.memoryId)||a.index-b.index);
}
