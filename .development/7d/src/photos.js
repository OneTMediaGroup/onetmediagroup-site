// Decode locally and re-encode a small JPEG portrait; no original bytes or EXIF are uploaded.
export async function resizePhoto(file) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP photo.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose a photo smaller than 8 MB.');
  const bitmap = await createImageBitmap(file, {imageOrientation:'from-image'});
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width > 12000 || bitmap.height > 12000) throw new Error('Choose a smaller photo.');
    const canvas = document.createElement('canvas'); canvas.width=256; canvas.height=256;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);
    const size=Math.min(bitmap.width,bitmap.height);
    ctx.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,256,256);
    for(const quality of [.82,.65,.45,.25]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=60000)return data;}
    throw new Error('This photo is too detailed. Try a simpler portrait.');
  } finally {bitmap.close();}
}
export function portrait(data,name,className='portrait') {
  const image=document.createElement('img');image.className=className;image.width=64;image.height=64;image.alt=name;
  if(typeof data==='string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data)&&data.length<=60000){image.src=data;return image;}
  const fallback=document.createElement('span');fallback.className=className+' portrait-fallback';fallback.textContent=(name||'?').slice(0,1).toUpperCase();fallback.setAttribute('aria-label',name);return fallback;
}

// Keep the scene's composition for memories; never crop it into a portrait.
export async function resizeMemoryPhoto(file) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP photo.');
  if (file.size>8*1024*1024) throw new Error('Choose a photo smaller than 8 MB.');
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  try {
    if(!bitmap.width||!bitmap.height||bitmap.width>12000||bitmap.height>12000)throw new Error('Choose a smaller photo.');
    for(const maxEdge of [1280,960]){
      const scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for(const quality of [.82,.65,.5,.35]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=240000)return data;}
    }
    throw new Error('Choose a less detailed photo so we can save a small copy.');
  }finally{bitmap.close();}
}
