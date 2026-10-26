import {searchParts} from './search-text.js';
// User text always stays text, including markup-like captions and stories.
export function markSearch(node,text,search=''){
 const doc=node.ownerDocument;node.replaceChildren();
 for(const part of searchParts(text,search)){if(part.match){const mark=doc.createElement('mark');mark.className='gallery-search-match';mark.textContent=part.text;node.append(mark);}else node.append(doc.createTextNode(part.text));}
 return node;
}
