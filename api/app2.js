const fs=require('fs');
const path=require('path');
const app=require('./app');

module.exports=async(req,res)=>{
  const pathname=(req.url||'').split('?')[0];

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