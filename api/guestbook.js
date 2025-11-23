// api/guestbook.js
export const runtime = 'edge';
import { kv } from '@vercel/kv';

// 可选：未来你想把数据“镜像”到腾讯文档，可在这里实现。
// 目前返回 false（不镜像）。
async function mirrorToTencentDocs(item) {
  // TODO: 在这里写入你的腾讯文档镜像逻辑（需要企业接口或自动化方案）
  // 例如调用企业 API / 第三方自动化 / 你自建的中转服务等
  return false;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    if (req.method === 'POST') {
      const { name, count, message, hp } = await req.json();

      // 简单校验 & 蜜罐
      if (hp) return json({ ok: true }); // 机器人/垃圾提交直接吞
      if (!name || !message || !count || Number(count) < 1) {
        return json({ ok: false, error: 'INVALID' }, 400);
      }

      const item = {
        id: crypto.randomUUID(),
        name: String(name).slice(0, 60),
        count: Number(count),
        message: String(message).slice(0, 2000),
        createdAt: Date.now(),
        ua: req.headers.get('user-agent') || '',
        ip: req.headers.get('x-forwarded-for') || '',
      };

      // 保存（按时间做 sorted set）
      await kv.zadd('guestbook', { score: item.createdAt, member: JSON.stringify(item) });

      // （可选）镜像到腾讯文档
      mirrorToTencentDocs(item).catch(() => { /* 忽略镜像失败 */ });

      return json({ ok: true });
    }

    if (req.method === 'GET') {
      // 取最近 200 条
      const items = await kv.zrange('guestbook', -200, -1);
      const list = items.map(s => {
        try { return JSON.parse(s); } catch { return null; }
      }).filter(Boolean);
      return json({ ok: true, list });
    }

    return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  } catch (e) {
    return json({ ok: false, error: 'SERVER_ERROR' }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}
