(()=>{'use strict';
if(!/\/valuation\/new/.test(location.pathname))return;
const orig=window.khAwaitValuationSave;if(typeof orig!=='function')return;
function countRepeat(){try{const a=JSON.parse(localStorage.getItem('valuation:repeat-photos')||'[]');return Array.isArray(a)?a.length:0}catch(e){return 0}}
window.khAwaitValuationSave=async function(id){
  const input=document.getElementById('photos');
  const selected=input?.files?Math.min(20,input.files.length):0;
  const repeated=countRepeat();
  const expected=selected+repeated;
  const uuid=await orig(id);
  if(expected){
    let saved=0;try{saved=Number(localStorage.getItem('valuation:photos:'+String(id))||0)}catch(e){}
    if(saved<expected)throw new Error('Фотографии не сохранены полностью: '+saved+' из '+expected+'. Оценка оставлена на этой странице, чтобы фото не потерялись.');
  }
  return uuid;
};
})();