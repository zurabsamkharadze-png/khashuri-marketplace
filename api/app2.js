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
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+key},body:JSON.stringify({model:'gpt-5-mini',input:[{role:'user',content}]})});
    const j=await r.json();
    if(!r.ok){console.error('photo-ai openai',r.status,j?.error?.message||j);res.statusCode=502;return res.end(JSON.stringify({error:'ai_provider_error'}))}
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