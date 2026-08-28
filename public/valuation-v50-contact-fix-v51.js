(()=>{'use strict';
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr';
let session=null;
function safe(v){try{return JSON.parse(v||'null')}catch(_){return null}}
function norm(v){return v?.access_token?v:(v?.currentSession||v?.session||v?.data?.session||null)}
function jwt(t){try{let s=String(t||'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(atob(s))}catch(_){return{}}}
function sessions(){const out=[];for(const st of [sessionStorage,localStorage]){try{for(let i=0;i<st.length;i++){const s=norm(safe(st.getItem(st.key(i))));if(!s?.access_token)continue;const p=jwt(s.access_token),iss=String(p.iss||'');if(p.ref==='eppyjmtowtkxcwwhvwzp'||iss.includes('eppyjmtowtkxcwwhvwzp.supabase.co/auth/v1'))out.push(s)}}catch(_){}}return out.sort((a,b)=>Number(jwt(b.access_token).exp||0)-Number(jwt(a.access_token).exp||0))}
async function getSession(){for(const s of sessions()){try{const r=await fetch(SB+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+s.access_token}});if(r.ok)return s}catch(_){}}return null}
async function record(id){if(!session)session=await getSession();if(!session)throw new Error('auth_required');const r=await fetch(SB+'/rest/v1/rpc/record_valuation_crm_contact_v45',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:JSON.stringify({p_lead_id:id,p_channel:'call'})});if(!r.ok)throw new Error('contact_failed')}
function note(t,type=''){const e=document.getElementById('v50Msg');if(e){e.textContent=t;e.dataset.type=type}}
document.addEventListener('click',async e=>{const b=e.target?.closest?.('.v50btn[data-contact],.v50btn[data-call]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const id=b.dataset.contact||b.dataset.id;try{await record(id);note('Контакт записан в историю клиента.','ok');if(b.dataset.call)location.href='tel:'+b.dataset.call;else document.getElementById('v50Refresh')?.click()}catch(err){note('Не удалось записать контакт.','error');if(b.dataset.call)location.href='tel:'+b.dataset.call}},true);
})();