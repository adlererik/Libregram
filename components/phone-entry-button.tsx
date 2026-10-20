"use client";

import { ArrowUpRight, Delete, LoaderCircle, Phone, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { useModal } from "@/lib/use-modal";

export function PhoneEntryButton() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === "hidden") close(); };
    window.addEventListener("pagehide", close);
    window.addEventListener("pageshow", close);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("pagehide", close);
      window.removeEventListener("pageshow", close);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [close]);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="gallery-icon-button" aria-label="Open PIN keypad" title="Enter PIN" aria-haspopup="dialog" aria-expanded={open}><Phone aria-hidden="true" className="h-5 w-5" strokeWidth={1.6} /></button>
    {open ? createPortal(<PhoneKeypad onClose={close} />, document.body) : null}
  </>;
}

const keys = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"]];

function PhoneKeypad({ onClose }: { onClose: () => void }) {
  const modal = useModal(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const [pin, setPin] = useState("");
  const [showLast, setShowLast] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryUntil, setRetryUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const request = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const maskedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { request.current?.abort(); if (maskedTimer.current) clearTimeout(maskedTimer.current); }, []);
  useEffect(() => {
    if (!retryUntil) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) setRetryUntil(0);
    };
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [retryUntil]);

  function clear() {
    setPin(""); setShowLast(false);
    if (maskedTimer.current) clearTimeout(maskedTimer.current);
  }
  function digit(value: string) {
    if (pending.current || remaining || pin.length >= 12) return;
    setPin(current => (current + value).slice(0, 12)); setError(""); setShowLast(true);
    if (maskedTimer.current) clearTimeout(maskedTimer.current);
    maskedTimer.current = setTimeout(() => setShowLast(false), 650);
  }
  function backspace() {
    if (pending.current || remaining) return;
    setPin(current => current.slice(0, -1)); setShowLast(false); setError("");
    if (maskedTimer.current) clearTimeout(maskedTimer.current);
  }
  async function unlock() {
    if (pending.current || remaining || pin.length < 4) return;
    const entered = pin;
    pending.current = true; setBusy(true); setError(""); clear();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch("/api/phone-entry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: entered }), cache: "no-store", credentials: "omit", signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        const seconds = Math.min(900, Math.max(0, Number(data.retryAfter) || 0));
        if (seconds) { setRemaining(Math.ceil(seconds)); setRetryUntil(Date.now() + seconds * 1000); }
        throw new Error(data.error || "Unable to continue. Please try again.");
      }
      if (typeof data.url !== "string") throw new Error("The destination is unavailable.");
      const destination = new URL(data.url, window.location.origin);
      if (!["http:", "https:"].includes(destination.protocol) || destination.username || destination.password) throw new Error("The destination is unavailable.");
      // Close before navigating so returning through browser history restores
      // the locked gallery, including when the browser uses its page cache.
      flushSync(onClose);
      window.location.assign(destination.href);
    } catch (failure) {
      if (controller.signal.aborted) {
        if (request.current === controller) setError("The request timed out. Please enter your PIN again.");
      } else setError(failure instanceof Error ? failure.message : "Unable to continue. Please try again.");
    } finally {
      clearTimeout(timeout);
      pending.current = false;
      setBusy(false);
    }
  }

  return <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/65 backdrop-blur-md" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="flex min-h-full items-center justify-center p-4" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={modal} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} className="phone-keypad studio-panel relative w-full max-w-sm rounded-[2rem] border border-white/15 p-6 shadow-2xl outline-none sm:p-7" onKeyDown={event => {
        if (event.ctrlKey || event.altKey || event.metaKey) return;
        if (/^[0-9]$/.test(event.key)) { event.preventDefault(); digit(event.key); }
        else if (event.key === "Backspace") { event.preventDefault(); backspace(); }
        else if (event.key === "Delete") { event.preventDefault(); if (!pending.current) clear(); }
        else if (event.key === "Enter" && event.target === event.currentTarget) { event.preventDefault(); void unlock(); }
      }}>
        <button type="button" onClick={onClose} aria-label="Close keypad" className="gallery-icon-button absolute right-3 top-3"><X aria-hidden="true" className="h-4 w-4" strokeWidth={1.6} /></button>
        <div className="text-center">
          <div className="phone-keypad-badge mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-studio-accent/20 text-studio-accent"><Phone aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} /></div>
          <p className="mt-4 text-[9px] font-semibold uppercase tracking-[.28em] text-studio-accent">Private access</p>
          <h2 id={titleId} className="sr-only">Enter PIN</h2>
          <p id={descriptionId} className="mt-2 text-xs leading-relaxed text-white/55">Tap the keys below to enter your PIN.</p>
        </div>
        <div className="studio-input mt-5 flex h-[68px] items-center justify-center rounded-2xl border border-white/10 px-2 shadow-inner">
          <div aria-hidden="true" className="flex items-center justify-center gap-1.5 sm:gap-2.5">
            {Array.from({ length: Math.max(4, pin.length) }, (_, index) => <span key={index} className="grid h-6 w-3 place-items-center text-lg font-medium tabular-nums text-studio-soft">{index < pin.length ? showLast && index === pin.length - 1 ? pin[index] : <span className="h-2 w-2 rounded-full bg-studio-soft" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/20" />}</span>)}
          </div>
          <span role="status" aria-live="polite" className="sr-only">{pin.length} digits entered</span>
        </div>
        <fieldset disabled={busy || remaining > 0} className="mt-5 grid grid-cols-3 gap-2.5 disabled:opacity-45">
          <legend className="sr-only">PIN keypad</legend>
          {keys.map(([value, letters]) => <button key={value} type="button" onClick={() => digit(value)} aria-label={value} className="phone-keypad-key flex h-14 flex-col items-center justify-center rounded-2xl border border-white/10 sm:h-16"><span aria-hidden="true" className="text-[25px] font-normal leading-7 tabular-nums">{value}</span><span aria-hidden="true" className="mt-0.5 h-2.5 text-[8px] font-medium leading-none tracking-[.22em] text-white/40">{letters}</span></button>)}
          <button type="button" onClick={() => { clear(); setError(""); }} aria-label="Clear PIN" className="phone-keypad-key grid h-14 place-items-center rounded-2xl border border-white/10 text-[10px] font-semibold uppercase tracking-[.14em] text-white/55 sm:h-16">Clear</button>
          <button type="button" onClick={() => digit("0")} aria-label="0" className="phone-keypad-key grid h-14 place-items-center rounded-2xl border border-white/10 text-[25px] font-normal tabular-nums sm:h-16">0</button>
          <button type="button" onClick={backspace} aria-label="Delete last digit" className="phone-keypad-key grid h-14 place-items-center rounded-2xl border border-white/10 text-white/60 sm:h-16"><Delete aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} /></button>
        </fieldset>
        <button type="button" onClick={() => void unlock()} disabled={busy || remaining > 0 || pin.length < 4} className="phone-keypad-submit mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-studio-fill px-4 text-sm font-semibold transition-opacity disabled:opacity-40">{busy ? <><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />Checking PIN…</> : remaining ? <>Try again in {remaining}s</> : <>Continue<ArrowUpRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} /></>}</button>
        <div className="mt-3 min-h-5 text-center text-xs leading-relaxed" aria-live="polite">{error ? <p role="alert" className="text-studio-soft">{error}</p> : null}</div>
      </div>
    </div>
  </div>;
}
