(()=>{'use strict';
function preserve(root=document){root.querySelectorAll?.('select option').forEach(o=>{if(o.dataset.modelValue)return;const explicit=o.getAttribute('value'),original=explicit!==null?explicit:(o.textContent||'').trim();o.dataset.modelValue=original;if(explicit===null)o.setAttribute('value',original)})}
preserve();
const mo=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)preserve(n)});
mo.observe(document.documentElement,{childList:true,subtree:true});
})();