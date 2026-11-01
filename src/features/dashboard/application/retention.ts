import { formatDateKey } from "../../../libs";
import type { PurchaseCohort } from "../../../analytics/engine/AnalyticsState";
import type { RetentionData, RetentionCohortRow } from "./types";
import { DAY_MS, RETENTION_DAYS_CONFIG } from "../../../constant";

export interface RetentionDateRange {
  readonly from: number;
  readonly to: number;
}

export interface BuildRetentionOptions {
  readonly now: number;
  readonly dateRange?: RetentionDateRange;
}

const RETENTION_DAYS: readonly number[] = [...RETENTION_DAYS_CONFIG];

export function buildRetentionData(
  cohorts: ReadonlyMap<string, PurchaseCohort>,
  timezone: string,
  options: BuildRetentionOptions,
): RetentionData {
  const reportEnd = options.dateRange?.to ?? options.now;
  const todayKey = formatDateKey(reportEnd, timezone);
  const fromKey = options.dateRange
    ? formatDateKey(options.dateRange.from, timezone)
    : undefined;
  const toKey = options.dateRange
    ? formatDateKey(options.dateRange.to, timezone)
    : undefined;

  const rows: RetentionCohortRow[] = [];
  let totalCustomers = 0;
  let repeatCustomers = 0;
  let primaryWindow = RETENTION_DAYS[0] ?? 0;
  let primaryWindowEligibleCustomers = 0;
  let primaryWindowRetainedCustomers = 0;
  const repeatPurchaseDays: number[] = [];

  const sortedCohorts = [...cohorts.entries()]
    .filter(([cohortDate]) => {
      if (fromKey === undefined || toKey === undefined) {
        return true;
      }

      return cohortDate >= fromKey && cohortDate <= toKey;
    })
    .sort(([left], [right]) => right.localeCompare(left));

  for (const [cohortDate, cohort] of sortedCohorts) {
    const ageDays = diffDateKeyDays(cohortDate, todayKey);
    const eligibleByDay: Record<string, number> = {};
    const retainedByDay: Record<string, number> = {};
    const retention: Record<string, number | null> = {};

    totalCustomers += cohort.users;

    const repeatedWithinWindow = getRetainedCounts(
      cohort,
      reportEnd,
      options.dateRange === undefined,
    );

    for (const day of RETENTION_DAYS) {
      const key = `day${day}`;
      const eligible = ageDays >= day ? cohort.users : 0;
      const retained = eligible > 0 ? (repeatedWithinWindow.get(day) ?? 0) : 0;

      eligibleByDay[key] = eligible;
      retainedByDay[key] = retained;
      retention[key] = eligible > 0 ? retained / eligible : null;

      if (eligible > 0 && day >= primaryWindow) {
        primaryWindow = day;
      }
    }

    rows.push({
      cohortDate,
      cohortSize: cohort.users,
      ageDays,
      eligibleByDay,
      retainedByDay,
      retention,
    });

    for (const repeatPurchase of cohort.repeatPurchases) {
      if (repeatPurchase.timestamp > reportEnd) {
        continue;
      }

      repeatCustomers++;
      repeatPurchaseDays.push(repeatPurchase.elapsedDays);
    }
  }

  for (const row of rows) {
    const key = `day${primaryWindow}`;
    primaryWindowEligibleCustomers += row.eligibleByDay[key] ?? 0;
    primaryWindowRetainedCustomers += row.retainedByDay[key] ?? 0;
  }

  const primaryWindowRetentionRate =
    primaryWindowEligibleCustomers > 0
      ? primaryWindowRetainedCustomers / primaryWindowEligibleCustomers
      : null;

  return {
    todayKey,
    retentionDaysUsed: RETENTION_DAYS,
    summary: {
      totalCustomers,
      repeatCustomers,
      repeatPurchaseRate:
        totalCustomers > 0 ? repeatCustomers / totalCustomers : 0,
      medianTimeToSecondPurchaseDays: median(repeatPurchaseDays),
      averageTimeToSecondPurchaseDays: average(repeatPurchaseDays),
      primaryWindow,
      primaryWindowEligibleCustomers,
      primaryWindowRetainedCustomers,
      primaryWindowRetentionRate,
    },
    cohorts: rows,
  };
}

function getRetainedCounts(
  cohort: PurchaseCohort,
  reportEnd: number,
  canUseMaintainedCounts: boolean,
): Map<number, number> {
  if (canUseMaintainedCounts && cohort.retainedByDay) {
    return new Map<number, number>([
      [1, cohort.retainedByDay.day1],
      [7, cohort.retainedByDay.day7],
      [30, cohort.retainedByDay.day30],
    ]);
  }

  const counts = new Map<number, number>();

  for (const day of RETENTION_DAYS) {
    counts.set(day, 0);
  }

  for (const repeatPurchase of cohort.repeatPurchases) {
    if (
      repeatPurchase.timestamp > reportEnd ||
      repeatPurchase.elapsedDays <= 0
    ) {
      continue;
    }

    for (const day of RETENTION_DAYS) {
      if (repeatPurchase.elapsedDays <= day) {
        counts.set(day, (counts.get(day) ?? 0) + 1);
      }
    }
  }

  return counts;
}

export function diffDateKeyDays(
  startDateKey: string,
  endDateKey: string,
): number {
  const start = Date.parse(`${startDateKey}T00:00:00Z`);
  const end = Date.parse(`${endDateKey}T00:00:00Z`);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(0, Math.floor((end - start) / DAY_MS));
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? (sorted[middle] ?? null)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
