import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendEmailVerification, sendPasswordResetEmail, updateProfile, reload, getIdToken } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, runTransaction,
  updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";
import { computeBalance, validMonth, amountToTetri } from './finance-math.js';
import { encryptFinanceSnapshot } from './encrypted-finance.js';

const el=document.getElementById('app'),toast=document.getElementById('toast');
let lang=localStorage.getItem('corp-language')==='ru'?'ru':'ka', screen='login', user=null,
    profile=null, isChair=false, application=null, membership=null, requests=[],members=[],units=[],
    profileCache=new Map(),working=false,editingUnit=1,announcements=[],repairs=[],
    ledgerMonth=localMonth(),ledgerRate=null,receipts=[],monthsHistory=[],corrections=[],correctingPaymentId=null;
function localMonth(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
const dict={
ka:{
  pending:'მოლოდინში',approved:'დადასტურებულია',rejected:'უარყოფილია',owner:'მესაკუთრე',resident:'მაცხოვრებელი',
  intro:'კორპუსის დაცული მართვა',address:'ხაშური · რუსთაველის 16 · 60 ბინა',
  notConnected:'მონაცემთა ბაზა ჯერ არ არის დაკავშირებული',notReady:'ეს არის Firebase Spark-ისთვის მომზადებული უსაფრთხო ვერსია. რეალურ მონაცემებს ვერ შევიტანთ, სანამ ცალკე უფასო სერვერს არ დავუკავშირებთ.',
  login:'შესვლა',signup:'რეგისტრაცია',email:'ელფოსტა',password:'პაროლი',first:'სახელი',last:'გვარი',phone:'ტელეფონი',forgot:'პაროლი დაგავიწყდათ?',sendReset:'აღდგენის ბმულის გაგზავნა',resetSent:'თუ ასეთი ანგარიში არსებობს, ელფოსტაზე მიიღებთ აღდგენის ბმულს.',back:'უკან',passwordHint:'გამოიყენეთ არანაკლებ 12 სიმბოლოიანი პაროლი.',
  register:'ანგარიშის შექმნა',sendVerify:'დადასტურების წერილის გაგზავნა',verifyInfo:'დაადასტურეთ ელფოსტის მისამართი. შემდეგ დააჭირეთ „განახლებას“.',verifySent:'დადასტურების წერილი გაიგზავნა. შეამოწმეთ ელფოსტა.',refresh:'განახლება',logout:'გასვლა',account:'ჩემი პროფილი',
  application:'ბინაზე წვდომის განაცხადი',entrance:'სადარბაზო',floor:'სართული',apartment:'ბინა',relation:'მობინადრის ტიპი',apply:'განაცხადის გაგზავნა',waiting:'თქვენი განაცხადი თავმჯდომარის გადაწყვეტილებას ელოდება.',rejectedMsg:'განაცხადი უარყოფილია. შეგიძლიათ გააგზავნოთ ახალი.',approvedMsg:'თქვენი ბინა დამტკიცებულია.',reapply:'ახალი განაცხადი',pendingRequests:'დასადასტურებელი განაცხადები',chair:'თავმჯდომარე',approve:'დადასტურება',reject:'უარყოფა',confirmApprove:'დავადასტუროთ ეს განაცხადი?',confirmReject:'უარვყოთ განაცხადი?',directory:'მცხოვრებთა ბაზა',noRecords:'ჩანაწერები არ არის',search:'ძებნა სახელით, გვარით, ბინით ან ტელეფონით',private:'მცხოვრებთა ტელეფონები ხელმისაწვდომია მხოლოდ თავმჯდომარისთვის.',unitMap:'ბინების სქემა',unitSave:'შენახვა',unknown:'დაუდგენელია',alreadyAssigned:'ეს ბინა სხვა სადარბაზოში ან სართულზეა. შეამოწმეთ სქემა.',confirmUnit:'შევცვალოთ ბინის მდებარეობა?',saved:'შენახულია',failed:'ოპერაცია ვერ შესრულდა',
  noFinance:'კენჭისყრა დაემატება შემდეგ ეტაპზე.',
  finance:'ფინანსები',month:'თვე',monthlyFee:'თვიური შენატანი',setMonthlyFee:'შენატანის დადგენა',feeConfirm:'დავაფიქსიროთ ამ თვის შენატანი? შემდეგ ცვლილება შეუძლებელია.',feeMissing:'ამ თვის შენატანი ჯერ არ არის მითითებული.',
  paid:'შემოსულია',due:'დარიცხულია',debt:'დავალიანება',credit:'ზედმეტობა',noPayments:'ჩანაწერები არ არის',recordPayment:'ხელით გადახდის დამატება',paymentNote:'შენიშვნა',amountGel:'თანხა (₾)',allUnits:'60 ბინის ანგარიში',downloadReport:'CSV ანგარიშის გადმოწერა',
  immutableLedger:'ეს არის მხოლოდ ხელით აღრიცხვა და არა ონლაინ გადახდის სისტემა. არასწორი გადახდა უქმდება ცალკე ჩანაწერით; ორიგინალი ისტორიაში რჩება.',accessExpired:'ბინაზე წინა წვდომა გაუქმებულია. შეგიძლიათ ახალი განაცხადი გააგზავნოთ.',
  opening:'წინა თვეების ნაშთი',monthlyPaid:'ამ თვეში გადახდილი',closing:'საბოლოო ნაშთი',paymentCancel:'გადახდის გაუქმება',cancelReason:'გაუქმების მიზეზი',confirmCorrection:'გაუქმდეს ეს გადახდა? ინფორმაცია დარჩება ისტორიაში.',correctionSaved:'გაუქმება ჩაწერილია',reversed:'გაუქმებულია',cancel:'გაუქმება',ledgerCumulative:'წინა თვეების დავალიანება ან ზედმეტობა გადადის შემდეგ თვეზე.',backupTitle:'ფინანსების დაშიფრული არქივი',backupExplain:'მხოლოდ ფინანსები; სახელები და ტელეფონები არ შედის. ფაილი ინახება მხოლოდ თქვენს მოწყობილობაზე. პაროლი არ შეინახება და დაკარგვის შემთხვევაში ვერ აღდგება.',backupPass:'არქივის პაროლი (მინ. 14 სიმბოლო)',backupRepeat:'გაიმეორეთ პაროლი',backupAction:'დაშიფრული არქივის ჩამოტვირთვა',backupMismatch:'პაროლები არ ემთხვევა.',backupLimit:'არქივი მეტისმეტად დიდია. დაუკავშირდით ადმინისტრატორს.',
  news:'განცხადებები',newNews:'ახალი განცხადება',headline:'სათაური',content:'ტექსტი',publish:'გამოქვეყნება',
  repairs:'სარემონტო განაცხადები',newRepair:'პრობლემის შეტყობინება',repairDetails:'პრობლემის აღწერა',sendRepair:'განაცხადის გაგზავნა',
  repairStatus:'მდგომარეობა',open:'ახალი',progress:'მიმდინარეობს',done:'დასრულებულია',setProgress:'მუშაობაში გადაყვანა',setDone:'დასრულება',
  privateData:'ინფორმაცია ხელმისაწვდომია მხოლოდ უფლებამოსილი პირებისთვის.',tooLong:'შეამოწმეთ ტექსტის სიგრძე და შევსებული ველები.'
},
ru:{
  pending:'Ожидает',approved:'Одобрена',rejected:'Отклонена',owner:'Собственник',resident:'Житель',
  intro:'Защищённое управление корпусом',address:'Хашури · Руставели 16 · 60 квартир',
  notConnected:'База данных ещё не подключена',notReady:'Это версия, подготовленная для Firebase Spark. Реальные данные вводить нельзя, пока мы не подключим отдельный бесплатный сервер.',
  login:'Войти',signup:'Регистрация',email:'Электронная почта',password:'Пароль',first:'Имя',last:'Фамилия',phone:'Телефон',forgot:'Забыли пароль?',sendReset:'Отправить ссылку для восстановления',resetSent:'Если аккаунт существует, ссылка для восстановления отправлена на почту.',back:'Назад',passwordHint:'Используй пароль длиной не менее 12 символов.',
  register:'Создать аккаунт',sendVerify:'Отправить письмо с подтверждением',verifyInfo:'Подтверди адрес электронной почты, затем нажми «Обновить».',verifySent:'Письмо с подтверждением отправлено. Проверь почту.',refresh:'Обновить',logout:'Выйти',account:'Мой профиль',
  application:'Заявка на доступ к квартире',entrance:'Подъезд',floor:'Этаж',apartment:'Квартира',relation:'Статус жильца',apply:'Отправить заявку',waiting:'Заявка ожидает решения председателя.',rejectedMsg:'Заявка отклонена. Можно подать новую.',approvedMsg:'Твоя квартира подтверждена.',reapply:'Новая заявка',pendingRequests:'Заявки на подтверждение',chair:'Председатель',approve:'Одобрить',reject:'Отклонить',confirmApprove:'Одобрить эту заявку?',confirmReject:'Отклонить заявку?',directory:'База жильцов',noRecords:'Пока нет записей',search:'Поиск по имени, фамилии, квартире или телефону',private:'Телефоны жильцов доступны только председателю.',unitMap:'Схема квартир',unitSave:'Сохранить',unknown:'Не назначено',alreadyAssigned:'Квартира закреплена за другим подъездом или этажом. Проверь схему.',confirmUnit:'Изменить расположение квартиры?',saved:'Сохранено',failed:'Операция не выполнена',
  noFinance:'Голосования добавим после проверки защищённой регистрации.',
  finance:'Финансы',month:'Месяц',monthlyFee:'Ежемесячный взнос',setMonthlyFee:'Установить взнос',feeConfirm:'Зафиксировать взнос на этот месяц? После сохранения его нельзя изменить.',feeMissing:'Взнос за этот месяц пока не установлен.',
  paid:'Поступило',due:'Начислено',debt:'Задолженность',credit:'Переплата',noPayments:'Записей пока нет',recordPayment:'Записать оплату вручную',paymentNote:'Примечание',amountGel:'Сумма (₾)',allUnits:'Отчёт по 60 квартирам',downloadReport:'Скачать CSV',
  immutableLedger:'Это ручной учёт, а не приём онлайн-платежей. Ошибочное поступление аннулируется отдельной записью, а оригинал остаётся в истории.',accessExpired:'Ранее одобренный доступ к квартире больше не действует. Можно подать новую заявку.',
  opening:'Остаток с прошлых месяцев',monthlyPaid:'Оплачено за месяц',closing:'Итоговый остаток',paymentCancel:'Аннулировать поступление',cancelReason:'Причина отмены',confirmCorrection:'Аннулировать это поступление? История сохранится.',correctionSaved:'Отмена сохранена',reversed:'Аннулирован',cancel:'Отмена',ledgerCumulative:'Долги и переплаты прошлых месяцев переносятся на следующий месяц.',backupTitle:'Зашифрованный архив финансов',backupExplain:'Только финансы: без имён и телефонов. Файл сохранится на устройстве. Пароль нигде не сохраняется; если его потерять, расшифровать файл не получится.',backupPass:'Пароль архива (минимум 14 символов)',backupRepeat:'Повторите пароль',backupAction:'Скачать зашифрованный архив',backupMismatch:'Пароли не совпадают.',backupLimit:'Архив слишком большой. Нужна отдельная процедура сохранения.',
  news:'Объявления',newNews:'Новое объявление',headline:'Заголовок',content:'Текст объявления',publish:'Опубликовать',
  repairs:'Заявки на ремонт',newRepair:'Сообщить о проблеме',repairDetails:'Описание проблемы',sendRepair:'Отправить заявку',
  repairStatus:'Статус',open:'Новая',progress:'В работе',done:'Завершена',setProgress:'В работу',setDone:'Завершить',
  privateData:'Информация доступна только уполномоченным пользователям.',tooLong:'Проверьте длину текста и заполненные поля.'
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
const monthOk=validMonth;
const toTetri=amountToTetri;
const money=v=>(Number(v||0)/100).toLocaleString(lang==='ka'?'ka-GE':'ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₾';
const balanceFor=flat=>computeBalance(flat,ledgerMonth,monthsHistory,receipts,corrections);
const totalsFor=flat=>balanceFor(flat).paidCurrent;

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
    // Read private building content only for approved members and the chairman.
    announcements=[];repairs=[];
    if(isChair||membership){
      const [newsSnap,repairSnap]=await Promise.all([
        getDocs(collection(db,'announcements')),
        isChair?getDocs(collection(db,'repairs')):
          getDocs(query(collection(db,'repairs'),where('authorUid','==',user.uid)))
      ]);
      announcements=newsSnap.docs.map(x=>({id:x.id,...x.data()}))
        .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      repairs=repairSnap.docs.map(x=>({id:x.id,...x.data()}))
        .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    }
    ledgerRate=null;receipts=[];monthsHistory=[];corrections=[];
    if(isChair||membership){
      const [monthDocs,receiptDocs,correctionDocs]=await Promise.all([
        getDocs(query(collection(db,'months'),where('month','<=',ledgerMonth))),
        isChair?getDocs(query(collection(db,'payments'),where('month','<=',ledgerMonth))):
          getDocs(query(collection(db,'payments'),where('apartment','==',membership.apartment))),
        isChair?getDocs(query(collection(db,'corrections'),where('month','<=',ledgerMonth))):
          getDocs(query(collection(db,'corrections'),where('apartment','==',membership.apartment)))
      ]);
      monthsHistory=monthDocs.docs.map(x=>({id:x.id,...x.data()})).filter(m=>m.month<=ledgerMonth);
      ledgerRate=monthsHistory.find(m=>m.month===ledgerMonth)||null;
      receipts=receiptDocs.docs.map(x=>({id:x.id,...x.data()})).filter(m=>m.month<=ledgerMonth);
      corrections=correctionDocs.docs.map(x=>({id:x.id,...x.data()})).filter(m=>m.month<=ledgerMonth);
    }
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
function listAnnouncements(){
  if(!announcements.length)return '<p class="muted">'+esc(t('noRecords'))+'</p>';
  return announcements.slice(0,30).map(n=>
    '<div class="mini"><strong>'+esc(n.title)+'</strong><p>'+esc(n.body)+'</p></div>'
  ).join('');
}
function listRepairs(canManage){
  if(!repairs.length)return '<p class="muted">'+esc(t('noRecords'))+'</p>';
  return repairs.slice(0,80).map(r=>
    '<div class="mini"><div class="row"><div><strong>'+esc(r.title)+'</strong><p class="muted">№ '+
      esc(r.apartment)+' · '+esc(t(r.status))+'</p><p>'+esc(r.details)+'</p></div>'+
      (canManage?'<div class="actions">'+
        (r.status==='open'?btn(t('setProgress'),'repair-progress:'+r.id,'light'):'')+
        (r.status!=='done'?btn(t('setDone'),'repair-done:'+r.id,'green'):'')+
        '</div>':'')+'</div></div>'
  ).join('');
}
function renderFinance(){
  const fee=ledgerRate?.amountTetri??null;
  const flats=isChair?Array.from({length:60},(_,i)=>i+1):[membership.apartment];
  const ledger=flats.map(flat=>({flat,...balanceFor(flat)}));
  const sum=key=>ledger.reduce((total,item)=>total+item[key],0);
  const figures=[[t('opening'),sum('opening')],[t('due'),sum('dueCurrent')],
    [t('monthlyPaid'),sum('paidCurrent')],[t('closing'),sum('closing')],
    [t('debt'),sum('debt')],[t('credit'),sum('credit')]];
  const metrics='<div class="grid section-gap">'+figures.map(([label,value])=>
    '<div class="card"><p class="muted">'+esc(label)+'</p><strong>'+money(value)+'</strong></div>'
  ).join('')+'</div>';
  const picker='<label>'+esc(t('month'))+'<input type="month" id="finance-month" value="'+esc(ledgerMonth)+'" min="2020-01" max="2099-12"></label>';
  const correctionById=new Map(corrections.map(c=>[c.paymentId,c]));
  const currentReceipts=receipts.filter(r=>r.month===ledgerMonth).slice()
    .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,150);
  const history=currentReceipts.map(r=>{
    const c=correctionById.get(r.id);
    const cancel=isChair&&!c?btn(t('paymentCancel'),'correct:'+r.id,'danger'):'';
    const flag=c?'<span class="status rejected">'+esc(t('reversed'))+'</span>':'';
    return '<div class="mini row"><div>№ '+esc(r.apartment)+' · <strong>'+money(r.amountTetri)+'</strong> '+
       flag+'<p class="muted">'+esc(r.note||'')+'</p>'+
       (c?'<p class="muted">'+esc(t('cancelReason'))+': '+esc(c.reason)+'</p>':'')+
       '</div><div class="actions">'+cancel+'</div></div>';
  }).join('')||'<p class="muted">'+esc(t('noPayments'))+'</p>';
  if(!isChair)return card(t('finance'),picker+'<p>'+esc(t('monthlyFee'))+': '+
    (fee===null?esc(t('feeMissing')):money(fee))+'</p><p class="muted">'+esc(t('ledgerCumulative'))+'</p>'+
    metrics+history);
  const feeForm=fee===null?'<form id="fee-form" class="grid"><label>'+esc(t('amountGel'))+
    '<input type="number" name="fee" step="0.01" min="0" max="100000" value="0" required></label>'+
    '<div><button type="submit" class="btn green">'+esc(t('setMonthlyFee'))+'</button></div></form>':
    '<p><strong>'+esc(t('monthlyFee'))+': '+money(fee)+'</strong></p>';
  const paymentForm='<form id="payment-form" class="grid">'+
    sel(t('apartment'),'apartment',Array.from({length:60},(_,i)=>i+1),1)+
    '<label>'+esc(t('amountGel'))+'<input type="number" name="amount" step="0.01" min="0.01" max="1000000" required></label>'+
    '<div class="wide"><label>'+esc(t('paymentNote'))+'<input name="note" type="text" maxlength="250"></label></div>'+
    '<div class="wide"><button type="submit" class="btn green">'+esc(t('recordPayment'))+'</button></div></form>';
  const selected=currentReceipts.find(p=>p.id===correctingPaymentId&&!correctionById.has(p.id));
  const correctionForm=selected?'<form id="correction-form" class="stack">'+
    '<strong>№ '+esc(selected.apartment)+' · '+money(selected.amountTetri)+'</strong>'+
    '<label>'+esc(t('cancelReason'))+'<textarea name="reason" minlength="5" maxlength="250" required></textarea></label>'+
    '<div class="actions"><button type="submit" class="btn danger">'+esc(t('paymentCancel'))+'</button>'+
    btn(t('cancel'),'correct-cancel')+'</div></form>':'';
  const rows=ledger.map(q=>'<tr><td>№ '+q.flat+'</td><td>'+money(q.opening)+'</td><td>'+
    money(q.dueCurrent)+'</td><td>'+money(q.paidCurrent)+'</td><td>'+money(q.closing)+'</td></tr>').join('');
  const report='<div class="table-wrap"><table><thead><tr>'+
    [t('apartment'),t('opening'),t('due'),t('monthlyPaid'),t('closing')]
    .map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<div class="actions">'+btn('↓ '+t('downloadReport'),'download-finance')+'</div>';
  const backupForm='<p class="muted">'+esc(t('backupExplain'))+'</p>'+
    '<form id="backup-form" class="stack">'+
    '<label>'+esc(t('backupPass'))+'<input name="pass" type="password" minlength="14" maxlength="1024" autocomplete="new-password" required></label>'+
    '<label>'+esc(t('backupRepeat'))+'<input name="repeat" type="password" minlength="14" maxlength="1024" autocomplete="new-password" required></label>'+
    '<button type="submit" class="btn green">'+esc(t('backupAction'))+'</button></form>';
  return card(t('finance'),picker+metrics+'<p class="muted">'+esc(t('ledgerCumulative'))+' '+esc(t('immutableLedger'))+'</p>')+
    card(t('setMonthlyFee'),feeForm)+card(t('recordPayment'),paymentForm)+
    (selected?card(t('paymentCancel'),correctionForm):'')+
    card(t('allUnits'),report)+card(t('paid'),history)+card(t('backupTitle'),backupForm);
}
function renderResident(){
  if(membership){
    const form='<form id="repair-form" class="stack">'+
       fld(t('headline'),'title','text','','minlength="4" maxlength="140"')+
       '<label>'+esc(t('repairDetails'))+'<textarea name="details" minlength="4" maxlength="1500" required></textarea></label>'+
       '<button type="submit" class="btn green">'+esc(t('sendRepair'))+'</button></form>';
    return card(t('application'),'<div class="notice">'+esc(t('approvedMsg'))+'</div><p>№ '+
      esc(membership.apartment)+' · '+esc(t('entrance'))+' '+esc(membership.entrance)+' · '+
      esc(t('floor'))+' '+esc(membership.floor)+'</p>')+
      renderFinance()+card(t('news'),listAnnouncements())+
      card(t('newRepair'),form)+card(t('repairs'),listRepairs(false));
  }
  const revoked=application?.status==='approved'&&!membership;
  const note=application?'<div class="notice '+(application.status==='rejected'||revoked?'warning':'')+'">'+
    (revoked?'':status(application.status)+' ')+
    esc(revoked?t('accessExpired'):application.status==='pending'?t('waiting'):t('rejectedMsg'))+'</div>':'';
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
  const newsForm='<form id="news-form" class="stack">'+
    fld(t('headline'),'title','text','','minlength="3" maxlength="130"')+
    '<label>'+esc(t('content'))+'<textarea name="body" minlength="3" maxlength="2500" required></textarea></label>'+
    '<button type="submit" class="btn green">'+esc(t('publish'))+'</button></form>';
  return card(t('pendingRequests')+' ('+requests.length+')',pending)+
    card(t('newNews'),newsForm)+card(t('news'),listAnnouncements())+
    card(t('repairs')+' ('+repairs.length+')',listRepairs(true))+renderFinance()+
    card(t('directory')+' ('+members.length+')','<p class="muted">'+esc(t('private'))+'</p><label>'+esc(t('search'))+'<input id="search" autocomplete="off" placeholder="'+esc(t('search'))+'"></label>'+
    '<div class="table-wrap"><table><thead><tr>'+[t('first'),t('last'),t('entrance'),t('floor'),t('apartment'),t('phone')].map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>')+
    card(t('unitMap'),layout)+'<div class="notice">'+esc(t('noFinance'))+'</div>';
}
async function submit(ev){
  const f=ev.target;if(!['auth-form','reset-form','application-form','layout-form','repair-form','news-form','fee-form','payment-form','correction-form','backup-form'].includes(f.id))return;
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
        // Auth may fire before Firestore profile creation finishes; read it again.
        await refresh();
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
    }else if(f.id==='repair-form'){
      if(!canWrite()||!membership||isChair)throw Error(t('failed'));
      const title=String(d.title||'').trim(),details=String(d.details||'').trim();
      if(title.length<4||title.length>140||details.length<4||details.length>1500)throw Error(t('tooLong'));
      await addDoc(collection(db,'repairs'),{
        authorUid:user.uid,apartment:membership.apartment,title,details,
        status:'open',createdAt:serverTimestamp(),updatedAt:serverTimestamp()
      });
      await refresh();
    }else if(f.id==='news-form'){
      if(!isChair)throw Error(t('failed'));
      const title=String(d.title||'').trim(),body=String(d.body||'').trim();
      if(title.length<3||title.length>130||body.length<3||body.length>2500)throw Error(t('tooLong'));
      await addDoc(collection(db,'announcements'),{
        title,body,authorUid:user.uid,createdAt:serverTimestamp()
      });
      await refresh();
    }else if(f.id==='fee-form'){
      if(!isChair||!canWrite()||!monthOk(ledgerMonth))throw Error(t('failed'));
      const amountTetri=toTetri(d.fee);
      if(!Number.isSafeInteger(amountTetri)||amountTetri<0||amountTetri>10000000)throw Error(t('tooLong'));
      if(!confirm(t('feeConfirm')+' '+ledgerMonth+' · '+money(amountTetri)))return;
      await setDoc(doc(db,'months',ledgerMonth),{
        month:ledgerMonth,amountTetri,createdBy:user.uid,createdAt:serverTimestamp()
      });
      await refresh();
    }else if(f.id==='payment-form'){
      if(!isChair||!canWrite()||!monthOk(ledgerMonth))throw Error(t('failed'));
      const amountTetri=toTetri(d.amount),apartment=Number(d.apartment),note=String(d.note||'').trim();
      if(!Number.isSafeInteger(amountTetri)||amountTetri<=0||amountTetri>100000000||
         !Number.isInteger(apartment)||apartment<1||apartment>60||note.length>250)throw Error(t('tooLong'));
      await addDoc(collection(db,'payments'),{
        apartment,month:ledgerMonth,amountTetri,note,createdBy:user.uid,createdAt:serverTimestamp()
      });
      await refresh();
    }else if(f.id==='backup-form'){
      if(!isChair||!canWrite())throw Error(t('failed'));
      const password=String(d.pass||''),repeat=String(d.repeat||'');
      if(password.length<14||password.length>1024)throw Error(t('backupMismatch'));
      if(password!==repeat)throw Error(t('backupMismatch'));
      // Fetch full financial history, independent of the month currently selected.
      const [fees,entries,reversals]=await Promise.all([
        getDocs(collection(db,'months')),getDocs(collection(db,'payments')),getDocs(collection(db,'corrections'))
      ]);
      const count=fees.size+entries.size+reversals.size;
      if(count>25000)throw Error(t('backupLimit'));
      const records=items=>items.docs.map(record=>({id:record.id,...record.data()}));
      const payload={
        schema:'chveni-korpusi-finance-snapshot-v1',savedAt:new Date().toISOString(),
        monthFees:records(fees),payments:records(entries),corrections:records(reversals)
      };
      const archive=await encryptFinanceSnapshot(payload,password);
      const url=URL.createObjectURL(new Blob([archive],{type:'application/json;charset=utf-8'}));
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download='chveni-korpusi-finance-encrypted-'+localMonth()+'.json';
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
    }else if(f.id==='correction-form'){
      if(!isChair||!canWrite()||!correctingPaymentId)throw Error(t('failed'));
      const payment=receipts.find(x=>x.id===correctingPaymentId&&x.month===ledgerMonth);
      const reason=String(d.reason||'').trim();
      if(!payment||corrections.some(c=>c.paymentId===payment.id)||reason.length<5||reason.length>250)throw Error(t('tooLong'));
      if(!confirm(t('confirmCorrection')+' № '+payment.apartment+' · '+money(payment.amountTetri)))return;
      const originalRef=doc(db,'payments',payment.id),correctionRef=doc(db,'corrections',payment.id);
      await runTransaction(db,async tx=>{
        const original=await tx.get(originalRef);
        const existing=await tx.get(correctionRef);
        if(!original.exists()||existing.exists())throw Error(t('failed'));
        const entry=original.data();
        if(entry.month!==ledgerMonth||entry.apartment!==payment.apartment)throw Error(t('failed'));
        tx.set(correctionRef,{
          paymentId:payment.id,month:entry.month,apartment:entry.apartment,
          amountTetri:-entry.amountTetri,reason,createdBy:user.uid,createdAt:serverTimestamp()
        });
      });
      correctingPaymentId=null;toastMsg(t('correctionSaved'));await refresh();
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
  if(a==='download-finance'){
    if(!isChair)return;
    if(!confirm(t('private')+' '+t('downloadReport')+'?'))return;
    const safe=v=>{let str=String(v??'');if(/^[=+@-]/.test(str))str="'"+str;return '"'+str.replace(/"/g,'""')+'"';};
    const rows=[['apartment','month','opening_gel','current_due_gel','net_paid_gel','closing_balance_gel'],
      ...Array.from({length:60},(_,i)=>{const n=i+1,b=balanceFor(n);
        return [n,ledgerMonth,(b.opening/100).toFixed(2),(b.dueCurrent/100).toFixed(2),
          (b.paidCurrent/100).toFixed(2),(b.closing/100).toFixed(2)];})];
    const csv='\ufeff'+rows.map(row=>row.map(safe).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='korpusi-finance-'+ledgerMonth+'.csv';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3500);
    return;
  }
  if(a==='correct-cancel'){correctingPaymentId=null;render();return;}
  if(a.startsWith('correct:')){
    if(!isChair)return;
    const id=a.slice(8);
    if(!receipts.some(x=>x.id===id&&x.month===ledgerMonth)||corrections.some(x=>x.paymentId===id))return;
    correctingPaymentId=id;render();return;
  }
  if(a==='logout'){await signOut(auth);return;}
  if(a==='verify'){try{await sendEmailVerification(user);toastMsg(t('verifySent'));}catch(e){toastMsg(e.message,true);}return;}
  if(a.startsWith('repair-progress:')||a.startsWith('repair-done:')){
    if(!isChair||!user)return;
    const next=a.startsWith('repair-progress:')?'progress':'done';
    const id=a.slice(next==='progress'?16:12);
    if(!repairs.some(q=>q.id===id))return;
    working=true;b.disabled=true;
    try{
      await updateDoc(doc(db,'repairs',id),{status:next,updatedAt:serverTimestamp()});
      await refresh();
    }catch(err){toastMsg(err.message||t('failed'),true);}
    finally{working=false;b.disabled=false;}
    return;
  }
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
document.addEventListener('change',ev=>{
  if(ev.target.id==='finance-month'&&monthOk(ev.target.value)){ledgerMonth=ev.target.value;correctingPaymentId=null;refresh();return;}
  if(ev.target.name==='apartment'&&ev.target.closest('#layout-form')){editingUnit=Number(ev.target.value);render();}
});
if(!configured)render();else onAuthStateChanged(auth,async current=>{user=current;profile=null;isChair=false;application=null;membership=null;requests=[];members=[];units=[];profileCache=new Map();if(current)await refresh();else render();});