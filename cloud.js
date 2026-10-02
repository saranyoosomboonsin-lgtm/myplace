const panel = document.querySelector('#cloud-panel');
const status = document.querySelector('#cloud-status');
const form = document.querySelector('#login-form');
const error = document.querySelector('#login-error');
const logout = document.querySelector('#logout');
const message = e => ({
 'auth/invalid-credential':'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
 'auth/user-not-found':'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
 'auth/wrong-password':'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
 'auth/too-many-requests':'ลองหลายครั้งเกินไป กรุณารอสักครู่',
 'auth/network-request-failed':'เชื่อมต่อไม่ได้ กรุณาตรวจอินเทอร์เน็ต',
 'permission-denied':'ไม่มีสิทธิ์เข้าถึงข้อมูล ตรวจ Firestore Rules และ UID ของบัญชี',
 'auth/operation-not-allowed':'กรุณาเปิด Email/Password ใน Firebase Authentication'
}[e.code] || `เชื่อมต่อไม่สำเร็จ (${e.code || e.message})`);
const publish = (places=[],ready=false) => window.dispatchEvent(new CustomEvent('myplace-cloud',{detail:{places,ready}}));
if (!window.MYPLACE_CLOUD) panel.hidden=true;
else if (!window.FIREBASE_CONFIG?.apiKey || !window.FIREBASE_CONFIG?.projectId) {
 status.textContent='ตั้งค่า Firebase ในไฟล์ firebase-config.js เพื่อเริ่มซิงก์';
 form.hidden=true;
} else {
 try {
  status.textContent='กำลังเชื่อมต่อ…';
  const [appSDK,authSDK,dbSDK]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
  ]);
  const app=appSDK.initializeApp(window.FIREBASE_CONFIG);
  const auth=authSDK.getAuth(app), db=dbSDK.getFirestore(app);
  // Memory cache avoids retaining another account's places on a shared device.
  let current=null,ready=false,stop=null,writing=false,epoch=0;
  const collectionFor = uid => dbSDK.collection(db,'users',uid,'places');
  const updateConnection=()=>{if(current)status.textContent=navigator.onLine?(ready?'ซิงก์เรียลไทม์ · '+current.email:'กำลังโหลดข้อมูล…'):'ออฟไลน์ · เชื่อมต่ออินเทอร์เน็ตเพื่อบันทึก';};
  window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);
  async function write(action){
   if(!current||!ready)throw Error('กรุณาเข้าสู่ระบบและรอโหลดข้อมูลให้เสร็จ');
   if(!navigator.onLine)throw Error('กรุณาเชื่อมต่ออินเทอร์เน็ตก่อนบันทึก');
   if(writing)throw Error('กำลังบันทึก กรุณารอสักครู่');
   writing=true;logout.disabled=true;status.textContent='กำลังบันทึกขึ้นคลาวด์…';
   try{await action(current.uid);}catch(e){throw Error(message(e));}
   finally{writing=false;logout.disabled=false;updateConnection();}
  }
  window.myplaceCloud={
   put:p=>write(uid=>dbSDK.setDoc(dbSDK.doc(collectionFor(uid),p.id),p)),
   remove:id=>write(uid=>dbSDK.deleteDoc(dbSDK.doc(collectionFor(uid),id))),
   import:items=>write(async uid=>{
    if(items.length>400)throw Error('นำเข้าได้ครั้งละไม่เกิน 400 สถานที่');
    if(new TextEncoder().encode(JSON.stringify(items)).length>7_000_000)throw Error('รูปในไฟล์สำรองรวมกันใหญ่เกิน 7 MB กรุณาแบ่งรายการก่อนนำเข้า');
    const batch=dbSDK.writeBatch(db);
    items.forEach(p=>batch.set(dbSDK.doc(collectionFor(uid),p.id),p));
    await batch.commit();
   })
  };
  authSDK.onAuthStateChanged(auth,user=>{
   const generation=++epoch;if(stop)stop();ready=false;current=user;publish();
   document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   form.hidden=Boolean(user);logout.hidden=!user;
   if(!user){status.textContent='เข้าสู่ระบบบัญชีเดียวกัน เพื่อซิงก์ทุกเครื่อง';return;}
   updateConnection();
   stop=dbSDK.onSnapshot(collectionFor(user.uid),{includeMetadataChanges:true},snapshot=>{
    if(generation!==epoch)return;
    ready=!snapshot.metadata.fromCache;
    const items=snapshot.docs.map(d=>({...d.data(),id:d.id}));
    publish(items,ready);
    if(snapshot.metadata.hasPendingWrites)status.textContent='กำลังบันทึกขึ้นคลาวด์…';else updateConnection();
   },e=>{if(generation!==epoch)return;ready=false;publish();status.textContent=message(e);});
  });
  form.addEventListener('submit',async e=>{
   e.preventDefault();error.textContent='';const button=form.querySelector('button');button.disabled=true;
   try{await authSDK.signInWithEmailAndPassword(auth,form.elements.email.value.trim(),form.elements.password.value);form.elements.password.value='';}
   catch(e){error.textContent=message(e);}finally{button.disabled=false;}
  });
  logout.addEventListener('click',async()=>{if(writing)return;try{await authSDK.signOut(auth);}catch(e){status.textContent=message(e);}});
 }catch(e){status.textContent=message(e);form.hidden=true;}
}
