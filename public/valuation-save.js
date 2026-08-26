(()=>{'use strict';
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr';
function safe(v){try{return JSON.parse(v||'null')}catch(e){return null}}
function norm(x){if(!x)return null;return x.access_token?x:(x.currentSession||x.session||x.data?.session||null)}
function session(){
  try{
    const direct=norm(safe(localStorage.getItem('kh_session')));if(direct?.access_token)return direct;
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';if(!/^sb-.*-auth-token$/.test(k))continue;
      const s=norm(safe(localStorage.getItem(k)));if(s?.access_token)return s;
    }
  }catch(e){}
  return null;
}
async function save(key,raw){
  const s=session();if(!s?.access_token)return null;
  let obj;try{obj=JSON.parse(raw)}catch(e){return null}
  if(!obj||obj.property_type!=='house'||!obj.estimated_value)return null;
  const localId=String(obj.id||key.replace(/^valuation:/,''));
  obj.id=localId;
  const stateKey='valuation:save:'+localId;
  if(localStorage.getItem(stateKey)==='saved')return localStorage.getItem('valuation:saved-id:'+localId)||null;
  if(localStorage.getItem(stateKey)==='saving')return null;
  try{localStorage.setItem(stateKey,'saving')}catch(e){}
  try{
    const r=await fetch(SB+'/rest/v1/rpc/save_property_valuation',{
      method:'POST',keepalive:true,
      headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},
      body:JSON.stringify({payload:obj})
    });
    if(!r.ok)throw new Error('save '+r.status);
    const uuid=String(await r.json()||'').replace(/^"|"$/g,'');
    try{localStorage.setItem(stateKey,'saved');localStorage.setItem('valuation:saved-id:'+localId,uuid)}catch(e){}
    return uuid;
  }catch(e){try{localStorage.setItem(stateKey,'error')}catch(_){}return null}
}
const original=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){
  const out=original.apply(this,arguments);
  try{if(this===localStorage&&typeof k==='string'&&k.startsWith('valuation:local-'))save(k,v)}catch(e){}
  return out;
};
async function syncExisting(){
  if(!session()?.access_token)return;
  const items=[];
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(k.startsWith('valuation:local-'))items.push([k,localStorage.getItem(k)])}}catch(e){}
  for(const [k,v] of items){try{await save(k,v)}catch(e){}}
}
setTimeout(syncExisting,250);
window.khSyncValuations=syncExisting;
})();