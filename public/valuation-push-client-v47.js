(()=>{'use strict';
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const KEY='sb_publishable_3oEkPaexOGYojb-9imVJjw_2SCQ7WRr';
let session=null,registration=null,busy=false;

function safe(v){try{return JSON.parse(v||'null')}catch(_){return null}}
function jwt(t){try{let s=String(t||'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(atob(s))}catch(_){return{}}}
function norm(v){return v?.access_token?v:(v?.currentSession||v?.session||v?.data?.session||null)}
function sessions(){const out=[];for(const st of [sessionStorage,localStorage]){try{for(let i=0;i<st.length;i++){const s=norm(safe(st.getItem(st.key(i))));if(!s?.access_token)continue;const p=jwt(s.access_token),iss=String(p.iss||'');if(p.ref==='eppyjmtowtkxcwwhvwzp'||iss.includes('eppyjmtowtkxcwwhvwzp.supabase.co/auth/v1'))out.push(s)}}catch(_){}}return out.sort((a,b)=>Number(jwt(b.access_token).exp||0)-Number(jwt(a.access_token).exp||0))}
async function getSession(){for(const s of sessions()){try{const r=await fetch(SB+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+s.access_token}});if(r.ok)return s}catch(_){}}return null}
async function rpc(name,body={}){if(!session)throw new Error('auth_required');const r=await fetch(SB+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:JSON.stringify(body)});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch(_){data=text}if(!r.ok)throw new Error(data?.message||text||('HTTP '+r.status));return data}
function scalar(v){return typeof v==='string'?v:String(v??'').replace(/^"|"$/g,'')}
function keyBytes(base64){const pad='='.repeat((4-base64.length%4)%4),raw=atob((base64+pad).replace(/-/g,'+').replace(/_/g,'/')),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function subKeys(sub){const j=sub.toJSON();return {endpoint:sub.endpoint,p256dh:j.keys?.p256dh||'',auth:j.keys?.auth||''}}
function el(id){return document.getElementById(id)}
function setMsg(text,type=''){const m=el('v47PushMsg');if(!m)return;m.textContent=text;m.style.color=type==='error'?'#a93434':type==='ok'?'#0b756c':'#70798b'}
function setBusy(v){busy=v;for(const id of ['v47PushEnable','v47PushTest','v47PushDisable']){const b=el(id);if(b)b.disabled=v}}
function supported(){return location.protocol==='https:'&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window}

function mount(){if(el('v47PushCard'))return;const hero=document.querySelector('.hero');if(!hero)return;const box=document.createElement('section');box.id='v47PushCard';box.className='card';box.innerHTML=`
  <div style="display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap">
    <div><h3 style="margin:0 0 5px">🔔 Push-уведомления · V47</h3><div class="muted">Новая заявка и просроченный follow-up приходят на телефон, даже когда CRM закрыта.</div></div>
    <span id="v47PushBadge" style="padding:6px 10px;border-radius:999px;background:#f1f3f6;color:#687080;font:800 12px system-ui">Проверяю…</span>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:13px">
    <button id="v47PushEnable" class="btn" type="button">Включить push</button>
    <button id="v47PushTest" class="btn alt" type="button">Отправить тест</button>
    <button id="v47PushDisable" class="btn alt" type="button">Отключить на этом устройстве</button>
  </div>
  <div id="v47PushMsg" class="muted" style="margin-top:9px">Проверяю поддержку браузера и подписку…</div>`;
hero.insertAdjacentElement('afterend',box);
el('v47PushEnable').onclick=enablePush;
el('v47PushDisable').onclick=disablePush;
el('v47PushTest').onclick=testPush;
}

async function getRegistration(){if(registration)return registration;registration=await navigator.serviceWorker.register('/valuation-push-sw-v47.js?v=47',{scope:'/'});await navigator.serviceWorker.ready;try{await registration.update()}catch(_){}return registration}
async function registerInDb(sub){const k=subKeys(sub);if(!k.p256dh||!k.auth)throw new Error('subscription_keys_missing');await rpc('register_valuation_crm_push_device_v47',{p_endpoint:k.endpoint,p_p256dh:k.p256dh,p_auth:k.auth,p_user_agent:navigator.userAgent.slice(0,500)});return k}
async function state(){try{return await rpc('valuation_crm_push_state_v47',{})}catch(_){return null}}

async function refresh(){mount();if(!supported()){el('v47PushBadge').textContent='Не поддерживается';setMsg('Этот браузер не поддерживает Web Push. Открой CRM в актуальном Chrome/Edge на Android или ПК.','error');el('v47PushEnable').disabled=true;el('v47PushTest').disabled=true;el('v47PushDisable').disabled=true;return}
if(!session){el('v47PushBadge').textContent='Нужен вход';setMsg('Сначала войди в аккаунт Khashuri Marketplace.');return}
try{const reg=await getRegistration(),sub=await reg.pushManager.getSubscription(),st=await state(),count=Number(st?.active_devices||0);if(sub){await registerInDb(sub);el('v47PushBadge').textContent='Включено';el('v47PushBadge').style.background='#e6f7ef';el('v47PushBadge').style.color='#116440';setMsg('Push включён на этом устройстве · активных устройств: '+Math.max(1,count),'ok');el('v47PushEnable').style.display='none';el('v47PushTest').style.display='inline-flex';el('v47PushDisable').style.display='inline-flex'}else{el('v47PushBadge').textContent=Notification.permission==='denied'?'Заблокировано':'Выключено';el('v47PushBadge').style.background=Notification.permission==='denied'?'#ffe7e7':'#f1f3f6';el('v47PushBadge').style.color=Notification.permission==='denied'?'#9d2c2c':'#687080';setMsg(Notification.permission==='denied'?'Уведомления заблокированы в настройках браузера для этого сайта.':'Push пока не включён на этом устройстве.');el('v47PushEnable').style.display='inline-flex';el('v47PushTest').style.display='none';el('v47PushDisable').style.display='none'}}catch(e){setMsg('Не удалось проверить push: '+String(e.message||e),'error')}}

async function enablePush(){if(busy)return;setBusy(true);try{if(!session)throw new Error('Сначала войди в аккаунт');if(!supported())throw new Error('Web Push не поддерживается');let perm=Notification.permission;if(perm==='default')perm=await Notification.requestPermission();if(perm!=='granted')throw new Error(perm==='denied'?'Разрешение на уведомления заблокировано':'Разрешение на уведомления не выдано');const reg=await getRegistration();let sub=await reg.pushManager.getSubscription();if(!sub){const publicKey=scalar(await rpc('push_public_key_v12',{}));if(!publicKey||publicKey.length<50)throw new Error('VAPID public key недоступен');sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(publicKey)})}await registerInDb(sub);setMsg('Push включён. Новые CRM-заявки и follow-up будут приходить на это устройство.','ok');await refresh()}catch(e){setMsg(String(e.message||e),'error')}finally{setBusy(false)}}

async function disablePush(){if(busy)return;setBusy(true);try{const reg=await getRegistration(),sub=await reg.pushManager.getSubscription();if(sub){const endpoint=sub.endpoint;try{await rpc('disable_valuation_crm_push_device_v47',{p_endpoint:endpoint})}catch(_){}await sub.unsubscribe()}setMsg('Push отключён на этом устройстве.','ok');await refresh()}catch(e){setMsg('Ошибка отключения: '+String(e.message||e),'error')}finally{setBusy(false)}}

async function testPush(){if(busy)return;setBusy(true);try{const reg=await getRegistration(),sub=await reg.pushManager.getSubscription();if(!sub)throw new Error('Сначала включи push');await registerInDb(sub);await rpc('queue_valuation_crm_test_notification_v47',{});setMsg('✅ Тестовое уведомление передано в push-систему Marketplace.','ok')}catch(e){setMsg('Тест не отправлен: '+String(e.message||e),'error')}finally{setBusy(false)}}

(async()=>{mount();session=await getSession();await refresh()})();
})();
