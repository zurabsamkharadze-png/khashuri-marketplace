(()=>{'use strict';
if(!/\/valuation\/new/.test(location.pathname))return;
const ka=new URLSearchParams(location.search).get('lang')==='ka';
function fixHouse(){
  const s=document.getElementById('structural_condition');
  if(!s)return;
  const f=s.closest('.field')||s.parentElement;
  if(f&&!f.dataset.v31House){
    f.dataset.v31House='1';
    const label=f.querySelector('label');
    if(label)label.textContent=ka?'ძირითადი სახლის ტექნიკური მდგომარეობა':'Техническое состояние основного дома';
    const hint=f.querySelector('.hint');
    if(hint)hint.textContent=ka?'„რეკონსტრუქცია“ და „დასანგრევია“ ეხება მხოლოდ ძირითად სახლს და არა ეზოს დამატებით/კომერციულ ნაგებობებს.':'«Реконструкция» и «Под снос» относятся только к основному дому, а не к дополнительным или коммерческим постройкам.';
    f.style.cssText+=';border:1px solid #b9ded8;border-radius:14px;padding:12px;background:#f3fbf9';
  }
}
function fixExtraSelect(sel){
  if(!sel)return;
  if(sel.value==='demolition'||sel.value==='reconstruction')sel.value='repair';
  [...sel.querySelectorAll('option')].forEach(o=>{if(o.value==='demolition'||o.value==='reconstruction')o.remove()});
  const wanted=ka?{good:'კარგი',average:'საშუალო',repair:'საჭიროებს რემონტს'}:{good:'Хорошее',average:'Среднее',repair:'Требует ремонта'};
  Object.entries(wanted).forEach(([v,t])=>{let o=sel.querySelector(`option[value="${v}"]`);if(!o){o=document.createElement('option');o.value=v;sel.appendChild(o)}o.textContent=t});
  const field=sel.closest('.field');
  const label=field?.querySelector('label');
  if(label)label.textContent=ka?'ნაგებობის მდგომარეობა':'Состояние постройки';
}
function fixExtras(){
  document.querySelectorAll('.kh-extra-condition').forEach(fixExtraSelect);
  const box=document.getElementById('khExtrasBox');
  if(box&&!box.dataset.v31Note){
    box.dataset.v31Note='1';
    const head=box.querySelector('div > div');
    if(head){const n=document.createElement('div');n.className='hint';n.style.marginTop='5px';n.textContent=ka?'აქ ფასდება მხოლოდ დამატებითი ნაგებობა. ძირითადი სახლის „რეკონსტრუქცია/დასანგრევია“ აირჩიეთ ზემოთ, სახლის მდგომარეობაში.':'Здесь оценивается только дополнительная постройка. «Реконструкция / Под снос» выбираются выше — в состоянии основного дома.';head.appendChild(n)}
  }
}
function sanitize(){document.querySelectorAll('.kh-extra-condition').forEach(s=>{if(s.value==='demolition'||s.value==='reconstruction')s.value='repair'})}
function run(){fixHouse();fixExtras()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,60));else setTimeout(run,60);
let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(run,40)}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('submit',e=>{if(e.target?.id==='vf')sanitize()},true);
})();
