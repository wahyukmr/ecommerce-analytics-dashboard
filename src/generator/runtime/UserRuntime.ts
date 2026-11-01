export interface UserRuntime {
  readonly userId: string;
  sessionId?: string;
  favoriteProductId?: string;
  lastViewedProducts: string[];
  abandonedCart: string[];
  purchaseCount: number;
  hasPurchased: boolean;
  lastPurchaseTimestamp?: number;
  currentOrderId?: string;
  totalRevenue?: number;
  successfulPayments?: number;
  failedPayments?: number;
  cancelledOrders?: number;
  checkoutAttempts?: number;
  loginCount?: number;
  returnCount?: number;
  voucherUsed?: boolean;
  lastCampaignId?: string;
  lastActivityTimestamp?: number;
}

export function createUserRuntime(userId: string): UserRuntime {
  return {
    userId,
    favoriteProductId: "",
    lastViewedProducts: [],
    abandonedCart: [],
    purchaseCount: 0,
    hasPurchased: false,
  };
}
