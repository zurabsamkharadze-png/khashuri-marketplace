(()=>{'use strict';
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const PROJECT='eppyjmtowtkxcwwhvwzp';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJlIiwicmVmIjoiZXBweWptdG93dGt4Y3d3aHZ3enAiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NzI0MzQ3MSwiZXhwIjoyMTAyODE5NDcxfQ.FBxRhLMZgObwy5cofdKs4k0nsDxr-LhUqu3R30uwIfk';
function safe(v){try{return JSON.parse(v||'null')}catch(e){return null}}
function norm(x){if(!x)return null;return x.access_token?x:(x.currentSession||x.session||x.data?.session||null)}
function tokenPayload(token){try{let s=String(token||'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(atob(s))}catch(e){return {}}}
function tokenExp(token){return Number(tokenPayload(token).exp||0)}
function belongs(s){const p=tokenPayload(s?.access_token||'');const iss=String(p.iss||'');return p.ref===PROJECT||iss===SB+'/auth/v1'||iss.startsWith(SB+'/auth/v1')}
function records(){
  const out=[],seen=new Set();
  for(const storage of [sessionStorage,localStorage]){
    try{
      for(let i=0;i<storage.length;i++){
        const k=storage.key(i)||'',raw=safe(storage.getItem(k)),s=norm(raw);
        if(!s?.access_token||!belongs(s)||seen.has(s.access_token))continue;
        seen.add(s.access_token);out.push({storage,key:k,raw,s});
      }
    }catch(e){}
  }
  return out.sort((a,b)=>tokenExp(b.s.access_token)-tokenExp(a.s.access_token));
}
function expired(s){const exp=Number(s?.expires_at||tokenExp(s?.access_token||''));return !exp||exp<=Math.floor(Date.now()/1000)+30}
function timeout(ms){return new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),ms))}
function storeSession(rec,s){try{let raw=rec.raw;if(raw?.currentSession)raw={...raw,currentSession:s};else if(raw?.session)raw={...raw,session:s};else if(raw?.data?.session)raw={...raw,data:{...raw.data,session:s}};else raw=s;rec.storage.setItem(rec.key,JSON.stringify(raw));rec.raw=raw;rec.s=s}catch(e){}}
async function probe(s){if(!s?.access_token||expired(s))return false;try{const r=await Promise.race([fetch(SB+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+s.access_token}}),timeout(5000)]);return r.ok}catch(e){return false}}
async function refresh(rec){if(!rec?.s?.refresh_token)return null;try{const r=await Promise.race([fetch(SB+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:rec.s.refresh_token})}),timeout(6000)]);if(!r.ok)return null;const fresh=await r.json();if(!fresh?.access_token||!belongs(fresh))return null;storeSession(rec,fresh);return fresh}catch(e){return null}}
async function validSession(force=false){const rs=records();for(const rec of rs){if(await probe(rec.s))return rec.s}for(const rec of rs){const fresh=await refresh(rec);if(fresh&&await probe(fresh))return fresh}return null}
async function postSave(obj,s){let r=await fetch(SB+'/rest/v1/rpc/save_property_valuation',{method:'POST',keepalive:true,headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify({payload:obj})});if(r.status===401||r.status===403){const fresh=await validSession(true);if(fresh)r=await fetch(SB+'/rest/v1/rpc/save_property_valuation',{method:'POST',keepalive:true,headers:{apikey:KEY,Authorization:'Bearer '+fresh.access_token,'Content-Type':'application/json'},body:JSON.stringify({payload:obj})})}return r}
async function save(key,raw){
  const s=await validSession();if(!s?.access_token)return null;
  let obj;try{obj=JSON.parse(raw)}catch(e){return null}
  if(!obj||obj.property_type!=='house'||!obj.estimated_value)return null;
  const localId=String(obj.id||key.replace(/^valuation:/,''));obj.id=localId;
  const stateKey='valuation:save:'+localId;
  if(localStorage.getItem(stateKey)==='saved')return localStorage.getItem('valuation:saved-id:'+localId)||null;
  if(localStorage.getItem(stateKey)==='saving')return null;
  try{localStorage.setItem(stateKey,'saving')}catch(e){}
  try{const r=await postSave(obj,s);if(!r.ok)throw new Error('save '+r.status);const uuid=String(await r.json()||'').replace(/^"|"$/g,'');try{localStorage.setItem(stateKey,'saved');localStorage.setItem('valuation:saved-id:'+localId,uuid)}catch(e){}return uuid}catch(e){try{localStorage.setItem(stateKey,'error')}catch(_){}return null}
}
const original=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){const out=original.apply(this,arguments);try{if(this===localStorage&&typeof k==='string'&&k.startsWith('valuation:local-'))save(k,v)}catch(e){}return out};
async function syncExisting(){if(!(await validSession())?.access_token)return;const items=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(k.startsWith('valuation:local-'))items.push([k,localStorage.getItem(k)])}}catch(e){}for(const [k,v] of items){try{await save(k,v)}catch(e){}}}
setTimeout(syncExisting,300);window.khSyncValuations=syncExisting;
})();