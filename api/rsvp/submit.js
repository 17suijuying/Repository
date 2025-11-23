export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'ONLY_POST' });
    }

    const base  = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!base || !token) {
      return res.status(500).json({ ok: false, error: 'KV environment variables missing' });
    }
    const headers = { Authorization: `Bearer ${token}` };

    const { name, count, message } = req.body || {};
    if (!name || !Number(count)) {
      return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' });
    }

    const id   = Math.random().toString(36).slice(2, 10) + '-' + Math.random().toString(36).slice(2, 8);
    const key  = `rsvp:${id}`;
    const now  = Date.now();
    const item = {
      id,
      name: String(name).slice(0, 40),
      count: Number(count),
      message: String(message || '').slice(0, 500),
      createdAt: now
    };

    // 写入单条
    const setUrl = `${base}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(item))}`;
    const setRes = await fetch(setUrl, { headers });
    if (!setRes.ok) {
      const t = await setRes.text().catch(()=> '');
      throw new Error(`SET failed ${t}`);
    }

    // 维护 zset 索引（score 用时间戳）
    const zaddUrl = `${base}/zadd/${encodeURIComponent('rsvp:index')}/${now}/${encodeURIComponent(key)}`;
    await fetch(zaddUrl, { headers });

    // 兼容：也塞进一个列表 rsvp:entries，方便没有索引时读取
    const rpushUrl = `${base}/rpush/${encodeURIComponent('rsvp:entries')}/${encodeURIComponent(JSON.stringify(item))}`;
    await fetch(rpushUrl, { headers });

    return res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error('[rsvp/submit] error:', err);
    return res.status(500).json({ ok: false, error: 'SUBMIT_FAILED' });
  }
}
