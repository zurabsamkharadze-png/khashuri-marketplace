(()=>{'use strict';
if(!/\/valuation\/new/.test(location.pathname))return;
let raw=null;try{raw=JSON.parse(localStorage.getItem('valuation:repeat-prefill')||'null')}catch(e){}
if(!raw)return;const x={...raw,...(raw.input_data||{})};
const extras=Array.isArray(x.outbuildings)?x.outbuildings.filter(o=>o&&('area'in o||['commercial','garage','guest_house','storage','utility','other'].includes(o.type))):[];
window.khRepeatExtras=extras;
window.khRepeatStructural=x.structural_condition||raw.calculation_details?.structural_condition||'usable';
function apply(){const s=document.getElementById('structural_condition');if(s&&window.khRepeatStructural)s.value=window.khRepeatStructural;if(extras.length&&typeof window.khSetAdditionalStructures==='function')window.khSetAdditionalStructures(extras)}
apply();setTimeout(apply,80);setTimeout(apply,300);setTimeout(apply,900);
})();