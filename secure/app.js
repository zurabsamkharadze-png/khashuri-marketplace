import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const el = document.getElementById('app');
const toastEl = document.getElementById('toast');
const enabled = /^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/.test(SUPABASE_URL) && /^(eyJ|sb_publishable_)/.test(SUPABASE_PUBLISHABLE_KEY);
const supabase = enabled ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken:true, persistSession:true, detectSessionInUrl:true }
}) : null;

let lang = localStorage.getItem('corp-lang') === 'ru' ? 'ru' : 'ka';
let authTab = 'signin', user = null, role = 'resident', profile = null;
let requests = [], members = [], units = [], profiles = [], ownRequests = [], ownMembers = [], view = 'home';
let loadVersion = 0, editingId = null, recoveryMode = false, editingUnit = 1;
const dictionary = {
ka:{
  notReady:'სერვერი ჯერ არ არის დაკავშირებული',notReadyDesc:'ეს არის დაცული აპლიკაციის მომზადებული ვერსია. 60 ოჯახის რეალური რეგისტრაცია არ ჩაირთვება ახალი, დამოუკიდებელი და უფასო მონაცემთა ბაზის გამართვამდე.',
  guestIntro:'მცხოვრებთა დაცული რეგისტრაცია',signin:'შესვლა',signup:'რეგისტრაცია',email:'ელფოსტა',password:'პაროლი',first:'სახელი',last:'გვარი',phone:'ტელეფონის ნომერი',send:'გაგზავნა',wait:'მიმდინარეობს…',emailSent:'გადაამოწმეთ ელფოსტა და დაადასტურეთ ანგარიში, შემდეგ შედით.',forgot:'დაგავიწყდათ პაროლი?',resetTitle:'პაროლის აღდგენა',resetExplain:'შეიყვანეთ ანგარიშის ელფოსტა. თუ ასეთი ანგარიში არსებობს, აღდგენის ინსტრუქციას მიიღებთ.',resetSend:'აღდგენის ბმულის გაგზავნა',resetSent:'თუ ეს ელფოსტა სისტემაში არსებობს, პაროლის აღდგენის ბმული გამოიგზავნება.',backSignIn:'შესვლაზე დაბრუნება',newPassword:'ახალი პაროლი',repeatPassword:'გაიმეორეთ პაროლი',updatePassword:'პაროლის შეცვლა',passwordChanged:'პაროლი შეიცვალა. შეგიძლიათ გააგრძელოთ.',passwordMismatch:'პაროლები არ ემთხვევა.',account:'ჩემი ანგარიში',logout:'გასვლა',
  request:'განაცხადი',registerApt:'ბინაზე წვდომის მოთხოვნა',entrance:'სადარბაზო',floor:'სართული',flat:'ბინა',owner:'მესაკუთრე',resident:'მცხოვრები',submitRequest:'განაცხადის გაგზავნა',pending:'მოლოდინში',approved:'დამტკიცებულია',rejected:'უარყოფილია',retry:'ხელახალი განაცხადის გაგზავნა',yourRequest:'ჩემი განაცხადი',noRequest:'განაცხადი ჯერ არ არის გაგზავნილი',waiting:'თქვენი განაცხადი თავმჯდომარის დადასტურებას ელოდება.',rejectedMsg:'წინა განაცხადი უარყოფილია. შეგიძლიათ გაგზავნოთ ახალი.',approvedMsg:'თქვენ გაქვთ დამტკიცებული წვდომა მითითებულ ბინაზე.',building:'ხაშური, რუსთაველის 16 · 60 ბინა · 3 სადარბაზო',
  chairman:'თავმჯდომარე',pendingRequests:'მომლოდინე განაცხადები',directory:'მცხოვრებთა ბაზა',records:'მცხოვრებთა ჩანაწერები',approve:'დამტკიცება',reject:'უარყოფა',confirmApprove:'დავამტკიცოთ განაცხადი?',confirmReject:'უარვყოთ განაცხადი?',edit:'შეცვლა',cancel:'გაუქმება',save:'შენახვა',revoke:'წვდომის გაუქმება',revokeConfirm:'ნამდვილად გავაუქმოთ ამ ბინაზე მაცხოვრებლის წვდომა? მომხმარებლის ანგარიში არ წაიშლება.',accessRevoked:'წინა წვდომა გაუქმებულია. სურვილის შემთხვევაში, ახალი განაცხადის გაგზავნა შეგიძლიათ.',unitLayout:'ბინების სქემის მართვა',unitAssigned:'მინიჭებული ბინები',unitSave:'სადარბაზოსა და სართულის შენახვა',unitConfirm:'შევცვალოთ ამ ბინის სადარბაზო და სართული?',unitUnset:'მონაცემები ჯერ არ არის მინიჭებული.',search:'ძებნა სახელით, გვარით, ტელეფონით ან ბინით',allEntrances:'ყველა სადარბაზო',exportCsv:'CSV ფაილის გადმოწერა',exportConfirm:'CSV ფაილი შეიცავს პირად მონაცემებს (სახელები, ტელეფონები). გააგრძელებთ? შეინახეთ მხოლოდ უსაფრთხო ადგილას.',none:'ჩანაწერები არ არის',relation:'კავშირი',status:'სტატუსი',date:'თარიღი',refresh:'განახლება',
  secure:'წვდომა მოწმდება სერვერზე. რიგითი მცხოვრებელი სხვის ტელეფონს ვერ ნახავს.',privacy:'მეზობლების მონაცემები დაამატეთ მხოლოდ მას შემდეგ, რაც დაცული სერვერი ამოქმედდება და მათი თანხმობა იქნება მიღებული.',fail:'ოპერაცია ვერ შესრულდა',session:'სესია დასრულდა. შედით თავიდან.',noRole:'თავმჯდომარის როლი ენიჭება მხოლოდ ხელით, უფლებამოსილი ადმინისტრატორის მიერ.',noFee:'ფინანსები და კენჭისყრები დაემატება შემდეგ ეტაპზე.',passwordHelp:'გამოიყენეთ უნიკალური, მინიმუმ 12-სიმბოლოიანი პაროლი.'
},
ru:{
  notReady:'Сервер пока не подключён',notReadyDesc:'Это подготовленная защищённая версия приложения. Реальная регистрация 60 семей не включится, пока не будет настроена новая отдельная бесплатная база данных.',
  guestIntro:'Защищённая регистрация жильцов',signin:'Вход',signup:'Регистрация',email:'Электронная почта',password:'Пароль',first:'Имя',last:'Фамилия',phone:'Номер телефона',send:'Отправить',wait:'Подождите…',emailSent:'Проверьте почту и подтвердите аккаунт, затем войдите.',forgot:'Забыли пароль?',resetTitle:'Восстановление пароля',resetExplain:'Введи адрес электронной почты. Если аккаунт существует, на него придёт ссылка для восстановления.',resetSend:'Отправить ссылку',resetSent:'Если аккаунт существует, на почту отправлена ссылка для восстановления пароля.',backSignIn:'Вернуться ко входу',newPassword:'Новый пароль',repeatPassword:'Повторите пароль',updatePassword:'Изменить пароль',passwordChanged:'Пароль изменён. Можно продолжать.',passwordMismatch:'Пароли не совпадают.',account:'Мой аккаунт',logout:'Выйти',
  request:'Заявка',registerApt:'Запрос доступа к квартире',entrance:'Подъезд',floor:'Этаж',flat:'Квартира',owner:'Собственник',resident:'Житель',submitRequest:'Отправить заявку',pending:'Ожидает',approved:'Одобрена',rejected:'Отклонена',retry:'Подать новую заявку',yourRequest:'Моя заявка',noRequest:'Заявка ещё не подана',waiting:'Твоя заявка ожидает проверки председателем.',rejectedMsg:'Предыдущая заявка отклонена. Можно отправить новую.',approvedMsg:'Твой доступ к квартире подтверждён.',building:'Хашури, Руставели 16 · 60 квартир · 3 подъезда',
  chairman:'Председатель',pendingRequests:'Заявки на подтверждение',directory:'База жильцов',records:'Записи жильцов',approve:'Одобрить',reject:'Отклонить',confirmApprove:'Подтвердить заявку?',confirmReject:'Отклонить заявку?',edit:'Изменить',cancel:'Отмена',save:'Сохранить',revoke:'Отозвать доступ',revokeConfirm:'Отозвать доступ жильца к этой квартире? Аккаунт не будет удалён.',accessRevoked:'Предыдущий доступ отозван. Можно подать новую заявку на квартиру.',unitLayout:'Схема квартир',unitAssigned:'Квартир распределено',unitSave:'Сохранить подъезд и этаж',unitConfirm:'Изменить подъезд и этаж этой квартиры?',unitUnset:'Подъезд и этаж ещё не назначены.',search:'Поиск по имени, фамилии, телефону или квартире',allEntrances:'Все подъезды',exportCsv:'Скачать таблицу CSV',exportConfirm:'В файле CSV будут персональные данные жильцов (имена, телефоны). Продолжить? Храните файл только в защищённом месте.',none:'Записей пока нет',relation:'Статус жильца',status:'Статус',date:'Дата',refresh:'Обновить',
  secure:'Права доступа проверяются на сервере. Жители не могут видеть чужие телефоны.',privacy:'Вносите реальные сведения соседей только после запуска защищённой базы и получения их согласия.',fail:'Не удалось выполнить действие',session:'Сессия завершилась. Войди снова.',noRole:'Роль председателя назначается только вручную уполномоченным администратором.',noFee:'Финансы и голосования будут добавлены на следующем этапе.',passwordHelp:'Используйте уникальный пароль длиной не менее 12 символов.'
}};
const t=k=>dictionary[lang][k]||k;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const show=(msg,isError=false)=>{toastEl.textContent=msg;toastEl.style.background=isError?'#9a3440':'#16374d';toastEl.style.display='block';setTimeout(()=>toastEl.style.display='none',4500);};
const safeDate=d=>d?new Date(d).toLocaleDateString(lang==='ka'?'ka-GE':'ru-RU'):'—';
const statusBadge=s=>'<span class="status '+esc(s)+'">'+esc(t(s))+'</span>';
const button=(text,action,extra='')=>'<button type="button" class="btn '+extra+'" data-action="'+action+'">'+text+'</button>';
const input=(label,name,type='text',placeholder='',extra='')=>'<label>'+esc(label)+'<input name="'+name+'" type="'+type+'" '+(placeholder?'placeholder="'+esc(placeholder)+'"':'')+' '+extra+' required></label>';
const html = {
  top(title,description=''){return '<div class="card"><h1>'+esc(title)+'</h1><p class="muted">'+esc(description)+'</p></div>';},
  status(){return '<div class="notice">'+esc(t('secure'))+'</div>';}
};

