/**
 * User personas for synthetic data generation
 * Browser: User who visits the site but does not engage deeply ~40% (Look product, read content, and go away)
 * Interested: User who engages with content but does not convert ~25% (engage with content, add to cart, but does not purchase)
 * Buyer: User who makes a purchase or converts ~20% (engage with content, add to cart, and purchase)
 * Loyal Customer: User who repeatedly engages and converts over time ~15% (engage with content, add to cart, purchase, and return multiple times)
 */
export type UserPersona = "browser" | "interested" | "buyer" | "loyal_customer";
export type PurchasePlan = "free" | "pro";
export type ProductCategory = "fashion" | "beauty" | "footwear" | "accessories";

export interface ECommerceProduct {
  id: string;
  name: string;
  category: ProductCategory;
  priceRange: {
    min: number;
    max: number;
  };
  popularity: number;
}

export interface User {
  id: string;
  persona: UserPersona;
  plan: PurchasePlan;
  signupTimestamp: number;
  preferredCategories: ProductCategory[];
  intentScore: number; // how strong their intention to buy is
  hesitationScore: number; // how big is the hesitation to buy
}

export interface GeneratorConfig {
  totalUsers: number;
  days: number;
  products: ECommerceProduct[];
  personaDistribution: {
    browser: number;
    interested: number;
    buyer: number;
    loyal_customer: number;
  };
}

export type EventType =
  // auth
  | "signup"
  | "login"
  | "logout"

  // store lifecycle
  | "store_created"
  | "store_verified"

  // product lifecycle
  | "product_created"
  | "product_published"
  | "product_updated"

  // customer commerce journey
  | "product_view"
  | "add_to_cart"
  | "checkout_started"
  | "payment_success"
  | "order_cancelled"
  | "payment_failed"

  // customer engagement
  | "wishlist_add"
  | "customer_return"

  // marketing
  | "campaign_opened"
  | "voucher_used";

export type ReasonFailure =
  | "card_declined"
  | "insufficient_funds"
  | "payment_gateway_timeout"
  | "suspected_fraud"
  | "currency_not_supported"
  | "user_cancelled";

export interface EventProperties {
  sessionId?: string;
  productId?: string;
  productName?: string;
  category?: ProductCategory;
  cartValue?: number;
  revenue?: number;
  orderId?: string;
  campaignId?: string;
  plan?: PurchasePlan;
  repeatOrder?: boolean;
  success?: boolean;
  reason?: ReasonFailure;
  retryAttempt?: boolean;
}

export interface RawEvent {
  event_type: EventType;
  user_id: string;
  timestamp: number;
  properties?: EventProperties;
}

export interface NormalizedEvent {
  eventType: EventType;
  userId: string;
  timestamp: number;
  properties?: EventProperties;
}

export interface EventBucket {
  eventCount: number;
}

export interface EventIndexes {
  byDay: ReadonlyMap<string, readonly number[]>;
  byUser: ReadonlyMap<string, readonly number[]>;
  byEventType: ReadonlyMap<string, readonly number[]>;
  byPlan: ReadonlyMap<string, readonly number[]>;
  byCategory: ReadonlyMap<string, readonly number[]>;
  byProduct: ReadonlyMap<string, readonly number[]>;
}

export interface FunnelSignalCounts {
  readonly wishlistUsers: number;
  readonly paymentFailedUsers: number;
  readonly paymentFailedAttempts: number;
}

export interface FilteredContext {
  eventIndexes: number[];
  userIds: Set<string>;
}

export interface CommerceMilestoneConfig {
  eventType: EventType;
  condition?: (event: NormalizedEvent) => boolean;
}
