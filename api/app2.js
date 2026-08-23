const app = require('./app');

const SHARE_BOOTSTRAP = `<script>(function(){
'use strict';
var SB='https://eppyjmtowtkxcwwhvwzp.supabase.co',KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr',ORIGIN='https://khashuri-marketplace.vercel.app',current=null,loading=false;
function vis(x){if(!x)return false;var r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>20&&r.height>15&&s.display!=='none'&&s.visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight}
function businessTitle(){var hs=[].slice.call(document.querySelectorAll('h1,h2,h3,strong,b,[class*=title],[class*=name]')).filter(function(h){var t=(h.textContent||'').trim();return vis(h)&&t.length>1&&t.length<80&&!/Хашури|О компании|Товары|Отзывы|Позвонить|Написать|Маршрут|Витрина/i.test(t)});var groups={};for(var i=0;i<hs.length;i++){var t=(hs[i].textContent||'').trim();(groups[t]||(groups[t]=[])).push(hs[i])}for(var k in groups){if(groups[k].length>=2){var arr=groups[k].sort(function(a,b){return a.getBoundingClientRect().top-b.getBoundingClientRect().top});return {name:k,h:arr[arr.length-1]}}}return null}
async function lookup(name){var u=SB+'/rest/v1/businesses?status=eq.published&name=eq.'+encodeURIComponent(name)+'&select=id,name&limit=1';var r=await fetch(u,{headers:{apikey:KEY,Accept:'application/json'}});if(!r.ok)return null;var a=await r.json();return a&&a[0]||null}
function removeOld(){var x=document.getElementById('kh56-share-top');if(x)x.remove()}
function makeButton(c){var old=document.getElementById('kh56-share-top');if(old&&old.previousElementSibling===c.h)return old;removeOld();var b=document.createElement('button');b.id='kh56-share-top';b.type='button';b.textContent='↗ Поделиться';b.style.cssText='display:block;width:100%;margin:12px 0 14px;border:0;border-radius:14px;padding:14px 16px;background:#0f8a80;color:#fff;font-weight:800;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,.10);box-sizing:border-box';b.onclick=async function(){try{if(!current||current.name!==c.name)current=await lookup(c.name);if(!current)return;var url=ORIGIN+'/business/'+encodeURIComponent(current.id)+'?share=56.4',title=current.name;if(navigator.share)await navigator.share({title:title,url:url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);alert('Ссылка скопирована')}else prompt('Скопируйте ссылку',url)}catch(e){}};c.h.insertAdjacentElement('afterend',b);return b}
async function tick(){var c=businessTitle();if(!c){current=null;removeOld();return}makeButton(c);if((current&&current.name===c.name)||loading)return;loading=true;try{var x=await lookup(c.name);if(x)current=x}catch(e){}finally{loading=false}}
document.addEventListener('click',function(){setTimeout(tick,180)},true);setInterval(tick,700);setTimeout(tick,300);})();</script>`;

function patchText(s) {
  s = s
    .replace(/<script[^>]+src=["']\/khashuri-v55-business\.js[^"']*["'][^>]*><\/script>/gi, '')
    .replace('github-vercel-v55-5', 'github-vercel-v56-4');
  if (s.includes('</body>') && !s.includes('kh56-share-top')) s = s.replace('</body>', SHARE_BOOTSTRAP + '</body>');
  return s;
}

module.exports = async function khashuriApp2(req, res) {
  const originalEnd = res.end.bind(res);
  res.end = function patchedEnd(body, ...args) {
    if (typeof body === 'string') body = patchText(body);
    else if (Buffer.isBuffer(body)) body = Buffer.from(patchText(body.toString('utf8')), 'utf8');
    return originalEnd(body, ...args);
  };
  return app(req, res);
};
