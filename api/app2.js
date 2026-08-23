const app = require('./app');

const SHARE_BOOTSTRAP = `<script>(function(){
'use strict';
var SB='https://eppyjmtowtkxcwwhvwzp.supabase.co',KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr',ORIGIN='https://khashuri-marketplace.vercel.app',current=null,loading=false;
function vis(x){if(!x)return false;var r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>20&&r.height>15&&s.display!=='none'&&s.visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight}
function hasClose(root){var bs=[].slice.call(root.querySelectorAll('button'));return bs.some(function(b){if(!vis(b))return false;var t=(b.textContent||'').trim();return t==='×'||t==='✕'||t==='✖'})}
function card(){var hs=[].slice.call(document.querySelectorAll('h1,h2,h3')).filter(function(h){return vis(h)&&h.textContent.trim().length>1&&!/Объявления Хашури/i.test(h.textContent)});for(var z=0;z<hs.length;z++){var h=hs[z],n=h;for(var i=0;i<12&&n;i++,n=n.parentElement){if(!vis(n))continue;var t=n.textContent||'';if(/Позвонить/.test(t)&&/Написать/.test(t)&&/Маршрут/.test(t)&&hasClose(n))return {h:h,root:n}}}return null}
async function lookup(name){var u=SB+'/rest/v1/businesses?status=eq.published&name=eq.'+encodeURIComponent(name)+'&select=id,name&limit=1';var r=await fetch(u,{headers:{apikey:KEY,Accept:'application/json'}});if(!r.ok)return null;var a=await r.json();return a&&a[0]||null}
function makeButton(c){var b=document.getElementById('kh56-share-top');if(b&&b.isConnected){if(b.previousElementSibling!==c.h){b.remove()}else return b}b=document.createElement('button');b.id='kh56-share-top';b.type='button';b.textContent='↗ Поделиться';b.style.cssText='display:block;width:calc(100% - 32px);margin:12px 16px 14px;border:0;border-radius:14px;padding:14px 16px;background:#0f8a80;color:#fff;font-weight:800;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,.10);box-sizing:border-box';b.onclick=async function(){try{var name=c.h.textContent.trim();if(!current||current.name!==name)current=await lookup(name);if(!current)return;var url=ORIGIN+'/business/'+encodeURIComponent(current.id)+'?share=56.2',title=current.name;if(navigator.share)await navigator.share({title:title,url:url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);alert('Ссылка скопирована')}else prompt('Скопируйте ссылку',url)}catch(e){}};c.h.insertAdjacentElement('afterend',b);return b}
async function tick(){var c=card(),old=document.getElementById('kh56-share-top');if(!c){current=null;if(old)old.remove();return}makeButton(c);var name=c.h.textContent.trim();if((current&&current.name===name)||loading)return;loading=true;try{var x=await lookup(name);if(x)current=x}catch(e){}finally{loading=false}}
document.addEventListener('click',function(){setTimeout(tick,180)},true);setInterval(tick,700);setTimeout(tick,300);})();</script>`;

function patchText(s) {
  s = s
    .replace(/<script[^>]+src=["']\/khashuri-v55-business\.js[^"']*["'][^>]*><\/script>/gi, '')
    .replace('github-vercel-v55-5', 'github-vercel-v56-2');
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
