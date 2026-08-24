(()=>{'use strict';
// Inbox is now provided natively by the active SPA bundle.
// Remove any leftover external overlay from older cached versions.
try{
  const old=document.getElementById('kh-inbox-page-layer');
  if(old) old.remove();
  document.documentElement.style.overflow='';
  document.body.style.overflow='';
}catch(e){}
})();