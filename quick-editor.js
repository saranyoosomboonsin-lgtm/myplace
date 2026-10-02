'use strict';
const QuickEditor=(()=>{
 let days=[],simpleMode=true,photo='',photoBusy=false,photoGeneration=0,parsed=null;
 const form=$('#place-form');
 function paint(){
  $('#quick-days').innerHTML=[1,2,3,4,5,6,0].map(i=>`<button type="button" data-quick-day="${i}" aria-pressed="${days.includes(i)}">${['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'][i]}</button>`).join('');
  $('#quick-times').hidden=!days.length;
  $('#quick-summary').textContent=!simpleMode?'ใช้ตารางเฉพาะวันด้านล่าง · เลือกวันด้านบนเพื่อเปลี่ยนเป็นเวลาเดียวกัน':days.length?`เปิด ${days.length} วัน · ใช้เวลาเดียวกันทุกวันที่เลือก`:'ยังไม่ทราบเวลา · บันทึกไว้ก่อนแล้วค่อยเติมได้';
 }
 function sync(strict=false){
  if(!simpleMode)return;
  try{scheduleDraft=PlaceTools.schedule(days,$('#quick-start').value,$('#quick-end').value);renderSchedule();}
  catch(e){if(strict)throw e;}
 }
 function showPhoto(){const img=$('#photo-preview');img.hidden=!photo;if(photo)img.src=photo;else img.removeAttribute('src');$('#remove-photo').hidden=!photo;}
 function mapSearch(){$('#search-maps').href=PlaceTools.mapLink({name:form.elements.name.value.trim(),area:form.elements.area.value.trim()});}
 function reset(p){
  photoGeneration++;photoBusy=false;photo=p?.photo||'';showPhoto();$('#place-photo').value='';$('#photo-status').textContent='';
  form.elements.mapsUrl.value=p?.mapsUrl||'';form.elements.lat.value=p?.location?.lat??'';form.elements.lng.value=p?.location?.lng??'';
  const s=PlaceTools.simple(scheduleDraft);simpleMode=Boolean(s);days=s?.days||[];$('#quick-start').value=s?.start||'';$('#quick-end').value=s?.end||'';
  $('#advanced-hours').open=!simpleMode;$('#optional-info').open=false;$('#hours-text').value='';$('#parse-result').textContent='';$('#apply-parsed').hidden=true;parsed=null;
  paint();mapSearch();
 }
 function collect(){
  if(photoBusy)throw Error('กำลังเตรียมรูป กรุณารอสักครู่');sync(true);
  const mapsUrl=form.elements.mapsUrl.value.trim();if(!PlaceTools.safeMaps(mapsUrl))throw Error('กรุณาวางลิงก์ https จากปุ่มแชร์ใน Google Maps');
  const lat=form.elements.lat.value,lng=form.elements.lng.value;
  if(Boolean(lat)!==Boolean(lng))throw Error('กรอกทั้งละติจูดและลองจิจูด หรือเว้นทั้งคู่');
  const location=lat!==''?{lat:Number(lat),lng:Number(lng)}:null;
  const extras={mapsUrl,location,photo};if(!PlaceTools.validExtras(extras))throw Error('รูปหรือพิกัดไม่ถูกต้อง');return extras;
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-preset')){simpleMode=true;days=({all:[0,1,2,3,4,5,6],weekdays:[1,2,3,4,5],weekend:[0,6],unknown:[]})[b.dataset.preset];sync();paint();}
  if(b.hasAttribute('data-quick-day')){simpleMode=true;const day=Number(b.dataset.quickDay);days=days.includes(day)?days.filter(d=>d!==day):[...days,day];sync();paint();}
 });
 for(const id of ['#quick-start','#quick-end'])$(id).addEventListener('input',()=>{simpleMode=true;sync();paint();});
 $('#advanced-hours').addEventListener('toggle',()=>{if($('#advanced-hours').open)sync();});
 $('#schedule-editor').addEventListener('input',()=>{simpleMode=false;paint();});
 $('#schedule-editor').addEventListener('change',()=>{simpleMode=false;paint();});
 // Capture before the main click handler rebuilds the interval controls.
 $('#schedule-editor').addEventListener('click',e=>{if(e.target.closest('button')){simpleMode=false;paint();}},true);
 form.elements.name.addEventListener('input',mapSearch);form.elements.area.addEventListener('input',mapSearch);
 $('#parse-hours').addEventListener('click',()=>{
  parsed=null;$('#apply-parsed').hidden=true;
  try{parsed=PlaceTools.parse($('#hours-text').value);const s=PlaceTools.simple(parsed);$('#parse-result').textContent=`เปิด ${s.days.map(d=>DAYS[d]).join(', ')} เวลา ${s.start}–${s.end}${s.end<s.start?' (ปิดวันถัดไป)':''} · วันอื่นหยุด`;$('#apply-parsed').hidden=false;}
  catch(e){$('#parse-result').textContent=e.message+' — ยังไม่ได้เปลี่ยนตารางเดิม';}
 });
 $('#apply-parsed').addEventListener('click',()=>{if(!parsed)return;scheduleDraft=structuredClone(parsed);const s=PlaceTools.simple(parsed);days=s.days;simpleMode=true;$('#quick-start').value=s.start;$('#quick-end').value=s.end;renderSchedule();paint();$('#parse-result').textContent='ใช้ตารางนี้แล้ว ตรวจได้ในเวลารายวัน';$('#apply-parsed').hidden=true;});
 $('#remove-photo').addEventListener('click',()=>{photoGeneration++;photoBusy=false;photo='';$('#place-photo').value='';$('#photo-status').textContent='';showPhoto();});
 $('#editor').addEventListener('close',()=>{photoGeneration++;photoBusy=false;});
 $('#place-photo').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;const generation=++photoGeneration;photoBusy=true;$('#photo-status').textContent='กำลังย่อรูป…';
  let objectUrl;
  try{
   if(file.size>25*1024*1024)throw Error('เลือกรูปขนาดไม่เกิน 25 MB');
   if(!file.type.startsWith('image/'))throw Error('กรุณาเลือกไฟล์รูปภาพ');
   objectUrl=URL.createObjectURL(file);const img=new Image();img.src=objectUrl;await img.decode();
   let size=Math.min(960,Math.max(img.naturalWidth,img.naturalHeight)),result='';
   while(size>=240){
    const scale=size/Math.max(img.naturalWidth,img.naturalHeight),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    for(const quality of [.8,.65,.5,.35]){result=canvas.toDataURL('image/jpeg',quality);if(result.length<=180000)break;}
    if(result.length<=180000)break;size=Math.floor(size*.75);
   }
   // Small originals also need encoding.
   if(!result){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);result=c.toDataURL('image/jpeg',.8);}
   if(!PlaceTools.validExtras({photo:result}))throw Error('รูปนี้ยังใหญ่เกินไป กรุณาเลือกรูปอื่น');
   if(generation!==photoGeneration)return;photo=result;showPhoto();$('#photo-status').textContent='รูปพร้อมแล้ว · กดบันทึกสถานที่เพื่ออัปโหลด';
  }catch(e){if(generation===photoGeneration)$('#photo-status').textContent=e.message==='The source image cannot be decoded.'?'อ่านรูปไม่ได้ ลองเลือก JPEG/PNG หรือภาพหน้าจอ':e.message;}
  finally{if(objectUrl)URL.revokeObjectURL(objectUrl);if(generation===photoGeneration)photoBusy=false;e.target.value='';}
 });
 return {reset,collect};
})();
