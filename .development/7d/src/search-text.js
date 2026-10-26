// Search and highlighting share the same fold; ranges refer to original text.
const graphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'});
function folded(value){
 const text=String(value||'');let normalized='';const spans=[];
 for(const {segment,index} of graphemes.segment(text)){const part=segment.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();normalized+=part;for(let i=0;i<part.length;i++)spans.push([index,index+segment.length]);}
 return {text,normalized,spans};
}
export function searchWords(value){return [...new Set(folded(value).normalized.trim().split(/\s+/u).filter(Boolean))];}
export function matchesSearch(value,words){const text=folded(value).normalized;return words.every(word=>text.includes(word));}
export function searchRanges(value,search){
 const {normalized,spans}=folded(value),ranges=[];
 for(const word of searchWords(search)){let pos=normalized.indexOf(word);while(pos!==-1){ranges.push([spans[pos][0],spans[pos+word.length-1][1]]);pos=normalized.indexOf(word,pos+1);}}
 ranges.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const merged=[];
 for(const range of ranges){const last=merged.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push([...range]);}return merged;
}
export function searchParts(value,search){
 const text=String(value||''),parts=[];let offset=0;
 for(const [start,end] of searchRanges(text,search)){if(start>offset)parts.push({text:text.slice(offset,start),match:false});parts.push({text:text.slice(start,end),match:true});offset=end;}
 if(offset<text.length)parts.push({text:text.slice(offset),match:false});return parts;
}
export function storyPreview(value,search){
 const text=String(value||''),first=searchRanges(text,search)[0];let start=first?Math.max(0,first[0]-70):0,end=Math.min(text.length,Math.max(start+300,first?.[1]||0));
 // Keep excerpts on grapheme boundaries, including emoji and combining accents.
 const boundaries=[...graphemes.segment(text)].map(g=>g.index);start=boundaries.findLast(i=>i<=start)||0;end=boundaries.find(i=>i>=end)??text.length;
 return (start?'…':'')+text.slice(start,end)+(end<text.length?'…':'');
}
