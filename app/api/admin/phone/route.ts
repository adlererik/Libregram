import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, isValidSession } from "@/lib/auth";
import { normalizePhoneUrl, readPhoneSettings, savePhoneSettings, validPhonePin } from "@/scripts/phone-settings.mjs";

const headers = { "Cache-Control": "no-store, private" };
export async function PATCH(request: NextRequest) {
  if (!await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site" || new URL(request.headers.get("origin") || "").host !== request.headers.get("host")) throw new Error();
  } catch { return NextResponse.json({ error: "Open your own gallery settings to make this change." }, { status: 403, headers }); }
  let data;
  try {
    if (Number(request.headers.get("content-length")) > 4096) throw new Error();
    const body = await request.text();
    if (body.length > 4096) throw new Error();
    data = JSON.parse(body);
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400, headers }); }
  const { enabled, url, pin = "" } = data || {};
  if (typeof enabled !== "boolean" || typeof url !== "string" || url.length > 2048 || typeof pin !== "string" || (pin && !validPhonePin(pin))) {
    return NextResponse.json({ error: "Choose a PIN containing 4 to 12 digits and enter a valid web address." }, { status: 400, headers });
  }
  if ((url.trim() && !normalizePhoneUrl(url)) || (enabled && !url.trim())) return NextResponse.json({ error: "Enter an HTTP/HTTPS address, or a path such as /com." }, { status: 400, headers });
  if (enabled && !pin && !(await readPhoneSettings()).pinHash) return NextResponse.json({ error: "Set a PIN before enabling the phone shortcut." }, { status: 400, headers });
  try {
    const settings = await savePhoneSettings({ enabled, url, pin });
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return NextResponse.json(settings, { headers });
  } catch { return NextResponse.json({ error: "Unable to save phone settings. Check that the server can write its private settings." }, { status: 500, headers }); }
}
