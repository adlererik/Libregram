import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { isPublicAddress, localVisitorLocation, visitorLocation } from "./visitor-location.mjs";
import { hasAdminSession, readVisitorExclusions, rememberOwner } from "./visitor-exclusions.mjs";

const tracked = pathname => ["/", "/favorites", "/privacy", "/admin", "/admin/settings", "/admin/login"].includes(pathname) || /^\/s\/[A-Za-z0-9_-]{16}$/.test(pathname);
const cookie = (req, name) => (req.headers.cookie || "").split(";").map(item => item.trim()).find(item => item.startsWith(name + "="))?.slice(name.length + 1) || "";
const equal = (a, b) => Boolean(a && b && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b)));
function clientIP(req) {
  const peer = (req.socket.remoteAddress || "").replace(/^::ffff:/i, "");
  if (process.env.TRUST_PROXY === "true" && ["127.0.0.1", "::1"].includes(peer)) {
    for (const candidate of [req.headers["cf-connecting-ipv6"], req.headers["cf-connecting-ip"], String(req.headers["x-forwarded-for"] || "").split(",").at(-1)]) {
      const ip = typeof candidate === "string" ? candidate.trim().replace(/^::ffff:/i, "") : "";
      if (isIP(ip)) return ip;
    }
  }
  return peer || "Unknown";
}
function sameOrigin(req) {
  try { return req.headers["sec-fetch-site"] !== "cross-site" && new URL(req.headers.origin).host.toLowerCase() === String(req.headers.host).toLowerCase(); } catch { return false; }
}
function addCookie(res, value) {
  const existing = res.getHeader("Set-Cookie");
  res.setHeader("Set-Cookie", [...(Array.isArray(existing) ? existing : existing ? [existing] : []), value]);
}
async function jsonBody(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 2048) throw new Error("Request too large"); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function createVisitorTracker({ prisma, secret }) {
  const sign = value => createHmac("sha256", secret).update(value).digest("base64url");
  const visitorSign = value => sign("visitor:" + value);
  const visitorToken = req => {
    const raw = cookie(req, "archive_visitor"), [id, signature, extra] = raw.split(".");
    return raw.length <= 200 && id && extra === undefined && equal(signature, visitorSign(id)) ? raw : "";
  };
  const activitySign = (id, expires, key) => sign("activity:" + id + ":" + expires + ":" + key);
  const secure = () => process.env.SESSION_COOKIE_SECURE === "true" ? "; Secure" : "";
  const budgets = new Map();
  function allowed(key) {
    let value = budgets.get(key);
    if (!value || value.until < Date.now()) { value = { count: 0, until: Date.now() + 60_000 }; budgets.set(key, value); }
    if (budgets.size > 5000) budgets.delete(budgets.keys().next().value);
    return ++value.count <= 30;
  }
  function reply(res, data, status = 200) { res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" }); res.end(JSON.stringify(data)); }
  async function outside(req, ip, key) {
    if (await hasAdminSession(cookie(req, "archive_admin"), secret, prisma)) { await rememberOwner(ip, key); return false; }
    if (!isPublicAddress(ip)) return false;
    const excluded = await readVisitorExclusions();
    return !excluded.ips.includes(ip) && !excluded.visitorKeys.includes(key);
  }
  async function activity(req, res) {
    if (req.method !== "POST") { reply(res, { error: "Method not allowed" }, 405); return; }
    if (!sameOrigin(req) || !String(req.headers["content-type"]).startsWith("application/json")) { reply(res, { error: "Invalid request" }, 403); return; }
    const raw = visitorToken(req);
    if (!raw) { reply(res, { ignored: true }); return; }
    const key = visitorSign(raw);
    if (!allowed(key)) { reply(res, { error: "Please wait" }, 429); return; }
    const data = await jsonBody(req);
    const token = data?.type === "start" ? cookie(req, "archive_visit") : data?.token;
    if (typeof token !== "string" || token.length > 200) { reply(res, { ignored: true }); return; }
    const [id, expires, signature, extra] = token.split(".");
    if (!id || extra !== undefined || !Number.isSafeInteger(Number(expires)) || Number(expires) <= Date.now() || !equal(signature, activitySign(id, expires, key))) { reply(res, { ignored: true }); return; }
    const visit = await prisma.visit.findFirst({ where: { id, visitorKey: key }, select: { createdAt: true, ip: true } });
    if (!visit || !await outside(req, visit.ip, key)) { reply(res, { ignored: true }); return; }
    if (data.type === "start") { reply(res, { token }); return; }
    if (data.type !== "heartbeat" || !Number.isSafeInteger(data.seconds) || data.seconds < 0) { reply(res, { error: "Invalid duration" }, 400); return; }
    // First-party estimates cannot exceed the wall time since the visit began.
    const seconds = Math.min(data.seconds, Math.max(0, Math.floor((Date.now() - visit.createdAt.getTime()) / 1000)), 86_400);
    await prisma.visit.updateMany({ where: { id, visitorKey: key, OR: [{ durationSeconds: null }, { durationSeconds: { lte: seconds } }] }, data: { durationSeconds: seconds, lastSeenAt: new Date() } });
    reply(res, { ok: true });
  }
  return {
    async handle(req, res) {
      const pathname = (req.url || "").split("?")[0];
      if (pathname === "/api/visitor-activity") {
        try { await activity(req, res); } catch { if (!res.headersSent) reply(res, { error: "Activity unavailable" }, 400); }
        return true;
      }
      if (req.method !== "GET" || !tracked(pathname)) return false;
      const fullVisit = !req.headers.rsc && !req.headers["next-router-prefetch"];
      let token = visitorToken(req);
      if (!token) {
        const id = randomUUID(); token = id + "." + visitorSign(id);
        if (fullVisit || cookie(req, "archive_admin")) addCookie(res, "archive_visitor=" + token + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000" + secure());
      }
      const key = visitorSign(token), ip = clientIP(req);
      try {
        // Identify the owner even on client-side navigation; historical matches
        // are hidden by the existing statistics filter without deleting history.
        const eligible = await outside(req, ip, key);
        if (fullVisit && eligible) {
          const ua = String(req.headers["user-agent"] || "").slice(0, 2048);
          const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS / iPadOS" : /Windows/i.test(ua) ? "Windows" : /Macintosh|Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown";
          const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other / unknown";
          const device = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? "Tablet" : /Mobile|iPhone|iPod/i.test(ua) ? "Mobile" : /Windows|Macintosh|Linux/i.test(ua) ? "Desktop" : "Other / unknown";
          const id = randomUUID();
          let referrer = "Direct"; try { referrer = new URL(String(req.headers.referer)).hostname.replace(/^\[|\]$/g, ""); } catch {}
          await prisma.visit.create({ data: { id, visitorKey: key, ip, ...localVisitorLocation(ip), os, browser, device, userAgent: ua, language: String(req.headers["accept-language"] || "").slice(0, 120), referrer } });
          const expires = Date.now() + 86_400_000;
          addCookie(res, "archive_visit=" + id + "." + expires + "." + activitySign(id, expires, key) + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400" + secure());
          // Enrich in the background; rendering never waits for the external API.
          void visitorLocation(ip).then(location => prisma.visit.updateMany({ where: { id, visitorKey: key }, data: location })).catch(() => {});
        }
      } catch { console.error("Visitor recording is temporarily unavailable."); }
      return false;
    },
  };
}
