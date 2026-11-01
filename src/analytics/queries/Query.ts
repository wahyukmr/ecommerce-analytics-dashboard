import type { EventType, ProductCategory, PurchasePlan } from "../../types";

export interface EventQuery {
  dateRange?: {
    from: number;
    to: number;
  };
  eventTypes?: readonly EventType[];
  plans?: readonly PurchasePlan[];
  categories?: readonly ProductCategory[];
  productIds?: readonly string[];
  userIds?: readonly string[];
  orderBy?: "timestamp";
  orderDirection?: "asc" | "desc";
}
