import {memoryAlbum} from './albums.js';
export function gallerySources(uid,connections,circles,kind,id){if(kind==='circle')return circles.some(c=>c.id===id)?[{key:'circle:'+id,filters:[['audienceKind','==','circle'],['audienceId','==',id]]}]:[];return [
 {key:'own',filters:[['ownerUid','==',uid]]},
 ...[...new Set(circles.map(c=>c.id))].map(id=>({key:'circle:'+id,filters:[['audienceKind','==','circle'],['audienceId','==',id]]})),
 ...[...new Set(connections.map(c=>c.otherUid))].filter(id=>id!==uid).map(id=>({key:'person:'+id,filters:[['ownerUid','==',id],['audienceKind','==','person'],['audienceId','==',uid]]}))
];}
export function galleryPhotos(memories,kind,id,selection=null){
 const key=kind==='person'?'people':'pets';
 return [...new Map(memories.map(m=>[m.id,m])).values()].filter(m=>kind!=='circle'||m.audienceKind==='circle'&&m.audienceId===id).flatMap(m=>memoryAlbum(m).flatMap((p,index)=>(kind==='circle'?(!selection||p.tags[selection.kind==='person'?'people':'pets'].includes(selection.id)):p.tags[key].includes(id))?[{...p,index,memoryId:m.id,title:m.title,story:m.story||'',happenedOn:m.happenedOn||'',createdAt:m.createdAt}]:[]))
  .sort((a,b)=>b.happenedOn.localeCompare(a.happenedOn)||(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)||a.memoryId.localeCompare(b.memoryId)||a.index-b.index);
}

export function galleryTagFilter(kind,id,selection=null){const filter=kind==='circle'?selection:{kind,id};return filter?{field:filter.kind==='person'?'photoTagPeople':'photoTagPets',id:filter.id}:null;}

// Dates belong to memories; never substitute upload timestamps for story dates.
export function galleryYearPhotos(photos,year='all'){
 if(year==='all')return photos;
 return photos.filter(photo=>{const value=photo.happenedOn;if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return year==='undated';const date=new Date(value+'T12:00:00Z'),valid=Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;return year==='undated'?!valid:valid&&value.slice(0,4)===year;});
}

function searchText(value){return String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();}
export function gallerySearchPhotos(photos,search=''){
 const words=searchText(search).trim().split(/\s+/u).filter(Boolean);
 if(!words.length)return photos;
 return photos.filter(photo=>{const text=searchText([photo.title,photo.caption,photo.story].join(' '));return words.every(word=>text.includes(word));});
}
