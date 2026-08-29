const fs=require('fs');
const path=require('path');
const app2=require('./app2');

module.exports=async(req,res)=>{
  const pathname=(req.url||'').split('?')[0];
  if(pathname==='/business-edit-v56.js'){
    try{
      const js=fs.readFileSync(path.join(process.cwd(),'public','business-edit-v56.js'),'utf8');
      res.statusCode=200;
      res.setHeader('content-type','application/javascript; charset=utf-8');
      res.setHeader('cache-control','no-store, max-age=0, must-revalidate');
      return res.end(js);
    }catch(e){res.statusCode=404;return res.end('not found')}
  }
  const originalEnd=res.end.bind(res);
  let ended=false;
  res.end=(body,...args)=>{
    if(ended)return;
    ended=true;
    try{
      const ct=String(res.getHeader('content-type')||'');
      if(ct.includes('text/html')&&typeof body==='string'&&!body.includes('/business-edit-v56.js')){
        const inject='<script src="/business-edit-v56.js?v=56.2"></script>';
        body=body.includes('</body>')?body.replace('</body>',inject+'</body>'):body+inject;
      }
    }catch(e){}
    return originalEnd(body,...args);
  };
  return app2(req,res);
};