"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ageAt, localDateTime, type AgeTrackingSettings } from "@/lib/dates";
import { useAgeTracking } from "./age-tracking-provider";

export function AgeTrackingSettingsPanel({ initialSettings }: { initialSettings: AgeTrackingSettings }) {
  const { setSettings } = useAgeTracking();
  const [fields, setFields] = useState(initialSettings);
  const [today, setToday] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const router = useRouter();
  useEffect(() => setFields(initialSettings), [initialSettings]);
  useEffect(() => setToday(localDateTime().slice(0, 10)), []);
  const ageToday = today ? ageAt(today + "T12:00:00", fields.birthDate) : null;

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/admin/age-tracking", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save age tracking");
      setSettings({ enabled: data.enabled, birthDate: data.enabled ? data.birthDate : "" });
      setFields(data);
      setStatus(data.enabled ? "Age tracking saved. The feed and viewer now use this birthday." : "Age tracking saved. Age labels are hidden.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save age tracking");
    } finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
    <h2 className="font-editorial text-3xl">Age tracking</h2>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">Enter the date of birth of the person this gallery tracks. Each memory shows their age when that photo or video was taken, rather than their age today.</p>
    <form onSubmit={save} className="mt-6 max-w-lg space-y-5">
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
        <legend className="sr-only">Age tracking preferences</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-white/80"><input type="checkbox" checked={fields.enabled} onChange={event => { setFields({ ...fields, enabled: event.target.checked }); setStatus(""); }} className="h-4 w-4 accent-studio-accent" />Show age on memories</label>
        <label className="block text-sm text-white/70">Date of birth<input type="date" required={fields.enabled} value={fields.birthDate} max={today || undefined} onChange={event => { setFields({ ...fields, birthDate: event.target.value }); setStatus(""); }} aria-describedby="age-tracking-help" className="studio-input mt-2 block min-h-12 w-full rounded-xl border border-white/15 px-4 py-3 text-white" /></label>
        <p id="age-tracking-help" className="text-xs leading-relaxed text-white/55">Use the birthday, not a fixed age, so labels stay correct as time passes. One person is tracked across the gallery. Save to apply changes immediately.</p>
        <p className="text-xs leading-relaxed text-white/45">While age tracking is enabled, the birthday is available to gallery visitors.</p>
        {ageToday !== null ? <p className="text-sm text-studio-soft">Age today: <strong>{ageToday}</strong></p> : null}
        <button type="submit" className="min-h-11 rounded-full bg-studio-fill px-5 text-sm font-semibold text-black">{busy ? "Saving…" : "Save age tracking"}</button>
      </fieldset>
      <p role="status" className="text-sm text-studio-soft">{status}</p>
    </form>
  </section>;
}
