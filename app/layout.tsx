import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { FavoritesProvider } from "@/components/favorites-provider";
import { CastProvider } from "@/components/cast-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { themeBootstrap } from "@/lib/archive-theme";
import { VisitorActivity } from "@/components/visitor-activity";
import { getHeader } from "@/lib/settings";
import { AgeTrackingProvider } from "@/components/age-tracking-provider";
import { getAgeTrackingSettings } from "@/lib/age-tracking-settings";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-serif", display: "swap" });

// Read the installed site's title at request time, never from the build machine.
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const header = await getHeader();
  return { applicationName: "Libregram", title: header.title, description: header.description };
}

export const viewport: Viewport = {
  themeColor: "#070709",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const ageTracking = await getAgeTrackingSettings();
  const publicAgeTracking = { enabled: ageTracking.enabled, birthDate: ageTracking.enabled ? ageTracking.birthDate : "" };
  return (
    <html lang="en" data-theme="gold" suppressHydrationWarning>
      <body className={sans.variable + " " + serif.variable}><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /><VisitorActivity /><AgeTrackingProvider initialSettings={publicAgeTracking}><ThemeProvider><FavoritesProvider><CastProvider>{children}</CastProvider></FavoritesProvider></ThemeProvider></AgeTrackingProvider></body>
    </html>
  );
}
