const fs=require('fs');
const path=require('path');
module.exports=(req,res)=>{
  try{
    const u=new URL(req.url||'','https://khashuri-marketplace.vercel.app');
    const name=u.searchParams.get('asset')==='actions'?'valuation-history-actions.js':'valuation-history-client.js';
    const file=path.join(process.cwd(),'public',name);
    const js=fs.readFileSync(file,'utf8');
    res.statusCode=200;
    res.setHeader('content-type','application/javascript; charset=utf-8');
    res.setHeader('cache-control','no-store, max-age=0, must-revalidate');
    res.end(js);
  }catch(e){
    res.statusCode=500;
    res.setHeader('content-type','application/javascript; charset=utf-8');
    res.end("console.error('valuation history client unavailable')");
  }
};