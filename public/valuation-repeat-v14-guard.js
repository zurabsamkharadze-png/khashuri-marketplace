(()=>{'use strict';
if(!/\/valuation\/new/.test(location.pathname))return;
let raw=null;try{raw=JSON.parse(localStorage.getItem('valuation:repeat-prefill')||'null')}catch(e){}
if(!raw)return;
const x={...raw,...(raw.input_data||{})};
const code=String(x.cadastral_code||raw.cadastral_code||'');
const created=Date.parse(raw.created_at||x.created_at||'');
const cutoff=Date.parse('2026-08-26T17:40:00Z');
const arr=Array.isArray(x.outbuildings)?x.outbuildings:[];
const legacyShape=arr.some(o=>o&&(['additional_building','unspecified'].includes(o.type)));
const legacy=code==='69.08.63.588'&&legacyShape&&(!created||created<cutoff);
if(!legacy)return;
let userTouched=false;
document.addEventListener('click',e=>{if(e.target&&e.target.id==='outbuildings'&&e.isTrusted)userTouched=true},true);
function fix(){if(userTouched)return;const el=document.getElementById('outbuildings');if(el)el.checked=false}
[0,60,150,300,600,1000,1600].forEach(ms=>setTimeout(fix,ms));
})();