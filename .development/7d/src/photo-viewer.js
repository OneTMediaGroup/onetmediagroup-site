// A single transient viewer; photos never outlive their authorized memory detail.
export function createPhotoViewer(){
 const dialog=document.createElement('dialog');
 dialog.className='photo-viewer';
 dialog.setAttribute('aria-labelledby','photo-viewer-title');
 dialog.innerHTML='<header class="photo-viewer-heading"><h2 id="photo-viewer-title"></h2><button type="button" class="photo-viewer-close" autofocus aria-label="Close photo viewer">Close ✕</button></header><div class="photo-viewer-stage"><img alt="" draggable="false"></div><nav class="photo-viewer-controls" aria-label="Album photos"><button type="button" class="photo-viewer-previous" aria-label="Previous album photo">← Previous</button><p role="status" aria-live="polite"></p><button type="button" class="photo-viewer-next" aria-label="Next album photo">Next →</button></nav><p class="photo-viewer-help">Use the arrows or swipe to browse · Esc to close</p>';
 document.body.append(dialog);
 const image=dialog.querySelector('img'),title=dialog.querySelector('h2'),status=dialog.querySelector('[role=status]'),previous=dialog.querySelector('.photo-viewer-previous'),next=dialog.querySelector('.photo-viewer-next');
 let photos=[],selected=0,opener=null,onSelect=null,start=null;
 function choose(index){if(!photos.length)return;selected=(index+photos.length)%photos.length;image.src=photos[selected];image.alt=`${title.textContent} — photo ${selected+1} of ${photos.length}`;status.textContent=`Photo ${selected+1} of ${photos.length}`;onSelect?.(selected);}
 function cleanup(){photos=[];onSelect=null;start=null;image.removeAttribute('src');image.alt='';title.textContent='';status.textContent='';document.body.classList.remove('photo-viewer-open');const target=opener;opener=null;if(target?.isConnected)target.focus({preventScroll:true});}
 function close(){if(dialog.open)dialog.close();cleanup();}
 dialog.querySelector('.photo-viewer-close').addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 // Native close events arrive asynchronously; do not clear a newly opened album.
 dialog.addEventListener('close',()=>{if(!dialog.open)cleanup();});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
 previous.addEventListener('click',()=>choose(selected-1));next.addEventListener('click',()=>choose(selected+1));
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();choose(selected+(event.key==='ArrowLeft'?-1:1));}});
 const stage=dialog.querySelector('.photo-viewer-stage');
 stage.addEventListener('touchstart',event=>{start=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},{passive:true});
 stage.addEventListener('touchend',event=>{if(!start||event.changedTouches.length!==1)return;const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;start=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)choose(selected+(dx<0?1:-1));},{passive:true});
 stage.addEventListener('touchcancel',()=>{start=null;},{passive:true});
 return {close,open({title:label,photos:album,index=0,trigger=document.activeElement,onChange}){close();if(!album.length)return;photos=[...album];opener=trigger;onSelect=onChange;title.textContent=label;dialog.querySelector('.photo-viewer-help').textContent=album.length>1?'Use the arrows or swipe to browse · Esc to close':'Esc to close';previous.hidden=next.hidden=album.length<2;choose(index);dialog.showModal();document.body.classList.add('photo-viewer-open');}};
}
