import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { cache } from "react";
import { isValidBirthDate, type AgeTrackingSettings } from "./dates";

const settingsPath = () => path.join(process.cwd(), ".runtime", "age-tracking.json");
const disabled = (): AgeTrackingSettings => ({ enabled: false, birthDate: "" });

export const getAgeTrackingSettings = cache(async (): Promise<AgeTrackingSettings> => {
  try {
    const settings = JSON.parse(await readFile(settingsPath(), "utf8"));
    if (typeof settings?.enabled !== "boolean" || typeof settings.birthDate !== "string") return disabled();
    if (settings.birthDate && !isValidBirthDate(settings.birthDate)) return disabled();
    return { enabled: settings.enabled && Boolean(settings.birthDate), birthDate: settings.birthDate };
  } catch (error) {
    // Only installations without saved settings use the legacy bootstrap.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") return disabled();
    const legacy = process.env.NEXT_PUBLIC_BIRTH_DATE?.trim() || "";
    return isValidBirthDate(legacy) ? { enabled: true, birthDate: legacy } : disabled();
  }
});

export async function setAgeTrackingSettings(settings: AgeTrackingSettings) {
  const destination = settingsPath();
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  const temporary = destination + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, JSON.stringify(settings) + "\n", { mode: 0o600, flag: "wx" });
    await rename(temporary, destination);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
