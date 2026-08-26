(()=>{'use strict';
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
let KEY='';
function safe(v){try{return JSON.parse(v||'null')}catch(e){return null}}
function session(){return safe(localStorage.getItem('kh_session'))}
async function key(){
  if(KEY)return KEY;
  const t=await fetch('/valuation-client.js?keyprobe=10',{cache:'no-store'}).then(r=>r.text());
  const m=t.match(/\bKEY=['"]([^'"]+)['"]/);
  if(!m)throw new Error('public key not found');
  KEY=m[1];return KEY;
}
async function api(path,opt={}){
  const s=session();if(!s?.access_token)throw new Error('auth');
  const k=await key();
  const headers={...(opt.headers||{}),apikey:k,Authorization:'Bearer '+s.access_token};
  if(opt.body!==undefined&&!headers['Content-Type'])headers['Content-Type']='application/json';
  const r=await fetch(SB+path,{...opt,headers,body:opt.body!==undefined?(typeof opt.body==='string'?opt.body:JSON.stringify(opt.body)):undefined});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch(e){data=text}
  if(!r.ok){const er=new Error((data&&data.message)||('HTTP '+r.status));er.status=r.status;throw er}return data;
}
function pack(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);s=btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');return s}
function localRecord(id){return safe(localStorage.getItem('valuation:'+id))}
async function cloudRecord(id){
  const rows=await api('/rest/v1/property_valuations?id=eq.'+encodeURIComponent(id)+'&select=*');
  const v=rows&&rows[0];if(!v)throw new Error('Оценка не найдена');
  let comps=[];try{comps=await api('/rest/v1/valuation_comparables?valuation_id=eq.'+encodeURIComponent(id)+'&select=*')}catch(e){}
  const fa=Array.isArray(v.floor_areas)?v.floor_areas:[],fc=Array.isArray(v.floor_conditions)?v.floor_conditions:[];
  const floors=Array.isArray(v.input_data?.floors)&&v.input_data.floors.length?v.input_data.floors:fa.map((f,i)=>({floor:f.floor||i+1,area:Number(f.area||0),condition:fc[i]?.condition||'average'}));
  return {...v,floors,comparables:comps||[]};
}
async function record(id,isLocal){const v=isLocal?localRecord(id):await cloudRecord(id);if(!v)throw new Error('Оценка не найдена');return v}
function purgeCloudMapping(cloudId){
  try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i)||'';if(!k.startsWith('valuation:saved-id:'))continue;if(localStorage.getItem(k)!==String(cloudId))continue;const localId=k.slice('valuation:saved-id:'.length);localStorage.removeItem('valuation:'+localId);localStorage.removeItem('valuation:save:'+localId);localStorage.removeItem(k)}}catch(e){}
}
function purgeLocal(id){try{localStorage.removeItem('valuation:'+id);localStorage.removeItem('valuation:save:'+id);localStorage.removeItem('valuation:saved-id:'+id)}catch(e){}}
async function deleteCloud(id){
  try{
    const photos=await api('/rest/v1/valuation_photos?valuation_id=eq.'+encodeURIComponent(id)+'&select=storage_path');
    for(const p of photos||[]){if(!p.storage_path)continue;const path=String(p.storage_path).split('/').map(encodeURIComponent).join('/');try{await api('/storage/v1/object/valuation-photos/'+path,{method:'DELETE'})}catch(e){}}
  }catch(e){}
  await api('/rest/v1/property_valuations?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{Prefer:'return=minimal'}});
  purgeCloudMapping(id);
}
function saveRepeat(v){try{localStorage.setItem('valuation:repeat-prefill',JSON.stringify(v))}catch(e){}location.href='/valuation/new?mode=precise&repeat=1'}
async function action(kind,id,isLocal,btn){
  if(btn?.disabled)return;const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='…'}
  try{
    if(kind==='report'){
      const v=await record(id,isLocal);location.href='/valuation/report?data='+encodeURIComponent(pack(v))+'&autoprint=1';return;
    }
    if(kind==='repeat'){const v=await record(id,isLocal);saveRepeat(v);return}
    if(kind==='delete'){
      if(!confirm('Удалить эту оценку из истории? Это действие нельзя отменить.'))return;
      if(isLocal)purgeLocal(id);else await deleteCloud(id);
      location.reload();return;
    }
  }catch(e){alert(e.message==='auth'?'Сессия входа устарела. Войдите в кабинет и попробуйте снова.':'Не удалось выполнить действие. Обновите страницу и попробуйте снова.')}
  finally{if(btn){btn.disabled=false;btn.textContent=old}}
}
function enhance(){
  document.querySelectorAll('.card').forEach(card=>{
    if(card.dataset.historyActions==='1')return;
    const open=card.querySelector('.openVal');const box=open?.closest('.actions');if(!open||!box)return;
    card.dataset.historyActions='1';const id=open.dataset.id||'',local=open.dataset.local==='1';
    const report=document.createElement('button');report.className='btn alt';report.textContent='PDF';report.type='button';report.onclick=()=>action('report',id,local,report);
    const repeat=document.createElement('button');repeat.className='btn alt';repeat.textContent='Повторить';repeat.type='button';repeat.onclick=()=>action('repeat',id,local,repeat);
    const del=document.createElement('button');del.className='btn alt';del.textContent='Удалить';del.type='button';del.style.cssText='color:#a72d2d;border-color:#efcaca';del.onclick=()=>action('delete',id,local,del);
    box.append(report,repeat,del);
  })
}
new MutationObserver(()=>enhance()).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
setTimeout(enhance,300);setTimeout(enhance,1200);
})();