async function refresh() {
  if(!enabled){el.innerHTML=html.top(t('notReady'),t('notReadyDesc'));return;}
  const version=++loadVersion;
  el.innerHTML='<div class="card">'+esc(t('wait'))+'</div>';
  try{
    const {data,error}=await supabase.auth.getUser();
    if(error&&!(/Auth session missing/i.test(error.message)))throw error;
    if(version!==loadVersion)return;
    user=data?.user||null;
    role='resident';profile=null;requests=[];members=[];units=[];profiles=[];ownRequests=[];ownMembers=[];
    if(!user){recoveryMode=false;renderGuest();return;}
    if(recoveryMode){renderRecovery();return;}
    const [myProfile,myRole,unitResp,myRequests,myMemberships]=await Promise.all([
      supabase.from('corp_profiles').select('id,first_name,last_name,phone').eq('id',user.id).single(),
      supabase.from('corp_roles').select('role').eq('user_id',user.id).single(),
      supabase.from('corp_units').select('apartment,entrance,floor').order('apartment'),
      supabase.from('corp_requests').select('id,applicant_id,apartment,entrance,floor,relation,status,review_note,created_at').eq('applicant_id',user.id).order('created_at',{ascending:false}),
      supabase.from('corp_members').select('apartment,relation,approved_at').eq('user_id',user.id)
    ]);
    for (const response of [myProfile,myRole,unitResp,myRequests,myMemberships])if(response.error)throw response.error;
    if(version!==loadVersion)return;
    profile=myProfile.data;role=myRole.data.role;
    units=unitResp.data||[];ownRequests=myRequests.data||[];ownMembers=myMemberships.data||[];
    if(role==='chairman'){
      const [allRequests,allMembers,allProfiles]=await Promise.all([
        supabase.from('corp_requests').select('id,applicant_id,apartment,entrance,floor,relation,status,review_note,created_at').eq('status','pending').order('created_at'),
        supabase.from('corp_members').select('user_id,apartment,relation,approved_at').order('apartment'),
        supabase.from('corp_profiles').select('id,first_name,last_name,phone').order('last_name')
      ]);
      for(const response of [allRequests,allMembers,allProfiles])if(response.error)throw response.error;
      if(version!==loadVersion)return;
      requests=allRequests.data||[];members=allMembers.data||[];profiles=allProfiles.data||[];
    }
    renderMember();
  }catch(err){if(version===loadVersion){el.innerHTML='<div class="card notice error">'+esc(t('fail'))+': '+esc(err.message||String(err))+'</div>'+button(t('refresh'),'refresh','light');}}
}

