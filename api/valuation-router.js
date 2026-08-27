const valuation=require('./valuation-loader');
const valuationResult=require('./valuation-result');
const report=require('../lib/valuation-report');
function unpack(v){if(!v)return null;try{let s=String(v).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(Buffer.from(s,'base64').toString('utf8'))}catch(e){return null}}
function pack(x){return Buffer.from(JSON.stringify(x),'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function money(x){return '$'+Math.round(Number(x||0)).toLocaleString('en-US')}
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
.kh-v30-grid{gap:3px!important}.kh-v30-card{padding:4px 5px!important;border-radius:5px!important;font-size:7px!important}.kh-v30-card b{font-size:8px!important}.kh-v30-ai{padding:4px!important;font-size:7px!important;line-height:1.15!important;margin-top:3px!important}.kh-v30-ai ul{margin:2px 0 0!important;padding-left:12px!important}
.brand,.hero,.metric,.detail,.box,.utility,.floor,figure,.kh-v30-card{break-inside:avoid!important}.photoSection{break-before:auto!important}a{color:inherit!important;text-decoration:none!important}
}</style>`;
function reportEnhancement(x){
  if(!x)return'';
  const i=x.input_data&&typeof x.input_data==='object'?x.input_data:{};
  const struct=i.structural_condition||x.structural_condition||x.calculation_details?.structural_condition;
  const structs={usable:'Пригоден для использования',capital_repair:'Требуется капитальный ремонт',reconstruction:'Требуется реконструкция',demolition:'Под снос'};
  const types={commercial:'Коммерческий объект',garage:'Гараж',guest_house:'Гостевой/жилой домик',storage:'Склад',utility:'Хоз. постройка',other:'Другое',unspecified:'Дополнительная постройка'};
  const conds={good:'Хорошее',average:'Среднее',repair:'Требует ремонта',demolition:'Под снос'};
  const extras=Array.isArray(i.outbuildings)?i.outbuildings:(Array.isArray(x.outbuildings)?x.outbuildings:[]);
  const calc=x.calculation_details||{};
  const details=Array.isArray(calc.outbuilding_details)?calc.outbuilding_details:[];
  const ai=i.photo_ai_analysis||x.photo_ai_analysis||null;
  if(!struct&&!extras.length&&!ai)return'';
  const cards=[];
  if(struct)cards.push(`<div class="kh-v30-card"><small>Общее техническое состояние</small><b>${esc(structs[struct]||struct)}</b>${calc.structural_factor!=null?`<span>Коэффициент строения: ${Math.round(Number(calc.structural_factor)*100)}%</span>`:''}</div>`);
  extras.forEach((e,n)=>{
    if(!e||(!Number(e.area||0)&&e.legacy))return;
    const d=details[n]||{};
    cards.push(`<div class="kh-v30-card"><small>${esc(types[e.type]||types.other)}</small><b>${Number(e.area||0)} м² · ${esc(conds[e.condition]||e.condition||'Не указано')}</b><span>${e.road_front?'Фасад / прямой выход на трассу · ':''}Расчётный вклад: ${money(d.value||0)}</span></div>`);
  });
  const obs=Array.isArray(ai?.observations_ru)?ai.observations_ru.slice(0,4):[];
  const warns=Array.isArray(ai?.warnings_ru)?ai.warnings_ru.slice(0,2):[];
  const aiHtml=ai?`<div class="kh-v30-ai"><b>✨ AI-анализ фотографий · ${Number(ai.confidence||0)}%</b>${obs.length?`<ul>${obs.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:''}${warns.length?`<div style="margin-top:3px;color:#8a5b00">${warns.map(v=>'⚠ '+esc(v)).join('<br>')}</div>`:''}<div style="margin-top:3px;color:#687283">AI оценивает только видимые признаки на фотографиях и не заменяет техническое обследование объекта.</div></div>`:'';
  return `<section class="section kh-v30"><h2>Техническое состояние и дополнительные постройки</h2><div class="kh-v30-grid">${cards.join('')}</div>${aiHtml}</section>`;
}
const reportCss=`<style>.kh-v30-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.kh-v30-card{border:1px solid #e2e6eb;border-radius:14px;padding:11px;background:#fff}.kh-v30-card small,.kh-v30-card b,.kh-v30-card span{display:block}.kh-v30-card small{color:#727c8c}.kh-v30-card b{font-size:14px;margin-top:3px}.kh-v30-card span{color:#687283;font-size:11px;margin-top:3px}.kh-v30-ai{margin-top:8px;padding:10px;border-radius:12px;background:#f6f8fa;color:#4f5969;line-height:1.4;font-size:11px}.kh-v30-ai ul{margin:6px 0 0;padding-left:18px}@media(max-width:650px){.kh-v30-grid{grid-template-columns:1fr 1fr}}</style>`;
function humanizeSevereStates(html){if(typeof html!=='string')return html;return html.replace(/\breconstruction\b/g,'Реконструкция').replace(/\bdemolition\b/g,'Под снос')}
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
    const enhancement=reportEnhancement(x);
    const originalEnd=res.end.bind(res);
    res.end=(body,...args)=>{
      const wasBuffer=Buffer.isBuffer(body);let html=wasBuffer?body.toString('utf8'):body;
      if(typeof html==='string'&&html.includes('</head>'))html=html.replace('</head>',reportCss+compactPrint+'</head>');
      if(typeof html==='string'&&enhancement){
        const marker='<section class="section"><h2>Факторы оценки</h2>';
        html=html.includes(marker)?html.replace(marker,enhancement+marker):html.replace('</main>',enhancement+'</main>');
      }
      html=humanizeSevereStates(html);
      return originalEnd(wasBuffer&&typeof html==='string'?Buffer.from(html,'utf8'):html,...args)
    };
    return report(req,res);
  }
  if(route==='result'){
    const safeId=String(id).replace(/[^0-9a-z-]/gi,'');
    const params=new URLSearchParams(u.searchParams);params.delete('route');
    req.url='/valuation/result/'+safeId+'?'+params.toString();
    const originalEnd=res.end.bind(res);
    res.end=(body,...args)=>{const wasBuffer=Buffer.isBuffer(body);let html=wasBuffer?body.toString('utf8'):body;if(typeof html==='string'&&html.includes('</body>'))html=html.replace('</body>','<script src="/valuation-i18n.js?v=34"><\/script></body>');return originalEnd(wasBuffer&&typeof html==='string'?Buffer.from(html,'utf8'):html,...args)};
    return valuationResult(req,res);
  }
  let target='/valuation';
  if(route==='new')target='/valuation/new?mode='+(u.searchParams.get('mode')==='precise'?'precise':'quick')+'&lang='+lang+(u.searchParams.get('public')==='1'?'&public=1':'');
  else if(route==='history')target='/valuation/history';
  else if(route==='home'&&lang==='ka')target='/valuation?lang=ka';
  req.url=target;
  return valuation(req,res);
};