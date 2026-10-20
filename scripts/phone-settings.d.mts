export type PhoneSettings = { enabled: boolean; url: string; pinHash: string };
export type AdminPhoneSettings = { enabled: boolean; url: string; hasPin: boolean };
export function validPhonePin(value: unknown): value is string;
export function normalizePhoneUrl(value: unknown): string | null;
export function readPhoneSettings(): Promise<PhoneSettings>;
export function phoneSettingsForAdmin(settings: PhoneSettings): AdminPhoneSettings;
export function savePhoneSettings(fields: { enabled: boolean; url: string; pin: string }): Promise<AdminPhoneSettings>;
export function phonePinMatches(pin: unknown, hash: string): Promise<boolean>;
