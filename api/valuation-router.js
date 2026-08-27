const valuation=require('./valuation-loader');
const valuationResult=require('./valuation-result');
const report=require('../lib/valuation-report');
function unpack(v){if(!v)return null;try{let s=String(v).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(Buffer.from(s,'base64').toString('utf8'))}catch(e){return null}}
function pack(x){return Buffer.from(JSON.stringify(x),'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
const compactPrint=`<style>@media print{
@page{size:A4 portrait;margin:3mm!important}
html,body{width:100%!important;margin:0!important;padding:0!important}
.page{font-size:8px!important;zoom:.84!important;width:119.05%!important;max-width:none!important}
.brand{padding-bottom:5px!important}.brand h1{font-size:15px!important}.brand small{font-size:7px!important}
.hero{margin:5px 0!important;padding:7px 9px!important;border-radius:8px!important}.hero .price{font-size:27px!important}.hero p{margin:1px 0!important;font-size:8px!important;line-height:1.15!important}
.section{margin-top:5px!important}.section h2{font-size:12px!important;margin:0 0 3px!important;line-height:1.1!important}.section h2 span{font-size:7px!important;padding:2px 4px!important}
.grid,.details,.two,.utilities,.floorGrid,.photos{gap:3px!important}.details{grid-template-columns:repeat(4,1fr)!important}
.metric,.detail,.box,.utility,.floor{padding:4px 5px!important;border-radius:5px!important}
.metric small,.detail small,.floor small,.utility small{font-size:6px!important;line-height:1.1!important}.metric b,.detail b{font-size:9px!important;margin-top:1px!important;line-height:1.1!important}
.box{font-size:7px!important;line-height:1.15!important}.box ul{margin:2px 0 0!important;padding-left:11px!important}
.photos img{height:66px!important}.photos figcaption{display:none!important}.utility{padding:3px!important}.utility span{font-size:10px!important;line-height:1!important}.utility b{font-size:7px!important;line-height:1!important}
.floor span{font-size:10px!important;margin:1px 0!important}.floor b{font-size:8px!important}table{font-size:6px!important;line-height:1.05!important}th,td{padding:2px 2px!important}
.method{padding:4px!important;font-size:7px!important;line-height:1.15!important}.notice{font-size:6px!important;margin-top:4px!important;padding-top:3px!important;line-height:1.15!important}.actions{display:none!important}
.brand,.hero,.metric,.detail,.box,.utility,.floor,figure{break-inside:avoid!important}.photoSection{break-before:auto!important}a{color:inherit!important;text-decoration:none!important}
}</style>`;
module.exports=(req,res)=>{
  const u=new URL(req.url||'','https://khashuri-marketplace.vercel.app');
  const route=u.searchParams.get('route')||'home',id=u.searchParams.get('id')||'';
  const lang=u.searchParams.get('lang')==='ka'?'ka':'ru';
  if(route==='estimate'){
    res.statusCode=302;res.setHeader('location','/estimate?lang='+lang);return res.end();
  }
  if(route==='report'){
    const x=unpack(u.searchParams.get('data'));
    if(x&&Number(x.calculation_details?.outbuilding_component||0)===0){x.outbuildings=[];x.input_data={...(x.input_data||{}),outbuildings:[]};u.searchParams.set('data',pack(x));req.url=u.pathname+'?'+u.searchParams.toString()}
    const originalEnd=res.end.bind(res);
    res.end=(body,...args)=>{const wasBuffer=Buffer.isBuffer(body);let html=wasBuffer?body.toString('utf8'):body;if(typeof html==='string'&&html.includes('</head>'))html=html.replace('</head>',compactPrint+'</head>');return originalEnd(wasBuffer&&typeof html==='string'?Buffer.from(html,'utf8'):html,...args)};
    return report(req,res);
  }
  if(route==='result'){
    const safeId=String(id).replace(/[^0-9a-z-]/gi,'');
    const params=new URLSearchParams(u.searchParams);params.delete('route');
    req.url='/valuation/result/'+safeId+'?'+params.toString();
    const originalEnd=res.end.bind(res);
    res.end=(body,...args)=>{const wasBuffer=Buffer.isBuffer(body);let html=wasBuffer?body.toString('utf8'):body;if(typeof html==='string'&&html.includes('</body>'))html=html.replace('</body>','<script src="/valuation-i18n.js?v=26"><\/script></body>');return originalEnd(wasBuffer&&typeof html==='string'?Buffer.from(html,'utf8'):html,...args)};
    return valuationResult(req,res);
  }
  let target='/valuation';
  if(route==='new')target='/valuation/new?mode='+(u.searchParams.get('mode')==='precise'?'precise':'quick')+'&lang='+lang+(u.searchParams.get('public')==='1'?'&public=1':'');
  else if(route==='history')target='/valuation/history';
  else if(route==='home'&&lang==='ka')target='/valuation?lang=ka';
  req.url=target;
  return valuation(req,res);
};