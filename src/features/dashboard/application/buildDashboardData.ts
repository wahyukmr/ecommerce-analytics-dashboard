import { formatDateKey } from "../../../libs";
import type { AnalyticsReadModel } from "../../../analytics/contracts/ReadModel";
import type { EventQuery } from "../../../analytics/queries/Query";
import type {
  NormalizedEvent,
  ProductCategory,
  PurchasePlan,
} from "../../../types";
import { resolveDashboardDateRange } from "./dateRange";
import type {
  DashboardData,
  DashboardFilters,
  EngagementData,
  ProductPerformanceRow,
} from "./types";
import { buildRetentionData } from "./retention";
import { buildFunnelDataFromMasks } from "./funnel";

export type DashboardQuerySource = Pick<
  AnalyticsReadModel,
  "query" | "getRevenueByDay" | "getActiveUsersByDay" | "getPurchaseCohorts"
>;

export function buildDashboardData(
  source: DashboardQuerySource,
  filters: DashboardFilters,
  timezone: string,
  now = Date.now(),
): DashboardData {
  const dateRange = resolveDashboardDateRange(filters.dateRange, now, timezone);

  const baseQuery: EventQuery = {
    ...(dateRange ? { dateRange } : {}),
    ...(filters.plan !== "all"
      ? {
          plans: [filters.plan] as readonly PurchasePlan[],
        }
      : {}),
    orderBy: "timestamp",
  };

  const baseEvents = source.query(baseQuery).events;

  const precomputedDailyUsers =
    filters.plan === "all"
      ? sliceDailyMap(source.getActiveUsersByDay(), dateRange, timezone)
      : undefined;

  const aggregates = aggregateDashboard(
    baseEvents,
    filters.category,
    timezone,
    precomputedDailyUsers,
  );

  const revenueByDay = source.getRevenueByDay(
    filters.plan === "all" ? undefined : filters.plan,
  );

  return {
    metrics: aggregates.metrics,
    revenueTrend: buildRevenueTrend(revenueByDay, dateRange, timezone),
    engagement: aggregates.engagement,
    funnel: aggregates.funnel,
    products: aggregates.products,
    retention: buildRetentionData(
      source.getPurchaseCohorts(
        filters.plan === "all" ? undefined : filters.plan,
      ),
      timezone,
      { now, ...(dateRange ? { dateRange } : {}) },
    ),
  };
}

type DashboardAccumulator = {
  users: Set<string>;
  signups: Set<string>;
  viewers: Set<string>;
  purchasers: Map<string, number>;
  sessions: Set<string>;
  userSessions: Set<string>;
  cartSessions: Set<string>;
  purchaseSessions: Set<string>;
  dailyUsers: Map<string, Set<string>> | undefined;
  userProducts: Set<string>;
  funnelUserStepMasks: Map<string, number>;
  funnelWishlistUsers: Set<string>;
  funnelPaymentFailedUsers: Set<string>;
  funnelPaymentFailedAttempts: number;
  products: Map<string, ProductAccumulator>;
  revenue: number;
  orders: number;
  successfulPayments: number;
  failedPayments: number;
};

type ProductAccumulator = {
  productName: string;
  category: ProductCategory | "unknown";
  views: number;
  uniqueViewers: Set<string>;
  addToCart: number;
  checkouts: number;
  purchases: number;
  revenue: number;
};

