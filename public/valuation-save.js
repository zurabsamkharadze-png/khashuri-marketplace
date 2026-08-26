(()=>{'use strict';
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr';
function session(){
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';
      if(!/^sb-.*-auth-token$/.test(k))continue;
      const raw=localStorage.getItem(k);if(!raw)continue;
      const x=JSON.parse(raw);
      const s=x?.access_token?x:(x?.currentSession||x?.session||x?.data?.session);
      if(s?.access_token)return s;
    }
  }catch(e){}
  return null;
}
async function save(key,raw){
  const s=session();if(!s?.access_token)return;
  let obj;try{obj=JSON.parse(raw)}catch(e){return}
  if(!obj||obj.property_type!=='house'||!obj.estimated_value)return;
  const localId=String(obj.id||key.replace(/^valuation:/,''));
  const stateKey='valuation:save:'+localId;
  if(localStorage.getItem(stateKey)==='saved'||localStorage.getItem(stateKey)==='saving')return;
  try{localStorage.setItem(stateKey,'saving')}catch(e){}
  try{
    const r=await fetch(SB+'/rest/v1/rpc/save_property_valuation',{
      method:'POST',keepalive:true,
      headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},
      body:JSON.stringify({payload:obj})
    });
    if(!r.ok)throw new Error('save '+r.status);
    const uuid=await r.json();
    try{localStorage.setItem(stateKey,'saved');localStorage.setItem('valuation:saved-id:'+localId,String(uuid||'').replace(/^"|"$/g,''))}catch(e){}
  }catch(e){try{localStorage.setItem(stateKey,'error')}catch(_){} }
}
const original=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){
  const out=original.apply(this,arguments);
  try{if(this===localStorage&&typeof k==='string'&&k.startsWith('valuation:')&&!k.startsWith('valuation:save:')&&!k.startsWith('valuation:saved-id:'))save(k,v)}catch(e){}
  return out;
};
})();