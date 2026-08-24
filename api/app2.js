const fs=require('fs');
const path=require('path');
const app=require('./app');
const SB='https://eppyjmtowtkxcwwhvwzp.supabase.co';
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcHlqbXRvd3RreGN3d2h2d3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNDM0NzEsImV4cCI6MjEwMjgxOTQ3MX0.FBxRhLMZgObwy5cofdKs4k0nsDxr-LhUqu3R30uwIfk';
function inboxHtml(){return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Центр входящих | Хашури</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#182132;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:720px;margin:0 auto;padding:18px 16px 40px}.top{position:sticky;top:0;z-index:5;background:rgba(244,246,248,.96);backdrop-filter:blur(8px);padding:8px 0 14px}.back{border:0;background:#fff;border-radius:14px;padding:11px 14px;font-weight:800;color:#263247;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{font-size:28px;margin:18px 0 6px}.sub{color:#70798a;margin-bottom:16px}.counts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}.counts div{background:#fff;border:1px solid #e1e5ea;border-radius:15px;padding:11px 5px;text-align:center}.counts b{display:block;font-size:20px}.counts span{font-size:10px;color:#778091}.list{display:grid;gap:10px}.row{background:#fff;border:1px solid #e1e5ea;border-radius:16px;padding:13px}.row.unread{background:#effaf8;border-color:#9bd8d1}.rtop{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px}.rtop strong{font-size:12px;color:#0f766e}.rtop small,.row>small{font-size:10px;color:#7a8494}.biz{font-weight:800}.title{font-weight:800;font-size:14px;margin-top:4px}.text{font-size:13px;color:#5f6878;margin:4px 0 6px}.state{text-align:center;background:#fff;border:1px solid #e1e5ea;border-radius:16px;padding:44px 14px;color:#727b89}.retry{margin-top:12px;border:0;border-radius:12px;background:#0f766e;color:#fff;padding:11px 16px;font-weight:800}@media(max-width:390px){.counts{grid-template-columns:repeat(2,1fr)}}</style></head><body><main class="wrap"><div class="top"><button class="back" onclick="backToCabinet()">← Назад в кабинет</button><h1>Центр входящих</h1><div class="sub">Заказы, записи и сообщения клиентов</div></div><div id="content"><div class="state">Загрузка…</div></div></main><script>const SB=${JSON.stringify(SB)},ANON=${JSON.stringify(ANON)};function backToCabinet(){try{sessionStorage.setItem('kh_return_cabinet','1')}catch{}location.href='/?open=cabinet&v=10'}const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));function find(v,seen=new Set()){if(!v||seen.has(v))return'';if(typeof v==='string'){if(/^eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/.test(v))return v;try{return find(JSON.parse(v),seen)}catch{return''}}if(typeof v!=='object')return'';seen.add(v);if(typeof v.access_token==='string')return v.access_token;for(const k of Object.keys(v)){const t=find(v[k],seen);if(t)return t}return''}function token(){for(const store of [localStorage,sessionStorage])for(let i=0;i<store.length;i++){try{const t=find(store.getItem(store.key(i)));if(t)return t}catch{}}return''}function tm(v){try{return new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch{return''}}function kind(k){return k==='order'?'🛒 Заказ':k==='booking'?'📅 Запись':'💬 Сообщение'}async function load(){const box=document.getElementById('content');box.innerHTML='<div class="state">Загрузка…</div>';try{const t=token();if(!t)throw Error('auth');const r=await fetch(SB+'/rest/v1/rpc/owner_inbox_v125',{method:'POST',headers:{apikey:ANON,Authorization:'Bearer '+t,'content-type':'application/json',Accept:'application/json'},body:JSON.stringify({p_limit:60})});if(!r.ok)throw Error('rpc '+r.status);let d=await r.json();if(Array.isArray(d))d=d[0]||{};const c=d?.counts||{},items=Array.isArray(d?.items)?d.items:[];box.innerHTML='<div class="counts"><div><b>'+Number(c.total||0)+'</b><span>Новых</span></div><div><b>'+Number(c.orders||0)+'</b><span>Заказы</span></div><div><b>'+Number(c.bookings||0)+'</b><span>Записи</span></div><div><b>'+Number(c.messages||0)+'</b><span>Сообщения</span></div></div>'+(items.length?'<div class="list">'+items.map(x=>'<div class="row'+(x.unread?' unread':'')+'"><div class="rtop"><strong>'+kind(x.kind)+'</strong><small>'+esc(tm(x.event_at))+'</small></div><div class="biz">'+esc(x.business_name||'Бизнес')+'</div><div class="title">'+esc(x.title||'')+'</div><div class="text">'+esc(x.body||'')+'</div><small>'+esc(x.customer_name||'Клиент')+'</small></div>').join('')+'</div>':'<div class="state">Новых входящих нет.</div>')}catch(e){box.innerHTML='<div class="state">Не удалось загрузить входящие.<br><button class="retry" onclick="load()">Повторить</button></div>'}}load();</script></body></html>`}
module.exports=async(req,res)=>{
  const pathname=(req.url||'').split('?')[0];
  if(pathname==='/inbox'){
    res.statusCode=200;
    res.setHeader('content-type','text/html; charset=utf-8');
    res.setHeader('cache-control','no-store, max-age=0, must-revalidate');
    return res.end(inboxHtml());
  }
  if(pathname==='/khashuri-inbox-reopen.js'){
    try{
      const file=path.join(process.cwd(),'public','khashuri-inbox-reopen.js');
      const js=fs.readFileSync(file,'utf8');
      res.statusCode=200;
      res.setHeader('content-type','application/javascript; charset=utf-8');
      res.setHeader('cache-control','no-store, max-age=0, must-revalidate');
      return res.end(js);
    }catch(e){res.statusCode=404;return res.end('')}
  }
  const originalEnd=res.end.bind(res);
  res.end=(body,...args)=>{
    try{
      const ct=String(res.getHeader('content-type')||'');
      if(ct.includes('text/html')&&body){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const tag='<script src="/khashuri-inbox-reopen.js?v=10.0"></script>';
        if(!html.includes('/khashuri-inbox-reopen.js'))html=html.includes('</body>')?html.replace('</body>',tag+'</body>'):html+tag;
        return originalEnd(html,...args);
      }
    }catch(e){}
    return originalEnd(body,...args);
  };
  return app(req,res);
};