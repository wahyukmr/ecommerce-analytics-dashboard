import { describe, expect, it } from "vitest";
import type { AnalyticsReadModel } from "../../../analytics/contracts/ReadModel";
import { buildProgressiveDashboardData } from "./buildProgressiveDashboardData";

const NOW = Date.parse("2026-01-31T00:00:00.000Z");

function createReadModel(): AnalyticsReadModel {
  return {
    revision: 3,
    eventCount: 100,

    query() {
      throw new Error("Progressive dashboard must not query raw events.");
    },

    getProgressiveSummary() {
      return {
        totalUsers: 20,
        newUsers: 20,
        totalOrders: 8,
        totalRevenue: 800_000,
        averageOrderValue: 100_000,
        successfulPayments: 8,
        failedPayments: 1,
        productViewUsers: 16,
        addToCartUsers: 12,
        checkoutStartedUsers: 10,
        paymentSuccessUsers: 8,
        wishlistUsers: 7,
        paymentFailedUsers: 2,
        paymentFailedAttempts: 3,
        totalSessions: 30,
        repeatCustomerRate: 0.25,
        cartAbandonmentRate: 0.2,
        productDepthPerUser: 1.5,
      };
    },

    getRevenueByDay() {
      return new Map([
        ["2026-01-01", 300_000],
        ["2026-01-02", 500_000],
      ]);
    },

    getActiveUsersByDay() {
      return new Map([
        ["2026-01-01", 12],
        ["2026-01-02", 18],
      ]);
    },

    getPurchaseCohorts() {
      return new Map([
        [
          "2026-01-01",
          {
            users: 10,
            repeatPurchases: [
              {
                timestamp: Date.parse("2026-01-02T00:00:00Z"),
                elapsedDays: 1,
              },
              {
                timestamp: Date.parse("2026-01-08T00:00:00Z"),
                elapsedDays: 7,
              },
              {
                timestamp: Date.parse("2026-01-20T00:00:00Z"),
                elapsedDays: 19,
              },
              {
                timestamp: Date.parse("2026-01-25T00:00:00Z"),
                elapsedDays: 24,
              },
              {
                timestamp: Date.parse("2026-01-30T00:00:00Z"),
                elapsedDays: 29,
              },
            ],
            retainedByDay: {
              day1: 1,
              day7: 3,
              day30: 5,
            },
          },
        ],
      ]);
    },

    getProductPerformance() {
      return new Map([
        [
          "p1",
          {
            productName: "Sneaker",
            category: "footwear",
            views: 20,
            uniqueViewers: new Set(["u1", "u2"]),
            addToCart: 8,
            checkouts: 6,
            purchases: 4,
            revenue: 400_000,
          },
        ],
        [
          "p2",
          {
            productName: "Lipstick",
            category: "beauty",
            views: 12,
            uniqueViewers: new Set(["u3"]),
            addToCart: 4,
            checkouts: 3,
            purchases: 2,
            revenue: 200_000,
          },
        ],
      ]);
    },
  };
}

describe("buildProgressiveDashboardData", () => {
  it("builds every dashboard section from incremental read-side aggregates", () => {
    const data = buildProgressiveDashboardData(createReadModel(), "UTC", NOW);

    expect(data.metrics.activeUsers).toBe(20);
    expect(data.metrics.orders).toBe(8);
    expect(data.metrics.revenue).toBe(800_000);
    expect(data.metrics.repeatCustomerRate).toBe(0.25);
    expect(data.metrics.cartAbandonmentRate).toBe(0.2);
    expect(data.engagement.productDepthPerUser).toBe(1.5);
    expect(data.metrics.conversionRate).toBe(0.5);

    expect(data.revenueTrend).toEqual([
      {
        date: "2026-01-01",
        revenue: 300_000,
      },
      {
        date: "2026-01-02",
        revenue: 500_000,
      },
    ]);

    expect(data.engagement.dailyActiveUsers).toEqual([
      {
        date: "2026-01-01",
        users: 12,
      },
      {
        date: "2026-01-02",
        users: 18,
      },
    ]);

    expect(data.funnel.steps.map((step) => step.usersAtStep)).toEqual([
      16, 12, 10, 8,
    ]);
    expect(data.funnel.steps.at(-1)?.shareOfBase).toBe(0.5);
    expect(data.funnel.supportingSignals[0]?.users).toBe(7);
    expect(data.funnel.supportingSignals[1]?.users).toBe(2);
    expect(data.funnel.supportingSignals[1]?.eventCount).toBe(3);
    expect(data.retention.cohorts).toHaveLength(1);
    expect(data.retention.summary.totalCustomers).toBe(10);
    expect(data.retention.summary.repeatCustomers).toBe(5);
    expect(data.retention.summary.primaryWindow).toBe(30);
    expect(data.retention.summary.averageTimeToSecondPurchaseDays).toBe(16);
    expect(data.retention.summary.medianTimeToSecondPurchaseDays).toBe(19);
    expect(data.retention.cohorts[0]?.retention.day1).toBe(0.1);
    expect(data.retention.cohorts[0]?.retention.day7).toBe(0.3);
    expect(data.retention.cohorts[0]?.retention.day30).toBe(0.5);

    expect(data.products).toHaveLength(2);
    expect(data.products[0]?.productId).toBe("p1");
    expect(data.products[0]?.purchaseRate).toBe(0.2);
  });

  it("never calls the raw-event query path", () => {
    expect(() =>
      buildProgressiveDashboardData(createReadModel(), "UTC"),
    ).not.toThrow();
  });
});
