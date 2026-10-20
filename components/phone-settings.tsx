"use client";

import { Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminPhoneSettings } from "@/scripts/phone-settings.mjs";

export function PhoneSettingsPanel({ initialSettings }: { initialSettings: AdminPhoneSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const router = useRouter();
  useEffect(() => { setSettings(initialSettings); setPin(""); setConfirmation(""); }, [initialSettings]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pin !== confirmation) { setStatus("The two PIN entries don't match."); return; }
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/admin/phone", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: settings.enabled, url: settings.url, pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save phone settings.");
      setSettings(data); setPin(""); setConfirmation("");
      setStatus(data.enabled ? "Saved. The phone icon now asks for the PIN every time." : "Saved. The phone icon is hidden.");
      router.refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to save phone settings."); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
    <div className="flex items-center gap-3"><Phone aria-hidden="true" className="h-5 w-5 text-studio-accent" strokeWidth={1.6} /><h2 className="font-editorial text-3xl">Phone shortcut</h2></div>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">Add an optional handset to the gallery. Every tap opens a fresh PIN keypad before continuing to your chosen web phone.</p>
    <form onSubmit={save} autoComplete="off" className="mt-6 max-w-xl space-y-5">
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
        <legend className="sr-only">Phone shortcut preferences</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-white/80"><input type="checkbox" checked={settings.enabled} onChange={event => { setSettings({ ...settings, enabled: event.target.checked }); setStatus(""); }} className="h-4 w-4 accent-studio-accent" />Show the phone icon</label>
        <label className="block text-sm text-white/70">Destination URL<input type="text" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} required={settings.enabled} maxLength={2048} value={settings.url} onChange={event => { setSettings({ ...settings, url: event.target.value }); setStatus(""); }} aria-describedby="phone-url-help" placeholder="https://your-site.example/com" className="studio-input mt-2 block min-h-12 w-full rounded-xl border border-white/15 px-4 py-3 text-white" /></label>
        <p id="phone-url-help" className="text-xs leading-relaxed text-white/50">Use a complete HTTP/HTTPS address, or /com for a phone on this gallery's hostname.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm text-white/70">{settings.hasPin ? "New PIN" : "PIN"}<input type="password" inputMode="numeric" autoComplete="new-password" required={settings.enabled && !settings.hasPin} minLength={4} maxLength={12} pattern="[0-9]{4,12}" value={pin} onChange={event => { setPin(event.target.value.replace(/[^0-9]/g, "")); setStatus(""); }} aria-describedby="phone-pin-help" className="studio-input mt-2 block min-h-12 w-full rounded-xl border border-white/15 px-4 py-3 text-white" /></label>
          <label className="block text-sm text-white/70">Confirm PIN<input type="password" inputMode="numeric" autoComplete="new-password" required={Boolean(pin)} minLength={4} maxLength={12} pattern="[0-9]{4,12}" value={confirmation} onChange={event => { setConfirmation(event.target.value.replace(/[^0-9]/g, "")); setStatus(""); }} className="studio-input mt-2 block min-h-12 w-full rounded-xl border border-white/15 px-4 py-3 text-white" /></label>
        </div>
        <p id="phone-pin-help" className="text-xs leading-relaxed text-white/50">Choose 4–12 digits. {settings.hasPin ? "A PIN is already set. Leave both PIN fields empty to keep it, or enter a new PIN to replace it." : "Set your own PIN before showing the icon."} There is no remembered unlock, including for administrators.</p>
        <button type="submit" className="min-h-11 rounded-full bg-studio-fill px-5 text-sm font-semibold text-black">{busy ? "Saving…" : "Save phone settings"}</button>
      </fieldset>
      <p role="status" className="text-sm text-studio-soft">{status}</p>
      <p className="text-xs leading-relaxed text-white/45">This PIN controls the gallery shortcut. Your phone application's own login, calls, chat, and direct URL access stay as configured in that application.</p>
    </form>
  </section>;
}
