export type Locale = "pt" | "en";

export type LocalizedString = string | { pt: string; en: string };

export type LocalizedStringList = string[] | { pt: string[]; en: string[] };

export function tx(value: LocalizedString | undefined, locale: Locale): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[locale] || value.pt;
}

export function txList(
  value: LocalizedStringList | undefined,
  locale: Locale,
): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return value[locale] || value.pt;
}
