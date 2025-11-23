import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const ADMIN_KEY = process.env.ADMIN_KEY || "Liuyan123$";

export default async function handler(req, res) {
  // 简单 CORS（同域其实不需要；为了本地或多域更稳）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-admin-key");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "POST") {
      const { name, count, message } = await readJson(req);

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

      await redis.lpush("rsvp:entries", JSON.stringify(item));
      return res.status(200).json({ ok: true });
    }

    if (req.method === "GET") {
      if (!ADMIN_KEY || req.headers["x-admin-key"] !== ADMIN_KEY) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }
      const raw = await redis.lrange("rsvp:entries", 0, 199); // 最近 200 条
      const data = raw.map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
      return res.status(200).json({ ok: true, data });
    }

    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "服务器异常" });
  }
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}
