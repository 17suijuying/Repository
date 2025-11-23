// 保存一条留言：SET rsvp:<id> 以及 ZADD rsvp:index <ts> <key>
export default async function handler(req, res) {
  // CORS + no-store
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method Not Allowed' });

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error('KV env missing');
    return res.status(500).json({ ok: false, message: 'KV env missing' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ ok:false, message:'Invalid JSON' }); }
  }

  const name = String(body?.name || '').trim().slice(0, 50);
  const count = Math.max(1, parseInt(body?.count, 10) || 1);
  const message = String(body?.message || '').trim().slice(0, 500);
  if (!name || !Number.isFinite(count)) {
    return res.status(400).json({ ok:false, message:'Name and count required' });
  }

  const ts = Date.now();
  const id = ts.toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const key = `rsvp:${id}`;
  const doc = {
    id, name, count, message,
    createdAt: ts,
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || ''
  };

  try {
    const r = await fetch(`${KV_REST_API_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      // 一次性执行多条命令：SET + ZADD（做时间倒序索引）
      body: JSON.stringify([
        ['SET', key, JSON.stringify(doc)],
        ['ZADD', 'rsvp:index', ts, key]
      ])
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Upstash pipeline error (submit):', data);
      return res.status(500).json({ ok:false, message:'KV pipeline failed' });
    }
    return res.status(200).json({ ok:true, id, createdAt: ts });
  } catch (err) {
    console.error('submit fatal:', err);
    return res.status(500).json({ ok:false, message:'Server error' });
  }
}
