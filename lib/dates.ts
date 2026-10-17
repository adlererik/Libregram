export const birthDate = process.env.NEXT_PUBLIC_BIRTH_DATE?.trim() || "";

export function ageAt(timestamp: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const born = new Date(birthDate + "T00:00:00Z");
  const date = new Date(timestamp);
  if (!Number.isFinite(born.getTime()) || born.toISOString().slice(0, 10) !== birthDate || !Number.isFinite(date.getTime())) return null;
  // The birthday is a calendar date, not a moment that shifts with time zones.
  // Compare with the same local calendar date displayed beside the age label.
  let age = date.getFullYear() - born.getUTCFullYear();
  if (date.getMonth() < born.getUTCMonth() || (date.getMonth() === born.getUTCMonth() && date.getDate() < born.getUTCDate())) age--;
  return Math.max(0, age);
}

export function localDateTime(timestamp = new Date().toISOString()) {
  const date = new Date(timestamp);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
