const fs=require('fs');
const path=require('path');
const app=require('./app');

async function readJson(req){
  if(req.body&&typeof req.body==='object')return req.body;
  let raw='';
  for await(const chunk of req){raw+=chunk;if(raw.length>5_500_000)throw new Error('payload_too_large')}
  return raw?JSON.parse(raw):{};
}
function extractText(j){
  if(typeof j?.output_text==='string')return j.output_text;
  for(const item of j?.output||[])for(const c of item?.content||[])if(c?.type==='output_text'&&c?.text)return c.text;
  return '';
}
function safeProviderError(status,j){
  const e=j&&j.error||{};
  const code=String(e.code||e.type||('http_'+status)).slice(0,80);
  const messages={
    insufficient_quota:'OpenAI API: недостаточно средств/кредитов (insufficient_quota)',
    billing_hard_limit_reached:'OpenAI API: достигнут лимит расходов (billing_hard_limit_reached)',
    invalid_api_key:'OpenAI API: API-ключ недействителен (invalid_api_key)',
    model_not_found:'OpenAI API: модель недоступна для этого проекта (model_not_found)',
    rate_limit_exceeded:'OpenAI API: временно превышен лимит запросов (rate_limit_exceeded)',
    permission_denied:'OpenAI API: у проекта нет доступа к модели (permission_denied)'
  };
  return {error:messages[code]||('OpenAI API error: '+code),provider_status:Number(status)||0,provider_code:code};
}
async function callVision(key,model,content){
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+key},body:JSON.stringify({model,input:[{role:'user',content}]})});
  let j={};try{j=await r.json()}catch(e){}
  return {r,j,model};
}
async function photoAI(req,res){
  if(req.method!=='POST'){res.statusCode=405;res.setHeader('allow','POST');return res.end(JSON.stringify({error:'method_not_allowed'}))}
  res.setHeader('content-type','application/json; charset=utf-8');
  const key=process.env.OPENAI_API_KEY;
  if(!key){res.statusCode=503;return res.end(JSON.stringify({error:'OPENAI_API_KEY is not configured'}))}
  try{
    const body=await readJson(req),images=Array.isArray(body.images)?body.images.slice(0,6):[];
    if(!images.length){res.statusCode=400;return res.end(JSON.stringify({error:'no_images'}))}
    if(images.some(x=>typeof x!=='string'||!x.startsWith('data:image/')||x.length>1_200_000)){res.statusCode=400;return res.end(JSON.stringify({error:'invalid_image'}))}
    const prompt=`Analyze real-estate photos only for visible condition. Do not claim hidden structural defects, foundation safety, roof integrity, wiring safety, or code compliance unless directly visible. Return ONLY valid JSON, no markdown. Schema: {"structural_condition":"usable|capital_repair|reconstruction|demolition","room_condition":"new_repair|good|average|old|repair|none|shell","confidence":0-100,"observations_ru":["..."],"observations_ka":["..."],"warnings_ru":["..."],"warnings_ka":["..."]}. structural_condition is only a cautious visual recommendation; choose demolition only when visible evidence strongly supports it. room_condition describes visible interior finishing. observations must be short factual visible signs. warnings must state important uncertainty and that photo analysis does not replace on-site technical inspection.`;
    const content=[{type:'input_text',text:prompt},...images.map(image_url=>({type:'input_image',image_url,detail:'high'}))];
    let attempt=await callVision(key,'gpt-5-mini',content);
    if(!attempt.r.ok){
      const code=String(attempt.j?.error?.code||attempt.j?.error?.type||'');
      if(['model_not_found','permission_denied','invalid_request_error'].includes(code)||[403,404].includes(attempt.r.status)){
        const fallback=await callVision(key,'gpt-4.1-mini',content);
        if(fallback.r.ok)attempt=fallback;
        else attempt=fallback;
      }
    }
    const {r,j}=attempt;
    if(!r.ok){const safe=safeProviderError(r.status,j);console.error('photo-ai openai',r.status,safe.provider_code);res.statusCode=502;return res.end(JSON.stringify(safe))}
    let text=extractText(j).trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim(),out;
    try{out=JSON.parse(text)}catch(e){res.statusCode=502;return res.end(JSON.stringify({error:'invalid_ai_response'}))}
    const allowedStruct=new Set(['usable','capital_repair','reconstruction','demolition']),allowedRoom=new Set(['new_repair','good','average','old','repair','none','shell']);
    if(!allowedStruct.has(out.structural_condition))out.structural_condition='capital_repair';
    if(!allowedRoom.has(out.room_condition))out.room_condition='average';
    out.confidence=Math.max(0,Math.min(100,Number(out.confidence)||0));
    for(const k of ['observations_ru','observations_ka','warnings_ru','warnings_ka'])out[k]=Array.isArray(out[k])?out[k].slice(0,8).map(x=>String(x).slice(0,240)):[];
    return res.end(JSON.stringify(out));
  }catch(e){console.error('photo-ai',e);res.statusCode=e?.message==='payload_too_large'?413:500;return res.end(JSON.stringify({error:e?.message||'photo_ai_failed'}))}
}

