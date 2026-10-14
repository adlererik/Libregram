import http from "node:http";
import next from "next";
import { createVisitorTracker } from "./visitor-tracker.mjs";
import { serveMedia } from "./serve-media.mjs";

const port = Number(process.env.LIBREGRAM_PORT || process.env.ARCHIVE_PORT || 3000);
const hostname = process.env.LIBREGRAM_HOST || process.env.ARCHIVE_HOST || "0.0.0.0";
const app = next({ dev: (process.env.LIBREGRAM_DEV ?? process.env.ARCHIVE_DEV) === "true", hostname, port });
await app.prepare();
// Next loads .env.local during prepare, including on a fresh clone.
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32 || ["replace-with-a-long-random-secret", "archive-local-session-change-this-before-public-exposure"].includes(sessionSecret)) throw new Error("Configure your own SESSION_SECRET in .env.local. Run ./libregram setup for a new installation.");
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const visitorTracker = createVisitorTracker({ prisma, secret: sessionSecret });
const handle = app.getRequestHandler();
const server = http.createServer(async (req, res) => {
  if (await visitorTracker.handle(req, res)) return;
  try { if (!await serveMedia(req, res)) await handle(req, res); } catch (error) { console.error(error); if (!res.headersSent) res.writeHead(500); res.end("Unable to serve Libregram"); }
});
server.listen(port, hostname, () => console.log("Libregram listening at http://" + hostname + ":" + port));
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  server.closeIdleConnections();
  setTimeout(() => process.exit(0), 7000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
