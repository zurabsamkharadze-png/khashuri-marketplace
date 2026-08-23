const UPSTREAM = 'https://eppyjmtowtkxcwwhvwzp.supabase.co/functions/v1/khashuri-app-v12/';

module.exports = async (req, res) => {
  try {
    const upstream = await fetch(UPSTREAM, {
      headers: {
        'user-agent': 'khashuri-marketplace-vercel-proxy/1.0'
      }
    });

    const body = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'text/html; charset=utf-8';

    res.statusCode = upstream.status;
    res.setHeader('content-type', contentType);
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-khashuri-source', 'github-vercel');
    res.send(Buffer.from(body));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Khashuri upstream temporarily unavailable');
  }
};
