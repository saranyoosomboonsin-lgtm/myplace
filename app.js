'use strict';
const DAYS=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const CATEGORIES=['ร้านอาหาร','ตลาด / ซื้อของ','คลินิก / สุขภาพ','ท่องเที่ยว','อื่น ๆ'];
const ICONS=['food','bag','health','sun','pin'];
const PATHS={user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',plus:'<path d="M12 5v14M5 12h14"/>',archive:'<rect x="3" y="3" width="18" height="5" rx="1.5"/><path d="M5 8v12h14V8M10 12h4"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',food:'<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M17 21V3c-3 2-4 5-4 9h4"/>',bag:'<rect x="4" y="7" width="16" height="14" rx="3"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',health:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 5V3h8v2M12 10v6M9 13h6"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]||PATHS.pin}</svg>`;
const RATINGS=['ยังไม่ได้ให้คะแนน','ไม่อยากกลับไป','ไม่ค่อยถูกใจ','เฉย ๆ','ชอบ','♥ ชอบมาก อยากกลับไปอีก'];
const KEY='myplace.v1';
// randomUUID requires HTTPS; LAN previews on iPhone may use HTTP.
const newId=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3));
function thaiNow(date=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Bangkok',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));
 return {day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),minute:Number(p.hour)*60+Number(p.minute)};
}
function statusOf(place,now=thaiNow()){
 const today=place.schedule[now.day],yesterday=place.schedule[(now.day+6)%7];
 for(const t of yesterday.slots){if(yesterday.mode==='open'&&minutes(t[1])<minutes(t[0])&&now.minute<minutes(t[1]))return {kind:'open',label:'เปิดตอนนี้',detail:`เปิดถึง ${t[1]} น. (ต่อจากเมื่อวาน)`};}
 if(today.mode==='open')for(const t of today.slots){const a=minutes(t[0]),b=minutes(t[1]);if(now.minute>=a&&(b<a||now.minute<b))return {kind:'open',label:'เปิดตอนนี้',detail:`เปิดถึง ${t[1]} น.${b<a?' วันถัดไป':''}`};}
 if(today.mode==='unknown')return {kind:'unknown',label:'ยังไม่ระบุเวลา',detail:'เพิ่มตารางเวลา เพื่อเช็กก่อนออกเดินทาง'};
 const future=[];
 for(let offset=0;offset<8;offset++){const d=place.schedule[(now.day+offset)%7];if(d.mode==='open')for(const t of d.slots){if(offset||minutes(t[0])>now.minute)future.push({offset,time:t[0]});}}
 future.sort((a,b)=>a.offset-b.offset||minutes(a.time)-minutes(b.time));
 const n=future[0];
 return {kind:'closed',label:today.mode==='closed'?'วันนี้หยุด':'ปิดตอนนี้',detail:n?`เปิดครั้งถัดไปตามตาราง: ${n.offset===0?'วันนี้':n.offset===1?'พรุ่งนี้':'วัน'+DAYS[(now.day+n.offset)%7]} ${n.time} น.`:'ยังไม่มีเวลาเปิดครั้งถัดไปในตาราง'};
}
function validPlace(p){
 const time=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
 return p&&PlaceTools.validExtras(p)&&typeof p.id==='string'&&p.id.length>0&&p.id.length<100&&!p.id.includes('/')&&p.id!=='.'&&p.id!=='..'&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=100&&CATEGORIES.includes(p.category)&&Number.isInteger(p.rating)&&p.rating>=0&&p.rating<=5&&typeof p.area==='string'&&p.area.length<=200&&typeof p.note==='string'&&p.note.length<=2000&&typeof p.updated==='string'&&Number.isFinite(Date.parse(p.updated))&&Array.isArray(p.schedule)&&p.schedule.length===7&&p.schedule.every(d=>d&&['open','closed','unknown'].includes(d.mode)&&Array.isArray(d.slots)&&d.slots.length<=8&&(d.mode!=='open'||d.slots.length>0)&&d.slots.every(t=>Array.isArray(t)&&t.length===2&&t.every(time)&&t[0]!==t[1]));
}
let places=[],category='ทั้งหมด',scheduleDraft=[],storageBlocked=false,view='all';
const cloudMode=window.MYPLACE_CLOUD===true; let cloudReady=false;
function requireCloud(){if(!cloudReady||!window.myplaceCloud)throw Error('กรุณาเข้าสู่ระบบและรอให้โหลดข้อมูลก่อน');return window.myplaceCloud;}
if(!cloudMode)try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||!parsed.every(validPlace))throw Error();places=parsed;}}catch{storageBlocked=true;}
function save(next){if(storageBlocked)throw Error('อ่านข้อมูลเดิมไม่ได้ กรุณาสำรองข้อมูลเบราว์เซอร์ก่อนใช้งานต่อ');try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw Error('บันทึกไม่สำเร็จ พื้นที่อาจเต็มหรือเบราว์เซอร์ไม่อนุญาตให้เก็บข้อมูล');}places=next;render();}
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',3500);}
function render(){
 const now=thaiNow();
 $('#account-page').hidden=view!=='account';$('#list-page').hidden=view==='account';$('#local-account').hidden=cloudMode;
 $('#page-name').textContent=({all:'ทั้งหมด',favorites:'ที่ที่ชอบ',open:'เปิดตอนนี้',account:'บัญชี'})[view];
 $('#filters').innerHTML=['ทั้งหมด',...CATEGORIES].map((c,i)=>`<button class="chip ${category===c?'active':''}" aria-pressed="${category===c}" data-category="${escapeHTML(c)}">${icon(i===0?'grid':ICONS[i-1])}${c}</button>`).join('');
 document.querySelectorAll('.nav-item[data-view]').forEach(b=>{const selected=b.dataset.view===view;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
 $('#list-title').textContent=view==='favorites'?'ที่ที่อยากกลับไป':view==='open'?'พร้อมให้แวะไป':'สถานที่ของฉัน';
 const q=$('#search').value.trim().toLocaleLowerCase();
 const filtered=places.filter(p=>(view!=='favorites'||p.rating>=4)&&(category==='ทั้งหมด'||p.category===category)&&(!(view==='open'||$('#only-open').checked)||statusOf(p,now).kind==='open')&&[p.name,p.area,p.note].some(s=>s.toLocaleLowerCase().includes(q)));
 $('#result-count').textContent=filtered.length;
 const accents=[['#fff1e5','#b48152'],['#edf6ef','#6e9275'],['#eaf3ff','#6894b6'],['#fff5da','#b79745'],['#f1eaff','#9570bc']];
 $('#places').innerHTML=filtered.map(p=>{
  const s=statusOf(p,now),idx=CATEGORIES.indexOf(p.category),[tint,accent]=accents[idx];
  return `<article class="card" style="--tint:${tint};--accent:${accent}">
   ${p.photo?`<img class="place-photo" src="${p.photo}" alt="${escapeHTML(p.name)}" loading="lazy">`:''}<div class="card-top"><div class="place-icon">${icon(ICONS[idx])}</div><div class="card-title"><div class="category">${p.category}</div><h3>${escapeHTML(p.name)}</h3></div><button class="favorite ${p.rating>=4?'selected':''}" data-favorite="${escapeHTML(p.id)}" aria-pressed="${p.rating>=4}" aria-label="${p.rating>=4?'เลิกชอบ':'ชอบ'} ${escapeHTML(p.name)}">${icon('heart')}</button><button class="edit" data-edit="${escapeHTML(p.id)}" aria-label="แก้ไข ${escapeHTML(p.name)}">${icon('edit')}</button></div>
   <div class="card-body">${p.area?`<p class="area">${icon('pin')}${escapeHTML(p.area)}</p>`:''}
   <a class="map-link" href="${escapeHTML(PlaceTools.mapLink(p))}" target="_blank" rel="noopener noreferrer">${icon('pin')}${p.mapsUrl||p.location?'เปิดตำแหน่งใน Google Maps':'ค้นหาสถานที่ใน Google Maps'}</a><div class="status-line"><span class="status ${s.kind}">${s.label}</span>${p.rating?`<span class="mini-rating" aria-label="ความรู้สึก: ${RATINGS[p.rating]}">${icon(p.rating>=4?'heart':'star')}${p.rating}/5</span>`:''}</div>
   <div class="next">${s.detail}</div>${s.kind==='unknown'?`<button class="text-button" data-hours="${escapeHTML(p.id)}">＋ เพิ่มเวลาเปิด–ปิด</button>`:''}
   ${p.note?`<p class="note"><span class="note-mark">บันทึกถึงตัวเอง</span>${escapeHTML(p.note)}</p>`:''}
   <details><summary>${icon('clock')} เวลาเปิด–ปิดทั้งสัปดาห์</summary>${p.schedule.map((d,i)=>`<div class="hours-row ${i===now.day?'current':''}"><span>${DAYS[i]}${i===now.day?' · วันนี้':''}</span><span>${d.mode==='closed'?'หยุด':d.mode==='unknown'?'ยังไม่ทราบ':d.slots.map(t=>`${t[0]}–${t[1]}${minutes(t[1])<minutes(t[0])?' (+1 วัน)':''}`).join('<br>')}</span></div>`).join('')}<div class="updated">แก้ไขล่าสุด ${new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium'}).format(new Date(p.updated))}</div></details></div>
  </article>`;
 }).join('')||`<section class="empty"><div class="empty-symbol">${icon(view==='favorites'?'heart':'pin')}</div><h2>${places.length?(view==='favorites'?'ยังไม่มีที่ที่ชอบ':'ยังไม่พบสถานที่'):'ความทรงจำแรก เริ่มที่นี่'}</h2><p>${places.length?(view==='favorites'?'สถานที่ที่ให้ความรู้สึก “ชอบ” หรือ “ชอบมาก” จะมาอยู่ตรงนี้':'ลองเปลี่ยนหมวดหมู่ คำค้น หรือเวลาเปิดดูนะ'):'เก็บร้านโปรด คลินิกประจำ หรือตลาดใกล้บ้าน ไว้เช็กก่อนไปครั้งหน้า'}</p><button class="primary" ${places.length?'id="clear-filters"':'data-add'}>${icon(places.length?'grid':'plus')}${places.length?'ดูสถานที่ทั้งหมด':'เพิ่มสถานที่แรก'}</button></section>`;
}

function renderSchedule(){
 $('#schedule-editor').innerHTML=scheduleDraft.map((d,i)=>`<div class="day-edit"><div class="day-head"><label for="day-${i}">วัน${DAYS[i]}</label><select id="day-${i}" data-day="${i}">${[['unknown','ไม่ทราบ'],['closed','หยุด'],['open','เปิด']].map(([v,l])=>`<option value="${v}" ${d.mode===v?'selected':''}>${l}</option>`).join('')}</select></div>${d.mode==='open'?d.slots.map((t,j)=>`<div class="interval"><input type="time" required value="${t[0]}" data-time="${i},${j},0" aria-label="เวลาเปิดวัน${DAYS[i]} ช่วง ${j+1}"><span>ถึง</span><input type="time" required value="${t[1]}" data-time="${i},${j},1" aria-label="เวลาปิดวัน${DAYS[i]} ช่วง ${j+1}">${d.slots.length>1?`<button type="button" class="remove-time" data-remove="${i},${j}" aria-label="ลบช่วงเวลา">×</button>`:''}</div>`).join('')+ (d.slots.length<8?`<button type="button" class="add-time" data-slot="${i}">＋ เพิ่มช่วงเวลา</button>`:''):''}</div>`).join('');
}
let editorScroll=0;
function openEditor(id){
 editorScroll=window.scrollY;
 if(cloudMode&&!cloudReady){navigate('account');toast('กรุณาเข้าสู่ระบบและรอให้เชื่อมต่อคลาวด์ก่อน');return;}
 const p=places.find(x=>x.id===id),f=$('#place-form');f.reset();$('#form-error').textContent='';
 for(const name of ['id','name','category','rating','area','note'])f.elements[name].value=p?p[name]:({category:'อื่น ๆ',rating:0}[name]??'');
 scheduleDraft=p?structuredClone(p.schedule):DAYS.map(()=>({mode:'unknown',slots:[]}));renderSchedule();$('#editor-title').textContent=p?'แก้ไขสถานที่':'เพิ่มสถานที่';$('#delete-place').hidden=!p;QuickEditor.reset(p);$('#note-details').open=Boolean(p?.note);$('#editor').showModal();
}
const pageFilters={};
function navigate(next,historyChange=true){
 if(!['all','favorites','open','account'].includes(next))next='all';
 pageFilters[view]={category,query:$('#search').value,onlyOpen:$('#only-open').checked};
 view=next;const state=pageFilters[next]||{category:'ทั้งหมด',query:'',onlyOpen:next==='open'};
 category=state.category;$('#search').value=state.query;$('#only-open').checked=state.onlyOpen;
 if(historyChange&&location.hash!=='#'+next)history.pushState(null,'','#'+next);
 render();window.scrollTo({top:0,behavior:'instant'});
}
window.addEventListener('popstate',()=>navigate(location.hash.slice(1)||'all',false));
$('#editor').addEventListener('close',()=>window.scrollTo({top:editorScroll,behavior:'instant'}));
let favoriteBusy=false;
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-hours')){openEditor(b.dataset.hours);if($('#editor').open){$('#hours-details').open=true;$('#hours-details').scrollIntoView({block:'start'});}}
 if(!b.hasAttribute('data-favorite')||favoriteBusy)return;
 const p=places.find(x=>x.id===b.dataset.favorite);if(!p)return;
 favoriteBusy=true;b.disabled=true;
 try{const next={...p,rating:p.rating>=4?0:5,updated:new Date().toISOString()};if(cloudMode)await requireCloud().put(next);else save(places.map(x=>x.id===p.id?next:x));toast(next.rating?'เพิ่มในที่ที่ชอบแล้ว':'นำออกจากที่ที่ชอบแล้ว');}
 catch(err){toast(err.message);}finally{favoriteBusy=false;b.disabled=false;}
});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-add'))openEditor();
 if(b.hasAttribute('data-edit'))openEditor(b.dataset.edit);
 if(b.hasAttribute('data-category')){category=b.dataset.category;render();}
 if(b.hasAttribute('data-view'))navigate(b.dataset.view);
 if(b.hasAttribute('data-backup')){$('#backup-error').textContent='';$('#backup').showModal();}
 if(b.hasAttribute('data-close'))b.closest('dialog').close();
 if(b.hasAttribute('data-slot')){scheduleDraft[Number(b.dataset.slot)].slots.push(['09:00','18:00']);renderSchedule();}
 if(b.hasAttribute('data-remove')){const [i,j]=b.dataset.remove.split(',').map(Number);scheduleDraft[i].slots.splice(j,1);renderSchedule();}
 if(b.id==='clear-filters'){view='all';category='ทั้งหมด';$('#search').value='';$('#only-open').checked=false;render();}
});
$('#schedule-editor').addEventListener('change',e=>{if(e.target.hasAttribute('data-day')){const d=scheduleDraft[Number(e.target.dataset.day)];d.mode=e.target.value;d.slots=d.mode==='open'?(d.slots.length?d.slots:[['09:00','18:00']]):[];renderSchedule();}});
$('#schedule-editor').addEventListener('input',e=>{if(e.target.hasAttribute('data-time')){const [i,j,k]=e.target.dataset.time.split(',').map(Number);scheduleDraft[i].slots[j][k]=e.target.value;}});
$('#search').addEventListener('input',render);$('#only-open').addEventListener('change',()=>{if(view==='open'&&!$('#only-open').checked)view='all';render();});
$('#place-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;let extras;try{extras=QuickEditor.collect();}catch(err){$('#form-error').textContent=err.message;return;}const p={...extras,id:f.elements.id.value||newId(),name:f.elements.name.value.trim(),category:f.elements.category.value,rating:Number(f.elements.rating.value),area:f.elements.area.value.trim(),note:f.elements.note.value.trim(),schedule:structuredClone(scheduleDraft),updated:new Date().toISOString()};if(!validPlace(p)){$('#form-error').textContent='กรุณาระบุชื่อและเวลาให้ครบ เวลาเปิดและปิดต้องไม่เท่ากัน';return;}try{if(cloudMode)await requireCloud().put(p);else save([...places.filter(x=>x.id!==p.id),p]);$('#editor').close();toast('บันทึกสถานที่แล้ว');}catch(err){$('#form-error').textContent=err.message;}});
$('#delete-place').addEventListener('click',()=>$('#delete-confirm').showModal());
$('#confirm-delete').addEventListener('click',async()=>{const id=$('#place-form').elements.id.value;try{if(cloudMode)await requireCloud().remove(id);else save(places.filter(p=>p.id!==id));$('#delete-confirm').close();$('#editor').close();toast('ลบสถานที่แล้ว');}catch(err){$('#delete-confirm').close();$('#form-error').textContent=err.message;}});

$('#export').addEventListener('click',()=>{if(storageBlocked){$('#backup-error').textContent='ไม่สามารถอ่านข้อมูลเดิม จึงยังส่งออกไม่ได้';return;}const blob=new Blob([JSON.stringify({version:1,places},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`myplace-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('สร้างไฟล์สำรองแล้ว');});
$('#import').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>50_000_000)throw Error('ไฟล์ใหญ่เกิน 50 MB');const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.places)||!data.places.every(validPlace)||new Set(data.places.map(p=>p.id)).size!==data.places.length)throw Error('รูปแบบไฟล์สำรองไม่ถูกต้อง');if(!confirm(`นำเข้า ${data.places.length} สถานที่? รายการรหัสเดียวกันจะถูกแทนที่`))return;const merged=new Map(places.map(p=>[p.id,p]));data.places.forEach(p=>merged.set(p.id,p));if(cloudMode)await requireCloud().import(data.places);else save([...merged.values()]);$('#backup').close();toast('นำเข้าข้อมูลแล้ว');}catch(err){$('#backup-error').textContent=err instanceof SyntaxError?'อ่านไฟล์ไม่ได้ กรุณาเลือกไฟล์สำรอง MyPlace':err.message;}finally{e.target.value='';}});
setInterval(()=>{if(!document.querySelector('dialog[open]')&&!document.querySelector('details[open]'))render();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
window.addEventListener('myplace-cloud',e=>{
 cloudReady=e.detail.ready;
 places=e.detail.places.filter(validPlace);
 if(places.length!==e.detail.places.length)toast('บางรายการมีรูปแบบไม่ถูกต้อง จึงยังแสดงไม่ได้');
 render();
});
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
navigate(location.hash.slice(1)||'all',false);if(storageBlocked)toast('อ่านข้อมูลเดิมไม่ได้ กรุณาอย่าล้างข้อมูลเบราว์เซอร์');
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'list_saved_places',description:'Read saved personal places and their current status based on recorded Bangkok opening hours.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('Expected empty object');return {places:places.map(p=>({...p,status:statusOf(p)}))};}})).catch(()=>{});}catch{}}


// Theme is a device preference; changing it does not write place data.
const themeMedia=matchMedia('(prefers-color-scheme: dark)');
let themePreference='system';try{themePreference=localStorage.getItem('myplace.theme')||'system';}catch{}
if(!['system','light','dark'].includes(themePreference))themePreference='system';
function applyTheme(){const dark=themePreference==='dark'||(themePreference==='system'&&themeMedia.matches);document.documentElement.dataset.theme=dark?'dark':'light';document.querySelector('meta[name="theme-color"]').content=dark?'#17141f':'#f7f6fb';$('#theme-choice').value=themePreference;}
$('#theme-choice').addEventListener('change',e=>{themePreference=e.target.value;try{localStorage.setItem('myplace.theme',themePreference);}catch{}applyTheme();});
themeMedia.addEventListener('change',applyTheme);applyTheme();
