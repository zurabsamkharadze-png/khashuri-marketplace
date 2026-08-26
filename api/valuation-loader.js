const fs=require('fs');
const path=require('path');
const Module=require('module');
let handler=null;
let fallback='';
let saver='';
let clickfix='';
let resultfix='';
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
  try{clickfix=fs.readFileSync(path.join(process.cwd(),'public','valuation-clickfix.js'),'utf8')}catch(e){clickfix=''}
  try{resultfix=fs.readFileSync(path.join(process.cwd(),'public','valuation-resultfix.js'),'utf8')}catch(e){resultfix=''}
  return handler;
}
module.exports=(req,res)=>{
  try{
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
          if(resultfix)html=html.replace('</body>',`<script>${resultfix}<\/script></body>`);
        }else{
          const scripts=(saver?`<script>${saver}<\/script>`:'')+(clickfix?`<script>${clickfix}<\/script>`:'')+(fallback?`<script>${fallback}<\/script>`:'');
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