function updateFooter(){
  const f=document.getElementById('security-footer');
  if(f)f.textContent=lang==='ka'
    ?'მონაცემები ხელმისაწვდომია მხოლოდ უსაფრთხო ავტორიზაციის შემდეგ'
    :'Данные доступны только после защищённой авторизации';
}
function renderGuest(){
  if(authTab==='reset'){
    el.innerHTML=html.top(t('resetTitle'),t('resetExplain'))+
      '<div class="card"><form id="forgot-form" class="stack">'+
      input(t('email'),'email','email','', 'autocomplete="email"')+
      '<button class="btn green" type="submit">'+esc(t('resetSend'))+'</button></form>'+
      '<div class="actions">'+button(t('backSignIn'),'tab-signin','light')+'</div></div>';
    return;
  }
  const signup=authTab==='signup';
  el.innerHTML=html.top(t('guestIntro'),t('building'))+
   '<div class="card"><div class="actions">'+
   button(t('signin'),'tab-signin',signup?'light':'green')+
   button(t('signup'),'tab-signup',signup?'green':'light')+'</div>'+
   '<form id="auth-form" class="grid">'+
   (signup?input(t('first'),'first_name','text','', 'autocomplete="given-name" minlength="2" maxlength="70"')+
            input(t('last'),'last_name','text','', 'autocomplete="family-name" minlength="2" maxlength="70"')+
            '<div class="wide">'+input(t('phone'),'phone','tel','+995 5XX XXX XXX', 'autocomplete="tel" minlength="7" maxlength="25"')+'</div>':'')+
   '<div class="wide">'+input(t('email'),'email','email','', 'autocomplete="email"')+'</div>'+
   '<div class="wide">'+input(t('password'),'password','password','', 'autocomplete="'+(signup?'new-password':'current-password')+'" minlength="12"')+'</div>'+
   '<div class="wide"><p class="muted">'+esc(t('passwordHelp'))+'</p><button class="btn green" type="submit">'+esc(t(signup?'signup':'signin'))+'</button></div></form>'+
   (!signup?'<div class="actions">'+button(esc(t('forgot')),'tab-reset','light')+'</div>':'')+'</div>';
}
function renderRecovery(){
  el.innerHTML=html.top(t('resetTitle'),t('building'))+
    '<div class="card"><form id="new-password-form" class="stack">'+
    input(t('newPassword'),'password','password','', 'autocomplete="new-password" minlength="12" maxlength="200"')+
    input(t('repeatPassword'),'confirm','password','', 'autocomplete="new-password" minlength="12" maxlength="200"')+
    '<button class="btn green" type="submit">'+esc(t('updatePassword'))+'</button></form></div>';
}
const fieldOptions=(items)=>items.map(x=>'<option value="'+x+'">'+x+'</option>').join('');
function renderRequest(){
  const cur=ownRequests[0];
  if(ownMembers.length)return '<div class="notice">'+esc(t('approvedMsg'))+'</div>'+ownMembers.map(m=>'<div class="mini">№ '+m.apartment+' '+esc(t(m.relation))+'</div>').join('');
  const revoked=cur?.status==='approved'&&ownMembers.length===0;
  const status=cur?'<div class="notice '+(cur.status==='rejected'||revoked?'warning':'')+'">'+(revoked?'':statusBadge(cur.status)+' ')+esc(revoked?t('accessRevoked'):cur.status==='rejected'?t('rejectedMsg'):t('waiting'))+'</div>':'';
  if(cur?.status==='pending')return status;
  const options=units.map(x=>'<option value="'+x.apartment+'">'+x.apartment+'</option>').join('');
  const form='<form id="request-form" class="grid"><label>'+esc(t('entrance'))+'<select name="entrance" required>'+fieldOptions([1,2,3])+'</select></label>'+
    '<label>'+esc(t('floor'))+'<select name="floor" required>'+fieldOptions([2,3,4,5,6,7,8])+'</select></label>'+
    '<label>'+esc(t('flat'))+'<select name="apartment" required>'+options+'</select></label>'+
    '<label>'+esc(t('relation'))+'<select name="relation"><option value="owner">'+esc(t('owner'))+'</option><option value="resident">'+esc(t('resident'))+'</option></select></label>'+
    '<div class="wide"><button type="submit" class="btn green">'+esc(t('submitRequest'))+'</button></div></form>';
  return status+form;
}
function renderChair(){
  const profileMap=new Map(profiles.map(p=>[p.id,p]));
  const reqHtml=requests.map(r=>{
    const p=profileMap.get(r.applicant_id)||{};
    return '<div class="mini"><div class="row"><div><strong>'+esc(p.first_name)+' '+esc(p.last_name)+'</strong><p class="muted">'+esc(p.phone)+' · '+esc(t('entrance'))+' '+r.entrance+' · '+esc(t('floor'))+' '+r.floor+' · № '+r.apartment+' · '+esc(t(r.relation))+'</p></div>'+
      '<div class="actions">'+button('✓ '+esc(t('approve')),'approve:'+esc(r.id),'green')+
      button('× '+esc(t('reject')),'reject:'+esc(r.id),'danger')+'</div></div></div>';
  }).join('')||'<p class="muted">'+esc(t('none'))+'</p>';
  const rows=members.map(m=>{
    const p=profileMap.get(m.user_id)||{};
    const u=units.find(u=>u.apartment===m.apartment)||{};
    const id=(p.first_name+' '+p.last_name+' '+p.phone+' '+m.apartment+' '+(u.entrance??'')+' '+(u.floor??'')).toLowerCase();
    return '<tr data-filter="'+esc(id)+'" data-entrance="'+esc(u.entrance??'')+'"><td>'+esc(p.first_name)+'</td><td>'+esc(p.last_name)+'</td><td>'+esc(u.entrance??'—')+'</td><td>'+esc(u.floor??'—')+'</td><td>№ '+m.apartment+'</td><td>'+esc(p.phone)+'</td><td><div class="actions">'+button('✎ '+esc(t('edit')),'edit:'+esc(m.user_id),'light')+button('× '+esc(t('revoke')),'revoke:'+esc(m.user_id)+':'+m.apartment,'danger')+'</div></td></tr>';
  }).join('');
  const selected=profiles.find(p=>p.id===editingId);
  const editForm=selected?'<div class="card"><h2>'+esc(t('edit'))+': '+esc(selected.first_name)+' '+esc(selected.last_name)+'</h2><form id="edit-form" class="grid">'+
     '<div>'+input(t('first'),'first_name','text','', 'value="'+esc(selected.first_name)+'" minlength="2" maxlength="70"')+'</div>'+
     '<div>'+input(t('last'),'last_name','text','', 'value="'+esc(selected.last_name)+'" minlength="2" maxlength="70"')+'</div>'+
     '<div class="wide">'+input(t('phone'),'phone','tel','', 'value="'+esc(selected.phone)+'" minlength="7" maxlength="25"')+'</div>'+
     '<div class="wide actions"><button class="btn green" type="submit">'+esc(t('save'))+'</button>'+button(esc(t('cancel')),'cancelEdit','light')+'</div></form></div>':'';
  const editing=units.find(u=>u.apartment===editingUnit)||units[0]||null;
  const unitOpts=units.map(u=>'<option value="'+u.apartment+'"'+(u.apartment===editing?.apartment?' selected':'')+'>№ '+u.apartment+'</option>').join('');
  const selects=(a,b,selected)=>Array.from({length:b-a+1},(_,i)=>a+i).map(n=>'<option value="'+n+'"'+(n===selected?' selected':'')+'>'+n+'</option>').join('');
  const unitForm=editing?'<form id="unit-form" class="grid">'+
    '<label>'+esc(t('flat'))+'<select id="unit-choice" name="apartment">'+unitOpts+'</select></label>'+
    '<label>'+esc(t('entrance'))+'<select name="entrance">'+selects(1,3,editing.entrance||1)+'</select></label>'+
    '<label>'+esc(t('floor'))+'<select name="floor">'+selects(2,8,editing.floor||2)+'</select></label>'+
    '<div><button type="submit" class="btn green">'+esc(t('unitSave'))+'</button></div></form>':'';
  const unitInfo=editing?.entrance&&editing?.floor?esc(t('entrance'))+' '+editing.entrance+' · '+esc(t('floor'))+' '+editing.floor:esc(t('unitUnset'));
  const unitCard='<div class="card"><h2>'+esc(t('unitLayout'))+'</h2>'+
    '<p class="muted">'+esc(t('unitAssigned'))+': '+units.filter(u=>u.entrance&&u.floor).length+' / 60</p>'+
    unitForm+'<p class="muted">'+esc(t('flat'))+' №'+(editing?.apartment||'—')+': '+unitInfo+'</p></div>';
  return '<div class="card"><h2>'+esc(t('pendingRequests'))+' ('+requests.length+')</h2>'+reqHtml+'</div>'+
    editForm+unitCard+'<div class="card"><div class="row"><h2>'+esc(t('directory'))+' ('+members.length+')</h2></div><p class="muted">'+esc(t('privacy'))+'</p>'+
    '<div class="grid"><label>'+esc(t('search'))+'<input id="search" autocomplete="off" placeholder="'+esc(t('search'))+'"></label>'+
    '<label>'+esc(t('entrance'))+'<select id="entrance-filter"><option value="">'+esc(t('allEntrances'))+'</option>'+
    [1,2,3].map(n=>'<option value="'+n+'">'+esc(t('entrance'))+' '+n+'</option>').join('')+'</select></label></div>'+
    '<div class="actions">'+button('↓ '+esc(t('exportCsv')),'export-csv','light')+'</div>'+
    '<div class="table-wrap"><table><thead><tr><th>'+esc(t('first'))+'</th><th>'+esc(t('last'))+'</th><th>'+esc(t('entrance'))+'</th><th>'+esc(t('floor'))+'</th><th>'+esc(t('flat'))+'</th><th>'+esc(t('phone'))+'</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
function renderMember(){
  el.innerHTML=html.top(t('account'),t('building'))+
    '<div class="card row"><div><strong>'+esc(profile.first_name)+' '+esc(profile.last_name)+'</strong><p class="muted">'+esc(user.email)+' · '+esc(profile.phone)+'</p><span class="status">'+esc(t(role))+'</span></div>'+
    '<div class="actions">'+button('↻ '+esc(t('refresh')),'refresh','light')+button(esc(t('logout')),'logout','light')+'</div></div>'+
    (role==='chairman'?renderChair():'<div class="card"><h2>'+esc(t('registerApt'))+'</h2>'+renderRequest()+'</div>')+
    html.status();
}
function exportRosterCsv(){
  if(role!=='chairman')return;
  if(!confirm(t('exportConfirm')))return;
  const byId=new Map(profiles.map(p=>[p.id,p]));
  const quote=value=>{
    let str=String(value??'');
    if(/^[=+@\-\t\r]/.test(str))str="'"+str;
    return '"'+str.replace(/"/g,'""')+'"';
  };
  const rows=[['first_name','last_name','entrance','floor','apartment','phone'],
     ...members.map(m=>{
        const p=byId.get(m.user_id)||{};
        const unit=units.find(x=>x.apartment===m.apartment)||{};
        return [p.first_name,p.last_name,unit.entrance,unit.floor,m.apartment,p.phone];
     })
  ];
  const csv='\uFEFF'+rows.map(row=>row.map(quote).join(';')).join('\r\n');
  const file=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(file),a=document.createElement('a');
  a.href=url;a.download='chveni-korpusi-residents.csv';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function applyRosterFilters(){
  const term=(document.getElementById('search')?.value||'').toLowerCase().trim();
  const entrance=document.getElementById('entrance-filter')?.value||'';
  document.querySelectorAll('tr[data-filter]').forEach(row=>{
    row.hidden=!(row.dataset.filter.includes(term)&&(!entrance||row.dataset.entrance===entrance));
  });
}
async function dispatchForm(ev){
  if(!enabled)return;
  const form=ev.target;if(!['auth-form','request-form','edit-form','unit-form','forgot-form','new-password-form'].includes(form.id))return;
  ev.preventDefault();
  const data=Object.fromEntries(new FormData(form).entries());
  const btn=form.querySelector('button[type="submit"]');if(btn)btn.disabled=true;
  try{
    if(form.id==='forgot-form'){
      const email=String(data.email||'').trim().toLowerCase();
      const {error}=await supabase.auth.resetPasswordForEmail(email,{
        redirectTo:location.origin+location.pathname
      });
      if(error)throw error;
      show(t('resetSent'));
      authTab='signin';
      renderGuest();
    }else if(form.id==='new-password-form'){
      if(!user||!recoveryMode)throw new Error(t('session'));
      if(String(data.password||'').length<12)throw new Error(t('passwordHelp'));
      if(String(data.password)!==String(data.confirm))throw new Error(t('passwordMismatch'));
      const {error}=await supabase.auth.updateUser({password:String(data.password)});
      if(error)throw error;
      recoveryMode=false;
      show(t('passwordChanged'));
      await refresh();
    }else if(form.id==='auth-form'){
      if(authTab==='signup'){
        if(String(data.password||'').length<12)throw new Error(t('passwordHelp'));
        const {data:result,error}=await supabase.auth.signUp({
          email:String(data.email||'').trim().toLowerCase(),
          password:String(data.password),
          options:{ emailRedirectTo:location.origin+location.pathname, data:{
             first_name:String(data.first_name||'').trim(),
             last_name:String(data.last_name||'').trim(),
             phone:String(data.phone||'').trim()
          }}
        });
        if(error)throw error;
        show(t('emailSent'));
        if(result.session){await refresh();return;}
        authTab='signin';renderGuest();
      } else {
        const {error}=await supabase.auth.signInWithPassword({email:data.email,password:data.password});
        if(error)throw error;
        await refresh();
      }
    }else if(form.id==='unit-form'){
      if(role!=='chairman')throw new Error(t('fail'));
      const apartment=Number(data.apartment),entrance=Number(data.entrance),floor=Number(data.floor);
      if(!Number.isInteger(apartment)||apartment<1||apartment>60
        ||![1,2,3].includes(entrance)||!Number.isInteger(floor)||floor<2||floor>8)throw new Error(t('fail'));
      if(!confirm(t('unitConfirm')+' № '+apartment)) {if(btn)btn.disabled=false;return;}
      const {error}=await supabase.rpc('corp_set_unit_location',
        {p_apartment:apartment,p_entrance:entrance,p_floor:floor});
      if(error)throw error;
      editingUnit=apartment;await refresh();
    }else if(form.id==='edit-form'){
      if(role!=='chairman'||!editingId)throw new Error(t('fail'));
      const {error}=await supabase.rpc('corp_edit_resident',{
        p_user_id:editingId,p_first_name:String(data.first_name||'').trim(),
        p_last_name:String(data.last_name||'').trim(),
        p_phone:String(data.phone||'').trim()
      });
      if(error)throw error;
      editingId=null;
      await refresh();
    }else if(form.id==='request-form'){
      if(!user)throw new Error(t('session'));
      const request={applicant_id:user.id,entrance:Number(data.entrance),floor:Number(data.floor),
        apartment:Number(data.apartment),relation:data.relation};
      const {error}=await supabase.from('corp_requests').insert(request);
      if(error)throw error;
      await refresh();
    }
  }catch(err){show((err.message||String(err)),true);if(btn)btn.disabled=false;}
}

async function dispatchClick(ev){
  const button=ev.target.closest('button[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(['tab-signin','tab-signup','tab-reset'].includes(action)){authTab=action.substring(4);renderGuest();return;}
  if(action==='refresh'){await refresh();return;}
  if(action==='export-csv'){exportRosterCsv();return;}
  if(action==='cancelEdit'){editingId=null;renderMember();return;}
  if(action.startsWith('edit:')){if(role!=='chairman')return;editingId=action.slice(5);renderMember();window.scrollTo(0,0);return;}
  if(action.startsWith('revoke:')){
    if(role!=='chairman')return;
    const match=/^revoke:([0-9a-f-]{36}):([1-9]|[1-5][0-9]|60)$/.exec(action);
    if(!match)return show(t('fail'),true);
    const member=members.find(m=>m.user_id===match[1]&&m.apartment===Number(match[2]));
    if(!member)return show(t('fail'),true);
    if(!confirm(t('revokeConfirm')+' № '+member.apartment))return;
    button.disabled=true;
    const {error}=await supabase.rpc('corp_revoke_member',{p_user_id:member.user_id,p_apartment:member.apartment,p_reason:''});
    if(error){show(error.message,true);button.disabled=false;return;}
    editingId=null;
    await refresh();return;
  }
  if(action==='logout'){const {error}=await supabase.auth.signOut();if(error)show(error.message,true);await refresh();return;}
  if(action.startsWith('approve:')||action.startsWith('reject:')){
    if(role!=='chairman')return;
    const approve=action.startsWith('approve:');
    if(!confirm(t(approve?'confirmApprove':'confirmReject')))return;
    button.disabled=true;
    const requestId=action.slice(approve?8:7);
    const {error}=await supabase.rpc('corp_review_request',{p_request_id:requestId,p_approve:approve,p_note:''});
    if(error){show(error.message,true);button.disabled=false;return;}
    await refresh();
  }
}
document.addEventListener('submit',dispatchForm);
document.addEventListener('click',dispatchClick);
document.addEventListener('input',ev=>{if(ev.target.id==='search')applyRosterFilters();});
document.addEventListener('change',ev=>{
  if(ev.target.id==='entrance-filter')applyRosterFilters();
  if(ev.target.id==='unit-choice'&&role==='chairman'){
    const num=Number(ev.target.value);
    if(Number.isInteger(num)&&num>=1&&num<=60){editingUnit=num;renderMember();}
  }
});
document.getElementById('language').addEventListener('click',()=>{
  lang=lang==='ka'?'ru':'ka';localStorage.setItem('corp-lang',lang);
  document.documentElement.lang=lang;
  updateFooter();
  document.getElementById('language').textContent=lang==='ka'?'🇷🇺 RU':'🇬🇪 KA';
  if(!enabled)refresh();else if(!user)renderGuest();else renderMember();
});
if(supabase) {
  supabase.auth.onAuthStateChange((event,_session)=>{
    if(event==='PASSWORD_RECOVERY')recoveryMode=true;
    if(event==='SIGNED_OUT')recoveryMode=false;
    setTimeout(refresh,0);
  });
}
updateFooter();
await refresh();