'use strict';
const TagEditor=(()=>{
 let tags=[],known=[];
 const el=id=>document.getElementById(id);
 function paint(){
  for(const [id,items,remove] of [['selected-tags',tags,true],['suggested-tags',known.filter(t=>!tags.includes(t)).slice(0,16),false]]){
   el(id).replaceChildren(...items.map(t=>{const b=document.createElement('button');b.type='button';b.textContent=t+(remove?' ×':' +');b.setAttribute('aria-label',(remove?'Remove tag: ':'Add tag: ')+t);b.onclick=()=>{if(remove)tags=tags.filter(x=>x!==t);else add(t);paint();};return b;}));
  }
 }
 function add(text){const t=text.trim();if(!t)return; if(tags.some(x=>PlaceTools.normalize(x)===PlaceTools.normalize(t))){el('tag-input').value='';return;}if(tags.length>=12){el('tag-error').textContent='เพิ่มได้สูงสุด 12 แท็ก';return;}tags.push(t.slice(0,40));el('tag-input').value='';el('tag-error').textContent='';paint();}
 document.addEventListener('DOMContentLoaded',()=>{
  el('add-tag').onclick=()=>add(el('tag-input').value);
  el('tag-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();add(e.target.value);}});
 });
 return {reset(p,places){tags=[...(p?.tags||[])];known=[...new Set(places.flatMap(x=>x.tags||[]))];el('tag-input').value='';el('tag-error').textContent='';paint();},collect(){add(el('tag-input').value);if(el('tag-input').value.trim())throw Error('เพิ่มได้สูงสุด 12 แท็ก');return [...tags];}};
})();