const publicHomeV56=`<script id="kh-public-home-v56">(function(){'use strict';
if(location.pathname!=='/'||document.getElementById('kh56Home'))return;
var css=document.createElement('style');css.textContent='#kh56Home{box-sizing:border-box;width:min(1180px,calc(100% - 24px));margin:14px auto 18px;padding:22px;border:1px solid #dfe5e8;border-radius:26px;background:linear-gradient(135deg,#f6fbfa 0%,#fff 52%,#f5f8ff 100%);box-shadow:0 14px 42px rgba(20,35,52,.07);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#142033}#kh56Home *{box-sizing:border-box}.kh56top{display:flex;gap:18px;justify-content:space-between;align-items:flex-start}.kh56eyebrow{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#e5f5f1;color:#0c746b;font-size:11px;font-weight:900}.kh56title{font-size:clamp(25px,4vw,42px);line-height:1.04;margin:10px 0 8px;letter-spacing:-.035em}.kh56lead{max-width:720px;color:#657082;font-size:15px;line-height:1.55;margin:0}.kh56roles{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.kh56role{padding:7px 9px;border:1px solid #dfe4e9;border-radius:999px;background:#fff;color:#5d6877;font-size:10px;font-weight:800;white-space:nowrap}.kh56grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-top:18px}.kh56action{appearance:none;border:1px solid #dfe4e8;background:#fff;border-radius:18px;padding:14px 12px;text-align:left;cursor:pointer;min-height:126px;color:#172238;box-shadow:0 4px 14px rgba(20,35,52,.035);transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.kh56action:hover{transform:translateY(-2px);border-color:#a9d5cf;box-shadow:0 9px 24px rgba(20,35,52,.08)}.kh56icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#eef7f5;font-size:20px;margin-bottom:10px}.kh56action b{display:block;font-size:14px;margin-bottom:4px}.kh56action span{display:block;color:#737d8d;font-size:11px;line-height:1.35}.kh56action.primary{background:#0f766e;border-color:#0f766e;color:#fff}.kh56action.primary .kh56icon{background:rgba(255,255,255,.16)}.kh56action.primary span{color:rgba(255,255,255,.82)}.kh56foot{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:13px;padding-top:12px;border-top:1px solid #e6eaee;color:#707a89;font-size:11px}.kh56foot strong{color:#263247}.kh56toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483000;background:#142033;color:#fff;padding:10px 14px;border-radius:12px;font:800 12px system-ui;box-shadow:0 12px 35px rgba(0,0,0,.2)}@media(max-width:820px){#kh56Home{padding:16px;border-radius:21px}.kh56top{display:block}.kh56roles{justify-content:flex-start;margin-top:11px}.kh56grid{grid-template-columns:1fr 1fr}.kh56action{min-height:116px}.kh56action:last-child{grid-column:1/-1;min-height:96px}.kh56foot{display:block;line-height:1.45}}@media(max-width:390px){#kh56Home{width:calc(100% - 16px);margin-top:8px;padding:13px}.kh56title{font-size:24px}.kh56grid{gap:7px}.kh56action{padding:11px 10px;min-height:112px}.kh56action b{font-size:13px}}';document.head.appendChild(css);
function norm(s){return String(s||'').replace(/\\s+/g,' ').trim()}
function visible(el){if(!el)return false;var r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>2&&r.height>2&&s.display!=='none'&&s.visibility!=='hidden'}
function candidates(){return Array.prototype.slice.call(document.querySelectorAll('button,a,[role="button"]')).filter(function(x){return visible(x)&&!x.closest('#kh56Home')})}
function clickText(res){var a=candidates();for(var i=0;i<res.length;i++){for(var j=0;j<a.length;j++){if(res[i].test(norm(a[j].textContent))){a[j].click();return true}}}return false}
function findSection(words){var hs=Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,strong,b'));for(var i=0;i<words.length;i++){for(var j=0;j<hs.length;j++){var t=norm(hs[j].textContent).toLowerCase();if(!t||t.indexOf(words[i].toLowerCase())<0)continue;var n=hs[j];for(var k=0;k<5&&n&&n!==document.body;k++,n=n.parentElement){if(visible(n)&&n.getBoundingClientRect().height>100&&n.getBoundingClientRect().height<1800){return n}}}}return null}
function toast(t){var x=document.createElement('div');x.className='kh56toast';x.textContent=t;document.body.appendChild(x);setTimeout(function(){x.remove()},2600)}
function scroll(words,msg){var s=findSection(words);if(s){s.scrollIntoView({behavior:'smooth',block:'start'});return true}toast(msg);return false}
function act(kind){if(kind==='valuation'){location.href='/valuation';return}if(kind==='buy'){scroll(['Объявления Хашури','Объявления'], 'Раздел объявлений находится ниже на главной.');return}if(kind==='services'){scroll(['Бизнес и услуги','Каталог бизнеса','Местный бизнес','Услуги'], 'Каталог бизнеса находится ниже на главной.');return}if(kind==='sell'){if(clickText([/подать.*объявлен/i,/разместить.*объявлен/i,/добавить.*объявлен/i]))return;scroll(['Объявления Хашури','Объявления'],'Откройте раздел объявлений и нажмите кнопку размещения.');return}if(kind==='business'){if(clickText([/добавить.*бизнес/i,/разместить.*бизнес/i,/добавить.*компан/i,/мой бизнес/i]))return;scroll(['Бизнес и услуги','Каталог бизнеса','Местный бизнес'],'Откройте каталог бизнеса и выберите добавление компании.')}}
function mount(){if(document.getElementById('kh56Home'))return;var box=document.createElement('section');box.id='kh56Home';box.setAttribute('aria-label','Что можно сделать на Khashuri Marketplace');box.innerHTML='<div class="kh56top"><div><div class="kh56eyebrow">📍 Для Хашури и района</div><h1 class="kh56title">Всё нужное в Хашури — в одном месте</h1><p class="kh56lead">Объявления, местные услуги, бизнес и недвижимость. Выберите, что хотите сделать — сайт сразу приведёт в нужный раздел.</p></div><div class="kh56roles"><span class="kh56role">👤 Жителям</span><span class="kh56role">🏪 Бизнесу</span><span class="kh56role">🏠 Владельцам недвижимости</span></div></div><div class="kh56grid"><button class="kh56action" data-kh56="buy"><span class="kh56icon">🛍️</span><b>Купить</b><span>Посмотреть товары и частные объявления в Хашури.</span></button><button class="kh56action" data-kh56="sell"><span class="kh56icon">➕</span><b>Продать</b><span>Подать своё объявление и найти покупателя.</span></button><button class="kh56action" data-kh56="services"><span class="kh56icon">🔎</span><b>Найти услугу</b><span>Мастера, магазины, сервисы и местные компании.</span></button><button class="kh56action" data-kh56="business"><span class="kh56icon">🏪</span><b>Разместить бизнес</b><span>Добавить компанию и получать клиентов с площадки.</span></button><button class="kh56action primary" data-kh56="valuation"><span class="kh56icon">🏠</span><b>Оценить недвижимость</b><span>Получить ориентировочную оценку объекта и сохранить результат.</span></button></div><div class="kh56foot"><span><strong>Khashuri Marketplace</strong> — локальная площадка для жителей и бизнеса.</span><span>CRM и инструменты менеджеров находятся в отдельном рабочем кабинете.</span></div>';box.querySelectorAll('[data-kh56]').forEach(function(b){b.onclick=function(){act(b.getAttribute('data-kh56'))}});var main=document.querySelector('main');if(main){main.insertBefore(box,main.firstChild)}else{var h=document.querySelector('header');if(h)h.insertAdjacentElement('afterend',box);else document.body.insertBefore(box,document.body.firstChild)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(mount,120)});else setTimeout(mount,120);setTimeout(mount,900);
})();</script>`;

