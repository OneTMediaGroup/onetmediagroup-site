/* Public, consented reviews only. No visitor credentials are sent to EverTree. */
(async()=>{
  const list=document.getElementById('evertree-reviews');
  const text=(tag,value)=>{const element=document.createElement(tag);element.textContent=value;return element;};
  try {
    const response=await fetch('https://evertree.onetmediagroup.ca/api/reviews/public',{credentials:'omit'});
    if(!response.ok)throw new Error('Unavailable');
    const data=await response.json();list.replaceChildren();
    if(!data.reviews.length){list.append(text('p','Our first families are trying EverTree. Their approved feedback will appear here.'));return;}
    for(const review of data.reviews.slice(0,3)){
      const card=document.createElement('article');
      card.append(text('h3',review.display_name),text('p',review.rating+' out of 5 · Verified Tree owner · Test account'),text('p',review.body),text('small','Received 1 Seed for an honest review.'));
      list.append(card);
    }
  } catch {list.replaceChildren(text('p','Owner feedback is temporarily unavailable. You can still visit the reviews page below.'));}
})();
