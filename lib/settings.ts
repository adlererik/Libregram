import { prisma } from "./prisma";
import { cache } from "react";

export const defaultHeader = { title: "Libregram", eyebrow: "Private collection", description: "A continuous preservation of the moments that made a life." };
export type HeaderSettings = typeof defaultHeader;
export const getHeader = cache(async (): Promise<HeaderSettings> => {
  const header = await prisma.siteSettings.findUnique({ where: { id: "site" } });
  if (!header) return defaultHeader;
  // Upgrade only the previous product default; keep an owner's custom title.
  return { ...header, title: ["The Archive", "The-Archive"].includes(header.title) ? defaultHeader.title : header.title };
});
