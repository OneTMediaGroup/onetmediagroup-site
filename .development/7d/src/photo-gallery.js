import {collection,query,where,orderBy,limit,startAfter,onSnapshot} from 'firebase/firestore';
import {galleryPhotos,gallerySources} from './gallery-data.js';
const PAGE_SIZE=12;
export function createPhotoGallery({db,user,version,connections,circles,targetName,element,action,openPhoto,openProfile}){
 const panel=document.getElementById('photo-gallery');
 let target=null,generation=0,sources=[],heading,summary,grid,more,warning,signature='',renderQueued=false;
 function clear(){generation++;for(const source of sources)for(const page of source.pages){page.rows=[];page.last=null;page.stop?.();}sources=[];target=null;signature='';grid?.replaceChildren();heading=summary=grid=more=warning=null;panel.replaceChildren();panel.hidden=true;}
 function accessSignature(){return JSON.stringify(gallerySources(user().uid,connections(),circles()));}
 function scheduleRender(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;if(target&&user())render();});}
 function render(){
  const rows=galleryPhotos(sources.flatMap(s=>s.pages.flatMap(p=>p.rows)),target.kind,target.id),pending=sources.some(s=>s.pages.some(p=>p.pending)),failed=sources.some(s=>s.error),hasMore=sources.some(s=>!s.error&&s.pages.at(-1)?.full);
  const count=new Set(rows.map(p=>p.memoryId)).size;
  summary.textContent=pending?'Finding tagged photos…':`${rows.length} tagged photo${rows.length===1?'':'s'} in ${count} memor${count===1?'y':'ies'}${hasMore?' · More photos available':''}`;
  warning.textContent=failed?'Some photos could not be loaded. Refresh the gallery to try again.':'';
  grid.replaceChildren();for(const photo of rows){
   const card=element('article',undefined,'profile-gallery-card'),button=action('Open tagged photo',()=>openPhoto(photo));button.className='memory-photo-open';button.setAttribute('aria-label',`Open photo ${photo.index+1} from ${photo.title}`);
   const image=element('img');image.src=photo.photoData;image.alt=photo.caption||`${target.label} · ${photo.title}`;image.loading='lazy';image.className='profile-gallery-photo';button.replaceChildren(image);
   const copy=element('div',undefined,'profile-gallery-copy');copy.append(element('h3',photo.title));if(photo.happenedOn)copy.append(element('p',photo.happenedOn,'fine'));if(photo.caption)copy.append(element('p',photo.caption,'photo-caption'));
   card.dataset.memoryId=photo.memoryId;card.dataset.photoIndex=String(photo.index);card.append(button,copy);grid.append(card);
  }
  if(!rows.length&&!pending)grid.append(element('p',hasMore?'No matching photos in this batch. Load more to keep looking.':failed?'No photos loaded yet. Try refreshing the gallery.':'No photos tagged here yet. Only photos explicitly tagged with this person or pet appear.','muted'));
  more.hidden=!hasMore;more.disabled=pending;
 }
 function loadPage(source){
  const last=source.pages.at(-1);if(source.error||last?.pending||last&&!last.full)return;
  const page={rows:[],pending:true,full:false,last:null,stop:null};source.pages.push(page);const g=generation,v=version();
  const parts=[...source.filters.map(([field,op,value])=>where(field,op,value)),where(target.kind==='person'?'photoTagPeople':'photoTagPets','array-contains',target.id),orderBy('createdAt','desc')];if(last?.last)parts.push(startAfter(last.last));parts.push(limit(PAGE_SIZE));
  page.stop=onSnapshot(query(collection(db,'memories'),...parts),snapshot=>{
   if(g!==generation||v!==version()||!user()||source.error)return;
   page.rows=snapshot.docs.map(d=>({id:d.id,...d.data()}));page.pending=false;page.full=snapshot.size===PAGE_SIZE;page.last=snapshot.docs.at(-1)||null;scheduleRender();
  },()=>{if(g!==generation||v!==version()||!user())return;source.error=true;for(const p of source.pages){p.rows=[];p.last=null;p.full=false;p.pending=false;p.stop?.();}scheduleRender();});
 }
 function open(kind,id){
  if(!user())return;const label=targetName(kind,id);if(!label)return;clear();target={kind,id,label};signature=accessSignature();
  panel.hidden=false;panel.append(element('span','THEIR PHOTOS, TOGETHER','kicker'));heading=element('h2',`Photos of ${label}`);heading.tabIndex=-1;
  const controls=element('div',undefined,'actions');controls.append(action('Back to profile',()=>openProfile(target.kind,target.id)),action('Refresh gallery',()=>open(target.kind,target.id)),action('Close gallery',clear));
  summary=element('p','Finding tagged photos…','fine');summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');warning=element('p',undefined,'fine');grid=element('div',undefined,'profile-gallery-grid');more=action('Load more photos',()=>{for(const source of sources)loadPage(source);scheduleRender();});more.hidden=true;
  panel.append(heading,element('p','Tagged photos from memories you can view. Open a photo to browse its original album, caption, and tags.','muted'),controls,summary,warning,grid,more,element('p','Searches your memories, current circles, and direct shares from confirmed connections. Use Load more for older photos, or Refresh gallery to reload the collection.','fine'));
  sources=gallerySources(user().uid,connections(),circles()).map(source=>({...source,pages:[],error:false}));for(const source of sources)loadPage(source);heading.focus({preventScroll:true});panel.scrollIntoView({block:'start'});
 }
 function refreshAccess(){if(!target)return;if(!user()||!targetName(target.kind,target.id)){clear();return;}if(signature!==accessSignature()){const {kind,id}=target;open(kind,id);}}
 return {open,clear,refreshAccess,isOpen:()=>!!target,focus:()=>{if(target){heading.focus({preventScroll:true});panel.scrollIntoView({block:'start'});}}};
}
