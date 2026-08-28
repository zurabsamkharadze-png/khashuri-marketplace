(()=>{'use strict';
if(!/\/valuation\/new/.test(location.pathname))return;
const q=new URLSearchParams(location.search),ka=q.get('lang')==='ka';
const $=id=>document.getElementById(id);
const msg=ka?{
 idle:'საკადასტრო კოდის შეყვანისას ქალაქი და მისამართი ავტომატურად მოიძებნება.',
 searching:'🔎 ვეძებ საკადასტრო მონაცემებს…',
 found:'✅ მონაცემები ნაპოვნია და შევსებულია.',
 partial:'✅ ნაკვეთი ნაპოვნია. მისამართი გადაამოწმეთ.',
 notFound:'ავტომატური მონაცემები ვერ მოიძებნა — გააგრძელეთ ხელით შევსება.',
 error:'ავტომატური ძებნა დროებით მიუწვდომელია — ხელით შევსება მუშაობს.'
}:{
 idle:'После ввода кадастрового кода город и адрес будут найдены автоматически.',
 searching:'🔎 Ищу данные по кадастровому коду…',
 found:'✅ Данные найдены и заполнены автоматически.',
 partial:'✅ Участок найден. Проверьте точный адрес.',
 notFound:'Автоматические данные не найдены — продолжите ручной ввод.',
 error:'Автоматический поиск временно недоступен — ручной ввод работает.'
};
function token(){
  try{const s=JSON.parse(localStorage.getItem('kh_session')||'null');if(s?.access_token)return s.access_token}catch(e){}
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/auth-token/i.test(k))continue;const v=JSON.parse(localStorage.getItem(k)||'null');const t=v?.access_token||v?.currentSession?.access_token;if(t)return t}}catch(e){}
  return'';
}
function setHint(text,state=''){const h=$('cadHint');if(!h)return;h.textContent=text;h.dataset.state=state;h.style.color=state==='ok'?'#08766d':state==='warn'?'#9a6500':''}
function emit(el){if(!el)return;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function setCity(v){const el=$('city');if(!el||!v)return false;const norm=String(v).toLowerCase();let target='';if(/surami|сурами|სურამი/.test(norm))target='Сурами';else if(/khashuri|хашури|ხაშური/.test(norm))target='Хашури';else target=v;const opt=[...el.options].find(o=>String(o.value||o.textContent).toLowerCase()===String(target).toLowerCase());if(!opt)return false;el.value=opt.value;el.dataset.cadAuto='1';emit(el);return true}
function setValue(id,v){const el=$(id);if(!el||v===null||v===undefined||v==='')return false;el.value=String(v);el.dataset.cadAuto='1';emit(el);return true}
let timer=0,seq=0,lastCode='';
async function lookup(force=false){
  const cad=$('cadastral_code');if(!cad)return;
  const code=String(cad.value||'').trim();const d=code.replace(/\D/g,'');
  if(d.length<8){setHint(msg.idle);return}
  if(!force&&code===lastCode)return;lastCode=code;const my=++seq;setHint(msg.searching);
  try{
    const headers={};const t=token();if(t)headers.Authorization='Bearer '+t;
    const r=await fetch('/api/cadastral-lookup?code='+encodeURIComponent(code),{headers,cache:'no-store'});const data=await r.json().catch(()=>null);
    if(my!==seq||String(cad.value||'').trim()!==code)return;
    if(!r.ok||!data?.ok){setHint(msg.notFound,'warn');return}
    const cityOk=setCity(data.city);
    const addrOk=setValue('address',data.address);
    if(data.latitude!=null)setValue('latitude',Number(data.latitude).toFixed(6));
    if(data.longitude!=null)setValue('longitude',Number(data.longitude).toFixed(6));
    cad.dataset.lookupSource=data.source||'';
    setHint(cityOk&&addrOk?msg.found:msg.partial,cityOk||addrOk?'ok':'warn');
  }catch(e){if(my===seq)setHint(msg.error,'warn')}
}
function boot(){
  const cad=$('cadastral_code');if(!cad)return;
  setHint(msg.idle);
  cad.setAttribute('autocomplete','off');cad.setAttribute('inputmode','text');
  cad.addEventListener('input',()=>{clearTimeout(timer);lastCode='';timer=setTimeout(()=>lookup(),700)});
  cad.addEventListener('blur',()=>{clearTimeout(timer);lookup(true)});
  cad.addEventListener('paste',()=>{clearTimeout(timer);timer=setTimeout(()=>lookup(true),80)});
  setTimeout(()=>{if(String(cad.value||'').replace(/\D/g,'').length>=8&&!String($('address')?.value||'').trim())lookup(true)},900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
