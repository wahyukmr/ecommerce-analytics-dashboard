const numberFormatterCache = new Map<string, Intl.NumberFormat>();
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getNumberFormatter(
  cacheName: string,
  locale: string,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const cacheKey = `${cacheName}:${locale}:${JSON.stringify(options ?? {})}`;

  let formatter = numberFormatterCache.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatterCache.set(cacheKey, formatter);
  }

  return formatter;
}

function getDateFormatter(
  cacheName: string,
  locale: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const cacheKey = `${cacheName}:${locale}:${timezone}:${JSON.stringify(
    options,
  )}`;

  let formatter = dateFormatterCache.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: timezone,
    });

    dateFormatterCache.set(cacheKey, formatter);
  }

  return formatter;
}

export function formatNumber(num: number | null, locale: string): string {
  if (num === null) return "-";

  return getNumberFormatter("number", locale).format(num);
}

export function formatCurrency(
  amount: number | null,
  locale: string,
  currency: string,
): string {
  if (amount === null) return "-";

  return getNumberFormatter("currency", locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(amount);
}

export function formatPercent(amount: number | null, locale: string): string {
  if (amount === null) return "-";

  return getNumberFormatter("percent", locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDecimal(amount: number | null, locale: string): string {
  if (amount === null) return "-";

  return getNumberFormatter("decimal", locale, {
    style: "decimal",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatAxis(amount: number | null, locale: string): string {
  if (amount === null) return "-";

  return getNumberFormatter("axis", locale, {
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateKey(timestamp: number, timezone: string): string {
  return getDateFormatter("date-key", "en-CA", timezone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

export function formatChartDate(
  date: string | number | null | undefined,
  locale: string,
  timezone: string,
): string {
  if (date === null || date === undefined || date === "") return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(date);
  }

  try {
    return getDateFormatter(
      "chart-date",
      locale || "en-US",
      timezone || "UTC",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    ).format(parsedDate);
  } catch {
    return parsedDate.toLocaleDateString(locale || "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

export function formatDisplayName(category: string): string {
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
