"use client";
import { Apple, Globe2, MapPin, Monitor, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectedVisitorRegions, visitorStatisticsHref, VISITOR_REGIONS, VISITOR_REGION_COOKIE, type VisitorRegion } from "@/lib/visitor-regions";

export type VisitRow = { id: string; ip: string; city: string; country: string; region: string; latitude: number | null; longitude: number | null; locationSource: string; durationSeconds: number | null; lastSeenAt: string | null; device: string; os: string; browser: string; language: string; referrer: string; userAgent: string; createdAt: string };
export type VisitorStats = { visits: number; visitors: number; cities: number; posts: number; media: number; hearts: number };

function OsIcon({ os }: { os: string }) {
  if (/Windows/i.test(os)) return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><path d="M1 3.5 8.5 2.5v7H1zm9-1.2L19 1v8.5h-9zM1 11h7.5v7L1 17zm9 0h9v8.5l-9-1.2z" /></svg>;
  if (/Android/i.test(os)) return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="m7 3 2 3m8-3-2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M5 11a7 7 0 0 1 14 0Z" /><rect x="5" y="12" width="14" height="7" rx="2" /><rect x="2" y="11" width="2" height="8" rx="1" /><rect x="20" y="11" width="2" height="8" rx="1" /><rect x="8" y="18" width="2" height="4" rx="1" /><rect x="14" y="18" width="2" height="4" rx="1" /><circle cx="9" cy="8.5" r=".8" fill="var(--studio-panel)" /><circle cx="15" cy="8.5" r=".8" fill="var(--studio-panel)" /></svg>;
  if (/iOS|iPadOS|macOS/i.test(os)) return <Apple aria-hidden="true" className="h-4 w-4" />;
  if (/Linux/i.test(os)) return <span aria-hidden="true" className="text-base leading-none">🐧</span>;
  return <Monitor aria-hidden="true" className="h-4 w-4" />;
}

function countryInfo(value: string) {
  const code = value.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return null;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    if (!name || name === code) return null;
    return { name, flag: String.fromCodePoint(...[...code].map(letter => 127397 + letter.charCodeAt(0))) };
  } catch { return null; }
}

function VisitTime({ value }: { value: string }) {
  const [text, setText] = useState(value.replace("T", " ").replace(/\.\d{3}Z$/, " UTC"));
  useEffect(() => setText(new Date(value).toLocaleString()), [value]);
  return <time dateTime={value}>{text}</time>;
}

