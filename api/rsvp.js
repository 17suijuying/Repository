import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// 可选：管理员查看用的密钥（到 Vercel → Settings → Environment Variables 新增 ADMIN_KEY）
const ADMIN_KEY = process.env.ADMIN_KEY || "";

export default async function handler(req, res) {
  // 同域请求不需要 CORS；如需跨域可放开下面三行
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-admin-key");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "POST") {
    try {
      const { name, count, message } = await readJson(req);

      // 简单校验
      if (!name || String(name).trim() === "") {
        return res.status(400).json({ ok: false, error: "请填写姓名" });
      }
      const people = Number(count);
      if (!Number.isFinite(people) || people < 0 || people > 20) {
        return res.status(400).json({ ok: false, error: "人数格式不正确" });
      }

      const item = {
        name: String(name).trim(),
        count: people,
        message: (message || "").toString().slice(0, 500),
        time: new Date().toISOString(),
        ua: req.headers["user-agent"] || ""
      };

      // 写入 Upstash。用列表保存，便于按时间倒序读取
      await redis.lpush("rsvp:entries", JSON.stringify(item));

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: "服务器异常" });
    }
  }

  if (req.method === "GET") {
    // 简单的“管理员密钥”保护
    if (!ADMIN_KEY || req.headers["x-admin-key"] !== ADMIN_KEY) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    // 读取最近 200 条
    const raw = await redis.lrange("rsvp:entries", 0, 199);
    const data = raw.map(safeParse).filter(Boolean);
    return res.status(200).json({ ok: true, data });
  }

  return res.status(405).json({ ok: false, error: "Method Not Allowed" });
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function safeParse(x) {
  try { return JSON.parse(x); } catch { return null; }
}
