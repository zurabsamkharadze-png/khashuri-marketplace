(()=>{'use strict';
if(!/\/valuation\/new/.test(location.pathname))return;
const q=new URLSearchParams(location.search),ka=q.get('lang')==='ka',repeat=q.get('repeat')==='1';
const TXT=ka?{unknown:'არ არის მითითებული',note:'საკადასტრო მონაცემები რემონტისა და ტექნიკურ მდგომარეობას არ განსაზღვრავს — აირჩიეთ დათვალიერების შემდეგ.',choose:'აირჩიეთ თითოეული სართულის მდგომარეობა შეფასების დაწყებამდე.'}:{unknown:'Не указано',note:'Кадастровые данные не определяют ремонт и техническое состояние — выберите после осмотра.',choose:'Выберите состояние каждого этажа перед расчётом.'};
function ensureUnknown(sel,kind){
  if(!sel)return;
  let o=sel.querySelector('option[value="unknown"]');
  if(!o){o=document.createElement('option');o.value='unknown';o.textContent=TXT.unknown;sel.insertBefore(o,sel.firstChild)}else o.textContent=TXT.unknown;
  if(!repeat){
    if(kind==='floor'&&sel.value==='new_repair')sel.value='unknown';
    if(kind==='house'&&sel.value==='usable')sel.value='unknown';
  }
  sel.dataset.khV40='1';
}
function patchFloors(root=document){root.querySelectorAll?.('#floors select.condition').forEach(s=>ensureUnknown(s,'floor'))}
function patchHouse(){
  const s=document.getElementById('structural_condition');if(!s)return;
  ensureUnknown(s,'house');
  if(!s.dataset.khV40Guard){
    s.dataset.khV40Guard='1';
    const guard=e=>{
      if(e.isTrusted){s.dataset.khManual='1';return}
      if(!repeat&&!s.dataset.khManual&&s.dataset.cadAuto==='1'){
        s.value='unknown';delete s.dataset.cadAuto;
      }
    };
    s.addEventListener('input',guard,true);s.addEventListener('change',guard,true);
  }
  const f=s.closest('.field')||s.parentElement;
  if(f&&!f.querySelector('.kh-v40-source-note')){const n=document.createElement('div');n.className='hint kh-v40-source-note';n.textContent=TXT.note;n.style.cssText='margin-top:7px;color:#687283;line-height:1.35';f.appendChild(n)}
}
function addFloorNote(){const floors=document.getElementById('floors');if(!floors)return;const parent=floors.parentElement;if(!parent||parent.querySelector('.kh-v40-floor-note'))return;const n=document.createElement('div');n.className='hint kh-v40-floor-note';n.textContent=TXT.note;n.style.cssText='margin-top:7px;color:#687283;line-height:1.35';floors.insertAdjacentElement('afterend',n)}
function apply(){patchFloors();patchHouse();addFloorNote()}
function firstUnknown(){return [...document.querySelectorAll('#floors select.condition')].find(s=>s.value==='unknown'||!s.value)}
function blockIfUnknown(e){const bad=firstUnknown();if(!bad)return false;e?.preventDefault?.();e?.stopImmediatePropagation?.();bad.style.outline='2px solid #d97706';bad.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>bad.focus(),250);alert(TXT.choose);return true}
document.addEventListener('submit',e=>{if(e.target?.id==='vf')blockIfUnknown(e)},true);
document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(!b)return;const f=b.closest?.('#vf');if(!f)return;if(b.type==='submit'||String(b.textContent||'').toLowerCase().includes(ka?'გამოთ':'рассч'))blockIfUnknown(e)},true);
const obs=new MutationObserver(ms=>{let need=false;for(const m of ms)for(const n of m.addedNodes){if(n.nodeType===1&&(n.matches?.('#floors,.floor,select.condition,#structural_condition')||n.querySelector?.('select.condition,#structural_condition'))){need=true;break}}if(need)setTimeout(apply,0)});
obs.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,120));else setTimeout(apply,120);
})();
