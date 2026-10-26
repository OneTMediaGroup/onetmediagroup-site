import {markSearch} from './search-mark.js';
// A single transient viewer; photos never outlive their authorized memory detail.
export function createPhotoViewer(){
 const dialog=document.createElement('dialog');
 dialog.className='photo-viewer';
 dialog.setAttribute('aria-labelledby','photo-viewer-title');
 dialog.innerHTML='<header class="photo-viewer-heading"><h2 id="photo-viewer-title"></h2><button type="button" class="photo-viewer-close" autofocus aria-label="Close photo viewer">Close ✕</button></header><nav class="photo-viewer-matches" aria-label="Search matches" hidden><button type="button" class="photo-viewer-match-previous">← Previous match</button><p role="status" aria-live="polite"></p><button type="button" class="photo-viewer-match-next">Next match →</button></nav><div class="photo-viewer-stage"><img alt="" draggable="false"></div><p class="photo-viewer-caption photo-caption" aria-live="polite" hidden></p><div class="photo-viewer-tags photo-tag-links" hidden></div><nav class="photo-viewer-controls" aria-label="Album photos"><button type="button" class="photo-viewer-previous" aria-label="Previous album photo">← Previous</button><p role="status" aria-live="polite"></p><button type="button" class="photo-viewer-next" aria-label="Next album photo">Next →</button></nav><details class="photo-viewer-story" hidden><summary>Full memory story</summary><p class="memory-story"></p></details><p class="photo-viewer-help">Use the arrows or swipe to browse · Esc to close</p>';
 document.body.append(dialog);
 const tags=dialog.querySelector('.photo-viewer-tags');
 const caption=dialog.querySelector('.photo-viewer-caption'),story=dialog.querySelector('.photo-viewer-story'),storyText=story.querySelector('p');
 const image=dialog.querySelector('img'),title=dialog.querySelector('h2'),status=dialog.querySelector('.photo-viewer-controls [role=status]'),previous=dialog.querySelector('.photo-viewer-previous'),next=dialog.querySelector('.photo-viewer-next');
 const matchBar=dialog.querySelector('.photo-viewer-matches'),matchStatus=matchBar.querySelector('[role=status]'),matchPrevious=matchBar.querySelector('.photo-viewer-match-previous'),matchNext=matchBar.querySelector('.photo-viewer-match-next');
 let matches=[],matchIndex=-1;
 let photos=[],captions=[],selected=0,opener=null,onSelect=null,renderTags=null,start=null,search='';
 function choose(index){if(!photos.length)return;selected=(index+photos.length)%photos.length;image.src=photos[selected];image.alt=`${title.textContent} — photo ${selected+1} of ${photos.length}`;status.textContent=`Photo ${selected+1} of ${photos.length}`;markSearch(caption,captions[selected]||'',search);caption.hidden=!caption.textContent;renderTags?.(selected,tags);onSelect?.(selected);refreshMatches();}
 function cleanup(){matches=[];matchIndex=-1;matchBar.hidden=true;matchStatus.textContent='';matchPrevious.disabled=matchNext.disabled=true;renderTags=null;tags.replaceChildren();tags.hidden=true;photos=[];captions=[];search='';storyText.replaceChildren();story.open=false;story.hidden=true;caption.textContent='';caption.hidden=true;onSelect=null;start=null;image.removeAttribute('src');image.alt='';title.textContent='';status.textContent='';document.body.classList.remove('photo-viewer-open');const target=opener;opener=null;if(target?.isConnected)target.focus({preventScroll:true});}
 function refreshMatches(){
  for(const mark of matches){mark.classList.remove('current-search-match');mark.removeAttribute('aria-current');}
  matches=[...dialog.querySelectorAll('mark.gallery-search-match')];matchIndex=-1;matchBar.hidden=!search.trim();matchPrevious.disabled=matchNext.disabled=!matches.length;
  matchStatus.textContent=matches.length?`${matches.length} match${matches.length===1?'':'es'} in this photo’s text`:'No matches in this photo’s text';
 }
 function jumpMatch(direction){
  if(!matches.length)return;
  if(matchIndex>=0){matches[matchIndex].classList.remove('current-search-match');matches[matchIndex].removeAttribute('aria-current');}
  matchIndex=matchIndex<0?(direction>0?0:matches.length-1):(matchIndex+direction+matches.length)%matches.length;
  const mark=matches[matchIndex],inStory=storyText.contains(mark);if(inStory)story.open=true;mark.classList.add('current-search-match');mark.setAttribute('aria-current','true');
  const location=inStory?'Story':caption.contains(mark)?'Caption':'Title';matchStatus.textContent=`Match ${matchIndex+1} of ${matches.length} · ${location}`;
  mark.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
 }
 matchPrevious.addEventListener('click',()=>jumpMatch(-1));matchNext.addEventListener('click',()=>jumpMatch(1));
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
 return {close,open({title:label,photos:album,captions:labels=[],search:query='',story:fullStory='',index=0,trigger=document.activeElement,onChange,renderTags:drawTags}){close();if(!album.length)return;photos=[...album];captions=[...labels];opener=trigger;onSelect=onChange;renderTags=drawTags;search=String(query||'').slice(0,200);markSearch(title,label,search);markSearch(storyText,fullStory,search);story.hidden=!fullStory;story.open=!!search.trim()&&!!fullStory;dialog.querySelector('.photo-viewer-help').textContent=album.length>1?'Use the arrows or swipe to browse · Esc to close':'Esc to close';previous.hidden=next.hidden=album.length<2;choose(index);dialog.showModal();document.body.classList.add('photo-viewer-open');}};
}
