"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AgeTrackingSettings } from "@/lib/dates";

const Context = createContext<{ settings: AgeTrackingSettings; setSettings: (settings: AgeTrackingSettings) => void } | null>(null);

export function AgeTrackingProvider({ initialSettings, children }: { initialSettings: AgeTrackingSettings; children: React.ReactNode }) {
  const [settings, setSettings] = useState(initialSettings);
  useEffect(() => setSettings(initialSettings), [initialSettings.enabled, initialSettings.birthDate]);
  return <Context.Provider value={{ settings, setSettings }}>{children}</Context.Provider>;
}

export function useAgeTracking() {
  const context = useContext(Context);
  if (!context) throw new Error("AgeTrackingProvider is required.");
  return context;
}
