export interface UserLocaleInfo {
  locale: string;

  // Browser / detected timezone
  userTimezone: string;

  // Business timezone: Used for analytics bucketing.
  workspaceTimezone: string;

  // Business currency.
  workspaceCurrency: string;

  // Business locale.
  workspaceLocale: string;
}

const defaultCurrencyMap: Record<string, string> = {
  ID: "IDR",
  US: "USD",
  GB: "GBP",
  JP: "JPY",
  CN: "CNY",
  DE: "EUR",
  FR: "EUR",
  AU: "AUD",
  CA: "CAD",
  SG: "SGD",
  MY: "MYR",
};

const languageToCountryMap: Record<string, string> = {
  id: "ID",
  en: "US",
  ja: "JP",
  zh: "CN",
  de: "DE",
  fr: "FR",
  ms: "MY",
};

export function normalizeLocale(locale: string): string {
  try {
    const parsed = new Intl.Locale(locale);

    if (parsed.region) return parsed.toString();

    const fallbackRegion = languageToCountryMap[parsed.language];

    if (!fallbackRegion) return parsed.toString();

    return `${parsed.language}-${fallbackRegion}`;
  } catch {
    return "en-US";
  }
}

export function getDefaultCurrencyFromLocale(locale: string): string {
  const normalizedLocale = normalizeLocale(locale);

  try {
    const region = new Intl.Locale(normalizedLocale).region;

    return region && defaultCurrencyMap[region]
      ? defaultCurrencyMap[region]
      : "USD";
  } catch {
    return "USD";
  }
}

export function detectUserLocale(): UserLocaleInfo {
  let locale = "en-US";
  let timezone = "UTC";

  try {
    if (typeof navigator !== "undefined" && navigator.language) {
      locale = normalizeLocale(navigator.language);
    } else if (typeof Intl !== "undefined") {
      locale = normalizeLocale(Intl.DateTimeFormat().resolvedOptions().locale);
    }

    if (typeof Intl !== "undefined") {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    }
  } catch (err) {
    console.error("Locale detection failed:", err);
  }

  return {
    locale,
    userTimezone: timezone,
    workspaceTimezone: "Asia/Jakarta",
    workspaceCurrency: getDefaultCurrencyFromLocale("id-ID"),
    workspaceLocale: "id-ID",
  };
}
