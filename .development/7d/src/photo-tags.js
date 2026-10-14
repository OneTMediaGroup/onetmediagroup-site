export const MAX_ALBUM_PEOPLE=3,MAX_ALBUM_PETS=1;
export function cleanPhotoTags(value){if(Array.isArray(value?.refs))value=value.refs;if(Array.isArray(value))value={people:value.filter(v=>typeof v==='string'&&v.startsWith('person:')).map(v=>v.slice(7)),pets:value.filter(v=>typeof v==='string'&&v.startsWith('pet:')).map(v=>v.slice(4))};return {people:Array.isArray(value?.people)?[...new Set(value.people.filter(id=>typeof id==='string'&&id.length>0&&id.length<=128))].slice(0,3):[],pets:Array.isArray(value?.pets)?[...new Set(value.pets.filter(id=>typeof id==='string'&&id.length>0&&id.length<=128))].slice(0,1):[]};}
export function photoTagFields(album,petOwners,uid){
 if(album.some(p=>(p.tags?.people?.length||0)>3||(p.tags?.pets?.length||0)>1))throw new Error('Each photo can tag up to three people and one pet.');
 const photoTags=album.map(p=>cleanPhotoTags(p.tags));
 const people=new Set(photoTags.flatMap(t=>t.people)),pets=[...new Set(photoTags.flatMap(t=>t.pets))];
 for(const id of pets){const owner=petOwners.get(id);if(!owner)throw new Error('A tagged pet is no longer available. Remove its tag before saving.');if(owner!==uid)people.add(owner);}
 if(people.size>MAX_ALBUM_PEOPLE||pets.length>MAX_ALBUM_PETS)throw new Error('An album can tag up to three people (including pets’ owners) and one pet.');
 return {photoTags:photoTags.map(t=>({refs:[...t.people.map(id=>'person:'+id),...t.pets.map(id=>'pet:'+id)]})),photoTagPeople:[...people],photoTagPets:pets};
}
export function taggedIds(memory,kind){return [...new Set((Array.isArray(memory.photoTags)?memory.photoTags:[]).slice(0,4).flatMap(t=>cleanPhotoTags(t)[kind==='person'?'people':'pets']))];}
