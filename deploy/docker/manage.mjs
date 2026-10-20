import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { environment, passwordHash, passwordMatches, readState, stateFile, writePrivateJson } from "./state.mjs";

process.umask(0o077);
const command = process.argv[2];
if (!["credentials", "reset-login", "import-instagram"].includes(command)) {
  console.error("Usage: node deploy/docker/manage.mjs credentials | reset-login | import-instagram /mounted/export");
  process.exitCode = 1;
} else {
  const state = await readState();
  Object.assign(process.env, environment(state));
  if (command === "import-instagram") {
    const folder = process.argv[3];
    if (!folder || !folder.startsWith("/")) throw new Error("Supply the absolute path of the export mounted inside this container.");
    const imported = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/import-instagram.ts"], { env: { ...process.env, INSTAGRAM_EXPORT_DIR: folder }, stdio: "inherit" });
    process.exitCode = imported.status ?? 1;
  } else {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      const account = await prisma.adminAccount.findUnique({ where: { id: "admin" } });
      if (command === "reset-login") {
        state.username = "admin";
        state.password = randomBytes(24).toString("base64url");
        const values = { username: state.username, passwordHash: await passwordHash(state.password), sessionVersion: randomUUID() };
        await prisma.adminAccount.upsert({ where: { id: "admin" }, create: { id: "admin", ...values }, update: values });
        await writePrivateJson(stateFile, state);
        await writePrivateJson("/data/runtime/admin-auth.json", { mode: "password" });
        console.log("Administrator password reset. Previous administrator sessions are revoked.");
      } else if (account && (account.username !== state.username || !await passwordMatches(state.password, account.passwordHash))) {
        console.error("Your login was changed in Settings. Use your chosen login, or run this command with reset-login to generate a new password.");
        process.exitCode = 1;
      }
      if (!process.exitCode) {
        console.log("Username: " + state.username);
        console.log("Password: " + state.password);
        console.log("Keep this output private. Save the login in your password manager.");
      }
    } finally { await prisma.$disconnect(); }
  }
}
