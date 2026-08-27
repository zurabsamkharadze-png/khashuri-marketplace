const valuation=require('./valuation-loader');
const report=require('../lib/valuation-report');
function unpack(v){if(!v)return null;try{let s=String(v).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(Buffer.from(s,'base64').toString('utf8'))}catch(e){return null}}
function pack(x){return Buffer.from(JSON.stringify(x),'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
module.exports=(req,res)=>{
  const u=new URL(req.url||'','https://khashuri-marketplace.vercel.app');
  const route=u.searchParams.get('route')||'home',id=u.searchParams.get('id')||'';
  if(route==='report'){
    const x=unpack(u.searchParams.get('data'));
    if(x&&Number(x.calculation_details?.outbuilding_component||0)===0){
      x.outbuildings=[];
      x.input_data={...(x.input_data||{}),outbuildings:[]};
      u.searchParams.set('data',pack(x));
      req.url=u.pathname+'?'+u.searchParams.toString();
    }
    return report(req,res);
  }
  let target='/valuation';
  if(route==='new')target='/valuation/new?mode='+(u.searchParams.get('mode')==='precise'?'precise':'quick');
  else if(route==='history')target='/valuation/history';
  else if(route==='result')target='/valuation/result/'+String(id).replace(/[^0-9a-z-]/gi,'');
  req.url=target;
  return valuation(req,res);
};
