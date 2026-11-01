import type { AnalyticsReadModel } from "../../../analytics/contracts/ReadModel";
import { buildFunnelDataFromCounts } from "./funnel";
import { buildRetentionData } from "./retention";

import type {
  DashboardData,
  EngagementData,
  ProductPerformanceRow,
} from "./types";

export function buildProgressiveDashboardData(
  readModel: AnalyticsReadModel,
  timezone: string,
  now = Date.now(),
): DashboardData {
  const summary = readModel.getProgressiveSummary();

  return {
    metrics: {
      activeUsers: summary.totalUsers,
      signups: summary.newUsers,
      orders: summary.totalOrders,
      revenue: summary.totalRevenue,
      averageOrderValue: summary.averageOrderValue,
      successfulPayments: summary.successfulPayments,
      failedPayments: summary.failedPayments,
      conversionRate:
        summary.productViewUsers > 0
          ? summary.paymentSuccessUsers / summary.productViewUsers
          : 0,
      repeatCustomerRate: summary.repeatCustomerRate,
      cartAbandonmentRate: summary.cartAbandonmentRate,
    },

    revenueTrend: buildRevenueTrend(readModel.getRevenueByDay()),

    engagement: buildEngagement(readModel, summary),

    funnel: buildFunnelDataFromCounts(
      [
        summary.productViewUsers,
        summary.addToCartUsers,
        summary.checkoutStartedUsers,
        summary.paymentSuccessUsers,
      ],
      {
        wishlistUsers: summary.wishlistUsers,
        paymentFailedUsers: summary.paymentFailedUsers,
        paymentFailedAttempts: summary.paymentFailedAttempts,
      },
    ),

    products: buildProducts(readModel.getProductPerformance()),

    retention: buildRetentionData(readModel.getPurchaseCohorts(), timezone, {
      now,
    }),
  };
}

function buildRevenueTrend(values: ReadonlyMap<string, number>) {
  return [...values.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, revenue]) => ({
      date,
      revenue,
    }));
}

function buildEngagement(
  readModel: AnalyticsReadModel,
  summary: ReturnType<AnalyticsReadModel["getProgressiveSummary"]>,
): EngagementData {
  const dailyActiveUsers = [...readModel.getActiveUsersByDay().entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, users]) => ({
      date,
      users,
    }));

  return {
    averageEventsPerUser:
      summary.totalUsers > 0 ? readModel.eventCount / summary.totalUsers : 0,

    averageEventsPerSession:
      summary.totalSessions > 0
        ? readModel.eventCount / summary.totalSessions
        : 0,

    averageSessionsPerUser:
      summary.totalUsers > 0 ? summary.totalSessions / summary.totalUsers : 0,

    productDepthPerUser: summary.productDepthPerUser,

    dailyActiveUsers,
  };
}

function buildProducts(
  products: ReadonlyMap<
    string,
    {
      productName: string;
      category: ProductPerformanceRow["category"];
      views: number;
      uniqueViewers: ReadonlySet<string>;
      addToCart: number;
      checkouts: number;
      purchases: number;
      revenue: number;
    }
  >,
): readonly ProductPerformanceRow[] {
  return [...products.entries()]
    .map(([productId, product]) => ({
      productId,
      productName: product.productName,
      category: product.category,
      views: product.views,
      uniqueViewers: product.uniqueViewers.size,
      addToCart: product.addToCart,
      checkouts: product.checkouts,
      purchases: product.purchases,
      revenue: product.revenue,
      purchaseRate: product.views > 0 ? product.purchases / product.views : 0,
    }))
    .sort(
      (left, right) =>
        right.revenue - left.revenue ||
        right.views - left.views ||
        left.productName.localeCompare(right.productName),
    );
}
