const fs=require('fs');
const path=require('path');
const router=require('./valuation-router');

function readPublic(name){try{return fs.readFileSync(path.join(process.cwd(),'public',name),'utf8')}catch(e){return''}}
const v34=readPublic('valuation-v34-floor-severe-states.js');
const v35=readPublic('valuation-v35-result-display-fix.js');

function unpack(v){
  if(!v)return null;
  try{
    let s=String(v).replace(/-/g,'+').replace(/_/g,'/');
    while(s.length%4)s+='=';
    return JSON.parse(Buffer.from(s,'base64').toString('utf8'));
  }catch(e){return null}
}
function money(n){return '$'+Math.round(Number(n||0)).toLocaleString('en-US')}
function escRe(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function labels(lang){
  return lang==='ka'
    ? {reconstruction:'რეკონსტრუქციას საჭიროებს',demolition:'დასანგრევია'}
    : {reconstruction:'Реконструкция',demolition:'Под снос'};
}
function cleanTechnical(html,lang){
  const l=labels(lang);
  return String(html||'')
    .replace(/\breconstruction\b/gi,l.reconstruction)
    .replace(/\bdemolition\b/gi,l.demolition);
}
function patchFloorRows(html,x,lang){
  if(!x||typeof html!=='string')return html;
  const comps=Array.isArray(x.calculation_details?.floor_components)?x.calculation_details.floor_components:[];
  const floors=Array.isArray(x.input_data?.floors)?x.input_data.floors:(Array.isArray(x.floors)?x.floors:[]);
  const l=labels(lang);
  const names={new_repair:lang==='ka'?'ახალი რემონტი':'Новый ремонт',good:lang==='ka'?'კარგი რემონტი':'Хороший ремонт',average:lang==='ka'?'საშუალო მდგომარეობა':'Среднее состояние',old:lang==='ka'?'ძველი რემონტი':'Старый ремонт',repair:lang==='ka'?'საჭიროებს რემონტს':'Требует ремонта',none:lang==='ka'?'რემონტის გარეშე':'Без ремонта',shell:lang==='ka'?'შავი კარკასი':'Черный каркас',reconstruction:l.reconstruction,demolition:l.demolition};
  comps.forEach((c,i)=>{
    const f=floors[i]||c||{};
    const floorNo=Number(c.floor||f.floor||i+1);
    const condition=c.condition||f.condition||'average';
    const label=names[condition]||c.label||condition;
    const area=Number(c.area||f.area||0);
    const rate=Number(c.rate||x.calculation_details?.building_replacement_benchmark||302);
    const value=Number(c.value||0);
    const eff=area>0&&rate>0?value/(area*rate):Number(c.coefficient||0)*Number(c.structural_coefficient??1);

    const stateRe=new RegExp('(<small>'+escRe(floorNo)+' этаж<\\/small><b>)[^<]*(<\\/b>)');
    html=html.replace(stateRe,'$1'+label+'$2');

    const rowRe=new RegExp('<div class="breakrow"><span><b>'+escRe(floorNo)+' этаж<\\/b><small>[\\s\\S]*?<\\/small><\\/span><b>[^<]*<\\/b><\\/div>');
    const coefWord=lang==='ka'?'კოეფიციენტი':'коэффициент';
    const row='<div class="breakrow"><span><b>'+floorNo+' этаж</b><small>'+area.toFixed(1)+' м² × $'+rate+'/м² × '+coefWord+' '+eff.toFixed(2)+' · '+label+'</small></span><b>'+money(value)+'</b></div>';
    html=html.replace(rowRe,row);
  });
  return html;
}
function compactComparableSummary(x){
  const comps=(Array.isArray(x?.comparables)?x.comparables:[]).filter(c=>!c.is_outlier).slice(0,3);
  if(!comps.length)return'';
  return '<section class="section kh-print-only"><h3>Рыночные аналоги</h3><div class="kh-print-comp-list">'+comps.map(c=>'<div><b>'+String(c.source_name||'Источник')+' · '+String(c.city||'')+'</b><span>'+money(c.asking_price||c.asking_price_usd)+' · сходство '+Number(c.similarity_score||0)+'%</span></div>').join('')+'</div></section>';
}
const printCss=`<style id="khV36ServerPrint">
.kh-print-only{display:none}
@media print{
@page{size:A4 portrait;margin:2.5mm!important}
html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.top,.stickyActions,.kh-screen-comps,.sourceLink,#khLangSwitch,.kh-lang-switch,.language-switch,.lang-switch,[data-lang-switch]{display:none!important}
.wrap{max-width:none!important;padding:0!important;margin:0!important;zoom:.60!important;width:166.67%!important}
.resultHero{padding:8px 12px!important;border-radius:9px!important}.price{font-size:30px!important;line-height:1!important}
.metrics{grid-template-columns:repeat(4,1fr)!important;gap:4px!important;margin-top:4px!important}.metric{padding:5px!important;border-radius:7px!important}.metric small{font-size:8px!important;line-height:1.05!important}.metric b{font-size:12px!important;margin-top:1px!important;line-height:1.05!important}
.section{padding:6px 8px!important;margin-top:4px!important;border-radius:8px!important}.section h3{font-size:14px!important;margin:0 0 4px!important;line-height:1.05!important}
.breakrow{padding:4px 0!important;gap:6px!important;font-size:10px!important}.breakrow small{font-size:8px!important;line-height:1.1!important;margin-top:1px!important}.breaktotal{padding:5px!important;margin-top:4px!important;font-size:11px!important}
.note{padding:5px!important;margin-top:4px!important;font-size:8px!important;line-height:1.15!important}.factors{grid-template-columns:1fr 1fr!important;gap:5px!important}.factor{padding:5px!important;font-size:8px!important}.factor ul{margin:2px 0 0!important;padding-left:13px!important}
.disclaimer{font-size:7px!important;padding-top:4px!important;margin-top:4px!important}.kh-print-only{display:block!important}.kh-print-comp-list{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.kh-print-comp-list>div{border:1px solid #e3e6eb;border-radius:6px;padding:4px;font-size:8px}.kh-print-comp-list b,.kh-print-comp-list span{display:block}.kh-print-comp-list span{margin-top:2px;color:#687283}
.compGrid{grid-template-columns:repeat(3,1fr)!important}.section,.metric,.breakrow,.breaktotal,.factor{break-inside:avoid!important}
}
</style>`;
function inlineScript(src){return src?'<script>'+String(src).replace(/<\/script/gi,'<\\/script')+'<\/script>':''}

module.exports=(req,res)=>{
  const u=new URL(req.url||'','https://khashuri-marketplace.vercel.app');
  const lang=u.searchParams.get('lang')==='ka'?'ka':'ru';
  const x=unpack(u.searchParams.get('data'));
  const originalEnd=res.end.bind(res);
  res.end=(body,...args)=>{
    const wasBuffer=Buffer.isBuffer(body);
    let html=wasBuffer?body.toString('utf8'):body;
    if(typeof html==='string'){
      html=patchFloorRows(html,x,lang);
      html=cleanTechnical(html,lang);
      html=html.replace('<section class="section"><h3>Рыночные аналоги</h3>','<section class="section kh-screen-comps"><h3>Рыночные аналоги</h3>');
      const summary=compactComparableSummary(x);
      if(summary&&html.includes('<section class="section kh-screen-comps">'))html=html.replace('<section class="section kh-screen-comps">',summary+'<section class="section kh-screen-comps">');
      if(html.includes('</head>'))html=html.replace('</head>',printCss+'</head>');
      if(html.includes('</body>'))html=html.replace('</body>',inlineScript(v34)+inlineScript(v35)+'</body>');
    }
    return originalEnd(wasBuffer&&typeof html==='string'?Buffer.from(html,'utf8'):html,...args);
  };
  return router(req,res);
};
