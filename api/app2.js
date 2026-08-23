const app = require('./app');

const BUSINESS_PAGE_BOOTSTRAP = `<style>
html.kh-business-page,body.kh-business-page{background:#fff!important;overflow:hidden!important}
#kh-business-share-page{display:block;width:100%;margin:12px 0 14px;border:0;border-radius:14px;padding:14px 16px;background:#0f8a80;color:#fff;font-weight:800;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,.10);box-sizing:border-box}
</style><script>(function(){
'use strict';
var SB='https://eppyjmtowtkxcwwhvwzp.supabase.co',KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr',ORIGIN='https://khashuri-marketplace.vercel.app';
var onBusiness=/^\\/business\\//.test(location.pathname),business=null,loading=false,navigating=false;
function vis(x){if(!x)return false;var r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>20&&r.height>15&&s.display!=='none'&&s.visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight}
function cleanupLegacy(){['kh56-share-top','kh56-share','kh-business-share-page'].forEach(function(id){var x=document.getElementById(id);if(x&&!onBusiness)x.remove()})}
cleanupLegacy();if(!onBusiness)setInterval(cleanupLegacy,700);
async function api(path){var r=await fetch(SB+'/rest/v1/'+path,{headers:{apikey:KEY,Accept:'application/json'}});if(!r.ok)return null;var a=await r.json();return a&&a[0]||null}
async function lookupName(name){return api('businesses?status=eq.published&name=eq.'+encodeURIComponent(name)+'&select=id,name,slug&limit=1')}
async function lookupPath(){var k=decodeURIComponent(location.pathname.replace(/^\\/business\\//,'').split('/')[0]||'');if(!k)return null;var isId=/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(k),f=isId?'id=eq.'+encodeURIComponent(k):'slug=eq.'+encodeURIComponent(k);return api('businesses?'+f+'&status=eq.published&select=id,name,slug&limit=1')}
function candidateName(box){var xs=[].slice.call(box.querySelectorAll('h1,h2,h3,strong,b,[class*=name],[class*=title]'));for(var i=0;i<xs.length;i++){var t=(xs[i].textContent||'').trim();if(t.length>1&&t.length<80&&!/Открыть|Позвонить|Написать|Маршрут|Витрина|О компании|Товары|Отзывы|Хашури|Рекомендуем/i.test(t))return t}return ''}
function businessCardFromTarget(target){var n=target;for(var i=0;i<10&&n&&n!==document.body;i++,n=n.parentElement){if(!vis(n))continue;var t=n.textContent||'';if(/Открыть\s*→?/.test(t)&&n.getBoundingClientRect().height>100&&n.getBoundingClientRect().height<900){var name=candidateName(n);if(name)return{name:name,root:n}}}return null}
if(!onBusiness){document.addEventListener('click',function(e){if(navigating)return;var c=businessCardFromTarget(e.target);if(!c)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();navigating=true;(async function(){try{var b=await lookupName(c.name);if(b){location.assign(ORIGIN+'/business/'+encodeURIComponent(b.id)+'?v=57.1');return}}catch(x){}navigating=false})()},true)}
function actionRoot(){var bs=[].slice.call(document.querySelectorAll('button')).filter(vis);for(var i=0;i<bs.length;i++){if(!/Позвонить/.test(bs[i].textContent||''))continue;var n=bs[i].parentElement;for(var d=0;d<10&&n;d++,n=n.parentElement){var t=n.textContent||'';if(/Позвонить/.test(t)&&/Написать/.test(t)&&/Маршрут/.test(t)&&/Витрина/.test(t))return n}}return null}
function closeBtn(root){var n=root;for(var d=0;d<12&&n;d++,n=n.parentElement){var bs=[].slice.call(n.querySelectorAll('button'));for(var i=0;i<bs.length;i++){var t=(bs[i].textContent||'').trim();if(vis(bs[i])&&(t==='×'||t==='✕'||t==='✖'))return{button:bs[i],root:n}}}return null}
function internalTitle(root,name){var xs=[].slice.call(root.querySelectorAll('h1,h2,h3,strong,b,[class*=name],[class*=title]')).filter(vis),matches=[];for(var i=0;i<xs.length;i++)if((xs[i].textContent||'').trim()===name)matches.push(xs[i]);if(matches.length){matches.sort(function(a,b){return a.getBoundingClientRect().top-b.getBoundingClientRect().top});return matches[matches.length-1]}return null}
function stylePage(root){var p=root;while(p.parentElement&&p!==document.body){var r=p.getBoundingClientRect();if(r.width>=innerWidth*.94&&r.height>=innerHeight*.65)break;p=p.parentElement}var s=p.style;s.setProperty('position','fixed','important');s.setProperty('inset','0','important');s.setProperty('width','100vw','important');s.setProperty('height','100dvh','important');s.setProperty('max-width','none','important');s.setProperty('max-height','none','important');s.setProperty('margin','0','important');s.setProperty('border-radius','0','important');s.setProperty('transform','none','important');s.setProperty('overflow-y','auto','important');s.setProperty('background','#fff','important');s.setProperty('z-index','2147483000','important');document.documentElement.classList.add('kh-business-page');document.body.classList.add('kh-business-page');return p}
function shareButton(title){['kh56-share-top','kh56-share'].forEach(function(id){var x=document.getElementById(id);if(x)x.remove()});var b=document.getElementById('kh-business-share-page');if(!b){b=document.createElement('button');b.id='kh-business-share-page';b.type='button';b.textContent='↗ Поделиться';b.onclick=async function(){if(!business)return;var url=ORIGIN+'/business/'+encodeURIComponent(business.id)+'?share=57.1';try{if(navigator.share)await navigator.share({title:business.name,url:url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);alert('Ссылка скопирована')}else prompt('Скопируйте ссылку',url)}catch(e){}};title.insertAdjacentElement('afterend',b)}return b}
function backify(c){var b=c.button;if(b.dataset.khPageBack)return;b.dataset.khPageBack='1';b.textContent='←';b.setAttribute('aria-label','Назад');b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();history.length>1?history.back():location.assign('/')},true)}
async function mount(){if(!onBusiness)return;if(!business&&!loading){loading=true;try{business=await lookupPath()}catch(e){}finally{loading=false}}if(!business)return;var ar=actionRoot();if(!ar)return;var c=closeBtn(ar);if(!c)return;var page=stylePage(c.root),title=internalTitle(page,business.name);backify(c);if(title)shareButton(title)}
if(onBusiness){setInterval(mount,400);setTimeout(mount,200)}
})();</script>`;

function patchText(s) {
  s = s
    .replace(/<script[^>]+src=["']\/khashuri-v55-business\.js[^"']*["'][^>]*><\/script>/gi, '')
    .replace('github-vercel-v55-5', 'github-vercel-v57-1');
  if (s.includes('</body>') && !s.includes('kh-business-share-page')) s = s.replace('</body>', BUSINESS_PAGE_BOOTSTRAP + '</body>');
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
