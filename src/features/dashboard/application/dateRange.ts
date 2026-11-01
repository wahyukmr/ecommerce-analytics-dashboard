import { DAY_MS } from "../../../constant";
import type { DashboardDateRangePreset } from "./types";

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function getDateParts(timestamp: number, timezone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);

  const result = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return {
    year: Number(result.year),
    month: Number(result.month),
    day: Number(result.day),
  };
}

function offsetFor(timestamp: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - timestamp;
}

function zonedStartOfDay(parts: DateParts, timezone: string): number {
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  let timestamp = localAsUtc;

  // Resolve the timezone offset against the candidate instant. A small fixed-point
  // iteration keeps this correct across DST transitions and zones with non-hour offsets.
  for (let iteration = 0; iteration < 3; iteration++) {
    const next = localAsUtc - offsetFor(timestamp, timezone);
    if (next === timestamp) return timestamp;
    timestamp = next;
  }

  return timestamp;
}

function addCalendarDays(parts: DateParts, days: number): DateParts {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day) + days * DAY_MS,
  );
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function resolveDashboardDateRange(
  preset: DashboardDateRangePreset,
  now: number,
  timezone: string,
): { from: number; to: number } | undefined {
  if (preset === "all") return undefined;

  const today = getDateParts(now, timezone);
  const todayStart = zonedStartOfDay(today, timezone);
  const tomorrowStart = zonedStartOfDay(addCalendarDays(today, 1), timezone);

  if (preset === "today") {
    return { from: todayStart, to: tomorrowStart - 1 };
  }

  if (preset === "last_7_days") {
    return {
      from: zonedStartOfDay(addCalendarDays(today, -6), timezone),
      to: tomorrowStart - 1,
    };
  }

  if (preset === "last_30_days") {
    return {
      from: zonedStartOfDay(addCalendarDays(today, -29), timezone),
      to: tomorrowStart - 1,
    };
  }

  const monthStart = zonedStartOfDay(
    { year: today.year, month: today.month, day: 1 },
    timezone,
  );
  const nextMonth =
    today.month === 12
      ? { year: today.year + 1, month: 1, day: 1 }
      : { year: today.year, month: today.month + 1, day: 1 };

  return {
    from: monthStart,
    to: zonedStartOfDay(nextMonth, timezone) - 1,
  };
}
