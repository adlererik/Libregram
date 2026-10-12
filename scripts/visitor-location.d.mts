export type VisitorLocation = { city: string; region: string; country: string; latitude: number | null; longitude: number | null; locationSource: string };
export function isPublicAddress(ip: string): boolean;
export function usesIP2Location(): boolean;
export function localVisitorLocation(ip: string): VisitorLocation;
export function visitorLocation(ip: string): Promise<VisitorLocation>;