function VisitMap({ visit }: { visit: VisitRow }) {
  const [apple, setApple] = useState(false);
  useEffect(() => setApple(/Macintosh|Mac OS|iPhone|iPad|iPod/i.test(navigator.userAgent)), []);
  if (visit.latitude === null || visit.longitude === null || !Number.isFinite(visit.latitude) || !Number.isFinite(visit.longitude) || Math.abs(visit.latitude) > 90 || Math.abs(visit.longitude) > 180) return null;
  const point = visit.latitude + "," + visit.longitude;
  const url = apple ? "https://maps.apple.com/?ll=" + encodeURIComponent(point) + "&q=Estimated%20IP%20location" : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(point);
  return <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-studio-soft underline decoration-studio-accent/30 underline-offset-4" title={"Open estimated IP location in " + (apple ? "Apple Maps" : "Google Maps") + "; this is not the visitor's GPS position"}><MapPin aria-hidden="true" className="h-3 w-3" />Estimated location</a>;
}
function duration(value: number | null) {
  if (value === null) return "Not measured";
  if (value < 1) return "Under 1 sec";
  if (value < 60) return value + " sec";
  if (value < 3600) return Math.floor(value / 60) + " min " + value % 60 + " sec";
  return Math.floor(value / 3600) + " hr " + Math.floor(value % 3600 / 60) + " min";
}
export function VisitorStatsPanel({ visits, regions, geoProvider, stats, breakdown, page, pages }: { visits: VisitRow[]; regions: VisitorRegion[]; geoProvider: "local" | "ip2location"; stats: VisitorStats; breakdown: { device: string; count: number }[]; page: number; pages: number }) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<VisitRow | "all" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const [filtering, startFiltering] = useTransition();
  const world = regions.includes("world");
  function chooseRegion(region: VisitorRegion) {
    const next = region === "world" ? ["world"] : regions.includes(region) ? regions.filter(value => value !== region) : [...regions.filter(value => value !== "world"), region];
    const selected = selectedVisitorRegions(next);
    // This cookie holds only harmless display preferences, never visitor data.
    document.cookie = VISITOR_REGION_COOKIE + "=" + encodeURIComponent(selected.join(",")) + "; Path=/admin; SameSite=Lax; Max-Age=31536000" + (location.protocol === "https:" ? "; Secure" : "");
    setPendingDelete(null); setStatus("");
    startFiltering(() => router.replace(visitorStatisticsHref(selected), { scroll: false }));
  }
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pendingDelete) return;
    confirmation.current?.focus({ preventScroll: true });
    confirmation.current?.scrollIntoView({ block: "center" });
  }, [pendingDelete]);
  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true); setStatus("");
    try {
      const all = pendingDelete === "all";
      const response = await fetch("/api/admin/visitors", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(all ? { all: true } : { id: pendingDelete.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete visitor information");
      setPendingDelete(null); setStatus(all ? "Visit history deleted. New visits will continue to be recorded." : "Visitor record deleted."); router.refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to delete visitor information"); }
    finally { setDeleting(false); }
  }
  async function refreshLocations() {
    setLocating(true); setStatus(""); let updated = 0, fallback = 0;
    try {
      for (let offset = 0; offset < visits.length; offset += 5) {
        const response = await fetch("/api/admin/visitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: visits.slice(offset, offset + 5).map(visit => visit.id) }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to update locations");
        updated += result.updated; fallback += result.fallback;
        setStatus("Updating locations: " + Math.min(offset + 5, visits.length) + " of " + visits.length);
      }
      setStatus(updated + " visit locations updated." + (fallback ? " " + fallback + " kept their existing estimate because the free API was unavailable or its allowance was reached." : ""));
      router.refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to update locations"); router.refresh(); }
    finally { setLocating(false); }
  }
  return <section>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-editorial text-3xl">Visitor statistics</h2><div className="flex flex-wrap items-center gap-3"><button type="button" disabled={filtering} onClick={() => router.refresh()} className="flex min-h-11 items-center gap-2 text-sm text-studio-soft disabled:opacity-40"><RefreshCw aria-hidden="true" className="h-4 w-4" /> Refresh</button><button type="button" disabled={deleting || locating || filtering || !stats.visits} onClick={() => setPendingDelete("all")} className="flex min-h-11 items-center gap-2 rounded-full border border-studio-accent/30 px-4 text-sm text-studio-soft disabled:opacity-40"><Trash2 aria-hidden="true" className="h-4 w-4" /> Delete all visit history</button></div></div>
    <fieldset className="mt-5 border-t border-white/10 pt-3" disabled={filtering || deleting || locating} aria-describedby="visitor-region-help"><legend className="px-1 text-xs uppercase tracking-widest text-white/45">Show visitors from</legend><div className="flex flex-wrap gap-x-6 gap-y-1">{VISITOR_REGIONS.map(region => <label key={region.id} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-white/75"><input type="checkbox" className="peer sr-only" checked={regions.includes(region.id)} onChange={() => chooseRegion(region.id)} /><span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-studio-accent/50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-studio-accent peer-disabled:opacity-40"><span className={"h-2 w-2 rounded-full " + (regions.includes(region.id) ? "bg-studio-fill" : "bg-transparent")} /></span><span className="peer-disabled:opacity-40">{region.label}</span></label>)}</div><p id="visitor-region-help" className="mt-1 text-xs leading-relaxed text-white/45">Choose one or more regions. World shows all regions, including unknown locations. These choices filter visitor counts, device summaries and history; they do not block traffic or identify bots. Your selection is remembered in this browser.</p></fieldset>
    {pendingDelete ? <div ref={confirmation} tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-studio-accent/30 bg-studio-fill/5 p-4"><p className="text-sm text-white/80">{pendingDelete === "all" ? "Permanently delete all recorded visitor information, including regions hidden by this filter?" : "Permanently delete the visit from " + (pendingDelete.ip || "an unknown IP") + " on " + new Date(pendingDelete.createdAt).toLocaleString() + "?"} Posts, media, hearts, and archive settings will be kept.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={deleting} onClick={remove} className="min-h-11 rounded-full bg-studio-fill px-5 text-sm font-semibold disabled:opacity-50">{deleting ? "Deleting…" : "Confirm deletion"}</button><button type="button" disabled={deleting} onClick={() => setPendingDelete(null)} className="min-h-11 px-4 text-sm text-white/70">Cancel</button></div></div> : null}
    <p role="status" className="mt-3 text-sm text-studio-soft">{filtering ? "Applying region filter…" : status}</p>
    <p className="mt-2 text-sm leading-relaxed text-white/50">Only outside visitors are shown. Local network visits and visits recognized as the administrator are excluded. Records stay until you delete them. Locations and map pins are IP estimates, not the person's exact position.</p>
    {geoProvider === "ip2location" ? <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><p className="text-white/65">Libregram uses IP2Location.io <a className="text-studio-soft underline underline-offset-4" href="https://www.ip2location.io" target="_blank" rel="noopener noreferrer">IP geolocation</a> web service, with a local fallback.</p><button type="button" onClick={() => void refreshLocations()} disabled={locating || deleting || filtering || !visits.length} className="inline-flex min-h-11 items-center gap-2 text-studio-soft disabled:opacity-40"><RefreshCw aria-hidden="true" className={"h-4 w-4 " + (locating ? "animate-spin" : "")} />{locating ? "Updating locations…" : "Update locations on this page"}</button></div> : <p className="mt-3 text-sm text-white/55">Local GeoIP estimates. To enable the free IP2Location.io API, see Visitor history & privacy in Info & documentation.</p>}
    <div className="my-6 grid grid-cols-2 gap-3 md:grid-cols-3">{Object.entries(stats).map(([name, value]) => <div key={name} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><p className="text-xs uppercase tracking-widest text-white/45">{name === "visitors" ? "Browser identities" : name === "cities" ? "Identified cities" : name}</p><p className="mt-2 font-editorial text-4xl text-studio-soft">{value.toLocaleString()}</p></div>)}</div>
    <div className="mb-6 flex flex-wrap gap-3">{breakdown.map(row => <span key={row.device} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/65">{row.device}: {row.count}</span>)}</div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm text-white/70">Visit history · newest first</h3><nav className="flex items-center gap-4 text-sm" aria-label="Visitor history pages">{page > 1 ? <Link href={visitorStatisticsHref(regions, page - 1)} className="inline-flex min-h-11 items-center text-studio-soft">Newer</Link> : null}<span className="text-white/50">Page {page} of {pages}</span>{page < pages ? <Link href={visitorStatisticsHref(regions, page + 1)} className="inline-flex min-h-11 items-center text-studio-soft">Older</Link> : null}</nav></div>
    <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-white/[.04] text-white/45"><tr>{["Time", "IP address", "Country / estimated city", "Visible stay", "Device / OS", "Browser", "Details", "Delete"].map(label => <th key={label} className="p-3 font-normal">{label}</th>)}</tr></thead><tbody>{visits.map(v => {
      const country = countryInfo(v.country);
      return <tr key={v.id} className="border-t border-white/10 align-top text-white/75"><td className="whitespace-nowrap p-3"><VisitTime value={v.createdAt} /></td><td className="p-3 font-mono text-xs"><span className="break-all">{v.ip || "Not recorded"}</span></td><td className="p-3"><div className="flex items-center gap-2">{country ? <span role="img" aria-label={country.name + " flag"} className="text-lg leading-none">{country.flag}</span> : <Globe2 aria-hidden="true" className="h-4 w-4" />}<span>{country?.name || v.country || "Location unavailable"}</span></div><p className="mt-1 text-xs text-white/55">{v.city || "City unavailable"}{v.region ? " · " + v.region : ""}</p><p className="mt-1 text-[11px] text-white/40">{v.locationSource === "ip2location" ? "IP2Location.io estimate" : v.locationSource === "local" ? "Local estimate" : v.locationSource === "unavailable" ? "Location unavailable" : "Historical estimate"}</p><VisitMap visit={v} /></td><td className="whitespace-nowrap p-3" title="Estimated time while the page was visible; not verified attention">{duration(v.durationSeconds)}{v.lastSeenAt && <p className="mt-1 text-xs text-white/40">Last update <VisitTime value={v.lastSeenAt} /></p>}</td><td className="p-3"><div className="flex items-center gap-2 text-studio-soft"><OsIcon os={v.os} /><span className="whitespace-nowrap">{v.os}</span></div><p className="mt-1 text-xs text-white/45">{v.device}</p></td><td className="p-3">{v.browser}</td><td className="max-w-xs p-3"><details><summary className="cursor-pointer text-studio-soft">Browser report</summary><p className="mt-2 break-words text-xs">Language: {v.language || "Unknown"}<br />Referrer: {v.referrer}<br />{v.userAgent}</p></details></td><td className="p-3"><button type="button" disabled={deleting || locating || filtering} onClick={() => { setPendingDelete(v); setStatus(""); }} className="gallery-icon-button" aria-label={"Delete visit from " + (v.ip || "unknown IP")} title="Delete this visit"><Trash2 aria-hidden="true" className="h-4 w-4" /></button></td></tr>;
    })}</tbody></table>{!visits.length ? <p className="p-6 text-sm text-white/50">{world ? "No recorded outside visits." : "No outside visits match the selected regions. Choose another region or World to see more."}</p> : null}</div>
    <p className="mt-4 text-xs leading-relaxed text-white/40">IPs are visible only to the administrator. Your recognized browser and public IP addresses are excluded after you sign in; past matching records are hidden too. A new browser or changed address cannot be identified until you sign in. Visible stay is a browser estimate updated about every 20 seconds and on leaving; blocked scripts, closed connections and multiple tabs can affect it. Earlier durations cannot be reconstructed. VPNs, proxies, and mobile networks can report a different location. OS and device labels come from browser reports. Previously deleted records and IPs cannot be reconstructed.</p>
  </section>;
}
