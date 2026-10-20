import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { phonePinMatches, readPhoneSettings } from "./phone-settings.mjs";

function clientAddress(req) {
  const peer = (req.socket.remoteAddress || "").replace(/^::ffff:/i, "");
  // Match the gallery's trusted local proxy boundary; public clients cannot
  // choose their own limiter key by supplying a forwarded address.
  if (process.env.TRUST_PROXY === "true" && ["127.0.0.1", "::1"].includes(peer)) {
    for (const candidate of [req.headers["cf-connecting-ipv6"], req.headers["cf-connecting-ip"], String(req.headers["x-forwarded-for"] || "").split(",").at(-1)]) {
      const ip = typeof candidate === "string" ? candidate.trim().replace(/^::ffff:/i, "") : "";
      if (isIP(ip)) return ip;
    }
  }
  return peer || "unknown";
}

function sameOrigin(req) {
  try { return req.headers["sec-fetch-site"] !== "cross-site" && new URL(req.headers.origin).host.toLowerCase() === String(req.headers.host).toLowerCase(); }
  catch { return false; }
}

function reply(res, status, data, retryAfter = 0) {
  if (res.destroyed) return;
  res.writeHead(status, {
    "Content-Type": "application/json", "Cache-Control": "no-store, private",
    "Pragma": "no-cache", "X-Content-Type-Options": "nosniff",
    ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (Number(req.headers["content-length"]) > 512) throw new Error("Request too large");
  const chunks = [];
  let length = 0;
  const timeout = setTimeout(() => req.destroy(), 5000);
  timeout.unref();
  try {
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 512) throw new Error("Request too large");
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { clearTimeout(timeout); }
}

export function createPhoneEntry({ secret }) {
  // Limits are per running server, contain no PINs, and expire after 15 minutes.
  const clients = new Map();
  let windowEnd = 0;
  let attempts = 0;
  let verifying = 0;
  return {
    async handle(req, res) {
      if ((req.url || "").split("?")[0] !== "/api/phone-entry") return false;
      if (req.method !== "POST") { res.setHeader("Allow", "POST"); reply(res, 405, { error: "Method not allowed" }); return true; }
      if (!sameOrigin(req) || !String(req.headers["content-type"]).startsWith("application/json")) {
        reply(res, 403, { error: "Open the keypad from this gallery." }); return true;
      }
      const now = Date.now();
      for (const [key, client] of clients) if (client.expires <= now && !client.active) clients.delete(key);
      const key = createHmac("sha256", secret).update("phone-entry:" + clientAddress(req)).digest("hex");
      let client = clients.get(key);
      if (!client) {
        if (clients.size >= 5000) { reply(res, 429, { error: "Please wait before trying again.", retryAfter: 60 }, 60); return true; }
        client = { failures: 0, nextAt: 0, expires: now + 15 * 60_000, active: false };
        clients.set(key, client);
      }
      if (client.active || client.nextAt > now) {
        const retryAfter = Math.max(1, Math.ceil((client.nextAt - now) / 1000));
        reply(res, 429, { error: "Please wait before trying again.", retryAfter }, retryAfter); return true;
      }
      if (windowEnd <= now) { windowEnd = now + 60_000; attempts = 0; }
      if (attempts >= 60 || verifying >= 2) {
        const retryAfter = attempts >= 60 ? Math.max(1, Math.ceil((windowEnd - now) / 1000)) : 2;
        reply(res, 429, { error: "Please wait before trying again.", retryAfter }, retryAfter); return true;
      }
      attempts++;
      verifying++;
      client.active = true;
      client.nextAt = now + 1000;
      try {
        const settings = await readPhoneSettings();
        if (!settings.enabled) { reply(res, 404, { error: "This shortcut is currently unavailable." }); return true; }
        const data = await readBody(req);
        const matches = await phonePinMatches(data?.pin, settings.pinHash);
        if (!matches) {
          client.failures++;
          const delay = client.failures >= 6 ? 300_000 : Math.min(60_000, 1000 * 2 ** (client.failures - 1));
          client.nextAt = Date.now() + delay;
          const retryAfter = Math.ceil(delay / 1000);
          reply(res, 401, { error: "That PIN wasn't recognized. Please try again.", retryAfter }, retryAfter);
          return true;
        }
        const current = await readPhoneSettings();
        if (!current.enabled || current.pinHash !== settings.pinHash || current.url !== settings.url) {
          reply(res, 409, { error: "Settings changed. Please open the keypad again." }); return true;
        }
        client.failures = 0;
        // Return the destination only after this individual PIN check. No
        // cookie, reusable token, or remembered unlock is ever issued.
        reply(res, 200, { url: current.url });
      } catch {
        reply(res, 400, { error: "Unable to check the PIN. Please try again." });
      } finally {
        client.active = false;
        verifying--;
      }
      return true;
    },
  };
}