function aggregateDashboard(
  events: readonly NormalizedEvent[],
  categoryFilter: DashboardFilters["category"],
  timezone: string,
  precomputedDailyUsers?: ReadonlyMap<string, number>,
): Pick<DashboardData, "metrics" | "engagement" | "funnel" | "products"> {
  const accumulator: DashboardAccumulator = {
    users: new Set(),
    signups: new Set(),
    viewers: new Set(),
    purchasers: new Map(),
    sessions: new Set(),
    userSessions: new Set(),
    cartSessions: new Set(),
    purchaseSessions: new Set(),
    dailyUsers: precomputedDailyUsers ? undefined : new Map(),
    userProducts: new Set(),
    funnelUserStepMasks: new Map(),
    funnelWishlistUsers: new Set(),
    funnelPaymentFailedUsers: new Set(),
    funnelPaymentFailedAttempts: 0,
    products: new Map(),
    revenue: 0,
    orders: 0,
    successfulPayments: 0,
    failedPayments: 0,
  };

  for (const event of events) {
    const userId = event.userId;
    accumulator.users.add(userId);

    if (event.eventType === "signup") {
      accumulator.signups.add(userId);
    }

    if (event.eventType === "product_view") {
      accumulator.viewers.add(userId);
    }

    const sessionId = event.properties?.sessionId;

    if (sessionId) {
      accumulator.sessions.add(sessionId);
      accumulator.userSessions.add(`${userId}:${sessionId}`);

      if (event.eventType === "add_to_cart") {
        accumulator.cartSessions.add(sessionId);
      }

      if (event.eventType === "payment_success") {
        accumulator.purchaseSessions.add(sessionId);
      }
    }

    if (event.eventType === "payment_success") {
      const revenue = Number(event.properties?.revenue ?? 0);

      accumulator.orders++;
      accumulator.successfulPayments++;
      accumulator.revenue += revenue;
      accumulator.purchasers.set(
        userId,
        (accumulator.purchasers.get(userId) ?? 0) + 1,
      );
    }

    if (event.eventType === "payment_failed") {
      accumulator.failedPayments++;
    }

    if (accumulator.dailyUsers !== undefined) {
      const day = formatDateKey(event.timestamp, timezone);

      let dailyUsers = accumulator.dailyUsers.get(day);

      if (!dailyUsers) {
        dailyUsers = new Set<string>();
        accumulator.dailyUsers.set(day, dailyUsers);
      }

      dailyUsers.add(userId);
    }

    if (event.eventType === "product_view" && event.properties?.productId) {
      accumulator.userProducts.add(`${userId}:${event.properties.productId}`);
    }

    const isProductEvent =
      categoryFilter === "all" || event.properties?.category === categoryFilter;

    if (isProductEvent) {
      updateFunnel(accumulator, event);
      updateProduct(accumulator, event);
    }
  }

  return {
    metrics: buildMetrics(accumulator),
    engagement: buildEngagement(
      accumulator,
      events.length,
      precomputedDailyUsers,
    ),
    funnel: buildFunnelDataFromMasks(accumulator.funnelUserStepMasks, {
      wishlistUsers: accumulator.funnelWishlistUsers.size,
      paymentFailedUsers: accumulator.funnelPaymentFailedUsers.size,
      paymentFailedAttempts: accumulator.funnelPaymentFailedAttempts,
    }),
    products: buildProductPerformance(accumulator.products),
  };
}

function buildMetrics(accumulator: DashboardAccumulator) {
  let repeatCustomers = 0;

  for (const count of accumulator.purchasers.values()) {
    if (count > 1) {
      repeatCustomers++;
    }
  }

  let abandonedCartSessions = 0;

  for (const sessionId of accumulator.cartSessions) {
    if (!accumulator.purchaseSessions.has(sessionId)) {
      abandonedCartSessions++;
    }
  }

  const activeUsers = accumulator.users.size;

  const orders = accumulator.orders;
  const revenue = accumulator.revenue;

  return {
    activeUsers,
    signups: accumulator.signups.size,
    orders,
    revenue,
    averageOrderValue: orders > 0 ? revenue / orders : 0,
    successfulPayments: accumulator.successfulPayments,
    failedPayments: accumulator.failedPayments,
    conversionRate:
      accumulator.viewers.size > 0
        ? overlapCount(accumulator.viewers, accumulator.purchasers.keys()) /
          accumulator.viewers.size
        : 0,
    repeatCustomerRate:
      accumulator.purchasers.size > 0
        ? repeatCustomers / accumulator.purchasers.size
        : 0,
    cartAbandonmentRate:
      accumulator.cartSessions.size > 0
        ? abandonedCartSessions / accumulator.cartSessions.size
        : 0,
  };
}

function overlapCount(
  left: ReadonlySet<string>,
  right: Iterable<string>,
): number {
  let count = 0;

  for (const value of right) {
    if (left.has(value)) {
      count++;
    }
  }

  return count;
}

