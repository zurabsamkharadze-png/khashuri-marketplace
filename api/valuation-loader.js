const fs=require('fs');
const path=require('path');
const Module=require('module');
let handler=null;
let fallback='',saver='',modelv4='',v31house='',v32mobile='',v33ux='',v34states='',v35result='',v37cad='',resultfix='',resultv28='',v28prefill='',prefill='',persistence='',repeatguard='',photoverify='',optionguard='';
const i18nScript='<script src="/valuation-i18n.js?v=37"><\/script>';
function readPublic(name){try{return fs.readFileSync(path.join(process.cwd(),'public',name),'utf8')}catch(e){return''}}
function patchModelV34(src){
  if(!src)return src;
  src=src.replace("const C={new_repair:1.12,good:1,average:.85,old:.72,repair:.58,none:.48,shell:.42};","const C={new_repair:1.12,good:1,average:.85,old:.72,repair:.58,none:.48,shell:.42,reconstruction:.45,demolition:.05};");
  src=src.replace("const L={new_repair:'Новый ремонт',good:'Хороший ремонт',average:'Среднее состояние',old:'Старый ремонт',repair:'Требует ремонта',none:'Без ремонта',shell:'Черный каркас'};","const L={new_repair:'Новый ремонт',good:'Хороший ремонт',average:'Среднее состояние',old:'Старый ремонт',repair:'Требует ремонта',none:'Без ремонта',shell:'Черный каркас',reconstruction:'Реконструкция',demolition:'Под снос'};");
  const oldFloor="fs.forEach(f=>{const ar=Number(f.area||0)||fallback,k=C[f.condition]||.85,v=ar*buildRate*k;rawBuilding+=v;floorComponents.push({floor:f.floor,area:ar,condition:f.condition,label:L[f.condition]||f.condition,coefficient:k,rate:buildRate,value_before_structural:v,value:v*struct.factor})});const building=rawBuilding*struct.factor,land=";
  const newFloor="let building=0;fs.forEach(f=>{const ar=Number(f.area||0)||fallback,k=C[f.condition]||.85,v=ar*buildRate*k;rawBuilding+=v;let sf=struct.factor;if((f.condition==='reconstruction'&&a.structural_condition==='reconstruction')||(f.condition==='demolition'&&a.structural_condition==='demolition'))sf=1;const fv=v*sf;building+=fv;floorComponents.push({floor:f.floor,area:ar,condition:f.condition,label:L[f.condition]||f.condition,coefficient:k,rate:buildRate,structural_coefficient:sf,value_before_structural:v,value:fv})});const land=";
  src=src.replace(oldFloor,newFloor);
  src=src.replace("if(a.structural_condition==='capital_repair')neg.push('Зданию требуется капитальный ремонт');","if(fs.some(f=>f.condition==='reconstruction'))neg.push('Один или несколько этажей требуют реконструкции');if(fs.some(f=>f.condition==='demolition'))neg.push('Один или несколько этажей указаны под снос');if(a.structural_condition==='capital_repair')neg.push('Зданию требуется капитальный ремонт');");
  return src;
}
function load(){
  if(handler)return handler;
  const file=path.join(__dirname,'valuation.js');
  let src=fs.readFileSync(file,'utf8');
  src=src.replace(/<\/body><\/html>`}\s*}\s*function landing\(\)/,"</body></html>`}\nfunction landing()");
  const m=new Module(file,module);
  m.filename=file;m.paths=module.paths;m._compile(src,file);
  handler=m.exports;
  fallback=readPublic('valuation-fallback.js');
  saver=readPublic('valuation-save.js');
  modelv4=patchModelV34(readPublic('valuation-model-v4.js'));
  v31house=readPublic('valuation-v31-house-condition-ui.js');
  v32mobile=readPublic('valuation-v32-mobile-fix.js');
  v33ux=readPublic('valuation-v33-form-ux.js');
  v34states=readPublic('valuation-v34-floor-severe-states.js');
  v35result=readPublic('valuation-v35-result-display-fix.js');
  v37cad=readPublic('valuation-v37-cadastral-autofill.js');
  resultfix=readPublic('valuation-resultfix.js');
  resultv28=readPublic('valuation-v28-result.js');
  v28prefill=readPublic('valuation-v28-prefill.js');
  prefill=readPublic('valuation-repeat-prefill.js');
  persistence=readPublic('valuation-form-persistence.js');
  repeatguard=readPublic('valuation-repeat-v14-guard.js');
  photoverify=readPublic('valuation-photo-verify.js');
  optionguard=readPublic('valuation-option-value-guard.js');
  return handler;
}
module.exports=(req,res)=>{
  try{
    res.setHeader('cache-control','no-store, max-age=0, must-revalidate');
    const h=load();
    const originalEnd=res.end.bind(res);
    res.end=(body,...args)=>{
      const wasBuffer=Buffer.isBuffer(body);
      let html=wasBuffer?body.toString('utf8'):body;
      if(typeof html==='string'&&html.includes('</body>')){
        const pathname=(req.url||'').split('?')[0];
        const isResult=/^\/valuation\/result\//.test(pathname);
        if(isResult){
          html=html.replace(/<script\s+src=["']\/valuation-client\.js[^"']*["']><\/script>/gi,'');
          const scripts=(resultfix?`<script>${resultfix}<\/script>`:'')+i18nScript+(resultv28?`<script>${resultv28}<\/script>`:'')+(v34states?`<script>${v34states}<\/script>`:'')+(v35result?`<script>${v35result}<\/script>`:'');
          html=html.replace('</body>',scripts+'</body>');
        }else{
          const scripts=
            (optionguard?`<script>${optionguard}<\/script>`:'')+
            (saver?`<script>${saver}<\/script>`:'')+
            (modelv4?`<script>${modelv4}<\/script>`:'')+
            (v31house?`<script>${v31house}<\/script>`:'')+
            (v32mobile?`<script>${v32mobile}<\/script>`:'')+
            (v33ux?`<script>${v33ux}<\/script>`:'')+
            (v34states?`<script>${v34states}<\/script>`:'')+
            (v37cad?`<script>${v37cad}<\/script>`:'')+
            (v28prefill?`<script>${v28prefill}<\/script>`:'')+
            (fallback?`<script>${fallback}<\/script>`:'')+
            (prefill?`<script>${prefill}<\/script>`:'')+
            (persistence?`<script>${persistence}<\/script>`:'')+
            (repeatguard?`<script>${repeatguard}<\/script>`:'')+
            (photoverify?`<script>${photoverify}<\/script>`:'')+
            i18nScript;
          if(scripts)html=html.replace('</body>',scripts+'</body>');
        }
      }
      return originalEnd(wasBuffer&&typeof html==='string'?Buffer.from(html,'utf8'):html,...args);
    };
    return h(req,res);
  }catch(err){
    console.error('valuation-loader',err&&err.stack||err);
    res.statusCode=500;
    res.setHeader('content-type','text/plain; charset=utf-8');
    return res.end('Valuation module error');
  }
};