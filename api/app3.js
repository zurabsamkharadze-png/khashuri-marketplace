const fs=require('fs');
const path=require('path');
const app=require('./app2');

module.exports=async(req,res)=>{
  const pathname=(req.url||'').split('?')[0];

  if(pathname==='/khashuri-v64-cardfix.js'){
    try{
      const js=fs.readFileSync(path.join(process.cwd(),'public','khashuri-v64-cardfix.js'),'utf8');
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
      if(ct.includes('text/html')&&typeof body==='string'&&!body.includes('/khashuri-v64-cardfix.js')){
        const inject='<script src="/khashuri-v64-cardfix.js?v=64.0"></script>';
        body=body.includes('</body>')?body.replace('</body>',inject+'</body>'):body+inject;
      }
    }catch(e){}
    return originalEnd(body,...args);
  };

  return app(req,res);
};
