import { describe, expect, it } from "vitest";
import type { PurchaseCohort } from "../../../analytics/engine/AnalyticsState";
import { buildRetentionData } from "./retention";

const NOW = Date.parse("2026-01-31T00:00:00.000Z");

function cohort(
  users: number,
  repeats: Array<[string, number]>,
): PurchaseCohort {
  return {
    users,
    repeatPurchases: repeats.map(([timestamp, elapsedDays]) => ({
      timestamp: Date.parse(timestamp),
      elapsedDays,
    })),
  };
}

describe("buildRetentionData", () => {
  it("measures only mature cohort windows and reports repeat timing", () => {
    const data = buildRetentionData(
      new Map([
        ["2026-01-01", cohort(4, [["2026-01-08T12:00:00Z", 7]])],
        ["2026-01-25", cohort(3, [["2026-01-26T12:00:00Z", 1]])],
      ]),
      "UTC",
      { now: NOW },
    );

    expect(data.retentionDaysUsed).toEqual([1, 7, 30]);
    expect(data.summary.totalCustomers).toBe(7);
    expect(data.summary.repeatCustomers).toBe(2);
    expect(data.summary.repeatPurchaseRate).toBeCloseTo(2 / 7);
    expect(data.summary.averageTimeToSecondPurchaseDays).toBe(4);
    expect(data.summary.medianTimeToSecondPurchaseDays).toBe(4);
    expect(data.summary.primaryWindow).toBe(30);
    expect(data.summary.primaryWindowEligibleCustomers).toBe(4);
    expect(data.summary.primaryWindowRetainedCustomers).toBe(1);
    expect(data.summary.primaryWindowRetentionRate).toBe(0.25);

    const first = data.cohorts.find((row) => row.cohortDate === "2026-01-01");
    const second = data.cohorts.find((row) => row.cohortDate === "2026-01-25");

    expect(first?.retention).toEqual({ day1: 0, day7: 0.25, day30: 0.25 });
    expect(first?.eligibleByDay).toEqual({ day1: 4, day7: 4, day30: 4 });
    expect(first?.retainedByDay).toEqual({ day1: 0, day7: 1, day30: 1 });

    expect(second?.retention).toEqual({ day1: 1 / 3, day7: null, day30: null });
    expect(second?.eligibleByDay).toEqual({ day1: 3, day7: 0, day30: 0 });
  });

  it("does not count a repeat purchase after the report end", () => {
    const data = buildRetentionData(
      new Map([["2026-01-01", cohort(2, [["2026-02-01T00:00:00Z", 31]])]]),
      "UTC",
      {
        now: NOW,
        dateRange: {
          from: Date.parse("2026-01-01T00:00:00Z"),
          to: NOW,
        },
      },
    );

    expect(data.summary.repeatCustomers).toBe(0);
    expect(data.cohorts[0]?.retention.day30).toBe(0);
  });

  it("keeps cohorts outside the selected first-purchase range out of the result", () => {
    const data = buildRetentionData(
      new Map([
        ["2026-01-01", cohort(2, [["2026-01-08T00:00:00Z", 7]])],
        ["2026-01-20", cohort(5, [])],
      ]),
      "UTC",
      {
        now: NOW,
        dateRange: {
          from: Date.parse("2026-01-15T00:00:00Z"),
          to: NOW,
        },
      },
    );

    expect(data.cohorts.map((row) => row.cohortDate)).toEqual(["2026-01-20"]);
    expect(data.summary.totalCustomers).toBe(5);
  });
});
