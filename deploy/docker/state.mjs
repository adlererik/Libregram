import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const derive = promisify(scrypt);
export const database = "/data/database/libregram.db";
export const stateFile = "/data/container.json";

export async function readState() {
  const state = JSON.parse(await readFile(stateFile, "utf8"));
  if (state.version !== 1 || typeof state.secret !== "string" || state.secret.length < 64 || typeof state.username !== "string" || typeof state.password !== "string" || state.password.length < 16) throw new Error("Invalid container state. Restore the private data-volume backup.");
  return state;
}

export async function initializeState() {
  try { return await readState(); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const state = { version: 1, secret: randomBytes(48).toString("hex"), username: "admin", password: randomBytes(24).toString("base64url") };
  await writePrivateJson(stateFile, state);
  return readState();
}

export async function writePrivateJson(destination, value) {
  const temporary = destination + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, JSON.stringify(value) + "\n", { mode: 0o600, flag: "wx" });
    await rename(temporary, destination);
  } finally { await unlink(temporary).catch(() => {}); }
}

export function environment(state) {
  return {
    ...process.env,
    DATABASE_URL: "file:" + database,
    SESSION_SECRET: state.secret,
    ADMIN_USERNAME: state.username,
    ADMIN_PASSWORD: state.password,
    ADMIN_AUTH_MODE: process.env.ADMIN_AUTH_MODE || "password",
    NEXT_PUBLIC_BIRTH_DATE: "",
    TRUST_PROXY: process.env.TRUST_PROXY || "false",
  };
}

export async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64);
  return "scrypt:" + salt + ":" + key.toString("hex");
}

export async function passwordMatches(password, hash) {
  const [algorithm, salt, encoded] = hash.split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(encoded)) return false;
  return timingSafeEqual(await derive(password, salt, 64), Buffer.from(encoded, "hex"));
}
