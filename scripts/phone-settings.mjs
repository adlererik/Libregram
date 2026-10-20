import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const settingsPath = () => path.join(process.cwd(), ".runtime", "phone-shortcut.json");
const defaults = () => ({ enabled: false, url: "/com", pinHash: "" });
const validHash = value => typeof value === "string" && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(value);
export const validPhonePin = value => typeof value === "string" && /^[0-9]{4,12}$/.test(value);

export function normalizePhoneUrl(value) {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url || url.length > 2048 || /[\u0000-\u001f\u007f\\]/.test(url)) return null;
  try {
    const relative = url.startsWith("/") && !url.startsWith("//");
    const parsed = relative ? new URL(url, "https://libregram.invalid") : new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    if (relative && parsed.origin !== "https://libregram.invalid") return null;
    return relative ? url : parsed.href;
  } catch { return null; }
}

export async function readPhoneSettings() {
  try {
    const data = JSON.parse(await readFile(settingsPath(), "utf8"));
    if (typeof data?.enabled !== "boolean" || typeof data.url !== "string" || typeof data.pinHash !== "string") return defaults();
    const url = data.url ? normalizePhoneUrl(data.url) : "";
    if (url === null || (data.pinHash && !validHash(data.pinHash))) return defaults();
    return { enabled: data.enabled && Boolean(url && data.pinHash), url, pinHash: data.pinHash };
  } catch { return defaults(); }
}

export function phoneSettingsForAdmin(settings) {
  return { enabled: settings.enabled, url: settings.url, hasPin: Boolean(settings.pinHash) };
}

let saving = Promise.resolve();
export function savePhoneSettings(fields) {
  const operation = saving.catch(() => {}).then(async () => {
    const previous = await readPhoneSettings();
    const url = fields.url.trim() ? normalizePhoneUrl(fields.url) : "";
    if (typeof fields.enabled !== "boolean" || url === null || (fields.enabled && !url)) throw new Error("Enter a valid web address, or a path such as /com.");
    if (fields.pin && !validPhonePin(fields.pin)) throw new Error("Choose a PIN containing 4 to 12 digits.");
    if (fields.enabled && !fields.pin && !previous.pinHash) throw new Error("Set a PIN before enabling the phone shortcut.");
    let pinHash = previous.pinHash;
    if (fields.pin) {
      const salt = randomBytes(16).toString("hex");
      const key = await derive(fields.pin, salt, 64);
      pinHash = "scrypt:" + salt + ":" + key.toString("hex");
    }
    const settings = { enabled: fields.enabled, url, pinHash };
    const destination = settingsPath();
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    const temporary = destination + "." + randomUUID() + ".tmp";
    try {
      await writeFile(temporary, JSON.stringify(settings) + "\n", { mode: 0o600, flag: "wx" });
      await rename(temporary, destination);
    } finally { await unlink(temporary).catch(() => {}); }
    return phoneSettingsForAdmin(settings);
  });
  saving = operation.then(() => {}, () => {});
  return operation;
}

export async function phonePinMatches(pin, hash) {
  if (!validPhonePin(pin) || !validHash(hash)) return false;
  const [, salt, encoded] = hash.split(":");
  const key = await derive(pin, salt, 64);
  return timingSafeEqual(key, Buffer.from(encoded, "hex"));
}
