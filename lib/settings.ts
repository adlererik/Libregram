import { prisma } from "./prisma";
import { cache } from "react";

export const defaultHeader = { title: "The Archive", eyebrow: "Private collection", description: "A continuous preservation of the moments that made a life." };
export type HeaderSettings = typeof defaultHeader;
export const getHeader = cache(async (): Promise<HeaderSettings> => {
  return await prisma.siteSettings.findUnique({ where: { id: "site" } }) || defaultHeader;
});
