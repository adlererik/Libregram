import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, isValidSession } from "@/lib/auth";
import { isValidBirthDate, localDateTime } from "@/lib/dates";
import { setAgeTrackingSettings } from "@/lib/age-tracking-settings";

export async function PATCH(request: NextRequest) {
  if (!await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin) {
    try { if (new URL(origin).host !== request.headers.get("host")) throw new Error(); }
    catch { return NextResponse.json({ error: "Open your own gallery settings to make this change." }, { status: 403 }); }
  }
  let data;
  try { data = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { enabled, birthDate } = data || {};
  if (typeof enabled !== "boolean" || typeof birthDate !== "string" || (enabled && !birthDate) || (birthDate && !isValidBirthDate(birthDate))) return NextResponse.json({ error: "Enter a valid date of birth to show age labels, or turn age tracking off." }, { status: 400 });
  if (birthDate > localDateTime().slice(0, 10)) return NextResponse.json({ error: "The date of birth cannot be in the future." }, { status: 400 });
  const settings = { enabled, birthDate };
  try { await setAgeTrackingSettings(settings); }
  catch { return NextResponse.json({ error: "Unable to save age tracking. Check that the server can write its private settings." }, { status: 500 }); }
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return NextResponse.json(settings, { headers: { "Cache-Control": "no-store" } });
}
