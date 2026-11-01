import { describe, expect, it } from "vitest";
import type { DashboardQuerySource } from "./buildDashboardData";
import { buildDashboardData } from "./buildDashboardData";
import type { PurchaseCohort } from "../../../analytics/engine/AnalyticsState";
import type { NormalizedEvent } from "../../../types";

const NOW = Date.parse("2026-01-31T00:00:00Z");

function event(
  eventType: NormalizedEvent["eventType"],
  userId: string,
  timestamp: string,
  properties?: NormalizedEvent["properties"],
): NormalizedEvent {
  return {
    eventType,
    userId,
    timestamp: Date.parse(timestamp),
    ...(properties ? { properties } : {}),
  };
}

const events: readonly NormalizedEvent[] = [
  event("signup", "u1", "2026-01-01T10:00:00Z", { plan: "pro" }),
  event("product_view", "u1", "2026-01-01T10:01:00Z", {
    sessionId: "s1",
    productId: "p1",
    category: "fashion",
  }),
  event("add_to_cart", "u1", "2026-01-01T10:02:00Z", {
    sessionId: "s1",
    productId: "p1",
    category: "fashion",
  }),
  event("checkout_started", "u1", "2026-01-01T10:03:00Z", {
    sessionId: "s1",
    productId: "p1",
    category: "fashion",
  }),
  event("payment_success", "u1", "2026-01-01T10:04:00Z", {
    sessionId: "s1",
    productId: "p1",
    category: "fashion",
    revenue: 100_000,
    plan: "pro",
  }),
  event("wishlist_add", "u1", "2026-01-01T10:04:30Z", {
    productId: "p1",
    category: "fashion",
  }),
  event("payment_failed", "u1", "2026-01-01T10:03:30Z", {
    productId: "p1",
    category: "fashion",
    reason: "card_declined",
  }),
  event("payment_success", "u1", "2026-01-08T10:04:00Z", {
    sessionId: "s2",
    productId: "p1",
    category: "fashion",
    revenue: 150_000,
    plan: "pro",
  }),
  event("product_view", "u2", "2026-01-02T10:00:00Z", {
    sessionId: "s3",
    productId: "p2",
    category: "beauty",
  }),
];

function source(
  overrides: Partial<DashboardQuerySource> = {},
): DashboardQuerySource {
  const baseEvents = [...events];

  const revenueByDay = new Map<string, number>([
    ["2026-01-01", 100_000],
    ["2026-01-08", 150_000],
  ]);

  const activeUsersByDay = new Map<string, number>([
    ["2026-01-01", 1],
    ["2026-01-02", 1],
    ["2026-01-08", 1],
  ]);

  const purchaseCohorts = new Map<string, PurchaseCohort>([
    [
      "2026-01-01",
      {
        users: 1,
        repeatPurchases: [
          {
            timestamp: Date.parse("2026-01-08T10:04:00Z"),
            elapsedDays: 7,
          },
        ],
      },
    ],
  ]);

  return {
    query() {
      return {
        events: baseEvents,
        total: baseEvents.length,
      };
    },
    getRevenueByDay() {
      return revenueByDay;
    },
    getActiveUsersByDay() {
      return activeUsersByDay;
    },
    getPurchaseCohorts() {
      return purchaseCohorts;
    },
    ...overrides,
  };
}

