const fs=require('fs');
const path=require('path');
const app=require('./app');
module.exports=async(req,res)=>{
  const pathname=(req.url||'').split('?')[0];
  if(pathname==='/khashuri-inbox-reopen.js'){
    try{
      const file=path.join(process.cwd(),'public','khashuri-inbox-reopen.js');
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
      if(ct.includes('text/html')&&body){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const tag='<script src="/khashuri-inbox-reopen.js?v=1.2"></script>';
        if(!html.includes('/khashuri-inbox-reopen.js')){
          html=html.includes('</body>')?html.replace('</body>',tag+'</body>'):html+tag;
        }
        return originalEnd(html,...args);
      }
    }catch(e){}
    return originalEnd(body,...args);
  };
  return app(req,res);
};
