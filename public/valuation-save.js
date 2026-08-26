(()=>{'use strict';
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const PROJECT='eppyjmtowtkxcwwhvwzp';
const KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr';
const pending=new Map();
function safe(v){try{return JSON.parse(v||'null')}catch(e){return null}}
function norm(x){if(!x)return null;return x.access_token?x:(x.currentSession||x.session||x.data?.session||null)}
function tokenPayload(token){try{let s=String(token||'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(atob(s))}catch(e){return {}}}
function tokenExp(token){return Number(tokenPayload(token).exp||0)}
function belongs(s){const p=tokenPayload(s?.access_token||'');const iss=String(p.iss||'');return p.ref===PROJECT||iss===SB+'/auth/v1'||iss.startsWith(SB+'/auth/v1')}
function records(){const out=[],seen=new Set();for(const storage of [sessionStorage,localStorage]){try{for(let i=0;i<storage.length;i++){const k=storage.key(i)||'',raw=safe(storage.getItem(k)),s=norm(raw);if(!s?.access_token||!belongs(s)||seen.has(s.access_token))continue;seen.add(s.access_token);out.push({storage,key:k,raw,s})}}catch(e){}}return out.sort((a,b)=>tokenExp(b.s.access_token)-tokenExp(a.s.access_token))}
function expired(s){const exp=Number(s?.expires_at||tokenExp(s?.access_token||''));return !exp||exp<=Math.floor(Date.now()/1000)+30}
function timeout(ms){return new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),ms))}
function storeSession(rec,s){try{let raw=rec.raw;if(raw?.currentSession)raw={...raw,currentSession:s};else if(raw?.session)raw={...raw,session:s};else if(raw?.data?.session)raw={...raw,data:{...raw.data,session:s}};else raw=s;rec.storage.setItem(rec.key,JSON.stringify(raw));rec.raw=raw;rec.s=s}catch(e){}}
async function probe(s){if(!s?.access_token||expired(s))return false;try{const r=await Promise.race([fetch(SB+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+s.access_token}}),timeout(5000)]);return r.ok}catch(e){return false}}
async function refresh(rec){if(!rec?.s?.refresh_token)return null;try{const r=await Promise.race([fetch(SB+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:rec.s.refresh_token})}),timeout(6000)]);if(!r.ok)return null;const fresh=await r.json();if(!fresh?.access_token||!belongs(fresh))return null;storeSession(rec,fresh);return fresh}catch(e){return null}}
async function validSession(){const rs=records();for(const rec of rs){if(await probe(rec.s))return rec.s}for(const rec of rs){const fresh=await refresh(rec);if(fresh&&await probe(fresh))return fresh}return null}
async function postSave(obj,s){let r=await fetch(SB+'/rest/v1/rpc/save_property_valuation',{method:'POST',keepalive:true,headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify({payload:obj})});if(r.status===401||r.status===403){const fresh=await validSession();if(fresh){s=fresh;r=await fetch(SB+'/rest/v1/rpc/save_property_valuation',{method:'POST',keepalive:true,headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify({payload:obj})})}}return {r,s}}
function fileExt(name,type){const fromName=(String(name||'').split('.').pop()||'').replace(/[^a-z0-9]/gi,'').toLowerCase();if(fromName&&fromName.length<=6)return fromName;if(type==='image/png')return'png';if(type==='image/webp')return'webp';return'jpg'}
async function existingPhotos(uuid,s){try{const r=await fetch(SB+'/rest/v1/valuation_photos?valuation_id=eq.'+encodeURIComponent(uuid)+'&select=id,storage_path&order=sort_order.asc',{headers:{apikey:KEY,Authorization:'Bearer '+s.access_token}});return r.ok?await r.json():[]}catch(e){return []}}
async function uploadOne(uuid,s,blob,name,index){const uid=s?.user?.id||tokenPayload(s?.access_token).sub;if(!uid||!blob)return false;const ext=fileExt(name,blob.type),path=uid+'/'+uuid+'/'+String(index+1).padStart(2,'0')+'-'+Date.now()+'.'+ext;const up=await fetch(SB+'/storage/v1/object/valuation-photos/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':blob.type||'image/jpeg','x-upsert':'false'},body:blob});if(!up.ok)return false;const publicUrl=SB+'/storage/v1/object/public/valuation-photos/'+path;const row=await fetch(SB+'/rest/v1/valuation_photos',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({valuation_id:uuid,storage_path:path,public_url:publicUrl,sort_order:index})});return row.ok}
async function uploadPhotos(uuid,s){
  const input=document.getElementById('photos');const files=input?.files?[...input.files].slice(0,20):[];const repeat=safe(localStorage.getItem('valuation:repeat-photos'))||[];
  if(!files.length&&!repeat.length)return 0;
  const existing=await existingPhotos(uuid,s);let index=existing.length,done=0;
  if(existing.length&&existing.length>=files.length+repeat.length){try{localStorage.removeItem('valuation:repeat-photos')}catch(e){}return existing.length}
  for(let i=Math.min(existing.length,files.length);i<files.length;i++){try{if(await uploadOne(uuid,s,files[i],files[i].name,index++))done++}catch(e){}}
  if(!files.length||existing.length>=files.length){for(let i=0;i<repeat.length;i++){try{const p=repeat[i],r=await fetch(p.public_url||p.url,{cache:'no-store'});if(!r.ok)continue;const b=await r.blob();if(await uploadOne(uuid,s,b,p.storage_path||p.public_url||'repeat.jpg',index++))done++}catch(e){}}}
  if(repeat.length){try{localStorage.removeItem('valuation:repeat-photos')}catch(e){}}
  return existing.length+done;
}
async function save(key,raw){
  const s0=await validSession();if(!s0?.access_token)return null;
  let obj;try{obj=JSON.parse(raw)}catch(e){return null}if(!obj||obj.property_type!=='house'||!obj.estimated_value)return null;
  const localId=String(obj.id||key.replace(/^valuation:/,''));obj.id=localId;const stateKey='valuation:save:'+localId;let uuid=localStorage.getItem('valuation:saved-id:'+localId)||'';let s=s0;
  if(!uuid){try{localStorage.setItem(stateKey,'saving')}catch(e){}try{const out=await postSave(obj,s);s=out.s;if(!out.r.ok)throw new Error('save '+out.r.status);uuid=String(await out.r.json()||'').replace(/^"|"$/g,'');if(!uuid)throw new Error('empty id');try{localStorage.setItem('valuation:saved-id:'+localId,uuid);localStorage.setItem(stateKey,'saved')}catch(e){}}catch(e){try{localStorage.setItem(stateKey,'error')}catch(_){}return null}}
  try{const n=await uploadPhotos(uuid,s);if(n)try{localStorage.setItem('valuation:photos:'+localId,String(n))}catch(e){}}catch(e){try{localStorage.setItem('valuation:photo-error:'+localId,String(e.message||e))}catch(_){}}
  return uuid;
}
function ensureSave(k,v){if(!k||!v)return Promise.resolve(null);if(pending.has(k))return pending.get(k);const p=save(k,v).finally(()=>pending.delete(k));pending.set(k,p);return p}
const original=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){const out=original.apply(this,arguments);try{if(this===localStorage&&typeof k==='string'&&k.startsWith('valuation:local-'))ensureSave(k,v)}catch(e){}return out};
window.khAwaitValuationSave=function(id){const k=String(id||'').startsWith('valuation:')?String(id):'valuation:'+String(id||'');let raw=null;try{raw=localStorage.getItem(k)}catch(e){}return raw?ensureSave(k,raw):Promise.resolve(null)};
async function syncExisting(){if(!(await validSession())?.access_token)return;const items=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(k.startsWith('valuation:local-'))items.push([k,localStorage.getItem(k)])}}catch(e){}for(const [k,v] of items){try{await ensureSave(k,v)}catch(e){}}}
setTimeout(syncExisting,300);window.khSyncValuations=syncExisting;
})();