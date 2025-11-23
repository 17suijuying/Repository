// api/rsvp/submit.js
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  // 简单 CORS，前后端同域其实不需要；为防以后跨域，这里放开来源
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).end('Method Not Allowed');
  }

  // 兼容 body 可能是字符串
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const name = (body.name || '').trim();
  const count = Number(body.count || 0);
  const message = (body.message || '').trim();

  if (!name || count <= 0) {
    return res.status(400).json({ ok: false, error: '姓名和人数必填，人数需大于0' });
  }

  const row = {
    name,
    count,
    message,
    ua: req.headers['user-agent'] || '',
    createdAt: Date.now()
  };

  const KEY = 'wedding:guestbook';      // 列表的键名
  await kv.lpush(KEY, JSON.stringify(row));
  await kv.ltrim(KEY, 0, 199);           // 只保留最新 200 条

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
};
