const UPSTREAM = 'https://eppyjmtowtkxcwwhvwzp.supabase.co/functions/v1/khashuri-app-v12/';

module.exports = async (req, res) => {
  try {
    const upstream = await fetch(UPSTREAM, {
      headers: {
        'user-agent': 'khashuri-marketplace-vercel-proxy/1.1'
      }
    });

    const body = await upstream.arrayBuffer();

    res.statusCode = upstream.status;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-store, max-age=0');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-khashuri-source', 'github-vercel');
    res.end(Buffer.from(body));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Khashuri upstream temporarily unavailable');
  }
};
