const fs=require('fs');
const path=require('path');
const Module=require('module');
let handler=null;
let fallback='';
let saver='';
let clickfix='';
let resultfix='';
let prefill='';
let persistence='';
let repeatguard='';
let photoverify='';
const i18nScript='<script src="/valuation-i18n.js?v=23"><\/script>';
function load(){
  if(handler)return handler;
  const file=path.join(__dirname,'valuation.js');
  let src=fs.readFileSync(file,'utf8');
  src=src.replace(/<\/body><\/html>`}\s*}\s*function landing\(\)/,"</body></html>`}\nfunction landing()");
  const m=new Module(file,module);
  m.filename=file;
  m.paths=module.paths;
  m._compile(src,file);
  handler=m.exports;
  try{fallback=fs.readFileSync(path.join(process.cwd(),'public','valuation-fallback.js'),'utf8')}catch(e){fallback=''}
  try{saver=fs.readFileSync(path.join(process.cwd(),'public','valuation-save.js'),'utf8')}catch(e){saver=''}
  try{
    clickfix=fs.readFileSync(path.join(process.cwd(),'public','valuation-clickfix.js'),'utf8');
    const beforeLegacyPatch=clickfix;
    clickfix=clickfix.replace(/if\(code==='69\.08\.63\.588'\)\{[\s\S]*?\}return \{mode:/,"return {mode:");
    clickfix=clickfix.replace(/outbuildings=\[\{type:'additional_building',label:'Дополнительное строение'\}\];/g,"outbuildings=chk('outbuildings')?[{type:'unspecified'}]:[];");
    clickfix=clickfix.replace(/if\(\$\('outbuildings'\)\)\$\('outbuildings'\)\.checked=true;/g,'');
    if(clickfix===beforeLegacyPatch)console.warn('valuation-loader: legacy cadastral override pattern not found');
    clickfix=clickfix.replace(/const data=pack\(obj\);location\.assign\('\/valuation\/result\/'\+id\+'\?data='\+encodeURIComponent\(data\)\+'&v=121'\);/,`const data=pack(obj);if(window.khAwaitValuationSave){btn.textContent='Сохраняю фото…';try{await window.khAwaitValuationSave(id)}catch(e){alert(e&&e.message?e.message:'Фото не удалось сохранить. Останьтесь на странице и попробуйте ещё раз.');btn.disabled=false;btn.textContent=oldText;return}}const khQ=new URLSearchParams(location.search),khLang=khQ.get('lang')||'ru',khPub=khQ.get('public')==='1'?'&public=1':'';location.assign('/valuation/result/'+id+'?data='+encodeURIComponent(data)+'&v=124&lang='+encodeURIComponent(khLang)+khPub);`);
  }catch(e){clickfix=''}
  try{resultfix=fs.readFileSync(path.join(process.cwd(),'public','valuation-resultfix.js'),'utf8')}catch(e){resultfix=''}
  try{prefill=fs.readFileSync(path.join(process.cwd(),'public','valuation-repeat-prefill.js'),'utf8')}catch(e){prefill=''}
  try{persistence=fs.readFileSync(path.join(process.cwd(),'public','valuation-form-persistence.js'),'utf8')}catch(e){persistence=''}
  try{repeatguard=fs.readFileSync(path.join(process.cwd(),'public','valuation-repeat-v14-guard.js'),'utf8')}catch(e){repeatguard=''}
  try{photoverify=fs.readFileSync(path.join(process.cwd(),'public','valuation-photo-verify.js'),'utf8')}catch(e){photoverify=''}
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
          if(resultfix)html=html.replace('</body>',`<script>${resultfix}<\/script>${i18nScript}</body>`);
          else html=html.replace('</body>',i18nScript+'</body>');
        }else{
          const scripts=(saver?`<script>${saver}<\/script>`:'')+(clickfix?`<script>${clickfix}<\/script>`:'')+(fallback?`<script>${fallback}<\/script>`:'')+(prefill?`<script>${prefill}<\/script>`:'')+(persistence?`<script>${persistence}<\/script>`:'')+(repeatguard?`<script>${repeatguard}<\/script>`:'')+(photoverify?`<script>${photoverify}<\/script>`:'')+i18nScript;
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
