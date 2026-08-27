const valuation=require('./valuation-loader');
const valuationResult=require('./valuation-result');
const report=require('../lib/valuation-report');
function unpack(v){if(!v)return null;try{let s=String(v).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(Buffer.from(s,'base64').toString('utf8'))}catch(e){return null}}
function pack(x){return Buffer.from(JSON.stringify(x),'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function estimatePage(lang){
  const ka=lang==='ka';
  const t=ka?{
    title:'უძრავი ქონების შეფასება',eyebrow:'Khashuri Marketplace · წინასწარი შეფასება',h1:'გაიგეთ თქვენი უძრავი ქონების სავარაუდო საბაზრო ღირებულება',p:'შეავსეთ მოკლე კითხვარი სახლის, მიწის ნაკვეთის, მდგომარეობის, კომუნიკაციებისა და ფოტოების შესახებ. სისტემა შეადარებს მონაცემებს საბაზრო ანალოგებს და მოგცემთ წინასწარ შეფასებას.',cta:'შეფასების დაწყება',time:'3–5 წუთი',a:'საბაზრო დიაპაზონი',b:'ფასის რეკომენდაცია',c:'ანალოგებთან შედარება',s1:'1. შეავსეთ ობიექტის მონაცემები',s2:'2. დაამატეთ მდგომარეობა და ფოტოები',s3:'3. მიიღეთ შეფასება და რეკომენდებული ფასი',note:'შეფასება ავტომატიზებულია და წინასწარია. ის არ წარმოადგენს სერტიფიცირებული შემფასებლის ოფიციალურ დასკვნას.',langLabel:'ენა'}:{
    title:'Оценка недвижимости',eyebrow:'Khashuri Marketplace · предварительная оценка',h1:'Узнайте ориентировочную рыночную стоимость своей недвижимости',p:'Заполните короткую анкету о доме, участке, состоянии, коммуникациях и фотографиях. Система сопоставит данные с рыночными аналогами и рассчитает предварительную стоимость.',cta:'Начать оценку',time:'3–5 минут',a:'Рыночный диапазон',b:'Рекомендация по цене',c:'Сравнение с аналогами',s1:'1. Заполните данные объекта',s2:'2. Добавьте состояние и фотографии',s3:'3. Получите оценку и рекомендуемую цену',note:'Оценка автоматизированная и предварительная. Она не является официальным заключением сертифицированного оценщика.',langLabel:'Язык'};
  const l=ka?'ka':'ru';
  return `<!doctype html><html lang="${ka?'ka':'ru'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${t.title} | Khashuri Marketplace</title><meta name="description" content="${t.h1}"><style>:root{--teal:#11877c;--teal2:#0b756c;--ink:#131c31;--muted:#6f7888;--line:#e2e6eb;--bg:#f4f6f9}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}.top{max-width:980px;margin:auto;padding:18px 18px 8px;display:flex;justify-content:space-between;align-items:center;gap:12px}.brand{font-weight:950;font-size:18px}.lang{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:12px}.lang a{border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none;padding:7px 10px;border-radius:999px;font-weight:850}.lang a.on{background:var(--teal);border-color:var(--teal);color:#fff}.wrap{max-width:980px;margin:auto;padding:10px 18px 70px}.hero{background:linear-gradient(135deg,#10233c,#0b7d73);color:#fff;border-radius:30px;padding:34px;box-shadow:0 18px 45px rgba(15,53,70,.12)}.eyebrow{display:inline-block;padding:6px 10px;border-radius:999px;background:#ffffff18;font-size:12px;font-weight:800}.hero h1{font-size:42px;line-height:1.03;letter-spacing:-1px;margin:18px 0 12px;max-width:760px}.hero p{font-size:17px;line-height:1.55;opacity:.9;max-width:760px}.ctaRow{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:24px}.cta{display:inline-block;background:#fff;color:#0d6962;text-decoration:none;border-radius:16px;padding:15px 22px;font-size:17px;font-weight:950}.time{opacity:.86;font-weight:750}.benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}.benefit{background:#ffffff12;border:1px solid #ffffff1d;border-radius:16px;padding:13px;font-weight:800}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}.step{background:#fff;border:1px solid var(--line);border-radius:20px;padding:19px;font-weight:850;line-height:1.35}.note{margin-top:14px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px;color:var(--muted);line-height:1.45;font-size:13px}@media(max-width:680px){.top{padding-top:12px}.brand{font-size:16px}.hero{padding:25px 21px;border-radius:25px}.hero h1{font-size:32px}.hero p{font-size:15px}.benefits,.steps{grid-template-columns:1fr}.cta{width:100%;text-align:center}.lang span{display:none}}</style></head><body><header class="top"><div class="brand">🏠 Khashuri Marketplace</div><nav class="lang"><span>${t.langLabel}</span><a class="${!ka?'on':''}" href="/estimate?lang=ru">RU</a><a class="${ka?'on':''}" href="/estimate?lang=ka">ქართული</a></nav></header><main class="wrap"><section class="hero"><span class="eyebrow">${t.eyebrow}</span><h1>${t.h1}</h1><p>${t.p}</p><div class="ctaRow"><a class="cta" href="/valuation/new?mode=precise&public=1&lang=${l}">${t.cta}</a><span class="time">⏱ ${t.time}</span></div><div class="benefits"><div class="benefit">✓ ${t.a}</div><div class="benefit">✓ ${t.b}</div><div class="benefit">✓ ${t.c}</div></div></section><section class="steps"><div class="step">${t.s1}</div><div class="step">${t.s2}</div><div class="step">${t.s3}</div></section><div class="note">${t.note}</div></main></body></html>`;
}
const compactPrint=`<style>@media print{
@page{size:A4 portrait;margin:3mm!important}
html,body{width:100%!important;margin:0!important;padding:0!important}
.page{font-size:8px!important;zoom:.84!important;width:119.05%!important;max-width:none!important}
.brand{padding-bottom:5px!important}.brand h1{font-size:15px!important}.brand small{font-size:7px!important}
.hero{margin:5px 0!important;padding:7px 9px!important;border-radius:8px!important}.hero .price{font-size:27px!important}.hero p{margin:1px 0!important;font-size:8px!important;line-height:1.15!important}
.section{margin-top:5px!important}.section h2{font-size:12px!important;margin:0 0 3px!important;line-height:1.1!important}.section h2 span{font-size:7px!important;padding:2px 4px!important}
.grid,.details,.two,.utilities,.floorGrid,.photos{gap:3px!important}
.details{grid-template-columns:repeat(4,1fr)!important}
.metric,.detail,.box,.utility,.floor{padding:4px 5px!important;border-radius:5px!important}
.metric small,.detail small,.floor small,.utility small{font-size:6px!important;line-height:1.1!important}.metric b,.detail b{font-size:9px!important;margin-top:1px!important;line-height:1.1!important}
.box{font-size:7px!important;line-height:1.15!important}.box ul{margin:2px 0 0!important;padding-left:11px!important}
.photos img{height:66px!important}.photos figcaption{display:none!important}
.utility{padding:3px!important}.utility span{font-size:10px!important;line-height:1!important}.utility b{font-size:7px!important;line-height:1!important}
.floor span{font-size:10px!important;margin:1px 0!important}.floor b{font-size:8px!important}
table{font-size:6px!important;line-height:1.05!important}th,td{padding:2px 2px!important}
.method{padding:4px!important;font-size:7px!important;line-height:1.15!important}.notice{font-size:6px!important;margin-top:4px!important;padding-top:3px!important;line-height:1.15!important}
.actions{display:none!important}
.brand,.hero,.metric,.detail,.box,.utility,.floor,figure{break-inside:avoid!important}
.photoSection{break-before:auto!important}a{color:inherit!important;text-decoration:none!important}
}</style>`;
module.exports=(req,res)=>{
  const u=new URL(req.url||'','https://khashuri-marketplace.vercel.app');
  const route=u.searchParams.get('route')||'home',id=u.searchParams.get('id')||'';
  const lang=u.searchParams.get('lang')==='ka'?'ka':'ru';
  if(route==='estimate'){
    res.statusCode=200;res.setHeader('content-type','text/html; charset=utf-8');res.setHeader('cache-control','no-store, max-age=0, must-revalidate');return res.end(estimatePage(lang));
  }
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
  if(route==='result'){
    const safeId=String(id).replace(/[^0-9a-z-]/gi,'');
    const params=new URLSearchParams(u.searchParams);params.delete('route');
    req.url='/valuation/result/'+safeId+'?'+params.toString();
    const originalEnd=res.end.bind(res);
    res.end=(body,...args)=>{const wasBuffer=Buffer.isBuffer(body);let html=wasBuffer?body.toString('utf8'):body;if(typeof html==='string'&&html.includes('</body>'))html=html.replace('</body>','<script src="/valuation-i18n.js?v=23"><\/script></body>');return originalEnd(wasBuffer&&typeof html==='string'?Buffer.from(html,'utf8'):html,...args)};
    return valuationResult(req,res);
  }
  let target='/valuation';
  if(route==='new')target='/valuation/new?mode='+(u.searchParams.get('mode')==='precise'?'precise':'quick')+'&lang='+lang+(u.searchParams.get('public')==='1'?'&public=1':'');
  else if(route==='history')target='/valuation/history';
  else if(route==='home'&&lang==='ka')target='/valuation?lang=ka';
  req.url=target;
  return valuation(req,res);
};