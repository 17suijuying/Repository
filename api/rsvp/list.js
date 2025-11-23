// api/rsvp/list.js
import { kv } from '@vercel/kv';

export default async function handler(_req, res) {
  try {
    let items = [];

    // 优先读“新结构”——ZSET 索引 + 每条记录 hgetall
    const ids = await kv.zrange('rsvp:index', 0, -1, { rev: true }); // 最新在前
    if (ids && ids.length) {
      const pipeline = kv.pipeline();
      for (const id of ids) pipeline.hgetall(`rsvp:${id}`);
      const rows = await pipeline.exec();

      items = rows
        .map(r => r || {})
        .filter(r => r.name)
        .map(r => ({
          id: r.id,
          name: r.name,
          count: Number(r.count || 0),
          message: r.message || '',
          createdAt: Number(r.createdAt || 0),
        }));
    }

    // 若上面为空，再回退读“老结构”：List 里存 JSON 字符串
    if (!items.length) {
      const list = await kv.lrange('rsvp:entries', 0, -1);
      if (list?.length) {
        items = list.map(v => {
          const r = typeof v === 'string' ? JSON.parse(v) : v;
          return {
            id: r.id,
            name: r.name,
            count: Number(r.count || 0),
            message: r.message || '',
            createdAt: Number(r.createdAt || 0),
          };
        });
      }
    }

    // 再兜底一次（你早期可能用过的 key）
    if (!items.length) {
      const legacy = await kv.lrange('wedding:guestbook', 0, -1);
      if (legacy?.length) {
        items = legacy.map(v => (typeof v === 'string' ? JSON.parse(v) : v));
      }
    }

    // 时间降序
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // 禁止缓存，防止“写了但前端一直旧数据”
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');

    return res.status(200).json(items);
  } catch (err) {
    console.error('list error', err);
    // 为了前端不报错，这里返回空数组 + no-store
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json([]);
  }
}
