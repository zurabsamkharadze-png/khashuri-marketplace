const fs=require('fs');
const path=require('path');
const Module=require('module');
let handler=null;
let fallback='';
const clickPatch=`(()=>{function prep(){const f=document.getElementById('vf');if(!f)return;f.noValidate=true;f.querySelectorAll('[required]').forEach(x=>x.removeAttribute('required'))}document.addEventListener('DOMContentLoaded',prep);setTimeout(prep,0);document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('button');if(!b)return;const txt=(b.textContent||'').trim();if(!/Рассчитать стоимость/i.test(txt))return;const f=document.getElementById('vf');if(!f)return;e.preventDefault();e.stopImmediatePropagation();prep();f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))},true)})();`;
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
        body=body.replace('</body>',`<script>${fallback}<\/script><script>${clickPatch}<\/script></body>`);
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
