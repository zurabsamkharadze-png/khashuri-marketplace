const fs=require('fs');
const path=require('path');
const Module=require('module');
let handler=null;
let fallback='';
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
  try{clickfix=fs.readFileSync(path.join(process.cwd(),'public','valuation-clickfix.js'),'utf8')}catch(e){clickfix=''}
  try{resultfix=fs.readFileSync(path.join(process.cwd(),'public','valuation-resultfix.js'),'utf8')}catch(e){resultfix=''}
  return handler;
}
module.exports=(req,res)=>{
  try{
    const h=load();
    const originalEnd=res.end.bind(res);
    res.end=(body,...args)=>{
      if(typeof body==='string'&&body.includes('</body>')){
        const pathname=(req.url||'').split('?')[0];
        const isResult=/^\/valuation\/result\//.test(pathname);
        if(isResult){
          body=body.replace(/<script\s+src=["']\/valuation-client\.js[^"']*["']><\/script>/gi,'');
          if(resultfix)body=body.replace('</body>',`<script>${resultfix}<\/script></body>`);
        }else{
          const scripts=(clickfix?`<script>${clickfix}<\/script>`:'')+(fallback?`<script>${fallback}<\/script>`:'');
          if(scripts)body=body.replace('</body>',scripts+'</body>');
        }
      }
      return originalEnd(body,...args);
    };
    return h(req,res);
  }catch(err){
    console.error('valuation-loader',err&&err.stack||err);
    res.statusCode=500;
    res.setHeader('content-type','text/plain; charset=utf-8');
    return res.end('Valuation module error');
  }
};
