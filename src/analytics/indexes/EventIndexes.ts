import type { EventType, ProductCategory, PurchasePlan } from "../../types";

export class EventIndexes {
  readonly byDay = new Map<string, number[]>();
  readonly byUser = new Map<string, number[]>();
  readonly byEventType = new Map<EventType, number[]>();
  readonly byPlan = new Map<PurchasePlan, number[]>();
  readonly byCategory = new Map<ProductCategory, number[]>();
  readonly byProduct = new Map<string, number[]>();
}
