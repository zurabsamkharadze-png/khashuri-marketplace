const valuation=require('./valuation-loader');
const report=require('../lib/valuation-report');
function unpack(v){if(!v)return null;try{let s=String(v).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(Buffer.from(s,'base64').toString('utf8'))}catch(e){return null}}
function pack(x){return Buffer.from(JSON.stringify(x),'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
const compactPrint=`<style>@media print{
@page{margin:6mm!important}
.page{font-size:9px!important}
.brand{padding-bottom:7px!important}.brand h1{font-size:17px!important}.brand small{font-size:8px!important}
.hero{margin:8px 0!important;padding:10px!important;border-radius:10px!important}.hero .price{font-size:31px!important}.hero p{margin:2px 0!important;font-size:9px!important}
.section{margin-top:8px!important}.section h2{font-size:14px!important;margin:0 0 5px!important}
.grid,.details,.two,.utilities,.floorGrid,.photos{gap:4px!important}
.metric,.detail,.box,.utility,.floor{padding:6px!important;border-radius:7px!important}
.metric small,.detail small,.floor small,.utility small{font-size:7px!important}.metric b,.detail b{font-size:11px!important;margin-top:2px!important}
.box{font-size:8px!important}.box ul{margin:3px 0 0!important;padding-left:13px!important}
.photos img{height:90px!important}.photos figcaption{display:none!important}
.utility{padding:4px!important}.utility span{font-size:12px!important}.utility b{font-size:8px!important}
.floor span{font-size:12px!important;margin:2px 0!important}
table{font-size:7px!important}th,td{padding:3px 2px!important}
.method{padding:6px!important;font-size:8px!important}.notice{font-size:7px!important;margin-top:7px!important;padding-top:5px!important;line-height:1.3!important}
}</style>`;
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
    const originalEnd=res.end.bind(res);
    res.end=(body,...args)=>{
      const wasBuffer=Buffer.isBuffer(body);let html=wasBuffer?body.toString('utf8'):body;
      if(typeof html==='string'&&html.includes('</head>'))html=html.replace('</head>',compactPrint+'</head>');
      return originalEnd(wasBuffer&&typeof html==='string'?Buffer.from(html,'utf8'):html,...args);
    };
    return report(req,res);
  }
  let target='/valuation';
  if(route==='new')target='/valuation/new?mode='+(u.searchParams.get('mode')==='precise'?'precise':'quick');
  else if(route==='history')target='/valuation/history';
  else if(route==='result')target='/valuation/result/'+String(id).replace(/[^0-9a-z-]/gi,'');
  req.url=target;
  return valuation(req,res);
};