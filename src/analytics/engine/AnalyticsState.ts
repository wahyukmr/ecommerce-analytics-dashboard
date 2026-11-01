import type { ProductCategory, PurchasePlan } from "../../types";

/** Cumulative financial facts maintained by RevenueProjection. */
export interface RevenueState {
  totalRevenue: number;
  totalOrders: number;
  successfulPayments: number;
  failedPayments: number;
  revenueByPlan: Record<PurchasePlan, number>;
  revenueByDay: Map<string, number>;
  revenueByDayByPlan: Record<PurchasePlan, Map<string, number>>;
}

/** Cumulative user facts maintained by UserProjection. */
export interface UserState {
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
  proUsers: number;
  freeUsers: number;
  planByUser: Map<string, PurchasePlan>;
  seenUsers: Set<string>;
  signedUpUsers: Set<string>;
  returningUserIds: Set<string>;
  activeUserDays: Set<string>;
  viewedUserProducts: Set<string>;
  usersByDay: Map<string, number>;
}

export interface FunnelStepUsers {
  productView: Set<string>;
  addToCart: Set<string>;
  checkoutStarted: Set<string>;
  paymentSuccess: Set<string>;
}

/** Cumulative funnel facts using milestone attainment with ordered prerequisites. */
export interface FunnelState {
  stepUsers: FunnelStepUsers;
  /**
   * Per-user event milestone bitmask. The mask is persisted so milestones
   * observed before a prerequisite can still unlock the funnel after a
   * later out-of-order event arrives or after checkpoint recovery.
   */
  userStepMasks: Map<string, number>;
  wishlistUsers: Set<string>;
  paymentFailedUsers: Set<string>;
  paymentFailed: number;
}

/** Cumulative unique session count and session outcome facts. */
export interface SessionState {
  totalSessions: number;
  sessionIds: Set<string>;
  cartSessionIds: Set<string>;
  purchasedSessionIds: Set<string>;
}

export interface PurchaseRetentionEvent {
  timestamp: number;
  elapsedDays: number;
}

