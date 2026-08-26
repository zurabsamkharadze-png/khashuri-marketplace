(()=>{'use strict';
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJlIiwicmVmIjoiZXBweWptdG93dGt4Y3d3aHZ3enAiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NzI0MzQ3MSwiZXhwIjoyMTAyODE5NDcxfQ.FBxRhLMZgObwy5cofdKs4k0nsDxr-LhUqu3R30uwIfk';
function safe(v){try{return JSON.parse(v||'null')}catch(e){return null}}
function norm(x){if(!x)return null;return x.access_token?x:(x.currentSession||x.session||x.data?.session||null)}
function tokenExp(token){try{let s=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Number(JSON.parse(atob(s)).exp||0)}catch(e){return 0}}
function records(){
  const out=[];
  for(const storage of [sessionStorage,localStorage]){
    try{
      for(let i=0;i<storage.length;i++){
        const k=storage.key(i)||'';
        if(!k.includes('auth-token'))continue;
        const raw=safe(storage.getItem(k)),s=norm(raw);
        if(s?.access_token)out.push({storage,key:k,s});
      }
      const raw=safe(storage.getItem('kh_session')),s=norm(raw);
      if(s?.access_token)out.push({storage,key:'kh_session',s});
    }catch(e){}
  }
  return out;
}
function expired(s){const exp=Number(s?.expires_at||tokenExp(s?.access_token||''));return !exp||exp<=Math.floor(Date.now()/1000)+60}
async function refresh(rec){if(!rec?.s?.refresh_token)return null;try{const r=await fetch(SB+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:rec.s.refresh_token})});if(!r.ok)return null;const fresh=await r.json();if(!fresh?.access_token)return null;try{rec.storage.setItem(rec.key,JSON.stringify(fresh))}catch(e){}return fresh}catch(e){return null}}
async function validSession(force=false){for(const rec of records()){if(!force&&!expired(rec.s))return rec.s;const fresh=await refresh(rec);if(fresh)return fresh}return null}
async function postSave(obj,s){let r=await fetch(SB+'/rest/v1/rpc/save_property_valuation',{method:'POST',keepalive:true,headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify({payload:obj})});if((r.status===401||r.status===403)){const fresh=await validSession(true);if(fresh)r=await fetch(SB+'/rest/v1/rpc/save_property_valuation',{method:'POST',keepalive:true,headers:{apikey:KEY,Authorization:'Bearer '+fresh.access_token,'Content-Type':'application/json'},body:JSON.stringify({payload:obj})})}return r}
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