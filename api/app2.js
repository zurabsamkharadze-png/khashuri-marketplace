const app = require('./app');

const BUSINESS_MODAL_SHARE = `<script>(function(){
'use strict';
if(/^\\/business\\//.test(location.pathname)) return;
var SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
var KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr';
var ORIGIN='https://khashuri-marketplace.vercel.app';
var businesses=null,loading=null,current=null;
function vis(el){if(!el)return false;var r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>20&&r.height>15&&s.display!=='none'&&s.visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight}
function load(){if(businesses)return Promise.resolve(businesses);if(loading)return loading;loading=fetch(SB+'/rest/v1/businesses?status=eq.published&select=id,name&limit=500',{headers:{apikey:KEY,Accept:'application/json'}}).then(function(r){return r.ok?r.json():[]}).then(function(a){businesses=(a||[]).filter(function(x){return x&&x.id&&x.name}).sort(function(a,b){return b.name.length-a.name.length});return businesses}).catch(function(){businesses=[];return businesses});return loading}
function actionRoot(){var bs=[].slice.call(document.querySelectorAll('button')).filter(vis);for(var i=0;i<bs.length;i++){if(!/Позвонить/.test(bs[i].textContent||''))continue;var n=bs[i].parentElement;for(var d=0;d<10&&n;d++,n=n.parentElement){var t=n.textContent||'';if(/Позвонить/.test(t)&&/Написать/.test(t)&&/Маршрут/.test(t)&&/Витрина/.test(t))return n}}return null}
function modalRoot(ar){var n=ar;for(var d=0;d<12&&n&&n!==document.body;d++,n=n.parentElement){var t=n.textContent||'',r=n.getBoundingClientRect();if(r.width>260&&r.height>500&&(/О компании/.test(t)||/Товары/.test(t)||/Отзывы/.test(t)))return n}return ar}
function findBusiness(root,list){var text=(root.textContent||'').replace(/\\s+/g,' ');for(var i=0;i<list.length;i++)if(text.indexOf(list[i].name)!==-1)return list[i];return null}
function titleEl(root,name){var xs=[].slice.call(root.querySelectorAll('h1,h2,h3,strong,b,[class*=name],[class*=title]')).filter(vis),m=[];for(var i=0;i<xs.length;i++)if((xs[i].textContent||'').trim()===name)m.push(xs[i]);if(!m.length)return null;m.sort(function(a,b){return a.getBoundingClientRect().top-b.getBoundingClientRect().top});return m[m.length-1]}
function clearLegacy(){['kh56-share-top','kh56-share','kh-business-share-page'].forEach(function(id){var x=document.getElementById(id);if(x)x.remove()});var extras=[].slice.call(document.querySelectorAll('button')).filter(function(b){return (b.textContent||'').trim()==='↗ Поделиться'&&b.id!=='kh59-business-share'});extras.forEach(function(x){x.remove()})}
function mount(){clearLegacy();var ar=actionRoot();if(!ar){var old=document.getElementById('kh59-business-share');if(old)old.remove();current=null;return}var root=modalRoot(ar);load().then(function(list){var b=findBusiness(root,list);if(!b)return;current=b;var title=titleEl(root,b.name);if(!title)return;var old=document.getElementById('kh59-business-share');if(old){if(old.previousElementSibling===title)return;old.remove()}var btn=document.createElement('button');btn.id='kh59-business-share';btn.type='button';btn.textContent='↗ Поделиться';btn.style.cssText='display:block;width:100%;margin:12px 0 14px;border:0;border-radius:14px;padding:14px 16px;background:#0f8a80;color:#fff;font-weight:800;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,.10);box-sizing:border-box';btn.onclick=async function(){if(!current)return;var url=ORIGIN+'/business/'+encodeURIComponent(current.id)+'?share=59';try{if(navigator.share)await navigator.share({title:current.name,url:url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);alert('Ссылка скопирована')}else prompt('Скопируйте ссылку',url)}catch(e){}};title.insertAdjacentElement('afterend',btn)})}
load();document.addEventListener('click',function(){setTimeout(mount,180)},true);setInterval(mount,900);setTimeout(mount,350);
})();</script>`;

function patch(html, reqUrl){
  const path=(reqUrl||'').split('?')[0];
  html=html.replace(/<script[^>]+src=["']\\/khashuri-v55-business\\.js[^"']*["'][^>]*><\\/script>/gi,'');
  if(/^\/business\//.test(path)) return html;
  if(html.includes('</body>')&&!html.includes('kh59-business-share')) return html.replace('</body>',BUSINESS_MODAL_SHARE+'<!-- v59 rich business modal share --></body>');
  return html;
}

module.exports=async function khashuriApp2(req,res){
  const end=res.end.bind(res);
  res.end=function(body,...args){
    if(typeof body==='string')body=patch(body,req.url);
    else if(Buffer.isBuffer(body))body=Buffer.from(patch(body.toString('utf8'),req.url),'utf8');
    return end(body,...args);
  };
  return app(req,res);
};
