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

const publicHomeV62=`<script id="kh-public-home-v62">(function(){'use strict';
if(location.pathname!=='/'||document.getElementById('kh62Home'))return;
var css=document.createElement('style');css.textContent='#kh62Home{box-sizing:border-box;width:min(1180px,calc(100% - 24px));margin:14px auto 18px;padding:22px;border:1px solid #dce5e6;border-radius:26px;background:linear-gradient(135deg,#f5fbfa 0%,#fff 52%,#f6f8fc 100%);box-shadow:0 16px 46px rgba(20,35,52,.08);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#142033}#kh62Home *{box-sizing:border-box}.kh62top{display:flex;gap:18px;justify-content:space-between;align-items:flex-start}.kh62eyebrow{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;background:#e8f6f3;color:#0c746b;font-size:11px;font-weight:900}.kh62eyebrow svg,.kh62role svg{width:15px;height:15px;flex:0 0 auto}.kh62title{font-size:clamp(25px,4vw,42px);line-height:1.04;margin:10px 0 8px;letter-spacing:-.035em}.kh62lead{max-width:720px;color:#657082;font-size:15px;line-height:1.55;margin:0}.kh62roles{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.kh62role{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid #dce4e8;border-radius:999px;background:#fff;color:#5b6675;font-size:10px;font-weight:850;white-space:nowrap;box-shadow:0 3px 10px rgba(20,35,52,.035)}.kh62grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:18px}.kh62action{appearance:none;position:relative;overflow:hidden;border:1px solid #dce4e8;background:linear-gradient(180deg,#fff,#fbfcfd);border-radius:20px;padding:15px 13px 17px;text-align:left;cursor:pointer;min-height:132px;color:#172238;box-shadow:0 6px 18px rgba(20,35,52,.045);transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.kh62action:hover{transform:translateY(-2px);border-color:#9fd0ca;box-shadow:0 10px 26px rgba(20,35,52,.09)}.kh62action:after{content:"›";position:absolute;right:13px;top:13px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#f1f5f6;color:#71808a;font-size:20px;font-weight:700;line-height:1}.kh62icon{display:grid;place-items:center;width:46px;height:46px;border-radius:15px;background:linear-gradient(145deg,#e8f6f3,#f3faf8);border:1px solid #d5ebe7;color:#0f766e;margin-bottom:11px;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}.kh62icon svg{width:24px;height:24px;display:block;stroke:currentColor}.kh62action b{display:block;font-size:14px;margin-bottom:5px;line-height:1.2}.kh62action .kh62desc{display:block;color:#707b8b;font-size:11px;line-height:1.38;padding-right:5px}.kh62action.primary{background:linear-gradient(135deg,#0f766e 0%,#11867c 100%);border-color:#0f766e;color:#fff;box-shadow:0 12px 26px rgba(15,118,110,.22)}.kh62action.primary .kh62icon{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.22);color:#fff}.kh62action.primary .kh62desc{color:rgba(255,255,255,.84)}.kh62action.primary:after{background:rgba(255,255,255,.16);color:#fff}.kh62foot{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:14px;padding-top:13px;border-top:1px solid #e4eaed;color:#707a89;font-size:11px}.kh62foot strong{color:#263247}.kh62toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483000;background:#142033;color:#fff;padding:10px 14px;border-radius:12px;font:800 12px system-ui;box-shadow:0 12px 35px rgba(0,0,0,.2)}@media(max-width:820px){#kh62Home{padding:16px;border-radius:22px}.kh62top{display:block}.kh62roles{justify-content:flex-start;margin-top:12px}.kh62grid{grid-template-columns:1fr 1fr}.kh62action{min-height:126px}.kh62action:last-child{grid-column:1/-1;min-height:102px}.kh62action:last-child .kh62icon{margin-bottom:8px}.kh62foot{display:block;line-height:1.5}}@media(max-width:390px){#kh62Home{width:calc(100% - 16px);margin-top:8px;padding:13px}.kh62title{font-size:24px}.kh62grid{gap:8px}.kh62action{padding:12px 10px 14px;min-height:122px;border-radius:18px}.kh62action b{font-size:13px}.kh62icon{width:43px;height:43px;border-radius:14px}.kh62role{font-size:9px;padding:7px 8px}}';document.head.appendChild(css);
function icon(type){var p={pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',store:'<path d="M4 10h16l-1.5-5h-13L4 10Z"/><path d="M5 10v9h14v-9"/><path d="M9 19v-5h6v5"/>',home:'<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',bag:'<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>',plus:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',search:'<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',building:'<path d="M4 20V8l8-4 8 4v12"/><path d="M8 12h2M14 12h2M8 16h2M14 16h2M10 20v-3h4v3"/>',estimate:'<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M8 15h8M8 18h5"/>'};return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(p[type]||'')+'</svg>'}
function norm(s){return String(s||'').replace(/\\s+/g,' ').trim()}
function visible(el){if(!el)return false;var r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>2&&r.height>2&&s.display!=='none'&&s.visibility!=='hidden'}
function candidates(){return Array.prototype.slice.call(document.querySelectorAll('button,a,[role="button"]')).filter(function(x){return visible(x)&&!x.closest('#kh62Home')})}
function clickText(res){var a=candidates();for(var i=0;i<res.length;i++){for(var j=0;j<a.length;j++){if(res[i].test(norm(a[j].textContent))){a[j].click();return true}}}return false}
function findSection(words){var hs=Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,strong,b'));for(var i=0;i<words.length;i++){for(var j=0;j<hs.length;j++){var t=norm(hs[j].textContent).toLowerCase();if(!t||t.indexOf(words[i].toLowerCase())<0)continue;var n=hs[j];for(var k=0;k<5&&n&&n!==document.body;k++,n=n.parentElement){if(visible(n)&&n.getBoundingClientRect().height>100&&n.getBoundingClientRect().height<1800){return n}}}}return null}
function toast(t){var x=document.createElement('div');x.className='kh62toast';x.textContent=t;document.body.appendChild(x);setTimeout(function(){x.remove()},2600)}
function scroll(words,msg){var s=findSection(words);if(s){s.scrollIntoView({behavior:'smooth',block:'start'});return true}toast(msg);return false}
function act(kind){if(kind==='valuation'){location.href='/valuation';return}if(kind==='buy'){scroll(['Объявления Хашури','Объявления'],'Раздел объявлений находится ниже на главной.');return}if(kind==='services'){scroll(['Бизнес и услуги','Каталог бизнеса','Местный бизнес','Услуги'],'Каталог бизнеса находится ниже на главной.');return}if(kind==='sell'){if(clickText([/подать.*объявлен/i,/разместить.*объявлен/i,/добавить.*объявлен/i]))return;scroll(['Объявления Хашури','Объявления'],'Откройте раздел объявлений и нажмите кнопку размещения.');return}if(kind==='business'){if(clickText([/добавить.*бизнес/i,/разместить.*бизнес/i,/добавить.*компан/i,/мой бизнес/i]))return;scroll(['Бизнес и услуги','Каталог бизнеса','Местный бизнес'],'Откройте каталог бизнеса и выберите добавление компании.')}}
function mount(){if(document.getElementById('kh62Home'))return;var old=document.getElementById('kh56Home');if(old)old.remove();var box=document.createElement('section');box.id='kh62Home';box.setAttribute('aria-label','Что можно сделать на Khashuri Marketplace');box.innerHTML='<div class="kh62top"><div><div class="kh62eyebrow">'+icon('pin')+'<span>Для Хашури и района</span></div><h1 class="kh62title">Всё нужное в Хашури — в одном месте</h1><p class="kh62lead">Объявления, местные услуги, бизнес и недвижимость. Выберите, что хотите сделать — сайт сразу приведёт в нужный раздел.</p></div><div class="kh62roles"><span class="kh62role">'+icon('user')+'Жителям</span><span class="kh62role">'+icon('store')+'Бизнесу</span><span class="kh62role">'+icon('home')+'Владельцам недвижимости</span></div></div><div class="kh62grid"><button class="kh62action" data-kh62="buy"><span class="kh62icon">'+icon('bag')+'</span><b>Купить</b><span class="kh62desc">Посмотреть товары и частные объявления в Хашури.</span></button><button class="kh62action" data-kh62="sell"><span class="kh62icon">'+icon('plus')+'</span><b>Продать</b><span class="kh62desc">Подать своё объявление и найти покупателя.</span></button><button class="kh62action" data-kh62="services"><span class="kh62icon">'+icon('search')+'</span><b>Найти услугу</b><span class="kh62desc">Мастера, магазины, сервисы и местные компании.</span></button><button class="kh62action" data-kh62="business"><span class="kh62icon">'+icon('building')+'</span><b>Разместить бизнес</b><span class="kh62desc">Добавить компанию и получать клиентов с площадки.</span></button><button class="kh62action primary" data-kh62="valuation"><span class="kh62icon">'+icon('estimate')+'</span><b>Оценить недвижимость</b><span class="kh62desc">Получить ориентировочную оценку объекта и сохранить результат.</span></button></div><div class="kh62foot"><span><strong>Khashuri Marketplace</strong> — локальная площадка для жителей и бизнеса.</span><span>CRM и инструменты менеджеров находятся в отдельном рабочем кабинете.</span></div>';box.querySelectorAll('[data-kh62]').forEach(function(b){b.onclick=function(){act(b.getAttribute('data-kh62'))}});var main=document.querySelector('main');if(main){main.insertBefore(box,main.firstChild)}else{var h=document.querySelector('header');if(h)h.insertAdjacentElement('afterend',box);else document.body.insertBefore(box,document.body.firstChild)}}
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
        if((pathname==='/'||pathname==='')&&!body.includes('kh-public-home-v62'))inject+=publicHomeV62;
        if(!body.includes('/valuation-entry.js'))inject+='<script src="/valuation-entry.js?v=46"></script>';
        if(inject)body=body.includes('</body>')?body.replace('</body>',inject+'</body>'):body+inject;
      }
    }catch(e){}
    return originalEnd(body,...args);
  };
  return app(req,res);
};