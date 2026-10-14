export const MAX_MEMORY_PHOTOS=4;
export const MAX_PHOTO_CAPTION=500;
export function memoryAlbum(memory){
 const captions=Array.isArray(memory.photoCaptions)?memory.photoCaptions:[];
 return [memory.photoData,...(Array.isArray(memory.additionalPhotos)?memory.additionalPhotos:[])]
  .map((photoData,index)=>({photoData,caption:typeof captions[index]==='string'?captions[index].slice(0,MAX_PHOTO_CAPTION):''}))
  .filter(p=>typeof p.photoData==='string'&&p.photoData.length<=240000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.photoData)).slice(0,MAX_MEMORY_PHOTOS);
}
export function memoryPhotos(memory){return memoryAlbum(memory).map(p=>p.photoData);}
export function albumFields(photos,captions){
 if(photos.length>MAX_MEMORY_PHOTOS)throw new Error('A memory can hold up to four photos.');
 const fields={photoData:photos[0]||'',additionalPhotos:photos.slice(1)};
 if(captions!==undefined){if(captions.length!==photos.length||captions.some(c=>typeof c!=='string'||c.length>MAX_PHOTO_CAPTION))throw new Error('Each photo caption must be 500 characters or less.');fields.photoCaptions=captions.map(c=>c.trim());}
 return fields;
}
