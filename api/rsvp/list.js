// 读取留言列表：按 rsvp:index 倒序取 key，再 MGET 取值
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error('KV env missing');
    return res.status(500).json({ ok:false, message:'KV env missing' });
  }

  const limit = Math.min(200, Math.max(1, parseInt(req.query?.limit || '50', 10)));

  try {
    // 第一步：拿到最近的 key 列表
    const r1 = await fetch(`${KV_REST_API_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['ZREVRANGE', 'rsvp:index', '0', String(limit - 1)]
      ])
    });
    const p1 = await r1.json().catch(() => null);
    if (!r1.ok || !Array.isArray(p1)) {
      console.error('Upstash pipeline error (zrevrange):', p1);
      return res.status(500).json({ ok:false, message:'KV zrevrange failed' });
    }
    const keys = p1[0]?.result || [];
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(200).json([]);
    }

    // 第二步：一次性把这些 key 的值取出来
    const r2 = await fetch(`${KV_REST_API_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['MGET', ...keys]
      ])
    });
    const p2 = await r2.json().catch(() => null);
    if (!r2.ok || !Array.isArray(p2)) {
      console.error('Upstash pipeline error (mget):', p2);
      return res.status(500).json({ ok:false, message:'KV mget failed' });
    }

    const raw = p2[0]?.result || [];
    const items = (raw || [])
      .map(s => { try { return JSON.parse(s); } catch { return null; } })
      .filter(Boolean);

    return res.status(200).json(items);
  } catch (err) {
    console.error('list fatal:', err);
    return res.status(500).json({ ok:false, message:'Server error' });
  }
}
