import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { database, environment, initializeState, passwordHash } from "./state.mjs";

process.umask(0o077);
try {
  for (const directory of ["/data/database", "/data/uploads", "/data/runtime", "/data/cache/cast-slides", "/data/backups"]) await mkdir(directory, { recursive: true, mode: 0o700 });
  const state = await initializeState();
  const env = environment(state);
  const schema = createHash("sha256").update(await readFile("prisma/schema.prisma")).digest("hex");
  const previous = await readFile("/data/database/schema.sha256", "utf8").catch(() => "");
  const existing = (await stat(database).catch(() => null))?.size > 0;
  if (schema !== previous || !existing) {
    if (existing) {
      const backup = "/data/backups/before-schema-" + new Date().toISOString().replace(/[:.]/g, "-") + ".sqlite";
      const copy = spawnSync("sqlite3", [database, ".backup '" + backup + "'"], { stdio: "inherit" });
      if (copy.status !== 0) throw new Error("Database backup failed; schema was not changed.");
      console.log("Saved a private database backup under /data/backups before the schema update.");
    } else {
      try { await writeFile(database, "", { flag: "wx", mode: 0o600 }); }
      catch (error) { if (error.code !== "EEXIST") throw error; }
    }
    const update = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env, stdio: "inherit" });
    if (update.status !== 0) throw new Error("Schema update stopped. No destructive reset or data-loss acceptance is performed automatically.");
    await writeFile("/data/database/schema.sha256", schema, { mode: 0o600 });
  }
  Object.assign(process.env, env);
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    if (!await prisma.adminAccount.findUnique({ where: { id: "admin" } })) {
      await prisma.adminAccount.create({ data: { id: "admin", username: state.username, passwordHash: await passwordHash(state.password) } });
      console.log("Created an empty Libregram installation with a unique administrator login.");
    }
  } finally { await prisma.$disconnect(); }
  console.log("Read your initial login privately with: docker compose exec libregram node deploy/docker/manage.mjs credentials");
  const child = spawn(process.execPath, ["scripts/server.mjs"], { env, stdio: "inherit" });
  for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
  child.on("error", () => { console.error("Unable to start Libregram."); process.exitCode = 1; });
  child.on("exit", (code, signal) => { process.exitCode = code ?? (signal === "SIGTERM" || signal === "SIGINT" ? 0 : 1); });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Container initialization failed.");
  process.exitCode = 1;
}
