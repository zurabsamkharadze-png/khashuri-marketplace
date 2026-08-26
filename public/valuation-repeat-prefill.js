(()=>{'use strict';
function safe(v){try{return JSON.parse(v||'null')}catch(e){return null}}
function setVal(id,v){const e=document.getElementById(id);if(!e||v===undefined||v===null||v==='')return;e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}
function setCheck(id,v){const e=document.getElementById(id);if(!e)return;e.checked=!!v;e.dispatchEvent(new Event('change',{bubbles:true}))}
function toast(){const d=document.createElement('div');d.textContent='↻ Данные прошлой оценки заполнены. Измените нужные параметры и пересчитайте.';d.style.cssText='position:fixed;left:14px;right:14px;top:82px;z-index:9999;background:#102f3e;color:#fff;padding:13px 15px;border-radius:14px;font:700 13px system-ui;box-shadow:0 8px 28px rgba(0,0,0,.16)';document.body.appendChild(d);setTimeout(()=>d.remove(),4200)}
function apply(){
  if(!/\/valuation\/new/.test(location.pathname))return;
  const raw=safe(localStorage.getItem('valuation:repeat-prefill'));if(!raw)return;
  const x={...raw,...(raw.input_data||{})};
  const floors=Array.isArray(x.floors)&&x.floors.length?x.floors:(Array.isArray(raw.floor_areas)?raw.floor_areas.map((f,i)=>({floor:f.floor||i+1,area:f.area,condition:raw.floor_conditions?.[i]?.condition||'average'})):[]);
  if(!document.getElementById('vf'))return false;
  const ids=['cadastral_code','city','address','latitude','longitude','house_area','land_area','land_purpose','rooms','bedrooms','bathrooms','build_year','material','lot_frontage','lot_depth','lot_shape','terrain','road_type','heating','commercial_potential','owner_asking_price'];
  ids.forEach(id=>setVal(id,x[id]));
  setVal('floor_count',x.floor_count||floors.length||1);
  ['basement','garage','balcony'].forEach(id=>setCheck(id,x[id]));setCheck('outbuildings',Array.isArray(x.outbuildings)?x.outbuildings.length>0:!!x.outbuildings);
  const u=x.utilities||{};['gas','water','sewer','electricity','internet'].forEach(id=>setCheck(id,u[id]));
  if(typeof window.renderFloors==='function')window.renderFloors();
  const rows=[...document.querySelectorAll('#floors .floor')];floors.forEach((f,i)=>{const r=rows[i];if(!r)return;const a=r.querySelector('.area'),c=r.querySelector('.condition');if(a&&f.area!=null)a.value=String(f.area);if(c&&f.condition)c.value=String(f.condition)});
  try{localStorage.removeItem('valuation:repeat-prefill')}catch(e){}
  try{history.replaceState(null,'','/valuation/new?mode=precise')}catch(e){}
  toast();return true;
}
let n=0,t=setInterval(()=>{if(apply()||++n>40)clearInterval(t)},150);if(document.readyState!=='loading')setTimeout(apply,50);else document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,50));
})();