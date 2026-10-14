import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendEmailVerification, sendPasswordResetEmail, updateProfile, reload, getIdToken } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, query, where, runTransaction,
  updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const el=document.getElementById('app'),toast=document.getElementById('toast');
let lang=localStorage.getItem('corp-language')==='ru'?'ru':'ka', screen='login', user=null,
    profile=null, isChair=false, application=null, membership=null, requests=[],members=[],units=[],
    profileCache=new Map(),working=false,editingUnit=1;
const dict={
ka:{
  pending:'მოლოდინში',approved:'დადასტურებულია',rejected:'უარყოფილია',owner:'მესაკუთრე',resident:'მაცხოვრებელი',
  intro:'კორპუსის დაცული მართვა',address:'ხაშური · რუსთაველის 16 · 60 ბინა',
  notConnected:'მონაცემთა ბაზა ჯერ არ არის დაკავშირებული',notReady:'ეს არის Firebase Spark-ისთვის მომზადებული უსაფრთხო ვერსია. რეალურ მონაცემებს ვერ შევიტანთ, სანამ ცალკე უფასო სერვერს არ დავუკავშირებთ.',
  login:'შესვლა',signup:'რეგისტრაცია',email:'ელფოსტა',password:'პაროლი',first:'სახელი',last:'გვარი',phone:'ტელეფონი',forgot:'პაროლი დაგავიწყდათ?',sendReset:'აღდგენის ბმულის გაგზავნა',resetSent:'თუ ასეთი ანგარიში არსებობს, ელფოსტაზე მიიღებთ აღდგენის ბმულს.',back:'უკან',passwordHint:'გამოიყენეთ არანაკლებ 12 სიმბოლოიანი პაროლი.',
  register:'ანგარიშის შექმნა',sendVerify:'დადასტურების წერილის გაგზავნა',verifyInfo:'დაადასტურეთ ელფოსტის მისამართი. შემდეგ დააჭირეთ „განახლებას“.',verifySent:'დადასტურების წერილი გაიგზავნა. შეამოწმეთ ელფოსტა.',refresh:'განახლება',logout:'გასვლა',account:'ჩემი პროფილი',
  application:'ბინაზე წვდომის განაცხადი',entrance:'სადარბაზო',floor:'სართული',apartment:'ბინა',relation:'მობინადრის ტიპი',apply:'განაცხადის გაგზავნა',waiting:'თქვენი განაცხადი თავმჯდომარის გადაწყვეტილებას ელოდება.',rejectedMsg:'განაცხადი უარყოფილია. შეგიძლიათ გააგზავნოთ ახალი.',approvedMsg:'თქვენი ბინა დამტკიცებულია.',reapply:'ახალი განაცხადი',pendingRequests:'დასადასტურებელი განაცხადები',chair:'თავმჯდომარე',approve:'დადასტურება',reject:'უარყოფა',confirmApprove:'დავადასტუროთ ეს განაცხადი?',confirmReject:'უარვყოთ განაცხადი?',directory:'მცხოვრებთა ბაზა',noRecords:'ჩანაწერები არ არის',search:'ძებნა სახელით, გვარით, ბინით ან ტელეფონით',private:'მცხოვრებთა ტელეფონები ხელმისაწვდომია მხოლოდ თავმჯდომარისთვის.',unitMap:'ბინების სქემა',unitSave:'შენახვა',unknown:'დაუდგენელია',alreadyAssigned:'ეს ბინა სხვა სადარბაზოში ან სართულზეა. შეამოწმეთ სქემა.',confirmUnit:'შევცვალოთ ბინის მდებარეობა?',saved:'შენახულია',failed:'ოპერაცია ვერ შესრულდა',
  noFinance:'ფინანსები, სარემონტო განაცხადები და კენჭისყრა დაემატება შემდეგ ეტაპზე.'
},
ru:{
  pending:'Ожидает',approved:'Одобрена',rejected:'Отклонена',owner:'Собственник',resident:'Житель',
  intro:'Защищённое управление корпусом',address:'Хашури · Руставели 16 · 60 квартир',
  notConnected:'База данных ещё не подключена',notReady:'Это версия, подготовленная для Firebase Spark. Реальные данные вводить нельзя, пока мы не подключим отдельный бесплатный сервер.',
  login:'Войти',signup:'Регистрация',email:'Электронная почта',password:'Пароль',first:'Имя',last:'Фамилия',phone:'Телефон',forgot:'Забыли пароль?',sendReset:'Отправить ссылку для восстановления',resetSent:'Если аккаунт существует, ссылка для восстановления отправлена на почту.',back:'Назад',passwordHint:'Используй пароль длиной не менее 12 символов.',
  register:'Создать аккаунт',sendVerify:'Отправить письмо с подтверждением',verifyInfo:'Подтверди адрес электронной почты, затем нажми «Обновить».',verifySent:'Письмо с подтверждением отправлено. Проверь почту.',refresh:'Обновить',logout:'Выйти',account:'Мой профиль',
  application:'Заявка на доступ к квартире',entrance:'Подъезд',floor:'Этаж',apartment:'Квартира',relation:'Статус жильца',apply:'Отправить заявку',waiting:'Заявка ожидает решения председателя.',rejectedMsg:'Заявка отклонена. Можно подать новую.',approvedMsg:'Твоя квартира подтверждена.',reapply:'Новая заявка',pendingRequests:'Заявки на подтверждение',chair:'Председатель',approve:'Одобрить',reject:'Отклонить',confirmApprove:'Одобрить эту заявку?',confirmReject:'Отклонить заявку?',directory:'База жильцов',noRecords:'Пока нет записей',search:'Поиск по имени, фамилии, квартире или телефону',private:'Телефоны жильцов доступны только председателю.',unitMap:'Схема квартир',unitSave:'Сохранить',unknown:'Не назначено',alreadyAssigned:'Квартира закреплена за другим подъездом или этажом. Проверь схему.',confirmUnit:'Изменить расположение квартиры?',saved:'Сохранено',failed:'Операция не выполнена',
  noFinance:'Финансы, ремонт и голосования добавим после проверки защищённой регистрации.'
}};
const t=x=>dict[lang][x]||x;
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const btn=(title,action,cls='light')=>'<button type="button" class="btn '+cls+'" data-action="'+esc(action)+'">'+esc(title)+'</button>';
const fld=(label,name,type='text',value='',opt='')=>'<label>'+esc(label)+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+opt+' required></label>';
const sel=(label,name,values,current)=>'<label>'+esc(label)+'<select name="'+name+'">'+values.map(v=>'<option value="'+v+'"'+(v===current?' selected':'')+'>'+v+'</option>').join('')+'</select></label>';
const toastMsg=(message,bad=false)=>{toast.textContent=message;toast.style.background=bad?'#96354d':'#16374d';toast.style.display='block';setTimeout(()=>toast.style.display='none',4000)};
const card=(title,body)=>'<section class="card"><h2>'+esc(title)+'</h2>'+body+'</section>';
const status=v=>'<span class="status '+esc(v)+'">'+esc(t(v))+'</span>';
const configured=!!firebaseConfig&&!!firebaseConfig.projectId&&!!firebaseConfig.apiKey&&!!firebaseConfig.appId;
let auth=null,db=null;
if(configured){const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);}
const canWrite=()=>user?.emailVerified===true;

