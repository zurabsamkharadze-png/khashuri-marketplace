(()=>{'use strict';
if(!/\/valuation\/new/.test(location.pathname))return;
const q=new URLSearchParams(location.search),ka=q.get('lang')==='ka';
const $=id=>document.getElementById(id);
const msg=ka?{
 idle:'საკადასტრო კოდის შეყვანისას ქალაქი, მისამართი და ფართობები ავტომატურად მოიძებნება.',
 searching:'🔎 ვეძებ საკადასტრო მონაცემებს…',
 found:'✅ ქალაქი, მისამართი და ხელმისაწვდომი ფართობები ავტომატურად შეივსო.',
 partial:'✅ საკადასტრო მონაცემები ნაწილობრივ მოიძებნა. შეამოწმეთ შევსებული ველები.',
 notFound:'ავტომატური მონაცემები ვერ მოიძებნა — გააგრძელეთ ხელით შევსება.',
 error:'ავტომატური ძებნა დროებით მიუწვდომელია — ხელით შევსება მუშაობს.',
 estimated:'სახლის ფართობი მიღებულია შენობის საკადასტრო კონტურიდან — საჭიროების შემთხვევაში დააზუსტეთ.'
}:{
 idle:'После ввода кадастрового кода город, адрес и площади будут найдены автоматически.',
 searching:'🔎 Ищу данные по кадастровому коду…',
 found:'✅ Город, адрес и доступные площади заполнены автоматически.',
 partial:'✅ Кадастровые данные найдены частично. Проверьте заполненные поля.',
 notFound:'Автоматические данные не найдены — продолжите ручной ввод.',
 error:'Автоматический поиск временно недоступен — ручной ввод работает.',
 estimated:'Площадь дома определена по кадастровому контуру строения — при необходимости уточните.'
};
function token(){try{const s=JSON.parse(localStorage.getItem('kh_session')||'null');if(s?.access_token)return s.access_token}catch(e){}try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/auth-token/i.test(k))continue;const v=JSON.parse(localStorage.getItem(k)||'null');const t=v?.access_token||v?.currentSession?.access_token;if(t)return t}}catch(e){}return''}
function setHint(text,state=''){const h=$('cadHint');if(!h)return;h.textContent=text;h.dataset.state=state;h.style.color=state==='ok'?'#08766d':state==='warn'?'#9a6500':''}
function emit(el){if(!el)return;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function setCity(v){const el=$('city');if(!el||!v)return false;const norm=String(v).toLowerCase();let target='';if(/surami|сурами|სურამი/.test(norm))target='Сурами';else if(/khashuri|хашури|ხაშური/.test(norm))target='Хашури';else target=v;const opt=[...el.options].find(o=>String(o.value||o.textContent).toLowerCase()===String(target).toLowerCase());if(!opt)return false;el.value=opt.value;el.dataset.cadAuto='1';emit(el);return true}
function canAuto(el){return !!el&&(!String(el.value||'').trim()||el.dataset.cadAuto==='1')}
function setValue(id,v){const el=$(id);if(!el||v===null||v===undefined||v===''||!canAuto(el))return false;el.value=String(v);el.dataset.cadAuto='1';emit(el);return true}
function markManual(){['city','address','latitude','longitude','house_area','land_area'].forEach(id=>{const el=$(id);if(!el)return;el.addEventListener('input',e=>{if(e.isTrusted)delete el.dataset.cadAuto});el.addEventListener('change',e=>{if(e.isTrusted)delete el.dataset.cadAuto})})}
function mobileFix(){if(document.getElementById('kh-v38-mobile-style'))return;const s=document.createElement('style');s.id='kh-v38-mobile-style';s.textContent='@media(max-width:700px){#floors .floor{grid-template-columns:1fr!important;display:grid!important}#floors .floor>b,#floors .floor .field,#floors .floor .area{grid-column:1/-1!important;width:100%!important}#floors .floor select.condition{width:100%!important;min-width:0!important;max-width:none!important;font-size:17px!important}#floors .floor .field:has(select.condition){width:100%!important}}';document.head.appendChild(s)}
let timer=0,seq=0,lastCode='';
async function lookup(force=false){const cad=$('cadastral_code');if(!cad)return;const code=String(cad.value||'').trim(),d=code.replace(/\D/g,'');if(d.length<8){setHint(msg.idle);return}if(!force&&code===lastCode)return;lastCode=code;const my=++seq;setHint(msg.searching);try{const headers={},t=token();if(t)headers.Authorization='Bearer '+t;const r=await fetch('/api/valuation-router?route=cadastral&code='+encodeURIComponent(code),{headers,cache:'no-store'}),data=await r.json().catch(()=>null);if(my!==seq||String(cad.value||'').trim()!==code)return;if(!r.ok||!data?.ok){setHint(msg.notFound,'warn');return}const changed=[];if(setCity(data.city))changed.push('city');if(setValue('address',data.address))changed.push('address');if(data.latitude!=null&&setValue('latitude',Number(data.latitude).toFixed(6)))changed.push('lat');if(data.longitude!=null&&setValue('longitude',Number(data.longitude).toFixed(6)))changed.push('lng');if(data.land_area!=null&&setValue('land_area',Number(data.land_area).toFixed(Number(data.land_area)%1?2:0)))changed.push('land');const houseWasSet=data.house_area!=null&&setValue('house_area',Number(data.house_area).toFixed(Number(data.house_area)%1?2:0));if(houseWasSet){changed.push('house');setTimeout(()=>{try{if(typeof window.renderFloors==='function')window.renderFloors()}catch(e){}},30)}cad.dataset.lookupSource=data.source||'';let text=changed.length>=4?msg.found:msg.partial;if(houseWasSet&&data.house_area_source==='napr-buildings')text+=' '+msg.estimated;setHint(text,changed.length?'ok':'warn')}catch(e){if(my===seq)setHint(msg.error,'warn')}}
function boot(){const cad=$('cadastral_code');if(!cad)return;mobileFix();markManual();setHint(msg.idle);cad.setAttribute('autocomplete','off');cad.setAttribute('inputmode','text');cad.addEventListener('input',()=>{clearTimeout(timer);lastCode='';timer=setTimeout(()=>lookup(),700)});cad.addEventListener('blur',()=>{clearTimeout(timer);lookup(true)});cad.addEventListener('paste',()=>{clearTimeout(timer);timer=setTimeout(()=>lookup(true),80)});setTimeout(()=>{if(String(cad.value||'').replace(/\D/g,'').length>=8)lookup(true)},900)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
