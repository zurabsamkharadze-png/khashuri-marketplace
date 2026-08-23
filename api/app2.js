const app = require('./app');

const SHARE_BOOTSTRAP = `<script>(function(){
'use strict';
var SB='https://eppyjmtowtkxcwwhvwzp.supabase.co',KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr',ORIGIN='https://khashuri-marketplace.vercel.app',current=null,loading=false;
function vis(x){if(!x)return false;var r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>20&&r.height>15&&s.display!=='none'&&s.visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight}
function card(){var hs=[].slice.call(document.querySelectorAll('h1,h2,h3')).filter(function(h){return vis(h)&&h.textContent.trim().length>1&&!/Объявления Хашури/i.test(h.textContent)});for(var z=0;z<hs.length;z++){var h=hs[z],n=h;for(var i=0;i<10&&n;i++,n=n.parentElement){if(!vis(n))continue;var t=n.textContent||'';if(/Позвонить/.test(t)&&/Написать/.test(t)&&/Маршрут/.test(t))return {h:h,root:n}}}return null}
function btn(){var b=document.getElementById('kh56-share');if(b)return b;b=document.createElement('button');b.id='kh56-share';b.type='button';b.textContent='↗ Поделиться';b.style.cssText='display:none;position:fixed;left:16px;right:16px;bottom:18px;z-index:2147483640;width:calc(100% - 32px);border:0;border-radius:14px;padding:15px 16px;background:#0f8a80;color:#fff;font-weight:800;font-size:18px;box-shadow:0 8px 28px rgba(0,0,0,.24)';b.onclick=async function(){if(!current)return;var url=ORIGIN+'/business/'+encodeURIComponent(current.id)+'?share=56',title=current.name;try{if(navigator.share)await navigator.share({title:title,url:url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);alert('Ссылка скопирована')}else prompt('Скопируйте ссылку',url)}catch(e){}};document.body.appendChild(b);return b}
async function lookup(name){var u=SB+'/rest/v1/businesses?status=eq.published&name=eq.'+encodeURIComponent(name)+'&select=id,name&limit=1';var r=await fetch(u,{headers:{apikey:KEY,Accept:'application/json'}});if(!r.ok)return null;var a=await r.json();return a&&a[0]||null}
async function tick(){var c=card(),b=btn();if(!c){if(!current)b.style.display='none';return}b.style.display='block';var name=c.h.textContent.trim();if(current&&current.name===name)return;if(loading)return;loading=true;try{var x=await lookup(name);if(x){current=x;b.style.display='block'}}catch(e){}finally{loading=false}}
document.addEventListener('click',function(e){var t=(e.target&&e.target.textContent||'').trim();if(t==='×'||t==='✕'||t==='✖'){current=null;btn().style.display='none';setTimeout(tick,350)}else setTimeout(tick,160)},true);
setInterval(tick,600);setTimeout(tick,250);})();</script>`;

function patchText(s) {
  s = s
    .replace('/khashuri-v55-business.js?v=55.5', '/khashuri-v55-business.js?v=55.9')
    .replace('github-vercel-v55-5', 'github-vercel-v56');
  if (s.includes('</body>') && !s.includes('id="kh56-share"')) s = s.replace('</body>', SHARE_BOOTSTRAP + '</body>');
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
