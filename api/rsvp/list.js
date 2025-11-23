export default async function handler(req, res) {
  try {
    // 允许跨域 & 禁缓存（前端不会被旧结果缓存）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    const base = process.env.KV_REST_API_URL;
    // 用可写 token 读写都能用；如果你更喜欢只读，也可以换成 KV_REST_API_READ_ONLY_TOKEN
    const token = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN;

    if (!base || !token) {
      return res.status(500).json({ ok: false, error: 'KV environment variables missing' });
    }

    const headers = { Authorization: `Bearer ${token}` };

    async function kv(path) {
      const url = `${base}${path}`;
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        throw new Error(`KV ${path} -> ${r.status} ${txt}`);
      }
      return r.json();
    }

    // 方案 A：有 zset 索引 rsvp:index
    let ids = [];
    try {
      const zr = await kv(`/zrevrange/${encodeURIComponent('rsvp:index')}/0/99`);
      if (Array.isArray(zr.result)) ids = zr.result;
    } catch (_) {}

    let entries = [];

    if (ids.length) {
      // 批量 mget（一次最多 100 个）
      const chunks = [];
      for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
      const batches = await Promise.all(
        chunks.map(c => kv(`/mget/${c.map(encodeURIComponent).join('/')}`))
      );
      const all = batches.flatMap(b => Array.isArray(b.result) ? b.result : []);
      entries = all.map(v => {
        try { return JSON.parse(v); } catch { return null; }
      }).filter(Boolean);
    }

    // 方案 B：纯列表 rsvp:entries（每项就是 JSON 字符串）
    if (!entries.length) {
      try {
        const lr = await kv(`/lrange/${encodeURIComponent('rsvp:entries')}/0/-1`);
        if (Array.isArray(lr.result) && lr.result.length) {
          entries = lr.result.map(v => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
        }
      } catch (_) {}
    }

    // 方案 C：扫描 rsvp:* 的散键（如 rsvp:xxxx）
    if (!entries.length) {
      try {
        let cursor = 0;
        const foundKeys = [];
        do {
          const sr = await kv(`/scan/${cursor}?match=${encodeURIComponent('rsvp:*')}&count=100`);
          const [next, keys] = sr.result || [];
          cursor = Number(next || 0);
          (keys || []).forEach(k => {
            if (typeof k === 'string' && k !== 'rsvp:index' && !k.startsWith('rsvp:entries:')) {
              foundKeys.push(k);
            }
          });
        } while (cursor !== 0 && foundKeys.length < 100);

        if (foundKeys.length) {
          const chunks = [];
          for (let i = 0; i < foundKeys.length; i += 50) chunks.push(foundKeys.slice(i, i + 50));
          const batches = await Promise.all(chunks.map(c => kv(`/mget/${c.map(encodeURIComponent).join('/')}`)));
          const all = batches.flatMap(b => Array.isArray(b.result) ? b.result : []);
          entries = all.map(v => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
        }
      } catch (_) {}
    }

    // 时间倒序
    entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return res.status(200).json(entries);
  } catch (err) {
    console.error('[rsvp/list] error:', err);
    return res.status(500).json({ ok: false, error: 'LIST_FAILED' });
  }
}
