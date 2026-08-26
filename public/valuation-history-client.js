(()=>{'use strict';
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const PROJECT='eppyjmtowtkxcwwhvwzp';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJlIiwicmVmIjoiZXBweWptdG93dGt4Y3d3aHZ3enAiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NzI0MzQ3MSwiZXhwIjoyMTAyODE5NDcxfQ.FBxRhLMZgObwy5cofdKs4k0nsDxr-LhUqu3R30uwIfk';
const app=document.getElementById('app');
const syncState=document.getElementById('syncState');
if(!app||!syncState)return;

function money(x){return '$'+Math.round(Number(x||0)).toLocaleString('en-US')}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function safe(v){try{return JSON.parse(v||'null')}catch(e){return null}}
function norm(x){if(!x)return null;if(x.access_token)return x;if(x.currentSession?.access_token)return x.currentSession;if(x.session?.access_token)return x.session;if(x.data?.session?.access_token)return x.data.session;return null}
function tokenPayload(token){try{let s=String(token||'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(atob(s))}catch(e){return {}}}
function tokenExp(token){return Number(tokenPayload(token).exp||0)}
function belongs(s){const p=tokenPayload(s?.access_token||'');const iss=String(p.iss||'');return p.ref===PROJECT||iss===SB+'/auth/v1'||iss.startsWith(SB+'/auth/v1')}
function records(){
  const out=[],seen=new Set();
  for(const storage of [sessionStorage,localStorage]){
    try{
      const keys=['sb-'+PROJECT+'-auth-token','kh_session'];
      for(let i=0;i<storage.length;i++){
        const k=storage.key(i)||'';
        if(k.includes('auth-token')&&!keys.includes(k))keys.push(k);
      }
      for(const k of keys){
        const raw=safe(storage.getItem(k)),s=norm(raw);
        if(!s?.access_token||!belongs(s)||seen.has(s.access_token))continue;
        seen.add(s.access_token);out.push({storage,key:k,raw,s});
      }
    }catch(e){}
  }
  return out.sort((a,b)=>tokenExp(b.s.access_token)-tokenExp(a.s.access_token));
}
function expired(s){const exp=Number(s?.expires_at||tokenExp(s?.access_token||''));return !exp||exp<=Math.floor(Date.now()/1000)+60}
function storeSession(rec,s){try{rec.storage.setItem(rec.key,JSON.stringify(s))}catch(e){}}
async function refresh(rec){
  const rt=rec?.s?.refresh_token;if(!rt)return null;
  try{
    const r=await fetch(SB+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:rt})});
    if(!r.ok)return null;
    const fresh=await r.json();if(!fresh?.access_token||!belongs(fresh))return null;
    storeSession(rec,fresh);return fresh;
  }catch(e){return null}
}
async function validSession(forceRefresh=false){
  const rs=records();
  for(const rec of rs){
    if(!forceRefresh&&!expired(rec.s))return rec.s;
    const fresh=await refresh(rec);if(fresh)return fresh;
  }
  return null;
}
function localRows(){
  const rows=[];
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!k.startsWith('valuation:local-'))continue;const x=safe(localStorage.getItem(k));if(x&&x.id)rows.push({...x,_local:true})}}catch(e){}
  return rows;
}
function timeout(ms){return new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),ms))}
async function rawJson(url,opt){const r=await Promise.race([fetch(url,opt||{}),timeout(8000)]);let data=null;try{data=await r.json()}catch(e){};if(!r.ok){const er=new Error('HTTP '+r.status);er.status=r.status;er.data=data;throw er}return data}
async function authedJson(url,opt,s){
  const make=session=>({...opt,headers:{...(opt?.headers||{}),apikey:KEY,Authorization:'Bearer '+session.access_token}});
  try{return await rawJson(url,make(s))}catch(e){
    if(e.status!==401&&e.status!==403)throw e;
    const fresh=await validSession(true);if(!fresh)throw e;
    return rawJson(url,make(fresh));
  }
}
function pack(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);s=btoa(s).split('+').join('-').split('/').join('_');while(s.endsWith('='))s=s.slice(0,-1);return s}
function mappedCloudId(localId){try{return localStorage.getItem('valuation:saved-id:'+localId)||''}catch(e){return ''}}
function render(rows){
  const seen=new Set();
  rows=rows.filter(v=>{const key=(v._local?'local:':'cloud:')+String(v.id||'');if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  if(!rows.length){app.className='state';app.innerHTML='<b style="color:#131c31">История пока пустая.</b><div style="margin-top:8px">Сделайте новую оценку — после расчёта она появится здесь автоматически.</div><div class="actions"><button class="btn newVal">Новая оценка</button></div>';return}
  app.className='';
  app.innerHTML=rows.map(v=>{const d=new Date(v.created_at||Date.now()),local=!!v._local;return '<article class="card"><div class="head"><div><b>'+esc(v.address||v.city||'Объект')+'</b><div class="date">'+d.toLocaleString('ru-RU')+'</div><span class="badge '+(local?'':'cloud')+'">'+(local?'📱 На устройстве':'☁️ В облаке')+'</span></div><span class="date">'+esc(v.cadastral_code||'')+'</span></div><div class="price">'+money(v.estimated_value)+'</div><div class="range">Диапазон '+money(v.market_low)+'–'+money(v.market_high)+'</div><div class="grid"><div class="metric"><small>Дом</small><b>'+Number(v.house_area||0)+' м²</b></div><div class="metric"><small>Земля</small><b>'+Number(v.land_area||0)+' м²</b></div><div class="metric"><small>Точность</small><b>'+Number(v.confidence_score||0)+'/100</b></div></div><div class="actions"><button class="btn openVal" data-id="'+esc(v.id)+'" data-local="'+(local?'1':'0')+'">Открыть</button><button class="btn alt newVal">Новая оценка</button></div></article>'}).join('');
}
async function syncOne(v,s){
  const localId=String(v.id||'');if(!localId)return null;const known=mappedCloudId(localId);if(known)return known;
  try{const id=String(await authedJson(SB+'/rest/v1/rpc/save_property_valuation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload:{...v,id:localId}})},s)||'').replace(/^"|"$/g,'');if(id){localStorage.setItem('valuation:save:'+localId,'saved');localStorage.setItem('valuation:saved-id:'+localId,id)}return id||null}catch(e){try{localStorage.setItem('valuation:save:'+localId,'error')}catch(_){}return null}
}
async function fetchCloud(s){return authedJson(SB+'/rest/v1/property_valuations?select=id,cadastral_code,city,address,house_area,land_area,estimated_value,market_low,market_high,confidence_score,confidence_label,created_at&order=created_at.desc&limit=50',{},s)}
function mergeRows(cloud,locals){const cloudIds=new Set((cloud||[]).map(x=>String(x.id)));return (cloud||[]).concat(locals.filter(v=>{const mapped=mappedCloudId(v.id);return !(mapped&&cloudIds.has(mapped))}))}
async function openCloud(id){
  const s=await validSession();if(!s){alert('Сессия входа устарела. Войдите в кабинет заново.');return}
  try{const [vals,comps]=await Promise.all([authedJson(SB+'/rest/v1/property_valuations?id=eq.'+encodeURIComponent(id)+'&select=*',{},s),authedJson(SB+'/rest/v1/valuation_comparables?valuation_id=eq.'+encodeURIComponent(id)+'&select=*',{},s)]);const v=vals&&vals[0];if(!v){alert('Оценка не найдена.');return}const fa=Array.isArray(v.floor_areas)?v.floor_areas:[],fc=Array.isArray(v.floor_conditions)?v.floor_conditions:[];const floors=fa.map((f,i)=>({floor:f.floor||i+1,area:Number(f.area||0),condition:fc[i]?.condition||'average'}));location.href='/valuation/result/'+encodeURIComponent(id)+'?data='+encodeURIComponent(pack({...v,floors,comparables:comps||[]}))+'&v=history'}catch(e){alert('Не удалось открыть оценку. Обновите страницу и попробуйте ещё раз.')}
}
function openLocal(id){const v=safe(localStorage.getItem('valuation:'+id));if(!v){alert('Локальная оценка не найдена.');return}location.href='/valuation/result/'+encodeURIComponent(id)+'?data='+encodeURIComponent(pack(v))+'&v=history'}
app.addEventListener('click',e=>{const open=e.target.closest?.('.openVal');if(open){open.dataset.local==='1'?openLocal(open.dataset.id):openCloud(open.dataset.id);return}if(e.target.closest?.('.newVal'))location.href='/valuation/new?mode=precise'});

async function load(){
  const locals=localRows();render(locals);
  const existing=records();if(!existing.length){syncState.innerHTML='<b style="color:#131c31">📱 Сейчас оценки хранятся на этом устройстве.</b><div style="margin-top:6px">Войдите в кабинет на главной странице, чтобы синхронизировать их с облачной историей.</div>';return}
  syncState.innerHTML='<b style="color:#131c31">🔐 Проверяю сессию аккаунта…</b>';
  const s=await validSession();
  if(!s){syncState.innerHTML='<b class="error">Сессия входа устарела.</b><div style="margin-top:6px">Оценки на телефоне сохранены. Откройте кабинет, войдите заново и вернитесь в историю.</div>';return}
  syncState.innerHTML='<b style="color:#131c31">☁️ Облачная история включена</b><div style="margin-top:6px">Локальные оценки показаны сразу. Проверяю облако и синхронизирую в фоне.</div>';
  let cloud=[];
  try{cloud=await fetchCloud(s);render(mergeRows(cloud,locals))}catch(e){syncState.innerHTML='<b class="error">Облачная история временно недоступна.</b><div style="margin-top:6px">Локальные оценки уже показаны ниже и не потеряны.</div>';return}
  const unsynced=locals.filter(v=>!mappedCloudId(v.id));
  if(unsynced.length){await Promise.allSettled(unsynced.map(v=>syncOne(v,s)));try{cloud=await fetchCloud(await validSession()||s);render(mergeRows(cloud,locals));syncState.innerHTML='<b style="color:#131c31">✅ Синхронизация завершена</b><div style="margin-top:6px">Оценки сохранены в вашем аккаунте.</div>'}catch(e){}}
  else syncState.innerHTML='<b style="color:#131c31">✅ Облачная история подключена</b>';
}
window.addEventListener('error',()=>{if(app.textContent.includes('Загружаю историю'))render(localRows())});
load();
})();