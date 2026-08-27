(()=>{'use strict';
if(!/\/valuation\/new/.test(location.pathname))return;
const ka=new URLSearchParams(location.search).get('lang')==='ka';

function houseField(){
  const s=document.getElementById('structural_condition');
  if(!s)return;
  const f=s.closest('.field')||s.parentElement;
  if(!f)return;
  if(f.dataset.v32House==='1')return;
  f.dataset.v32House='1';
  const label=f.querySelector('label');
  if(label)label.textContent=ka?'ძირითადი სახლის ტექნიკური მდგომარეობა':'Техническое состояние основного дома';
  let hint=f.querySelector('.hint');
  if(!hint){hint=document.createElement('div');hint.className='hint';f.appendChild(hint)}
  hint.textContent=ka?'„რეკონსტრუქცია“ და „დასანგრევია“ ეხება მხოლოდ ძირითად სახლს.':'«Реконструкция» и «Под снос» относятся только к основному дому.';
  f.style.border='1px solid #b9ded8';f.style.borderRadius='14px';f.style.padding='12px';f.style.background='#f3fbf9';
}

function normalizeExtraSelect(sel){
  if(!sel||sel.dataset.v32Ready==='1')return;
  const old=sel.value;
  [...sel.querySelectorAll('option')].forEach(o=>{if(o.value==='demolition'||o.value==='reconstruction')o.remove()});
  const labels=ka?{good:'კარგი',average:'საშუალო',repair:'საჭიროებს რემონტს'}:{good:'Хорошее',average:'Среднее',repair:'Требует ремонта'};
  for(const [v,t] of Object.entries(labels)){
    let o=sel.querySelector(`option[value="${v}"]`);
    if(!o){o=document.createElement('option');o.value=v;sel.appendChild(o)}
    if(o.textContent!==t)o.textContent=t;
  }
  sel.value=(old==='demolition'||old==='reconstruction'||!labels[old])?'repair':old;
  const label=sel.closest('.field')?.querySelector('label');
  if(label)label.textContent=ka?'ნაგებობის მდგომარეობა':'Состояние постройки';
  sel.dataset.v32Ready='1';
}

function layout(){
  const box=document.getElementById('khExtrasBox');
  if(!box||box.dataset.v32Layout==='1')return;
  box.dataset.v32Layout='1';
  box.classList.add('kh-v32-extras');
  const top=box.firstElementChild;
  if(top)top.classList.add('kh-v32-extras-head');
  let note=box.querySelector('.kh-v32-note');
  if(!note){
    note=document.createElement('div');note.className='hint kh-v32-note';
    note.textContent=ka?'აქ ფასდება მხოლოდ დამატებითი ნაგებობა. ძირითადი სახლის რეკონსტრუქცია ან დანგრევა აირჩიეთ ზემოთ — ძირითადი სახლის მდგომარეობაში.':'Здесь оценивается только дополнительная постройка. Реконструкцию или снос основного дома выбирайте выше — в состоянии основного дома.';
    if(top)top.insertAdjacentElement('afterend',note);else box.prepend(note);
  }
}

function cleanOldNote(){
  const box=document.getElementById('khExtrasBox');
  if(!box)return;
  [...box.querySelectorAll('.hint')].forEach(h=>{
    if(h.classList.contains('kh-v32-note'))return;
    const t=(h.textContent||'').trim();
    if(t.includes('Здесь оценивается только дополнительная постройка')||t.includes('აქ ფასდება მხოლოდ დამატებითი ნაგებობა'))h.remove();
  });
}

function apply(){houseField();cleanOldNote();layout();document.querySelectorAll('.kh-extra-condition').forEach(normalizeExtraSelect)}

const css=document.createElement('style');
css.textContent=`
.kh-v32-note{display:block!important;width:100%!important;max-width:100%!important;margin:8px 0 12px!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;line-height:1.35!important}
.kh-v32-extras-head{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:12px!important;align-items:center!important;width:100%!important}
.kh-v32-extras-head>div{min-width:0!important}.kh-v32-extras-head .hint{max-width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important}
@media(max-width:700px){
 .kh-v32-extras-head{grid-template-columns:1fr!important}
 .kh-v32-extras-head>button{width:100%!important;max-width:none!important}
 .kh-extra-row{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;width:100%!important}
 .kh-extra-row>.field,.kh-extra-row>.check,.kh-extra-row>.kh-extra-remove{grid-column:1!important;width:100%!important;min-width:0!important}
 .kh-extra-row select,.kh-extra-row input{width:100%!important;max-width:100%!important;min-width:0!important}
 .kh-extra-row .kh-extra-remove{grid-row:auto!important}
 .kh-extra-row .check{white-space:normal!important;overflow-wrap:anywhere!important}
}
`;
document.head.appendChild(css);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,80));else setTimeout(apply,80);
// Only observe newly added rows; never rewrite an already prepared select, so Android native dropdown stays open.
const obs=new MutationObserver(ms=>{let need=false;for(const m of ms){for(const n of m.addedNodes){if(n.nodeType===1&&(n.matches?.('.kh-extra-row,#khExtrasBox')||n.querySelector?.('.kh-extra-row,.kh-extra-condition,#khExtrasBox'))){need=true;break}}if(need)break}if(need)setTimeout(apply,20)});
obs.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('submit',()=>{document.querySelectorAll('.kh-extra-condition').forEach(s=>{if(s.value==='demolition'||s.value==='reconstruction')s.value='repair'})},true);
})();
