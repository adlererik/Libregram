// Country-level display groups, not traffic blocking or bot detection.
// M49: https://unstats.un.org/unsd/methodology/m49/
// Western Europe includes the owner's requested Nordic/UK/Irish/southern group;
// Scandinavia is the owner's five-country group, also included in Western Europe.
// Asia also recognizes the TW country code returned by GeoIP providers.
export const VISITOR_REGIONS = [
  { id: "western-europe", label: "Western Europe", countries: "AD AT AX BE CH DE DK ES FI FO FR GB GG GI IE IM IS IT JE LI LU MC MT NL NO PT SE SJ SM VA".split(" ") },
  { id: "scandinavia", label: "Scandinavia", countries: "DK NO SE FI IS".split(" ") },
  { id: "north-america", label: "North America", countries: "AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI".split(" ") },
  { id: "south-america", label: "South America", countries: "AR BO BR BV CL CO EC FK GF GS GY PE PY SR UY VE".split(" ") },
  { id: "asia", label: "Asia", countries: "AE AF AM AZ BD BH BN BT CN CY GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE".split(" ") },
  { id: "world", label: "World", countries: [] as string[] },
] as const;
export type VisitorRegion = (typeof VISITOR_REGIONS)[number]["id"];
export const VISITOR_REGION_COOKIE = "archive_visitor_regions";

export function selectedVisitorRegions(value?: string | string[]): VisitorRegion[] {
  const raw = (Array.isArray(value) ? value : [value || "world"]).flatMap(part => part.split(","));
  if (raw.includes("world")) return ["world"];
  const selected = VISITOR_REGIONS.filter(region => raw.includes(region.id)).map(region => region.id);
  return selected.length ? selected : ["world"];
}

export function visitorRegionCountries(regions: VisitorRegion[]): string[] | null {
  if (regions.includes("world")) return null;
  return [...new Set(VISITOR_REGIONS.filter(region => regions.includes(region.id)).flatMap(region => region.countries))];
}

export function visitorStatisticsHref(regions: VisitorRegion[], page = 1) {
  const params = new URLSearchParams();
  params.set("visitsRegions", selectedVisitorRegions(regions).join(","));
  if (page > 1) params.set("visitsPage", String(page));
  return "/admin/settings?" + params.toString();
}
