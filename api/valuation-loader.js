const fs=require('fs');
const path=require('path');
const Module=require('module');
let handler=null;
let fallback='';
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
  return handler;
}
module.exports=(req,res)=>{
  try{
    const h=load();
    const originalEnd=res.end.bind(res);
    res.end=(body,...args)=>{
      if(typeof body==='string'&&body.includes('</body>')&&fallback){
        body=body.replace('</body>',`<script>${fallback}<\/script></body>`);
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