describe("buildDashboardData", () => {
  it("uses maintained read-side aggregates for revenue, active users and retention", () => {
    const calls: unknown[] = [];

    const readSource = source({
      query(query) {
        calls.push(query);
        return {
          events,
          total: events.length,
        };
      },
    });

    const data = buildDashboardData(
      readSource,
      {
        dateRange: "all",
        plan: "all",
        category: "all",
      },
      "UTC",
      NOW,
    );

    expect(data.metrics.activeUsers).toBe(2);
    expect(data.metrics.orders).toBe(2);
    expect(data.metrics.revenue).toBe(250_000);
    expect(data.funnel.steps.map((step) => step.usersAtStep)).toEqual([
      2, 1, 1, 1,
    ]);
    expect(data.funnel.steps[1]?.dropOffFromPrevious).toBe(1);
    expect(data.funnel.steps.at(-1)?.shareOfBase).toBe(0.5);
    expect(data.funnel.supportingSignals[0]?.users).toBe(1);
    expect(data.funnel.supportingSignals[1]?.users).toBe(1);
    expect(data.funnel.supportingSignals[1]?.eventCount).toBe(1);
    expect(data.products[0]?.productId).toBe("p1");

    expect(data.revenueTrend).toEqual([
      {
        date: "2026-01-01",
        revenue: 100_000,
      },
      {
        date: "2026-01-08",
        revenue: 150_000,
      },
    ]);

    expect(data.engagement.dailyActiveUsers).toEqual([
      { date: "2026-01-01", users: 1 },
      { date: "2026-01-02", users: 1 },
      { date: "2026-01-08", users: 1 },
    ]);

    expect(data.retention.cohorts).toEqual([
      {
        cohortDate: "2026-01-01",
        cohortSize: 1,
        ageDays: 30,
        eligibleByDay: {
          day1: 1,
          day7: 1,
          day30: 1,
        },
        retainedByDay: {
          day1: 0,
          day7: 1,
          day30: 1,
        },
        retention: {
          day1: 0,
          day7: 1,
          day30: 1,
        },
      },
    ]);
    expect(data.retention.summary.totalCustomers).toBe(1);
    expect(data.retention.summary.repeatCustomers).toBe(1);
    expect(data.retention.summary.primaryWindow).toBe(30);

    expect(calls).toHaveLength(1);
  });

  it("uses plan-specific maintained aggregates without creating a second event query", () => {
    const queries: unknown[] = [];
    const requestedPlans: Array<string | undefined> = [];

    const readSource = source({
      query(query) {
        queries.push(query);
        return {
          events: events.filter(
            (item) =>
              item.eventType === "payment_success" ||
              item.properties?.plan === "pro",
          ),
          total: 6,
        };
      },
      getRevenueByDay(plan) {
        requestedPlans.push(plan);

        return new Map<string, number>([
          ["2026-01-01", 100_000],
          ["2026-01-08", 150_000],
        ]);
      },
      getPurchaseCohorts(plan) {
        requestedPlans.push(plan);
        return new Map<string, PurchaseCohort>();
      },
    });

    const data = buildDashboardData(
      readSource,
      {
        dateRange: "all",
        plan: "pro",
        category: "all",
      },
      "UTC",
      NOW,
    );

    expect(data.revenueTrend).toHaveLength(2);
    expect(queries).toHaveLength(1);
    expect(requestedPlans).toEqual(["pro", "pro"]);
  });

  it("does not create a retention cohort from a purchase before the selected range", () => {
    const data = buildDashboardData(
      source({
        getPurchaseCohorts() {
          return new Map([
            [
              "2026-01-01",
              {
                users: 1,
                repeatPurchases: [
                  {
                    timestamp: Date.parse("2026-01-08T10:00:00Z"),
                    elapsedDays: 7,
                  },
                ],
              },
            ],
          ]);
        },
      }),
      {
        dateRange: "last_7_days",
        plan: "all",
        category: "all",
      },
      "UTC",
      Date.parse("2026-01-31T00:00:00Z"),
    );

    expect(data.retention.cohorts).toHaveLength(0);
  });
  it("treats funnel steps as milestones while keeping prerequisites", () => {
    const outOfOrderEvents: readonly NormalizedEvent[] = [
      event("product_view", "u1", "2026-01-01T10:04:00Z"),
      event("checkout_started", "u1", "2026-01-01T10:01:00Z"),
      event("payment_success", "u1", "2026-01-01T10:02:00Z"),
      event("add_to_cart", "u1", "2026-01-01T10:03:00Z"),
    ];

    const readSource = source({
      query() {
        return {
          events: outOfOrderEvents,
          total: outOfOrderEvents.length,
        };
      },
    });

    const data = buildDashboardData(
      readSource,
      {
        dateRange: "all",
        plan: "all",
        category: "all",
      },
      "UTC",
      NOW,
    );

    expect(data.funnel.steps.map((step) => step.usersAtStep)).toEqual([
      1, 1, 1, 1,
    ]);
  });
});
