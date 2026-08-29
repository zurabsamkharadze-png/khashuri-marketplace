(()=>{'use strict';
if(window.__kh64CardFix)return;
window.__kh64CardFix=true;
function install(){
  if(document.getElementById('kh64CardFixStyle'))return;
  const s=document.createElement('style');
  s.id='kh64CardFixStyle';
  s.textContent=`
/* V64 — unified marketplace cards */
#kh63All{box-sizing:border-box!important;overflow:visible!important}
#kh63All .kh63Grid{align-items:stretch!important}
#kh63All .kh63Card{
  box-sizing:border-box!important;
  display:flex!important;
  flex-direction:column!important;
  min-width:0!important;
  height:100%!important;
  overflow:hidden!important;
  border-radius:18px!important;
  background:#fff!important;
  box-shadow:0 3px 14px rgba(15,23,42,.075)!important;
}
#kh63All .kh63Pic{
  position:relative!important;
  display:block!important;
  width:100%!important;
  height:auto!important;
  aspect-ratio:1/1!important;
  flex:0 0 auto!important;
  overflow:hidden!important;
  background:#eef1f4!important;
}
#kh63All .kh63Pic>img{
  display:block!important;
  width:100%!important;
  height:100%!important;
  object-fit:cover!important;
}
#kh63All .kh63Fallback{width:100%!important;height:100%!important}
#kh63All .kh63Loc,
#kh63All .kh63Sponsor{
  left:10px!important;
  right:auto!important;
  bottom:10px!important;
  max-width:calc(100% - 68px)!important;
  padding:5px 9px!important;
  border-radius:9px!important;
  font-size:12.5px!important;
  line-height:1.15!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
#kh63All .kh63Body{
  position:relative!important;
  box-sizing:border-box!important;
  display:flex!important;
  flex:1 1 auto!important;
  flex-direction:column!important;
  min-width:0!important;
  min-height:106px!important;
  padding:14px 12px 14px!important;
  background:#fff!important;
}
#kh63All .kh63Price{
  display:block!important;
  min-width:0!important;
  margin:0 0 7px!important;
  padding-right:43px!important;
  font-size:18px!important;
  line-height:1.15!important;
  font-weight:850!important;
  color:#25272d!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
#kh63All .kh63Title{
  display:-webkit-box!important;
  margin:0!important;
  min-height:39px!important;
  font-size:15.5px!important;
  line-height:1.28!important;
  font-weight:400!important;
  color:#45484f!important;
  white-space:normal!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  -webkit-box-orient:vertical!important;
  -webkit-line-clamp:2!important;
}
#kh63All .kh63Fav{
  position:absolute!important;
  left:auto!important;
  right:9px!important;
  top:-21px!important;
  width:42px!important;
  height:42px!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  border-radius:50%!important;
  display:grid!important;
  place-items:center!important;
  background:#fff!important;
  color:#25272d!important;
  font:400 32px/1 Arial,sans-serif!important;
  box-shadow:0 2px 7px rgba(15,23,42,.16)!important;
  z-index:6!important;
}
#kh63All .kh63Fav.on{color:#e5484d!important}
#kh63All .kh63Ad .kh63Body{padding-right:12px!important}
#kh63All .kh63Ad .kh63Price{padding-right:0!important}
#kh63All .kh63Ad .kh63Title{font-weight:650!important}

/* giveaway cards use the same proportions */
#kh61Give .kh61Track{align-items:stretch!important}
#kh61Give .kh61Card{display:flex!important;flex-direction:column!important;height:auto!important;border-radius:18px!important}
#kh61Give .kh61Img{aspect-ratio:1/1!important;flex:0 0 auto!important}
#kh61Give .kh61Loc{left:10px!important;right:auto!important;bottom:10px!important;max-width:calc(100% - 68px)!important}
#kh61Give .kh61Body{display:flex!important;flex:1 1 auto!important;flex-direction:column!important;min-height:106px!important;padding:14px 12px!important}
#kh61Give .kh61Body:after{left:auto!important;right:9px!important;top:-21px!important;width:42px!important;height:42px!important;font-size:32px!important;z-index:6!important}
#kh61Give .kh61Free{padding-right:43px!important;margin-bottom:7px!important;font-size:18px!important;overflow:hidden!important;text-overflow:ellipsis!important}
#kh61Give .kh61Title{min-height:39px!important;font-size:15.5px!important;line-height:1.28!important}

@media(max-width:760px){
  #kh63All{width:100%!important;margin:22px 0 108px!important;padding:0 14px!important}
  #kh63All h2{font-size:27px!important;margin:0 0 16px!important}
  #kh63All .kh63Grid{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:12px 10px!important;
    width:100%!important;
  }
  #kh63All .kh63Card{width:100%!important;max-width:none!important;min-width:0!important;border-radius:16px!important}
  #kh63All .kh63Body{min-height:104px!important;padding:13px 11px 14px!important}
  #kh63All .kh63Price{font-size:17.5px!important;padding-right:41px!important}
  #kh63All .kh63Title{font-size:15px!important;min-height:38px!important}
  #kh63All .kh63Fav{right:8px!important;top:-20px!important;width:40px!important;height:40px!important;font-size:31px!important}
  #kh63All .kh63Loc,#kh63All .kh63Sponsor{left:9px!important;bottom:9px!important;max-width:calc(100% - 64px)!important;font-size:12px!important}
  #kh61Give .kh61Body{min-height:104px!important;padding:13px 11px 14px!important}
  #kh61Give .kh61Body:after{right:8px!important;top:-20px!important;width:40px!important;height:40px!important;font-size:31px!important}
  #kh61Give .kh61Free{font-size:17.5px!important;padding-right:41px!important}
  #kh61Give .kh61Title{font-size:15px!important;min-height:38px!important}
}
@media(max-width:360px){
  #kh63All{padding:0 10px!important}
  #kh63All .kh63Grid{gap:10px 8px!important}
  #kh63All .kh63Body{padding-left:10px!important;padding-right:10px!important}
  #kh63All .kh63Price{font-size:16.5px!important}
  #kh63All .kh63Title{font-size:14.5px!important}
}
`;
  document.head.appendChild(s);
}
install();
new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})();
