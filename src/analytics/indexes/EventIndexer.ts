import type { EventIndexes, NormalizedEvent, PurchasePlan } from "../../types";
import { formatDateKey } from "../../libs";
import { EventIndexes as EventIndexesStore } from "./EventIndexes";

const EMPTY_PLANS = new Map<string, PurchasePlan>();

export class EventIndexer {
  private readonly _timezone: string;
  private readonly _indexes = new EventIndexesStore();

  constructor(timezone = "UTC") {
    this._timezone = timezone;
  }

  get timezone(): string {
    return this._timezone;
  }

  append(
    events: readonly NormalizedEvent[],
    startIndex: number,
    existingPlans: ReadonlyMap<string, PurchasePlan> = EMPTY_PLANS,
  ): void {
    const pendingPlans = new Map<string, PurchasePlan>();

    for (let offset = 0; offset < events.length; offset++) {
      const event = events[offset];
      const index = startIndex + offset;

      this.add(
        this._indexes.byDay,
        formatDateKey(event.timestamp, this._timezone),
        index,
      );

      this.add(this._indexes.byUser, event.userId, index);

      this.add(this._indexes.byEventType, event.eventType, index);

      const eventPlan = event.properties?.plan;

      if (eventPlan !== undefined) {
        pendingPlans.set(event.userId, eventPlan);
      }

      const plan =
        eventPlan ??
        pendingPlans.get(event.userId) ??
        existingPlans.get(event.userId);

      if (plan !== undefined) {
        this.add(this._indexes.byPlan, plan, index);
      }

      if (event.properties?.category) {
        this.add(this._indexes.byCategory, event.properties.category, index);
      }

      if (event.properties?.productId) {
        this.add(this._indexes.byProduct, event.properties.productId, index);
      }
    }
  }

  get indexes(): EventIndexes {
    return {
      byDay: this._indexes.byDay,
      byUser: this._indexes.byUser,
      byEventType: this._indexes.byEventType,
      byPlan: this._indexes.byPlan,
      byCategory: this._indexes.byCategory,
      byProduct: this._indexes.byProduct,
    };
  }

  reset(): void {
    this._indexes.byDay.clear();
    this._indexes.byUser.clear();
    this._indexes.byEventType.clear();
    this._indexes.byPlan.clear();
    this._indexes.byCategory.clear();
    this._indexes.byProduct.clear();
  }

  private add<TKey extends string>(
    map: Map<TKey, number[]>,
    key: TKey,
    value: number,
  ): void {
    const bucket = map.get(key);

    if (bucket) {
      bucket.push(value);
      return;
    }

    map.set(key, [value]);
  }
}
