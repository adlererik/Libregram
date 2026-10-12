import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, isValidSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visitorFilter } from "@/lib/visitor-filter";
import { usesIP2Location, visitorLocation } from "@/scripts/visitor-location.mjs";

export async function POST(request: NextRequest) {
  if (!await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { if (new URL(request.headers.get("origin") || "").host !== request.headers.get("host")) throw new Error(); }
  catch { return NextResponse.json({ error: "Invalid origin" }, { status: 403 }); }
  if (!usesIP2Location()) return NextResponse.json({ error: "Enable IP2Location.io in the server configuration first." }, { status: 400 });
  if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  const data = await request.json().catch(() => null);
  if (!Array.isArray(data?.ids) || !data.ids.length || data.ids.length > 5 || !data.ids.every((id: unknown) => typeof id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id))) return NextResponse.json({ error: "Choose up to five visit records." }, { status: 400 });
  const rows = await prisma.visit.findMany({ where: { AND: [await visitorFilter(), { id: { in: data.ids } }] }, select: { id: true, ip: true } });
  let updated = 0, fallback = 0;
  for (const row of rows) {
    const location = await visitorLocation(row.ip);
    if (location.locationSource === "ip2location") {
      await prisma.visit.updateMany({ where: { id: row.id }, data: location }); updated++;
    } else { fallback++; }
  }
  revalidatePath("/admin/settings");
  return NextResponse.json({ updated, fallback }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  if (!await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  } catch { return NextResponse.json({ error: "Invalid origin" }, { status: 403 }); }
  const data = await request.json().catch(() => null);
  const single = typeof data?.id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(data.id) && data.all !== true;
  const all = data?.all === true && data.id === undefined;
  if (!single && !all) return NextResponse.json({ error: "Choose a visitor record or confirm deletion of all visit history." }, { status: 400 });
  const { count } = single ? await prisma.visit.deleteMany({ where: { id: data.id } }) : await prisma.visit.deleteMany();
  revalidatePath("/admin/settings");
  return NextResponse.json({ ok: true, deleted: count });
}