async function refresh(){
  if(!user||!db)return render();
  try {
    await reload(user); user=auth.currentUser;
    // Refresh the ID token so Firestore sees the new email_verified claim.
    if(user.emailVerified)await getIdToken(user,true);
    profile=(await getDoc(doc(db,'profiles',user.uid))).data()||null;
    isChair=(await getDoc(doc(db,'roles',user.uid))).data()?.chairman===true;
    application=(await getDoc(doc(db,'applications',user.uid))).data()||null;
    membership=(await getDoc(doc(db,'members',user.uid))).data()||null;
    if(isChair) {
      const [reqs,mem,loc]=await Promise.all([
        getDocs(query(collection(db,'applications'),where('status','==','pending'))),
        getDocs(collection(db,'members')),getDocs(collection(db,'units'))
      ]);
      requests=reqs.docs.map(d=>({id:d.id,...d.data()}));
      members=mem.docs.map(d=>({id:d.id,...d.data()}));
      units=loc.docs.map(d=>({id:d.id,...d.data()}));
      const ids=[...new Set([...requests.map(r=>r.uid),...members.map(m=>m.uid)])];
      profileCache=new Map();
      await Promise.all(ids.map(async id=>{
        const snap=await getDoc(doc(db,'profiles',id));
        if(snap.exists())profileCache.set(id,snap.data());
      }));
    }
    render();
  }catch(err){showError(err);}
}
function showError(err){el.innerHTML=card(t('failed'),'<p>'+esc(err.message||String(err))+'</p>'+btn(t('refresh'),'refresh'));}
function render(){
  document.documentElement.lang=lang;
  document.getElementById('language').textContent=lang==='ka'?'🇷🇺 RU':'🇬🇪 KA';
  if(!configured){el.innerHTML=card(t('notConnected'),'<div class="notice warning">'+esc(t('notReady'))+'</div>');return;}
  if(!user){return renderAuth();}
  const menu='<div class="row"><div><strong>'+esc(profile?.first||user.email)+' '+esc(profile?.last||'')+'</strong><p class="muted">'+esc(user.email)+'</p></div><div class="actions">'+btn(t('refresh'),'refresh')+btn(t('logout'),'logout')+'</div></div>';
  if(!user.emailVerified){el.innerHTML=card(t('account'),menu+'<div class="notice warning">'+esc(t('verifyInfo'))+'</div>'+btn(t('sendVerify'),'verify','green'));return;}
  if(!profile){el.innerHTML=card(t('account'),menu+'<div class="notice warning">'+esc(t('failed'))+'</div>');return;}
  el.innerHTML=card(t('account'),menu)+ (isChair?renderChair():renderResident());
}
function renderAuth(){
  const signup=screen==='signup',reset=screen==='reset';
  if(reset){el.innerHTML=card(t('forgot'),'<form id="reset-form" class="stack">'+fld(t('email'),'email','email','','autocomplete="email"')+'<button class="btn green" type="submit">'+esc(t('sendReset'))+'</button></form><div class="actions">'+btn(t('back'),'login')+'</div>');return;}
  el.innerHTML=card(t('intro'),'<p class="muted">'+esc(t('address'))+'</p><div class="actions">'+btn(t('login'),'login',!signup?'green':'light')+btn(t('signup'),'signup',signup?'green':'light')+'</div>'+
    '<form id="auth-form" class="grid">'+(signup?fld(t('first'),'first','text','','maxlength="70" minlength="2"')+fld(t('last'),'last','text','','maxlength="70" minlength="2"')+'<div class="wide">'+fld(t('phone'),'phone','tel','+995 ','maxlength="25" minlength="7"')+'</div>':'')+
    '<div class="wide">'+fld(t('email'),'email','email','','autocomplete="email"')+'</div>'+
    '<div class="wide">'+fld(t('password'),'password','password','','minlength="12" autocomplete="'+(signup?'new-password':'current-password')+'"')+'</div><div class="wide"><p class="muted">'+esc(t('passwordHint'))+'</p><button type="submit" class="btn green">'+esc(t(signup?'register':'login'))+'</button></div></form>'+
    (!signup?'<div class="actions">'+btn(t('forgot'),'reset')+'</div>':''));
}
function renderResident(){
  if(membership)return card(t('application'),'<div class="notice">'+esc(t('approvedMsg'))+'</div><p>№ '+esc(membership.apartment)+' · '+esc(t('entrance'))+' '+esc(membership.entrance)+' · '+esc(t('floor'))+' '+esc(membership.floor)+'</p>');
  const note=application?'<div class="notice '+(application.status==='rejected'?'warning':'')+'">'+status(application.status)+' '+esc(application.status==='pending'?t('waiting'):t('rejectedMsg'))+'</div>':'';
  if(application?.status==='pending')return card(t('application'),note);
  const form='<form id="application-form" class="grid">'+sel(t('entrance'),'entrance',[1,2,3],1)+sel(t('floor'),'floor',[2,3,4,5,6,7,8],2)+
    sel(t('apartment'),'apartment',Array.from({length:60},(_,i)=>i+1),1)+
    '<label>'+esc(t('relation'))+'<select name="relation"><option value="resident">'+esc(t('resident'))+'</option><option value="owner">'+esc(t('owner'))+'</option></select></label>'+
    '<div class="wide"><button type="submit" class="btn green">'+esc(t('apply'))+'</button></div></form>';
  return card(t('application'),note+form);
}
function renderChair(){
  const pending=requests.map(r=>{const p=profileCache.get(r.uid)||{};return '<div class="mini row"><div><strong>'+esc(p.first)+' '+esc(p.last)+'</strong><p class="muted">'+esc(t('apartment'))+' №'+esc(r.apartment)+' · '+esc(t('entrance'))+' '+esc(r.entrance)+' · '+esc(t('floor'))+' '+esc(r.floor)+'</p></div><div class="actions">'+btn(t('approve'),'approve:'+r.uid,'green')+btn(t('reject'),'reject:'+r.uid,'danger')+'</div></div>';}).join('')||'<p class="muted">'+esc(t('noRecords'))+'</p>';
  const rows=members.map(m=>{const p=profileCache.get(m.uid)||{};const search=[p.first,p.last,p.phone,m.apartment,m.entrance,m.floor].join(' ').toLowerCase();return '<tr data-search="'+esc(search)+'"><td>'+esc(p.first)+'</td><td>'+esc(p.last)+'</td><td>'+esc(m.entrance)+'</td><td>'+esc(m.floor)+'</td><td>№ '+esc(m.apartment)+'</td><td>'+esc(p.phone)+'</td></tr>';}).join('');
  const unit=units.find(u=>u.apartment===editingUnit);
  const layout='<form id="layout-form" class="grid">'+sel(t('apartment'),'apartment',Array.from({length:60},(_,i)=>i+1),editingUnit)+sel(t('entrance'),'entrance',[1,2,3],unit?.entrance||1)+sel(t('floor'),'floor',[2,3,4,5,6,7,8],unit?.floor||2)+'<div><button class="btn green" type="submit">'+esc(t('unitSave'))+'</button></div></form>';
  return card(t('pendingRequests')+' ('+requests.length+')',pending)+card(t('directory')+' ('+members.length+')','<p class="muted">'+esc(t('private'))+'</p><label>'+esc(t('search'))+'<input id="search" autocomplete="off" placeholder="'+esc(t('search'))+'"></label>'+
    '<div class="table-wrap"><table><thead><tr>'+[t('first'),t('last'),t('entrance'),t('floor'),t('apartment'),t('phone')].map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>')+
    card(t('unitMap'),layout)+'<div class="notice">'+esc(t('noFinance'))+'</div>';
}
async function submit(ev){
  const f=ev.target;if(!['auth-form','reset-form','application-form','layout-form'].includes(f.id))return;
  ev.preventDefault();if(working)return;working=true;
  const d=Object.fromEntries(new FormData(f).entries());
  const actionButton=f.querySelector('button[type="submit"]');if(actionButton)actionButton.disabled=true;
  try{
    if(f.id==='auth-form'){
      if(screen==='signup'){
        if(d.password.length<12)throw Error(t('passwordHint'));
        const creds=await createUserWithEmailAndPassword(auth,d.email.trim().toLowerCase(),d.password);
        const current=creds.user;
        await setDoc(doc(db,'profiles',current.uid),{
          first:d.first.trim(),last:d.last.trim(),phone:d.phone.trim(),createdAt:serverTimestamp()
        });
        await updateProfile(current,{displayName:d.first.trim()+' '+d.last.trim()});
        await sendEmailVerification(current);
        toastMsg(t('verifySent'));
      }else await signInWithEmailAndPassword(auth,d.email.trim(),d.password);
    }else if(f.id==='reset-form'){
      await sendPasswordResetEmail(auth,d.email.trim());
      toastMsg(t('resetSent'));screen='login';renderAuth();
    }else if(f.id==='application-form'){
      if(!canWrite())throw Error(t('verifyInfo'));
      const applicant={uid:user.uid,apartment:Number(d.apartment),entrance:Number(d.entrance),floor:Number(d.floor),
        relation:d.relation,status:'pending',createdAt:serverTimestamp()};
      await setDoc(doc(db,'applications',user.uid),applicant);
      await refresh();
    }else if(f.id==='layout-form'){
      if(!isChair)throw Error(t('failed'));
      if(!confirm(t('confirmUnit')))return;
      const id=String(d.apartment);
      await setDoc(doc(db,'units',id),{apartment:Number(id),entrance:Number(d.entrance),floor:Number(d.floor)});
      editingUnit=Number(id);await refresh();
    }
  }catch(err){toastMsg(err.message||t('failed'),true);}
  finally{working=false;if(actionButton)actionButton.disabled=false;}
}
async function handleAction(ev){
  const b=ev.target.closest('button[data-action]');if(!b||working)return;
  const a=b.dataset.action;
  if(['login','signup','reset'].includes(a)){screen=a;renderAuth();return;}
  if(a==='refresh'){await refresh();return;}
  if(a==='logout'){await signOut(auth);return;}
  if(a==='verify'){try{await sendEmailVerification(user);toastMsg(t('verifySent'));}catch(e){toastMsg(e.message,true);}return;}
  if(a.startsWith('approve:')||a.startsWith('reject:')){
    if(!isChair||!user)return;
    const approved=a.startsWith('approve:'),id=a.slice(approved?8:7);
    if(!confirm(t(approved?'confirmApprove':'confirmReject')))return;
    working=true;b.disabled=true;
    try{
      await runTransaction(db,async tx=>{
        const requestRef=doc(db,'applications',id), memberRef=doc(db,'members',id);
        const rs=await tx.get(requestRef);
        if(!rs.exists()||rs.data().status!=='pending')throw Error(t('failed'));
        const r=rs.data();
        const unitRef=doc(db,'units',String(r.apartment)),unit=await tx.get(unitRef),mem=await tx.get(memberRef);
        if(mem.exists())throw Error(t('failed'));
        if(approved&&unit.exists()&&
          (unit.data().entrance!==r.entrance||unit.data().floor!==r.floor))throw Error(t('alreadyAssigned'));
        if(approved){
          if(!unit.exists())tx.set(unitRef,{apartment:r.apartment,entrance:r.entrance,floor:r.floor});
          tx.set(memberRef,{uid:id,apartment:r.apartment,entrance:r.entrance,floor:r.floor,relation:r.relation,approvedAt:serverTimestamp()});
        }
        tx.update(requestRef,{status:approved?'approved':'rejected',reviewedAt:serverTimestamp(),reviewedBy:user.uid});
      });
      await refresh();
    }catch(err){toastMsg(err.message||t('failed'),true);}
    finally{working=false;b.disabled=false;}
  }
}
document.getElementById('language').addEventListener('click',()=>{lang=lang==='ka'?'ru':'ka';localStorage.setItem('corp-language',lang);render();});
document.addEventListener('submit',submit);
document.addEventListener('click',handleAction);
document.addEventListener('input',ev=>{if(ev.target.id==='search'){const v=ev.target.value.toLowerCase().trim();document.querySelectorAll('tr[data-search]').forEach(row=>{row.hidden=!row.dataset.search.includes(v);});}});
document.addEventListener('change',ev=>{if(ev.target.name==='apartment'&&ev.target.closest('#layout-form')){editingUnit=Number(ev.target.value);render();}});
if(!configured)render();else onAuthStateChanged(auth,async current=>{user=current;profile=null;isChair=false;application=null;membership=null;requests=[];members=[];units=[];profileCache=new Map();if(current)await refresh();else render();});