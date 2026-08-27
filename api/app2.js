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
      if(ct.includes('text/html')&&typeof body==='string'&&!body.includes('/valuation-entry.js')){
        body=body.includes('</body>')?body.replace('</body>','<script src="/valuation-entry.js?v=1.0"></script></body>'):body+'<script src="/valuation-entry.js?v=1.0"></script>';
      }
    }catch(e){}
    return originalEnd(body,...args);
  };
  return app(req,res);
};