(()=>{'use strict';
const q=new URLSearchParams(location.search),ka=q.get('lang')==='ka';
const labels=ka?{reconstruction:'რეკონსტრუქციას საჭიროებს',demolition:'დასანგრევია'}:{reconstruction:'Реконструкция',demolition:'Под снос'};
function patchSelect(s){
  if(!s||!s.classList.contains('condition'))return;
  const current=s.value;
  const repair=s.querySelector('option[value="repair"]');
  for(const key of ['reconstruction','demolition']){
    let o=s.querySelector(`option[value="${key}"]`);
    if(!o){o=document.createElement('option');o.value=key;if(repair&&repair.nextSibling)s.insertBefore(o,repair.nextSibling);else s.appendChild(o)}
    o.textContent=labels[key];
  }
  if(current)s.value=current;
  s.dataset.v34='1';
}
function patchForm(){
  const floors=document.getElementById('floors');
  if(!floors)return;
  floors.querySelectorAll('select.condition').forEach(patchSelect);
  if(!floors.dataset.v34observer){
    floors.dataset.v34observer='1';
    new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches?.('select.condition'))patchSelect(n);n.querySelectorAll?.('select.condition').forEach(patchSelect)}}).observe(floors,{childList:true,subtree:true});
  }
}
function translateResult(){
  if(!ka)return;
  const map={'Реконструкция':'რეკონსტრუქცია','Под снос':'დასანგრევი','Требуется реконструкция':'რეკონსტრუქციას საჭიროებს','Дом под снос':'სახლი დასანგრევია'};
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
  for(const n of nodes){let t=n.nodeValue;for(const [a,b] of Object.entries(map))t=t.split(a).join(b);n.nodeValue=t}
}
function boot(){if(/\/valuation\/new/.test(location.pathname))patchForm();else if(/\/valuation\/result\//.test(location.pathname))translateResult()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80));else setTimeout(boot,80);
})();
