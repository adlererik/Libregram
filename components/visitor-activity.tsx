"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Only visible-page time is accumulated. No location permission, device GPS,
// localStorage activity log, third-party browser script, or heartbeat visit rows.
export function VisitorActivity() {
  const pathname = usePathname();
  const eligible = ["/", "/favorites", "/privacy", "/admin", "/admin/settings", "/admin/login"].includes(pathname) || /^\/s\/[A-Za-z0-9_-]{16}$/.test(pathname);
  useEffect(() => {
    if (!eligible) return;
    let token = "", cancelled = false, seconds = 0;
    let visibleSince = document.visibilityState === "visible" ? performance.now() : null;
    const total = () => Math.floor(seconds + (visibleSince === null ? 0 : (performance.now() - visibleSince) / 1000));
    const send = (beacon = false) => {
      if (!token) return;
      const body = JSON.stringify({ type: "heartbeat", token, seconds: total() });
      if (beacon && navigator.sendBeacon?.("/api/visitor-activity", new Blob([body], { type: "application/json" }))) return;
      void fetch("/api/visitor-activity", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    };
    const visibility = () => {
      if (visibleSince !== null) seconds += (performance.now() - visibleSince) / 1000;
      visibleSince = document.visibilityState === "visible" ? performance.now() : null;
      send(true);
    };
    const hide = () => { if (visibleSince !== null) seconds += (performance.now() - visibleSince) / 1000; visibleSince = null; send(true); };
    const show = () => { if (visibleSince === null && document.visibilityState === "visible") visibleSince = performance.now(); };
    void fetch("/api/visitor-activity", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "start" }), cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => { if (!cancelled && typeof data?.token === "string") { token = data.token; send(); } }).catch(() => {});
    const interval = setInterval(() => { if (document.visibilityState === "visible") send(); }, 20_000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide); window.addEventListener("pageshow", show);
    return () => { cancelled = true; hide(); clearInterval(interval); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", show); };
  }, [eligible]);
  return null;
}
