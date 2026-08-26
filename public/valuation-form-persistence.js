(()=>{'use strict';
if(!/\/valuation\/new/.test(location.pathname))return;
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const $=id=>document.getElementById(id);
const safe=v=>{try{return JSON.parse(v||'null')}catch(e){return null}};
const val=id=>$(id)?.value??null;
const num=id=>{const v=val(id);return v!==null&&v!==''?Number(v):null};
const chk=id=>!!$(id)?.checked;
let submittedFiles=[];
function snapshot(){
  const floors=[...document.querySelectorAll('#floors .floor')].map((r,i)=>({floor:i+1,area:Number(r.querySelector('.area')?.value||0),condition:r.querySelector('.condition')?.value||'average'}));
  return {property_type:val('property_type')||'house',cadastral_code:(val('cadastral_code')||'').trim(),city:val('city')||'',address:(val('address')||'').trim(),latitude:num('latitude'),longitude:num('longitude'),house_area:num('house_area'),land_area:num('land_area'),land_purpose:val('land_purpose')||'unknown',floor_count:Number(val('floor_count')||floors.length||1),floor_areas:floors.map(x=>({floor:x.floor,area:x.area})),floor_conditions:floors.map(x=>({floor:x.floor,condition:x.condition})),floors,rooms:num('rooms'),bedrooms:num('bedrooms'),bathrooms:num('bathrooms'),build_year:num('build_year'),material:val('material')||'',basement:chk('basement'),garage:chk('garage'),balcony:chk('balcony'),outbuildings:chk('outbuildings')?[{type:'unspecified'}]:[],lot_frontage:num('lot_frontage'),lot_depth:num('lot_depth'),lot_shape:val('lot_shape')||'',terrain:val('terrain')||'',road_type:val('road_type')||'',utilities:{gas:chk('gas'),water:chk('water'),sewer:chk('sewer'),electricity:chk('electricity'),internet:chk('internet')},heating:val('heating')||'',commercial_potential:val('commercial_potential')||'',owner_asking_price:num('owner_asking_price')};
}
function remember(){
  const s=snapshot();
  try{localStorage.setItem('valuation:last-form-snapshot',JSON.stringify(s))}catch(e){}
  const input=$('photos');submittedFiles=input?.files?[...input.files].slice(0,20):[];
  return s;
}
function mergeSaved(obj,s){
  if(!obj||typeof obj!=='object')return obj;
  const input={...(obj.input_data||{}),...s,floors:s.floors};
  return {...obj,...s,input_data:input,utilities:s.utilities,floor_areas:s.floor_areas,floor_conditions:s.floor_conditions};
}
const origSet=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){
  try{
    if(this===localStorage&&typeof k==='string'&&k.startsWith('valuation:local-')){
      const o=safe(v);if(o){const s=remember();v=JSON.stringify(mergeSaved(o,s))}
    }
  }catch(e){}
  return origSet.call(this,k,v);
};
function headerObj(h){const out={};try{new Headers(h||{}).forEach((v,k)=>out[k]=v)}catch(e){Object.assign(out,h||{})}return out}
async function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function uploadBlob(id,blob,name,headers,index){
  const auth=headers.authorization||headers.Authorization,apikey=headers.apikey;if(!auth||!apikey)return;
  const ext=(String(name||'jpg').split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';
  let uid='repeat';try{let p=String(auth).replace(/^Bearer\s+/i,'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';uid=JSON.parse(atob(p)).sub||uid}catch(e){}
  const path=uid+'/'+id+'/'+(index+1)+'-'+Date.now()+'.'+ext;
  const up=await origFetch(SB+'/storage/v1/object/valuation-photos/'+path,{method:'POST',headers:{apikey,Authorization:auth,'Content-Type':blob.type||'image/jpeg','x-upsert':'false'},body:blob});
  if(!up.ok)return;
  const base=SB+'/storage/v1/object/public/valuation-photos/';
  await origFetch(SB+'/rest/v1/valuation_photos',{method:'POST',headers:{apikey,Authorization:auth,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({valuation_id:id,storage_path:path,public_url:base+path,sort_order:index})});
}
async function ensurePhotos(id,headers){
  await sleep(1600);
  const auth=headers.authorization||headers.Authorization,apikey=headers.apikey;if(!auth||!apikey)return;
  let existing=[];try{const r=await origFetch(SB+'/rest/v1/valuation_photos?valuation_id=eq.'+encodeURIComponent(id)+'&select=id,storage_path,public_url',{headers:{apikey,Authorization:auth}});if(r.ok)existing=await r.json()}catch(e){}
  let index=existing.length;
  if(!existing.length&&submittedFiles.length){for(const f of submittedFiles){try{await uploadBlob(id,f,f.name,headers,index++)}catch(e){}}}
  const repeats=safe(localStorage.getItem('valuation:repeat-photos'))||[];
  if(repeats.length){
    for(const p of repeats){try{const r=await origFetch(p.public_url||p.url,{cache:'no-store'});if(!r.ok)continue;const b=await r.blob();await uploadBlob(id,b,(p.storage_path||p.public_url||'repeat.jpg'),headers,index++)}catch(e){}}
    try{localStorage.removeItem('valuation:repeat-photos')}catch(e){}
  }
}
const origFetch=window.fetch.bind(window);
window.fetch=async function(input,init={}){
  const url=typeof input==='string'?input:(input?.url||'');
  const method=String(init?.method||input?.method||'GET').toUpperCase();
  if(url.includes('/rest/v1/property_valuations')&&method==='POST'&&init?.body){
    try{
      const raw=typeof init.body==='string'?JSON.parse(init.body):null;
      if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
        const s=remember(),body=mergeSaved(raw,s);init={...init,body:JSON.stringify(body)};
      }
    }catch(e){}
    const h=headerObj(init.headers||input?.headers);
    const resp=await origFetch(input,init);
    if(resp.ok){try{const rows=await resp.clone().json();const id=rows?.[0]?.id;if(id)setTimeout(()=>ensurePhotos(id,h),50)}catch(e){}}
    return resp;
  }
  return origFetch(input,init);
};
document.addEventListener('submit',e=>{if(e.target?.id==='vf')remember()},true);
})();