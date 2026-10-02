'use strict';
const PlaceTools=(()=>{
 const time=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
 const unknown=()=>Array.from({length:7},()=>({mode:'unknown',slots:[]}));
 function schedule(days,start,end){
  if(!days.length)return unknown();
  if(!start&&!end)return Array.from({length:7},(_,i)=>({mode:days.includes(i)?'unknown':'closed',slots:[]}));
  if(!time(start)||!time(end)||start===end)throw Error('ใส่เวลาเปิดและปิดให้ครบ และไม่ใช้เวลาเดียวกัน');
  return Array.from({length:7},(_,i)=>days.includes(i)?{mode:'open',slots:[[start,end]]}:{mode:'closed',slots:[]});
 }
 function simple(existing){
  if(existing.every(d=>d.mode==='unknown'))return {days:[],start:'',end:''};
  if(existing.some(d=>d.mode==='unknown')&&existing.every(d=>d.mode==='unknown'||d.mode==='closed'))return {days:existing.flatMap((d,i)=>d.mode==='unknown'?[i]:[]),start:'',end:''};
  const active=existing.filter(d=>d.mode==='open');
  if(!active.length||existing.some(d=>d.mode==='unknown')||active.some(d=>d.slots.length!==1||JSON.stringify(d.slots)!==JSON.stringify(active[0].slots)))return null;
  return {days:existing.flatMap((d,i)=>d.mode==='open'?[i]:[]),start:active[0].slots[0][0],end:active[0].slots[0][1]};
 }
 function safeMaps(value){
  if(!value)return true;
  if(typeof value!=='string'||value.length>2048)return false;
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&((['google.com','www.google.com','maps.google.com','google.co.th','www.google.co.th'].includes(u.hostname)&&(u.pathname==='/maps'||u.pathname.startsWith('/maps/')))||u.hostname==='maps.app.goo.gl'||(u.hostname==='goo.gl'&&u.pathname.startsWith('/maps/')));}catch{return false;}
 }
 function validExtras(p){
  return (p.photo===undefined||(typeof p.photo==='string'&&(p.photo===''||(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.photo)&&p.photo.length<=180000))))&&
   (p.mapsUrl===undefined||safeMaps(p.mapsUrl))&&
   (p.location===undefined||p.location===null||(typeof p.location==='object'&&Number.isFinite(p.location.lat)&&Number.isFinite(p.location.lng)&&Math.abs(p.location.lat)<=90&&Math.abs(p.location.lng)<=180));
 }
 function mapLink(p){return p.mapsUrl&&safeMaps(p.mapsUrl)?p.mapsUrl:p.location?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.location.lat+','+p.location.lng)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+' '+p.area)}`;}
 const dayNames=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
 const aliases={'อา.':'อาทิตย์','จ.':'จันทร์','อ.':'อังคาร','พ.':'พุธ','พฤ.':'พฤหัสบดี','ศ.':'ศุกร์','ส.':'เสาร์'};
 function daysFrom(text){
  text=text.replace(/วัน/g,'').trim();if(text==='ทุก')return [0,1,2,3,4,5,6];
  for(const [short,full] of Object.entries(aliases))text=text.split(short).join(full);
  if(text==='จันทร์ถึงศุกร์')text='จันทร์-ศุกร์';
  const range=text.split(/\s*(?:-|ถึง)\s*/);if(range.length===2){const a=dayNames.indexOf(range[0]),b=dayNames.indexOf(range[1]);if(a<0||b<0)throw Error('ไม่รู้จักช่วงวัน');const days=[a];while(days.at(-1)!==b)days.push((days.at(-1)+1)%7);return days;}
  const result=text.split(/[\s,、]+/).filter(Boolean).map(s=>dayNames.indexOf(s));if(!result.length||result.some(i=>i<0))throw Error('ไม่รู้จักชื่อวัน');return [...new Set(result)];
 }
 function parse(text){
  text=text.trim().replace(/[–—]/g,'-');
  const m=text.match(/^(.+?)\s+(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})(?:\s*น\.?)?(?:\s+หยุด\s*(.+))?$/);
  if(!m)throw Error('ลองรูปแบบ: ทุกวัน 16:00–21:00 หยุดอาทิตย์');
  let days=daysFrom(m[1]);if(m[4]){const closed=daysFrom(m[4]);days=days.filter(d=>!closed.includes(d));}
  if(!days.length)throw Error('ข้อความนี้ไม่มีวันที่เปิด');
  return schedule(days,m[2].replace('.',':').padStart(5,'0'),m[3].replace('.',':').padStart(5,'0'));
 }
 return {schedule,simple,unknown,safeMaps,validExtras,mapLink,parse};
})();
