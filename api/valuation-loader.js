const fs=require('fs');
const path=require('path');
const Module=require('module');
let handler=null;
let fallback='',saver='',modelv4='',resultfix='',resultv28='',v28prefill='',prefill='',persistence='',repeatguard='',photoverify='',optionguard='';
const i18nScript='<script src="/valuation-i18n.js?v=28"><\/script>';
function readPublic(name){try{return fs.readFileSync(path.join(process.cwd(),'public',name),'utf8')}catch(e){return''}}
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
  modelv4=readPublic('valuation-model-v4.js');
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
          const scripts=(resultfix?`<script>${resultfix}<\/script>`:'')+i18nScript+(resultv28?`<script>${resultv28}<\/script>`:'');
          html=html.replace('</body>',scripts+'</body>');
        }else{
          const scripts=
            (optionguard?`<script>${optionguard}<\/script>`:'')+
            (saver?`<script>${saver}<\/script>`:'')+
            (modelv4?`<script>${modelv4}<\/script>`:'')+
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