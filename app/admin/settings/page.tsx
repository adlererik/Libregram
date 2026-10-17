import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";
import { AdminConsole } from "@/components/admin-console";
import { AdminShell } from "@/components/admin-shell";
import { ADMIN_COOKIE, getAdminAccount, isValidSession } from "@/lib/auth";
import { getAdminAuthSettings } from "@/lib/admin-auth-settings";
import { prisma } from "@/lib/prisma";
import { getHeader } from "@/lib/settings";
import { visitorFilter } from "@/lib/visitor-filter";
import { selectedVisitorRegions, visitorRegionCountries, VISITOR_REGION_COOKIE } from "@/lib/visitor-regions";
import { usesIP2Location } from "@/scripts/visitor-location.mjs";
import { getAgeTrackingSettings } from "@/lib/age-tracking-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ visitsPage?: string; visitsRegions?: string | string[] }> }) {
  const jar = await cookies();
  if (!await isValidSession(jar.get(ADMIN_COOKIE)?.value)) redirect("/admin/login");
  const params = await searchParams;
  const regions = selectedVisitorRegions(params.visitsRegions ?? jar.get(VISITOR_REGION_COOKIE)?.value);
  const countries = visitorRegionCountries(regions);
  const where = { AND: [await visitorFilter(), ...(countries ? [{ country: { in: countries } }] : [])] };
  const [account, adminAuth, header, ageTracking, visitCount, visitors, cities, posts, media, hearts, devices, documents] = await Promise.all([
    getAdminAccount(), getAdminAuthSettings(), getHeader(), getAgeTrackingSettings(), prisma.visit.count({ where }),
    prisma.visit.groupBy({ by: ["visitorKey"], where }),
    prisma.visit.groupBy({ by: ["city", "country"], where: { AND: [where, { city: { not: "" } }] } }),
    prisma.post.count(), prisma.mediaItem.count(), prisma.postLike.count(),
    prisma.visit.groupBy({ by: ["device"], where, _count: { _all: true } }),
    Promise.all([{ title: "Carousel editing, soundtracks & themes", file: "CAROUSELS-SOUNDTRACKS-THEMES.md" }, { title: "Beginner setup — step by step", file: "BEGINNER-GUIDE.md" }, { title: "All features", file: "FEATURES.md" }, { title: "Sharing media & compilations", file: "SHARING.md" }, { title: "Visitor history & privacy", file: "VISITOR-STATS.md" }, { title: "Cloudflare HTTPS & custom domains", file: "CLOUDFLARE.md" }, { title: "Public installation & deployment", file: "PUBLIC-SETUP.md" }, { title: "Operations & server migration", file: "OPERATIONS.md" }, { title: "Libregram rename & upgrade", file: "RENAMING.md" }, { title: "Login and administration", file: "ADMIN.md" }, { title: "Favorites, Google Cast & AirPlay", file: "FAVORITES-CASTING.md" }, { title: "Architecture", file: "ARCHITECTURE.md" }, { title: "Development notes — Erik Adler", file: "CHANGELOG.md" }].map(async doc => ({ title: doc.title, content: await readFile(path.join(process.cwd(), "docs", doc.file), "utf8").catch(() => "Documentation file is missing from docs/. Include that folder when moving the archive.") }))),
  ]);
  const requested = Number(params.visitsPage || 1);
  const visitPages = Math.max(1, Math.ceil(visitCount / 50));
  const visitPage = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, visitPages) : 1;
  const visits = await prisma.visit.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (visitPage - 1) * 50, take: 50, select: { id: true, ip: true, city: true, country: true, region: true, latitude: true, longitude: true, locationSource: true, durationSeconds: true, lastSeenAt: true, device: true, os: true, browser: true, language: true, referrer: true, userAgent: true, createdAt: true } });
  return <AdminShell title="Libregram settings" description="Visitor history, gallery details, login settings, and your archive handbook." current="settings"><AdminConsole username={account.username} adminAuth={adminAuth} header={header} ageTracking={ageTracking} visits={visits.map(v => ({ ...v, createdAt: v.createdAt.toISOString(), lastSeenAt: v.lastSeenAt?.toISOString() || null }))} regions={regions} geoProvider={usesIP2Location() ? "ip2location" : "local"} stats={{ visits: visitCount, visitors: visitors.length, cities: cities.length, posts, media, hearts }} visitPage={visitPage} visitPages={visitPages} breakdown={devices.map(d => ({ device: d.device, count: d._count._all }))} documents={documents} /></AdminShell>;
}
