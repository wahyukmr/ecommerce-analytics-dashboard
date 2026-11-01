import type { NormalizedEvent } from "../../types";
import { formatDateKey } from "../../libs";
import { DAY_MS } from "../../constant";
import type { EventIndexer } from "../indexes/EventIndexer";
import type { InMemoryEventRepository } from "../repository/EventRepository";
import type { EventQuery } from "./Query";
import type { QueryResult } from "./QueryResult";

type IndexBucket = readonly number[];

export class QueryEngine {
  private readonly _repository: InMemoryEventRepository;
  private readonly _indexer: EventIndexer;

  constructor(repository: InMemoryEventRepository, indexer: EventIndexer) {
    this._repository = repository;
    this._indexer = indexer;
  }

  execute(query: EventQuery): QueryResult {
    const indexes = this._indexer.indexes;
    const candidates: number[][] = [];

    if (query.dateRange) {
      candidates.push(
        this.collectDateRangeIndexes(query.dateRange.from, query.dateRange.to),
      );
    }

    if (query.userIds?.length) {
      candidates.push(
        this.mergeBuckets(
          query.userIds.map((id) => indexes.byUser.get(id) ?? []),
        ),
      );
    }

    if (query.eventTypes?.length) {
      candidates.push(
        this.mergeBuckets(
          query.eventTypes.map(
            (eventType) => indexes.byEventType.get(eventType) ?? [],
          ),
        ),
      );
    }

    if (query.plans?.length) {
      candidates.push(
        this.mergeBuckets(
          query.plans.map((plan) => indexes.byPlan.get(plan) ?? []),
        ),
      );
    }

    if (query.categories?.length) {
      candidates.push(
        this.mergeBuckets(
          query.categories.map(
            (category) => indexes.byCategory.get(category) ?? [],
          ),
        ),
      );
    }

    if (query.productIds?.length) {
      candidates.push(
        this.mergeBuckets(
          query.productIds.map(
            (productId) => indexes.byProduct.get(productId) ?? [],
          ),
        ),
      );
    }

    candidates.sort((left, right) => left.length - right.length);

    const source = this._repository.events();
    const candidate = this.intersectCandidates(candidates);
    const events: NormalizedEvent[] = [];

    if (candidate === undefined) {
      for (const event of source) {
        if (!this.matchesDateRange(event, query.dateRange)) {
          continue;
        }

        events.push(event);
      }
    } else {
      for (const index of candidate) {
        const event = source[index];
        if (event === undefined) continue;

        if (!this.matchesDateRange(event, query.dateRange)) {
          continue;
        }

        events.push(event);
      }
    }

    if (query.orderBy === "timestamp") {
      const direction = query.orderDirection === "desc" ? -1 : 1;

      events.sort(
        (left, right) => (left.timestamp - right.timestamp) * direction,
      );
    }

    return {
      events,
      total: events.length,
    };
  }

  private collectDateRangeIndexes(from: number, to: number): number[] {
    const indexes = this._indexer.indexes.byDay;
    const timezone = this._indexer.timezone;
    const result: number[] = [];
    const seen = new Set<number>();
    const firstKey = formatDateKey(from, timezone);
    const lastKey = formatDateKey(to, timezone);

    let cursor = Date.parse(`${firstKey}T00:00:00Z`);
    const last = Date.parse(`${lastKey}T00:00:00Z`);

    while (cursor <= last) {
      const key = new Date(cursor).toISOString().slice(0, 10);

      for (const index of indexes.get(key) ?? []) {
        if (seen.has(index)) continue;

        seen.add(index);
        result.push(index);
      }

      cursor += DAY_MS;
    }

    result.sort((left, right) => left - right);

    return result;
  }

  private mergeBuckets(buckets: readonly IndexBucket[]): number[] {
    const nonEmpty = buckets.filter((bucket) => bucket.length > 0);

    if (nonEmpty.length === 0) {
      return [];
    }

    if (nonEmpty.length === 1) {
      return [...nonEmpty[0]];
    }

    let merged = [...nonEmpty[0]];

    for (let index = 1; index < nonEmpty.length; index++) {
      merged = this.unionSorted(merged, nonEmpty[index]);
    }

    return merged;
  }

  private unionSorted(
    left: readonly number[],
    right: readonly number[],
  ): number[] {
    const result: number[] = [];

    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      const leftValue = left[leftIndex];
      const rightValue = right[rightIndex];

      if (leftValue < rightValue) {
        result.push(leftValue);
        leftIndex++;
      } else if (rightValue < leftValue) {
        result.push(rightValue);
        rightIndex++;
      } else {
        result.push(leftValue);
        leftIndex++;
        rightIndex++;
      }
    }

    while (leftIndex < left.length) {
      result.push(left[leftIndex]);
      leftIndex++;
    }

    while (rightIndex < right.length) {
      result.push(right[rightIndex]);
      rightIndex++;
    }

    return result;
  }

  private intersectCandidates(
    candidates: readonly number[][],
  ): number[] | undefined {
    if (candidates.length === 0) {
      return undefined;
    }

    let current = candidates[0] ?? [];

    for (let index = 1; index < candidates.length; index++) {
      current = this.intersectSorted(current, candidates[index] ?? []);

      if (current.length === 0) {
        return [];
      }
    }

    return current;
  }

  private intersectSorted(
    left: readonly number[],
    right: readonly number[],
  ): number[] {
    if (left.length === 0 || right.length === 0) {
      return [];
    }

    const result: number[] = [];

    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      const leftValue = left[leftIndex];
      const rightValue = right[rightIndex];

      if (leftValue === rightValue) {
        result.push(leftValue);
        leftIndex++;
        rightIndex++;
      } else if (leftValue < rightValue) {
        leftIndex++;
      } else {
        rightIndex++;
      }
    }

    return result;
  }

  private matchesDateRange(
    event: NormalizedEvent,
    dateRange: EventQuery["dateRange"],
  ): boolean {
    if (!dateRange) {
      return true;
    }

    return event.timestamp >= dateRange.from && event.timestamp <= dateRange.to;
  }
}