module.exports=async(req,res)=>{
  const pathname=(req.url||'').split('?')[0];

  if(pathname==='/valuation/photo-ai')return photoAI(req,res);

  if(pathname==='/khashuri-inbox-reopen.js'||pathname==='/valuation-entry.js'){
    try{
      const name=pathname==='/valuation-entry.js'?'valuation-entry.js':'khashuri-inbox-reopen.js';
      const file=path.join(process.cwd(),'public',name);
      const js=fs.readFileSync(file,'utf8');
      res.statusCode=200;
      res.setHeader('content-type','application/javascript; charset=utf-8');
      res.setHeader('cache-control','no-store, max-age=0, must-revalidate');
      return res.end(js);
    }catch(e){
      res.statusCode=404;
      return res.end('');
    }
  }

  const originalEnd=res.end.bind(res);
  res.end=(body,...args)=>{
    try{
      const ct=String(res.getHeader('content-type')||'');
      if(ct.includes('text/html')&&typeof body==='string'){
        let inject='';
        if((pathname==='/'||pathname==='')&&!body.includes('kh-public-home-v56'))inject+=publicHomeV56;
        if(!body.includes('/valuation-entry.js'))inject+='<script src="/valuation-entry.js?v=46"></script>';
        if(inject)body=body.includes('</body>')?body.replace('</body>',inject+'</body>'):body+inject;
      }
    }catch(e){}
    return originalEnd(body,...args);
  };
  return app(req,res);
};