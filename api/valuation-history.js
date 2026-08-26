module.exports=(req,res)=>{
  res.statusCode=200;
  res.setHeader('content-type','text/html; charset=utf-8');
  res.setHeader('cache-control','no-store, max-age=0, must-revalidate');
  res.end(`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>История оценок | Хашури</title>
<style>
:root{--teal:#11877c;--ink:#131c31;--muted:#70798b;--line:#e3e6eb;--bg:#f4f6f9;--danger:#a72d2d}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
.top{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid var(--line);padding:14px 18px;display:flex;align-items:center;gap:12px}
.back{width:50px;height:50px;border:1px solid var(--line);background:#fff;border-radius:17px;font-size:28px}
.top h1{font-size:24px;margin:0}
.wrap{max-width:900px;margin:auto;padding:18px 16px 100px}
.hero{background:linear-gradient(135deg,#10233c,#0c766e);color:#fff;border-radius:24px;padding:22px}
.hero h2{margin:0 0 7px;font-size:29px}.hero p{margin:0;opacity:.86;line-height:1.45}
.state{margin-top:14px;padding:18px;background:#fff;border:1px solid var(--line);border-radius:20px;color:var(--muted);line-height:1.45}.state b{color:var(--ink)}
.card{margin-top:12px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:16px}.head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.head b{font-size:19px}.date{font-size:12px;color:var(--muted)}
.badge{display:inline-block;margin-top:5px;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:850;background:#eef2f5;color:#5f6878}.badge.cloud{background:#e8f8f4;color:#0f7468}
.price{font-size:31px;font-weight:950;margin:12px 0 4px}.range{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:13px}.metric{padding:10px;background:#f7f8fa;border-radius:12px}.metric small{display:block;color:var(--muted);font-size:11px}.metric b{display:block;margin-top:3px}
.actions{display:flex;gap:8px;margin-top:13px;flex-wrap:wrap}.btn{border:0;border-radius:13px;padding:11px 14px;font-weight:850;background:var(--teal);color:#fff}.btn.alt{background:#fff;color:var(--ink);border:1px solid var(--line)}.error{color:var(--danger)}
@media(max-width:650px){.top h1{font-size:21px}.grid{grid-template-columns:1fr 1fr}.price{font-size:28px}}
</style>
<script defer src="/valuation-history-client.js?v=5"></script>
</head>
<body>
<header class="top"><button class="back" onclick="location.href='/valuation'">←</button><h1>📊 История оценок</h1></header>
<main class="wrap">
<section class="hero"><h2>Сохранённые оценки</h2><p>Здесь накапливается история объекта и будущие данные для улучшения точности модели.</p></section>
<div id="syncState" class="state">Проверяю синхронизацию…</div>
<div id="app" class="state">Загружаю историю…</div>
</main>
</body>
</html>`);
};