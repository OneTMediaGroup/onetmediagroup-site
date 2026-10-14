export const MAX_MEMORY_PHOTOS=4;
export function memoryPhotos(memory){return [memory.photoData,...(Array.isArray(memory.additionalPhotos)?memory.additionalPhotos:[])].filter(p=>typeof p==='string'&&p.length<=240000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p)).slice(0,MAX_MEMORY_PHOTOS);}
export function albumFields(photos){if(photos.length>MAX_MEMORY_PHOTOS)throw new Error('A memory can hold up to four photos.');return {photoData:photos[0]||'',additionalPhotos:photos.slice(1)};}
