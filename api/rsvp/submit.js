// api/rsvp/submit.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });

  try {
    const { name, count, message } = req.body || {};
    const n = (name || '').trim();
    const c = Number(count || 0);
    const m = (message || '').trim();

    if (!n || !c) {
      return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' });
    }

    const id = Math.random().toString(36).slice(2, 10);
    const createdAt = Date.now();
    const record = { id, name: n, count: c, message: m, createdAt };

    // —— 写两套结构，保证新旧读法都能读到 —— //
    // 1) 新：ZSET 索引 + Hash/JSON 存储
    await kv.hset(`rsvp:${id}`, record);
    await kv.zadd('rsvp:index', { member: id, score: createdAt });

    // 2) 旧：List 直存整条 JSON
    await kv.lpush('rsvp:entries', JSON.stringify(record));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error('submit error', err);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
}