export interface PurchaseCohort {
  users: number;
  repeatPurchases: PurchaseRetentionEvent[];
  /** Incrementally maintained cumulative counts for standard retention windows. */
  retainedByDay?: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export interface UserPurchaseProfile {
  userId: string;
  plan: PurchasePlan;
  firstPurchase: number;
  firstPurchaseDateKey: string;
  secondPurchase?: number;
}

/** Cumulative purchase facts plus a compact repeat-purchase cohort index. */
export interface PurchaseState {
  userPurchases: Map<string, UserPurchaseProfile>;
  purchaseCountByUser: Map<string, number>;
  repeatCustomerCount: number;
  cohorts: Map<string, PurchaseCohort>;
  cohortsByPlan: Record<PurchasePlan, Map<string, PurchaseCohort>>;
}

export interface ProductAggregate {
  productName: string;
  category: ProductCategory | "unknown";
  views: number;
  uniqueViewers: Set<string>;
  addToCart: number;
  checkouts: number;
  purchases: number;
  revenue: number;
}

export interface ProductState {
  products: Map<string, ProductAggregate>;
}

export interface AnalyticsState {
  revenue: RevenueState;
  users: UserState;
  funnel: FunnelState;
  sessions: SessionState;
  purchase: PurchaseState;
  products: ProductState;
}

export function createAnalyticsState(): AnalyticsState {
  return {
    revenue: {
      totalRevenue: 0,
      totalOrders: 0,
      successfulPayments: 0,
      failedPayments: 0,
      revenueByPlan: {
        free: 0,
        pro: 0,
      },
      revenueByDay: new Map(),
      revenueByDayByPlan: {
        free: new Map(),
        pro: new Map(),
      },
    },
    users: {
      totalUsers: 0,
      newUsers: 0,
      returningUsers: 0,
      proUsers: 0,
      freeUsers: 0,
      planByUser: new Map(),
      seenUsers: new Set(),
      signedUpUsers: new Set(),
      returningUserIds: new Set(),
      activeUserDays: new Set(),
      viewedUserProducts: new Set(),
      usersByDay: new Map(),
    },
    funnel: {
      stepUsers: {
        productView: new Set(),
        addToCart: new Set(),
        checkoutStarted: new Set(),
        paymentSuccess: new Set(),
      },
      userStepMasks: new Map(),
      wishlistUsers: new Set(),
      paymentFailedUsers: new Set(),
      paymentFailed: 0,
    },
    sessions: {
      totalSessions: 0,
      sessionIds: new Set(),
      cartSessionIds: new Set(),
      purchasedSessionIds: new Set(),
    },
    purchase: {
      userPurchases: new Map(),
      purchaseCountByUser: new Map(),
      repeatCustomerCount: 0,
      cohorts: new Map(),
      cohortsByPlan: {
        free: new Map(),
        pro: new Map(),
      },
    },
    products: {
      products: new Map(),
    },
  };
}

/**
 * Migrates checkpoints produced before the latest incremental read-model state
 * additions while keeping the persisted schema version backward-compatible.
 */
export function hydrateAnalyticsState(
  snapshot: AnalyticsState,
): AnalyticsState {
  const base = createAnalyticsState();

  const state: AnalyticsState = {
    revenue: {
      ...base.revenue,
      ...snapshot.revenue,
      revenueByPlan: {
        ...base.revenue.revenueByPlan,
        ...snapshot.revenue?.revenueByPlan,
      },
      revenueByDay: new Map(
        snapshot.revenue?.revenueByDay ?? base.revenue.revenueByDay,
      ),
      revenueByDayByPlan: {
        free: new Map(
          snapshot.revenue?.revenueByDayByPlan?.free ??
            base.revenue.revenueByDayByPlan.free,
        ),
        pro: new Map(
          snapshot.revenue?.revenueByDayByPlan?.pro ??
            base.revenue.revenueByDayByPlan.pro,
        ),
      },
    },
    users: {
      ...base.users,
      ...snapshot.users,
      planByUser: new Map(snapshot.users?.planByUser ?? base.users.planByUser),
      seenUsers: new Set(snapshot.users?.seenUsers ?? base.users.seenUsers),
      signedUpUsers: new Set(
        snapshot.users?.signedUpUsers ?? base.users.signedUpUsers,
      ),
      returningUserIds: new Set(
        snapshot.users?.returningUserIds ?? base.users.returningUserIds,
      ),
      activeUserDays: new Set(
        snapshot.users?.activeUserDays ?? base.users.activeUserDays,
      ),
      viewedUserProducts: new Set(
        snapshot.users?.viewedUserProducts ?? base.users.viewedUserProducts,
      ),
      usersByDay: new Map(snapshot.users?.usersByDay ?? base.users.usersByDay),
    },
    funnel: hydrateFunnelState(snapshot.funnel, base.funnel),
    sessions: {
      ...base.sessions,
      ...snapshot.sessions,
      sessionIds: new Set(
        snapshot.sessions?.sessionIds ?? base.sessions.sessionIds,
      ),
      cartSessionIds: new Set(
        snapshot.sessions?.cartSessionIds ?? base.sessions.cartSessionIds,
      ),
      purchasedSessionIds: new Set(
        snapshot.sessions?.purchasedSessionIds ??
          base.sessions.purchasedSessionIds,
      ),
    },
    purchase: {
      ...base.purchase,
      ...snapshot.purchase,
      userPurchases: new Map(
        snapshot.purchase?.userPurchases ?? base.purchase.userPurchases,
      ),
      purchaseCountByUser: new Map(
        snapshot.purchase?.purchaseCountByUser ??
          derivePurchaseCounts(snapshot.purchase?.userPurchases),
      ),
      repeatCustomerCount:
        snapshot.purchase?.repeatCustomerCount ??
        countRepeatCustomers(snapshot.purchase?.userPurchases),
      cohorts: hydrateCohorts(
        snapshot.purchase?.cohorts ?? base.purchase.cohorts,
      ),
      cohortsByPlan: {
        free: hydrateCohorts(
          snapshot.purchase?.cohortsByPlan?.free ??
            base.purchase.cohortsByPlan.free,
        ),
        pro: hydrateCohorts(
          snapshot.purchase?.cohortsByPlan?.pro ??
            base.purchase.cohortsByPlan.pro,
        ),
      },
    },
    products: {
      products: hydrateProducts(
        snapshot.products?.products ?? base.products.products,
      ),
    },
  };

  return state;
}

function hydrateFunnelState(
  snapshot: FunnelState | undefined,
  base: FunnelState,
): FunnelState {
  const stepUsers = {
    productView: new Set(
      snapshot?.stepUsers?.productView ?? base.stepUsers.productView,
    ),
    addToCart: new Set(
      snapshot?.stepUsers?.addToCart ?? base.stepUsers.addToCart,
    ),
    checkoutStarted: new Set(
      snapshot?.stepUsers?.checkoutStarted ?? base.stepUsers.checkoutStarted,
    ),
    paymentSuccess: new Set(
      snapshot?.stepUsers?.paymentSuccess ?? base.stepUsers.paymentSuccess,
    ),
  };

  const userStepMasks = new Map(snapshot?.userStepMasks ?? base.userStepMasks);

  if (userStepMasks.size === 0) {
    const legacySets = [
      stepUsers.productView,
      stepUsers.addToCart,
      stepUsers.checkoutStarted,
      stepUsers.paymentSuccess,
    ];

    for (let stepIndex = 0; stepIndex < legacySets.length; stepIndex++) {
      for (const userId of legacySets[stepIndex] ?? []) {
        userStepMasks.set(
          userId,
          (userStepMasks.get(userId) ?? 0) | (1 << stepIndex),
        );
      }
    }
  }

  return {
    ...base,
    ...snapshot,
    stepUsers,
    userStepMasks,
    wishlistUsers: new Set(snapshot?.wishlistUsers ?? base.wishlistUsers),
    paymentFailedUsers: new Set(
      snapshot?.paymentFailedUsers ?? base.paymentFailedUsers,
    ),
    paymentFailed: snapshot?.paymentFailed ?? 0,
  };
}

function derivePurchaseCounts(
  profiles: ReadonlyMap<string, UserPurchaseProfile> | undefined,
): Map<string, number> {
  const counts = new Map<string, number>();

  if (!profiles) {
    return counts;
  }

  for (const [userId, profile] of profiles) {
    counts.set(userId, profile.secondPurchase === undefined ? 1 : 2);
  }

  return counts;
}

function countRepeatCustomers(
  profiles: ReadonlyMap<string, UserPurchaseProfile> | undefined,
): number {
  if (!profiles) {
    return 0;
  }

  let count = 0;

  for (const profile of profiles.values()) {
    if (profile.secondPurchase !== undefined) {
      count++;
    }
  }

  return count;
}

function createRetainedByDay(cohort: PurchaseCohort): {
  day1: number;
  day7: number;
  day30: number;
} {
  if (cohort.retainedByDay) {
    return {
      ...cohort.retainedByDay,
    };
  }

  const retained = {
    day1: 0,
    day7: 0,
    day30: 0,
  };

  for (const repeat of cohort.repeatPurchases) {
    if (repeat.elapsedDays <= 0) {
      continue;
    }

    if (repeat.elapsedDays <= 1) {
      retained.day1++;
      retained.day7++;
      retained.day30++;
      continue;
    }

    if (repeat.elapsedDays <= 7) {
      retained.day7++;
      retained.day30++;
      continue;
    }

    if (repeat.elapsedDays <= 30) {
      retained.day30++;
    }
  }

  return retained;
}

function hydrateCohorts(
  cohorts: ReadonlyMap<string, PurchaseCohort>,
): Map<string, PurchaseCohort> {
  const result = new Map<string, PurchaseCohort>();

  for (const [date, cohort] of cohorts) {
    result.set(date, {
      users: cohort.users,
      repeatPurchases: [...(cohort.repeatPurchases ?? [])],
      retainedByDay: createRetainedByDay(cohort),
    });
  }

  return result;
}

function hydrateProducts(
  products: ReadonlyMap<string, ProductAggregate>,
): Map<string, ProductAggregate> {
  const result = new Map<string, ProductAggregate>();

  for (const [productId, product] of products) {
    result.set(productId, {
      ...product,
      uniqueViewers: new Set(product.uniqueViewers ?? []),
    });
  }

  return result;
}
