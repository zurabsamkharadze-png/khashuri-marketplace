const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr';

module.exports=(req,res)=>{
  res.statusCode=200;
  res.setHeader('content-type','text/html; charset=utf-8');
  res.setHeader('cache-control','no-store, max-age=0, must-revalidate');
  res.end(`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>История оценок | Хашури</title>
<style>
:root{--teal:#11877c;--ink:#131c31;--muted:#70798b;--line:#e3e6eb;--bg:#f4f6f9;--danger:#a72d2d}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
.top{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid var(--line);padding:14px 18px;display:flex;align-items:center;gap:12px}
.back{width:50px;height:50px;border:1px solid var(--line);background:#fff;border-radius:17px;font-size:28px}
.top h1{font-size:24px;margin:0}
.wrap{max-width:900px;margin:auto;padding:18px 16px 100px}
.hero{background:linear-gradient(135deg,#10233c,#0c766e);color:#fff;border-radius:24px;padding:22px}
.hero h2{margin:0 0 7px;font-size:29px}.hero p{margin:0;opacity:.86;line-height:1.45}
.state{margin-top:14px;padding:18px;background:#fff;border:1px solid var(--line);border-radius:20px;color:var(--muted);line-height:1.45}
.state b{color:var(--ink)}
.card{margin-top:12px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:16px}
.head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.head b{font-size:19px}.date{font-size:12px;color:var(--muted)}
.price{font-size:31px;font-weight:950;margin:12px 0 4px}.range{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:13px}.metric{padding:10px;background:#f7f8fa;border-radius:12px}.metric small{display:block;color:var(--muted);font-size:11px}.metric b{display:block;margin-top:3px}
.actions{display:flex;gap:8px;margin-top:13px;flex-wrap:wrap}.btn{border:0;border-radius:13px;padding:11px 14px;font-weight:850;background:var(--teal);color:#fff}.btn.alt{background:#fff;color:var(--ink);border:1px solid var(--line)}
.error{color:var(--danger)}
@media(max-width:650px){.top h1{font-size:21px}.grid{grid-template-columns:1fr 1fr}.price{font-size:28px}}
</style>
</head>
<body>
<header class="top"><button class="back" onclick="location.href='/valuation'">←</button><h1>📊 История оценок</h1></header>
<main class="wrap">
<section class="hero"><h2>Сохранённые оценки</h2><p>Здесь накапливается история объекта и будущие данные для улучшения точности модели.</p></section>
<div id="app" class="state">Загружаю историю…</div>
</main>
<script>
(function(){
'use strict';
var SB=${JSON.stringify(SB)};
var KEY=${JSON.stringify(KEY)};
var app=document.getElementById('app');

function money(x){return '$'+Math.round(Number(x||0)).toLocaleString('en-US')}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function show(html,cls){app.className=cls||'state';app.innerHTML=html}
function safeJson(v){try{return JSON.parse(v||'null')}catch(e){return null}}
function normalizeSession(x){if(!x)return null;if(x.access_token)return x;if(x.currentSession&&x.currentSession.access_token)return x.currentSession;if(x.session&&x.session.access_token)return x.session;if(x.data&&x.data.session&&x.data.session.access_token)return x.data.session;return null}
function getSession(){
  try{
    var direct=normalizeSession(safeJson(localStorage.getItem('kh_session')));
    if(direct)return direct;
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i)||'';
      if(/^sb-.*-auth-token$/.test(k)){
        var found=normalizeSession(safeJson(localStorage.getItem(k)));
        if(found)return found;
      }
    }
  }catch(e){}
  return null;
}
function localRows(){
  var rows=[];
  try{
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i)||'';
      if(k.indexOf('valuation:local-')!==0)continue;
      var x=safeJson(localStorage.getItem(k));
      if(x&&x.id)rows.push(x);
    }
  }catch(e){}
  return rows;
}
function timeout(ms){return new Promise(function(_,reject){setTimeout(function(){reject(new Error('timeout'))},ms)})}
function pack(obj){
  var json=JSON.stringify(obj);
  var bytes=new TextEncoder().encode(json);
  var s='';
  for(var i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
}
async function fetchJson(url,headers){
  var r=await Promise.race([fetch(url,{headers:headers}),timeout(8000)]);
  if(!r.ok)throw new Error('HTTP '+r.status);
  return await r.json();
}
async function openCloud(id){
  var s=getSession();
  if(!s||!s.access_token){alert('Войдите в кабинет, чтобы открыть эту оценку.');return}
  var h={apikey:KEY,Authorization:'Bearer '+s.access_token};
  try{
    var both=await Promise.all([
      fetchJson(SB+'/rest/v1/property_valuations?id=eq.'+encodeURIComponent(id)+'&select=*',h),
      fetchJson(SB+'/rest/v1/valuation_comparables?valuation_id=eq.'+encodeURIComponent(id)+'&select=*',h)
    ]);
    var v=both[0]&&both[0][0];
    if(!v){alert('Оценка не найдена.');return}
    var comps=both[1]||[];
    var floorAreas=Array.isArray(v.floor_areas)?v.floor_areas:[];
    var floorConditions=Array.isArray(v.floor_conditions)?v.floor_conditions:[];
    var floors=floorAreas.map(function(f,i){return {floor:f.floor||i+1,area:Number(f.area||0),condition:(floorConditions[i]&&floorConditions[i].condition)||'average'}});
    var obj=Object.assign({},v,{floors:floors,comparables:comps.map(function(c){return Object.assign({},c,{asking_price:Number(c.asking_price||0),price_per_sqm_usd:Number(c.price_per_sqm||0),condition_label:c.condition_summary,comparison_role:c.metadata&&c.metadata.comparison_role,verified:c.metadata&&c.metadata.verified,city:c.metadata&&c.metadata.city,data_quality:Number(c.metadata&&c.metadata.data_quality||0),similarity_score:Number(c.similarity_score||0)})})});
    location.href='/valuation/result/'+encodeURIComponent(id)+'?data='+encodeURIComponent(pack(obj))+'&v=history';
  }catch(e){alert('Не удалось открыть оценку. Обновите страницу и попробуйте ещё раз.')}
}
function openLocal(id){
  var v=safeJson(localStorage.getItem('valuation:'+id));
  if(!v){alert('Локальная оценка не найдена.');return}
  location.href='/valuation/result/'+encodeURIComponent(id)+'?data='+encodeURIComponent(pack(v))+'&v=history';
}
window.openValuation=function(id,isLocal){if(isLocal)openLocal(id);else openCloud(id)};
app.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.openVal');if(b){openValuation(b.getAttribute('data-id'),b.getAttribute('data-local')==='1');return}if(e.target.closest&&e.target.closest('.newVal')){location.href='/valuation/new?mode=precise';return}if(e.target.closest&&e.target.closest('.reloadVal'))location.reload()});
function render(rows){
  rows.sort(function(a,b){return new Date(b.created_at||0)-new Date(a.created_at||0)});
  if(!rows.length){
    show('<b>История пока пустая.</b><div style="margin-top:8px">Сделайте новую оценку — после расчёта она появится здесь автоматически.</div><div class="actions"><button class="btn newVal">Новая оценка</button></div>');
    return;
  }
  app.className='';
  app.innerHTML=rows.map(function(v){
    var d=new Date(v.created_at||Date.now());
    var local=String(v.id||'').indexOf('local-')===0;
    return '<article class="card"><div class="head"><div><b>'+esc(v.address||v.city||'Объект')+'</b><div class="date">'+d.toLocaleString('ru-RU')+(local?' · сохранено на устройстве':'')+'</div></div><span class="date">'+esc(v.cadastral_code||'')+'</span></div><div class="price">'+money(v.estimated_value)+'</div><div class="range">Диапазон '+money(v.market_low)+'–'+money(v.market_high)+'</div><div class="grid"><div class="metric"><small>Дом</small><b>'+Number(v.house_area||0)+' м²</b></div><div class="metric"><small>Земля</small><b>'+Number(v.land_area||0)+' м²</b></div><div class="metric"><small>Точность</small><b>'+Number(v.confidence_score||0)+'/100</b></div></div><div class="actions"><button class="btn openVal" data-id="'+esc(v.id)+'" data-local="'+(local?'1':'0')+'">Открыть</button><button class="btn alt newVal">Новая оценка</button></div></article>';
  }).join('');
}
async function load(){
  var rows=localRows();
  var s=getSession();
  if(s&&s.access_token){
    try{
      var h={apikey:KEY,Authorization:'Bearer '+s.access_token};
      var cloud=await fetchJson(SB+'/rest/v1/property_valuations?select=id,cadastral_code,city,address,house_area,land_area,estimated_value,market_low,market_high,confidence_score,confidence_label,created_at&order=created_at.desc&limit=50',h);
      if(Array.isArray(cloud))rows=cloud.concat(rows);
    }catch(e){
      if(!rows.length){show('<b class="error">Не удалось загрузить облачную историю.</b><div style="margin-top:8px">Проверьте вход в кабинет и обновите страницу.</div><div class="actions"><button class="btn alt reloadVal">Обновить</button><button class="btn newVal">Новая оценка</button></div>');return}
    }
  }
  render(rows);
}
window.addEventListener('error',function(){if(app&&app.textContent.indexOf('Загружаю историю')>=0)show('<b class="error">Ошибка загрузки истории.</b><div style="margin-top:8px">Обновите страницу. Если ошибка повторится, откройте новую оценку.</div>')});
setTimeout(function(){if(app&&app.textContent.indexOf('Загружаю историю')>=0)show('<b class="error">Загрузка заняла слишком много времени.</b><div style="margin-top:8px">Обновите страницу или войдите в кабинет заново.</div>')},10000);
load();
})();
</script>
</body>
</html>`);
};
