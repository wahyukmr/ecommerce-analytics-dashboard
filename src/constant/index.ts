import type { FunnelSignalCounts, RawEvent } from "../types";

export const ANALYTICS_TEST_EVENTS: RawEvent[] = [
  {
    event_type: "product_view",
    user_id: "u1",
    timestamp: Date.parse("2026-01-01T10:00:00.000Z"),
    properties: {
      sessionId: "s1",
      productId: "p1",
      productName: "Hijab",
      category: "fashion",
    },
  },
  {
    event_type: "add_to_cart",
    user_id: "u1",
    timestamp: Date.parse("2026-01-01T10:05:00.000Z"),
    properties: {
      sessionId: "s1",
      productId: "p1",
      productName: "Hijab",
      category: "fashion",
    },
  },
  {
    event_type: "checkout_started",
    user_id: "u1",
    timestamp: Date.parse("2026-01-01T10:10:00.000Z"),
    properties: {
      sessionId: "s1",
      productId: "p1",
      productName: "Hijab",
      category: "fashion",
    },
  },
  {
    event_type: "payment_success",
    user_id: "u1",
    timestamp: Date.parse("2026-01-01T10:15:00.000Z"),
    properties: {
      sessionId: "s1",
      productId: "p1",
      productName: "Hijab",
      category: "fashion",
      revenue: 100000,
      success: true,
    },
  },
  {
    event_type: "product_view",
    user_id: "u2",
    timestamp: Date.parse("2026-01-01T11:00:00.000Z"),
    properties: {
      sessionId: "s2",
      productId: "p2",
      productName: "Serum",
      category: "beauty",
    },
  },
  {
    event_type: "product_view",
    user_id: "u3",
    timestamp: Date.parse("2026-01-08T10:00:00.000Z"),
    properties: {
      sessionId: "s3",
      productId: "p1",
      productName: "Hijab",
      category: "fashion",
    },
  },
  {
    event_type: "payment_success",
    user_id: "u1",
    timestamp: Date.parse("2026-01-08T10:15:00.000Z"),
    properties: {
      sessionId: "s4",
      productId: "p1",
      productName: "Hijab",
      category: "fashion",
      revenue: 120000,
      success: true,
    },
  },
];

export const ECOMMERCE_FUNNEL_CONFIG = {
  STEPS: [
    {
      eventType: "product_view" as const,
      label: "Product View",
      description: "Customers who viewed at least one product.",
    },
    {
      eventType: "add_to_cart" as const,
      label: "Add to Cart",
      description: "Customers who added at least one product to cart.",
    },
    {
      eventType: "checkout_started" as const,
      label: "Checkout",
      description: "Customers who started the checkout flow.",
    },
    {
      eventType: "payment_success" as const,
      label: "Purchase",
      description: "Customers who completed a successful payment.",
    },
  ] as const,

  SUPPORTING_SIGNALS: [
    {
      eventType: "wishlist_add" as const,
      label: "Wishlist / Interest",
      description:
        "Customers who expressed product interest without making wishlist activity a required funnel step.",
    },
    {
      eventType: "payment_failed" as const,
      label: "Payment Failed",
      description:
        "Customers affected by at least one failed payment attempt during the selected funnel population.",
    },
  ] as const,
};

export const ZERO_SIGNAL_COUNTS: FunnelSignalCounts = {
  wishlistUsers: 0,
  paymentFailedUsers: 0,
  paymentFailedAttempts: 0,
};

export const RETENTION_DAYS_CONFIG = [1, 7, 30] as const;

export const DAY_MS = 24 * 60 * 60 * 1000;

interface DatasetPreset {
  label: string;
  totalUsers: number;
}
const PRODUCTION_DATASET_PRESETS: DatasetPreset[] = [
  { label: "10k users", totalUsers: 10_000 },
  { label: "50k users", totalUsers: 50_000 },
  { label: "100k users", totalUsers: 100_000 },
];

// The E2E fixture is enabled only by Playwright's local web-server environment.
// It keeps browser tests deterministic without changing production dataset presets.
export const DATASET_PRESETS: DatasetPreset[] =
  import.meta.env.VITE_E2E_MODE === "true"
    ? [
        { label: "25 users", totalUsers: 25 },
        { label: "50 users", totalUsers: 50 },
      ]
    : PRODUCTION_DATASET_PRESETS;
