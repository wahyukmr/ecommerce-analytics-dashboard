import type { PurchasePlan } from "../../types";
import type { EventQuery } from "../queries/Query";
import type { QueryResult } from "../queries/QueryResult";
import type {
  ProductAggregate,
  PurchaseCohort,
} from "../engine/AnalyticsState";

export interface AnalyticsProgressiveSummary {
  readonly totalUsers: number;
  readonly newUsers: number;
  readonly totalOrders: number;
  readonly totalRevenue: number;
  readonly averageOrderValue: number;
  readonly successfulPayments: number;
  readonly failedPayments: number;
  readonly productViewUsers: number;
  readonly addToCartUsers: number;
  readonly checkoutStartedUsers: number;
  readonly paymentSuccessUsers: number;
  readonly wishlistUsers: number;
  readonly paymentFailedUsers: number;
  readonly paymentFailedAttempts: number;
  readonly totalSessions: number;
  /** Not available from cumulative state without an additional high-cardinality index. */
  readonly repeatCustomerRate: number | null;
  /** Not available from cumulative state without session-status tracking. */
  readonly cartAbandonmentRate: number | null;
  /** Not available from cumulative state without user-product tracking. */
  readonly productDepthPerUser: number | null;
}

export interface AnalyticsReadModel {
  readonly revision: number;
  readonly eventCount: number;

  readonly query: (query: EventQuery) => QueryResult;

  readonly getProgressiveSummary: () => AnalyticsProgressiveSummary;

  readonly getRevenueByDay: (
    plan?: PurchasePlan,
  ) => ReadonlyMap<string, number>;

  readonly getActiveUsersByDay: () => ReadonlyMap<string, number>;

  readonly getPurchaseCohorts: (
    plan?: PurchasePlan,
  ) => ReadonlyMap<string, PurchaseCohort>;

  readonly getProductPerformance: () => ReadonlyMap<string, ProductAggregate>;
}
