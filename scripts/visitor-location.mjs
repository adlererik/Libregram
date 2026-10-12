import geoip from "geoip-lite";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { isPublicAddress } from "./visitor-address.mjs";
export { isPublicAddress } from "./visitor-address.mjs";

const empty = () => ({ city: "", region: "", country: "", latitude: null, longitude: null, locationSource: "unavailable" });
const text = value => typeof value === "string" && value !== "-" ? value.replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 120) : "";
const coordinate = (value, limit) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit ? Number(value) : null;
// Share caches across the custom server and Next's bundled administrator route.
const stateKey = Symbol.for("archive.visitor-location.v1");
const state = globalThis[stateKey] ||= { cache: new Map(), pending: new Map(), tail: Promise.resolve(), blockedUntil: 0 };
export function usesIP2Location() { return process.env.VISITOR_GEO_PROVIDER === "ip2location"; }
export function localVisitorLocation(ip) {
  if (!isPublicAddress(ip)) return empty();
  const result = geoip.lookup(ip);
  return { city: result?.city || "", region: result?.region || "", country: result?.country || "", latitude: result?.country ? coordinate(result?.ll?.[0], 90) : null, longitude: result?.country ? coordinate(result?.ll?.[1], 180) : null, locationSource: result ? "local" : "unavailable" };
}

async function claimFreeRequest() {
  const folder = path.join(process.cwd(), ".runtime");
  const file = path.join(folder, "ip2location-usage.json");
  const lock = file + ".lock";
  await mkdir(folder, { recursive: true, mode: 0o700 });
  let locked = false;
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      try { await mkdir(lock, { mode: 0o700 }); locked = true; break; }
      catch (error) {
        if (error.code !== "EEXIST") return false;
        // Recover only an abandoned counter lock, never visitor records.
        try { if (Date.now() - (await stat(lock)).mtimeMs > 30_000) await rm(lock, { recursive: true, force: true }); } catch {}
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    if (!locked) return false;
    const day = new Date().toISOString().slice(0, 10);
    let usage;
    try { usage = JSON.parse(await readFile(file, "utf8")); }
    catch (error) { if (error.code !== "ENOENT") return false; }
    const used = usage?.day === day ? Number(usage.used) : 0;
    // Below both the keyless 1,000/day and free-key 50,000/month allowances.
    // No setting enables paid requests or automatic plan upgrades.
    if (!Number.isSafeInteger(used) || used < 0 || used >= 900) return false;
    await writeFile(file + ".tmp", JSON.stringify({ day, used: used + 1 }), { mode: 0o600 });
    await rename(file + ".tmp", file);
    return true;
  } finally { if (locked) await rm(lock, { recursive: true, force: true }); }
}

export async function visitorLocation(ip) {
  const fallback = localVisitorLocation(ip);
  if (!isPublicAddress(ip) || !usesIP2Location()) return fallback;
  const cached = state.cache.get(ip);
  if (cached?.until > Date.now()) return cached.value;
  if (state.pending.has(ip)) return state.pending.get(ip);
  const lookup = state.tail.catch(() => {}).then(async () => {
    let value = fallback;
    try {
      if (state.blockedUntil <= Date.now() && await claimFreeRequest()) {
        const url = new URL("https://api.ip2location.io/"); url.searchParams.set("ip", ip);
        const key = process.env.IP2LOCATION_API_KEY?.trim();
        const response = await fetch(url, { headers: key ? { Authorization: "Bearer " + key } : {}, signal: AbortSignal.timeout(3000), cache: "no-store", redirect: "error" });
        if (response.status === 429) state.blockedUntil = Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z") + 86_400_000;
        if (response.ok) {
          const data = await response.json();
          const country = text(data.country_code).toUpperCase();
          if (!data.error && /^[A-Z]{2}$/.test(country) && country !== "XX") value = { city: text(data.city_name), region: text(data.region_name), country, latitude: coordinate(data.latitude, 90), longitude: coordinate(data.longitude, 180), locationSource: "ip2location" };
        } else { await response.body?.cancel(); }
      }
    } catch { /* Keep the gallery working; do not log IPs, API keys or responses. */ }
    if (state.cache.size >= 1000) state.cache.delete(state.cache.keys().next().value);
    state.cache.set(ip, { value, until: Date.now() + (value.locationSource === "ip2location" ? 86_400_000 : 300_000) });
    return value;
  });
  state.pending.set(ip, lookup);
  state.tail = lookup.then(() => {}, () => {});
  try { return await lookup; } finally { state.pending.delete(ip); }
}