function sliceDailyMap(
  values: ReadonlyMap<string, number>,
  dateRange:
    | {
        from: number;
        to: number;
      }
    | undefined,
  timezone: string,
): ReadonlyMap<string, number> {
  const fromKey = dateRange
    ? formatDateKey(dateRange.from, timezone)
    : undefined;

  const toKey = dateRange ? formatDateKey(dateRange.to, timezone) : undefined;

  return new Map(
    [...values.entries()].filter(([date]) => {
      if (fromKey === undefined || toKey === undefined) {
        return true;
      }

      return date >= fromKey && date <= toKey;
    }),
  );
}

function buildRevenueTrend(
  revenueByDay: ReadonlyMap<string, number>,
  dateRange:
    | {
        from: number;
        to: number;
      }
    | undefined,
  timezone: string,
) {
  const fromKey = dateRange
    ? formatDateKey(dateRange.from, timezone)
    : undefined;

  const toKey = dateRange ? formatDateKey(dateRange.to, timezone) : undefined;

  return [...revenueByDay.entries()]
    .filter(([date]) => {
      if (fromKey === undefined || toKey === undefined) {
        return true;
      }

      return date >= fromKey && date <= toKey;
    })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, revenue]) => ({
      date,
      revenue,
    }));
}

function buildEngagement(
  accumulator: DashboardAccumulator,
  eventCount: number,
  precomputedDailyUsers?: ReadonlyMap<string, number>,
): EngagementData {
  const totalUsers = accumulator.users.size;

  const sessionCount = accumulator.sessions.size;

  const dailyActiveUsers = precomputedDailyUsers
    ? [...precomputedDailyUsers.entries()]
    : accumulator.dailyUsers
      ? [...accumulator.dailyUsers.entries()].map(
          ([date, users]) => [date, users.size] as const,
        )
      : [];

  return {
    averageEventsPerUser: totalUsers > 0 ? eventCount / totalUsers : 0,
    averageEventsPerSession: sessionCount > 0 ? eventCount / sessionCount : 0,
    averageSessionsPerUser:
      totalUsers > 0 ? accumulator.userSessions.size / totalUsers : 0,
    productDepthPerUser:
      totalUsers > 0 ? accumulator.userProducts.size / totalUsers : 0,
    dailyActiveUsers: dailyActiveUsers
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, users]) => ({
        date,
        users,
      })),
  };
}

function updateFunnel(
  accumulator: DashboardAccumulator,
  event: NormalizedEvent,
): void {
  if (event.eventType === "wishlist_add") {
    accumulator.funnelWishlistUsers.add(event.userId);
    return;
  }

  if (event.eventType === "payment_failed") {
    accumulator.funnelPaymentFailedAttempts++;
    accumulator.funnelPaymentFailedUsers.add(event.userId);
    return;
  }

  const stepIndex = [
    "product_view",
    "add_to_cart",
    "checkout_started",
    "payment_success",
  ].indexOf(event.eventType);

  if (stepIndex < 0) {
    return;
  }

  const currentMask = accumulator.funnelUserStepMasks.get(event.userId) ?? 0;

  accumulator.funnelUserStepMasks.set(
    event.userId,
    currentMask | (1 << stepIndex),
  );
}

function updateProduct(
  accumulator: DashboardAccumulator,
  event: NormalizedEvent,
): void {
  const productId = event.properties?.productId;

  if (!productId) {
    return;
  }

  let product = accumulator.products.get(productId);

  if (!product) {
    product = {
      productName: event.properties?.productName ?? productId,
      category: event.properties?.category ?? "unknown",
      views: 0,
      uniqueViewers: new Set<string>(),
      addToCart: 0,
      checkouts: 0,
      purchases: 0,
      revenue: 0,
    };

    accumulator.products.set(productId, product);
  }

  if (event.properties?.productName) {
    product.productName = event.properties.productName;
  }

  if (event.properties?.category) {
    product.category = event.properties.category;
  }

  switch (event.eventType) {
    case "product_view":
      product.views++;
      product.uniqueViewers.add(event.userId);
      break;

    case "add_to_cart":
      product.addToCart++;
      break;

    case "checkout_started":
      product.checkouts++;
      break;

    case "payment_success":
      product.purchases++;
      product.revenue += Number(event.properties?.revenue ?? 0);
      break;
  }
}

function buildProductPerformance(
  products: ReadonlyMap<string, ProductAccumulator>,
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
