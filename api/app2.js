const app = require('./app');

const BUSINESS_NAV = `<script>(function(){
'use strict';
if(/^\\/business\\//.test(location.pathname)) return;
var SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
var KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr';
var ORIGIN='https://khashuri-marketplace.vercel.app';
var businesses=null,loading=null;
function load(){
  if(businesses) return Promise.resolve(businesses);
  if(loading) return loading;
  loading=fetch(SB+'/rest/v1/businesses?status=eq.published&select=id,name&limit=500',{headers:{apikey:KEY,Accept:'application/json'}})
    .then(function(r){return r.ok?r.json():[]})
    .then(function(a){businesses=(a||[]).filter(function(x){return x&&x.id&&x.name}).sort(function(a,b){return b.name.length-a.name.length});return businesses})
    .catch(function(){businesses=[];return businesses});
  return loading;
}
load();
function visible(el){if(!el)return false;var r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>100&&r.height>40&&s.display!=='none'&&s.visibility!=='hidden'}
function candidate(target,list){
  var n=target;
  for(var d=0;d<10&&n&&n!==document.body;d++,n=n.parentElement){
    if(!visible(n)) continue;
    var r=n.getBoundingClientRect();
    if(r.height<100||r.height>900) continue;
    var text=(n.textContent||'').replace(/\\s+/g,' ').trim();
    if(!/Открыть/.test(text)) continue;
    for(var i=0;i<list.length;i++){
      var name=list[i].name;
      if(name&&text.indexOf(name)!==-1) return list[i];
    }
  }
  return null;
}
function intercept(e){
  var t=e.target;
  if(!t||!t.closest) return;
  var maybe=t.closest('button,a,[role="button"]');
  var txt=((maybe&&maybe.textContent)||'').trim();
  var n=t,hasOpen=/Открыть/.test(txt);
  if(!hasOpen){
    for(var d=0;d<5&&n&&n!==document.body;d++,n=n.parentElement){
      if(/Открыть/.test(n.textContent||'')){hasOpen=true;break}
    }
  }
  if(!hasOpen) return;
  e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  load().then(function(list){
    var b=candidate(t,list);
    if(b) location.assign(ORIGIN+'/business/'+encodeURIComponent(b.id)+'?v=58.1');
  });
}
document.addEventListener('click',intercept,true);
})();</script>`;

function patch(html, reqUrl){
  const path=(reqUrl||'').split('?')[0];
  if(/^\/business\//.test(path)) return html;
  if(html.includes('</body>')&&!html.includes('v58.1 route business cards')){
    return html.replace('</body>', BUSINESS_NAV+'<!-- v58.1 route business cards --></body>');
  }
  return html;
}

module.exports = async function khashuriApp2(req,res){
  const end=res.end.bind(res);
  res.end=function(body,...args){
    if(typeof body==='string') body=patch(body,req.url);
    else if(Buffer.isBuffer(body)) body=Buffer.from(patch(body.toString('utf8'),req.url),'utf8');
    return end(body,...args);
  };
  return app(req,res);
};
