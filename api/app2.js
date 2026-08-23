const app = require('./app');

module.exports = async function khashuriApp2(req, res) {
  const originalEnd = res.end.bind(res);
  res.end = function patchedEnd(body, ...args) {
    if (typeof body === 'string') {
      body = body
        .replace('/khashuri-v55-business.js?v=55.5', '/khashuri-v55-business.js?v=55.9')
        .replace('github-vercel-v55-5', 'github-vercel-v55-9');
    } else if (Buffer.isBuffer(body)) {
      const s = body.toString('utf8');
      body = Buffer.from(
        s.replace('/khashuri-v55-business.js?v=55.5', '/khashuri-v55-business.js?v=55.9')
         .replace('github-vercel-v55-5', 'github-vercel-v55-9'),
        'utf8'
      );
    }
    return originalEnd(body, ...args);
  };
  return app(req, res);
};
