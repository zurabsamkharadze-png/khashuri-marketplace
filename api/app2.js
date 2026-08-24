const fs=require('fs');
const path=require('path');
const app=require('./app');

module.exports=async(req,res)=>{
  const pathname=(req.url||'').split('?')[0];

  // Kept only to neutralize stale cached references from older builds.
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

  // The active SPA bundle now owns the Inbox UI and navigation.
  return app(req,res);
};