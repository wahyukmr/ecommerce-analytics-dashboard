import type { ProductCategory, PurchasePlan } from "../../../types";

export type DashboardDateRangePreset =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "all";

export interface DashboardFilters {
  dateRange: DashboardDateRangePreset;
  plan: "all" | PurchasePlan;
  category: "all" | ProductCategory;
}

export interface DashboardMetrics {
  activeUsers: number;
  signups: number;
  orders: number;
  revenue: number;
  averageOrderValue: number;
  successfulPayments: number;
  failedPayments: number;
  conversionRate: number;
  repeatCustomerRate: number | null;
  cartAbandonmentRate: number | null;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
}

export interface EngagementData {
  averageEventsPerUser: number;
  averageEventsPerSession: number;
  averageSessionsPerUser: number;
  productDepthPerUser: number | null;
  dailyActiveUsers: readonly { date: string; users: number }[];
}

export interface FunnelStep {
  step: string;
  usersAtStep: number;
  shareOfBase: number;
  conversionRateFromPrevious: number;
  dropOffFromPrevious: number;
  dropOffRateFromPrevious: number;
}

export interface FunnelSignal {
  label: string;
  description: string;
  users: number;
  rateFromBase: number;
  eventCount?: number;
}

export interface FunnelData {
  steps: readonly FunnelStep[];
  supportingSignals: readonly FunnelSignal[];
}

export interface ProductPerformanceRow {
  productId: string;
  productName: string;
  category: ProductCategory | "unknown";
  views: number;
  uniqueViewers: number;
  addToCart: number;
  checkouts: number;
  purchases: number;
  revenue: number;
  purchaseRate: number;
}

export interface RetentionCohortRow {
  cohortDate: string;
  cohortSize: number;
  ageDays: number;
  eligibleByDay: Readonly<Record<string, number>>;
  retainedByDay: Readonly<Record<string, number>>;
  retention: Readonly<Record<string, number | null>>;
}

export interface RetentionSummary {
  totalCustomers: number;
  repeatCustomers: number;
  repeatPurchaseRate: number;
  medianTimeToSecondPurchaseDays: number | null;
  averageTimeToSecondPurchaseDays: number | null;
  primaryWindow: number;
  primaryWindowEligibleCustomers: number;
  primaryWindowRetainedCustomers: number;
  primaryWindowRetentionRate: number | null;
}

export interface RetentionData {
  todayKey: string;
  retentionDaysUsed: readonly number[];
  summary: RetentionSummary;
  cohorts: readonly RetentionCohortRow[];
}

export interface DashboardData {
  metrics: DashboardMetrics;
  revenueTrend: readonly RevenuePoint[];
  engagement: EngagementData;
  funnel: FunnelData;
  products: readonly ProductPerformanceRow[];
  retention: RetentionData;
}
