import { describe, expect, it } from "vitest";
import { EventIndexer } from "../indexes/EventIndexer";
import { InMemoryEventRepository } from "../repository/EventRepository";
import { QueryEngine } from "./QueryEngine";
import type { NormalizedEvent } from "../../types";

function event(
  userId: string,
  timestamp: string,
  eventType: NormalizedEvent["eventType"],
): NormalizedEvent {
  return {
    userId,
    eventType,
    timestamp: Date.parse(timestamp),
  };
}

describe("QueryEngine", () => {
  it("uses workspace-day indexes but still applies exact timestamp boundaries", () => {
    const repository = new InMemoryEventRepository();
    const indexer = new EventIndexer("Asia/Jakarta");
    const queryEngine = new QueryEngine(repository, indexer);

    const events = [
      event("u1", "2026-03-09T16:59:59.999Z", "product_view"),
      event("u1", "2026-03-09T17:00:00.000Z", "add_to_cart"),
      event("u2", "2026-03-10T16:59:59.999Z", "payment_success"),
      event("u3", "2026-03-10T17:00:00.000Z", "payment_success"),
    ];

    repository.append(events);
    indexer.append(events, 0);

    const result = queryEngine.execute({
      dateRange: {
        from: Date.parse("2026-03-09T17:00:00.000Z"),
        to: Date.parse("2026-03-10T16:59:59.999Z"),
      },
      orderBy: "timestamp",
    });

    expect(result.total).toBe(2);

    expect(result.events.map((item) => item.timestamp)).toEqual([
      Date.parse("2026-03-09T17:00:00.000Z"),
      Date.parse("2026-03-10T16:59:59.999Z"),
    ]);
  });

  it("does not sort unless the query explicitly requests timestamp ordering", () => {
    const repository = new InMemoryEventRepository();
    const indexer = new EventIndexer("UTC");
    const queryEngine = new QueryEngine(repository, indexer);

    const events = [
      event("u1", "2026-01-01T12:00:00Z", "product_view"),
      event("u1", "2026-01-01T10:00:00Z", "signup"),
    ];

    repository.append(events);
    indexer.append(events, 0);

    expect(
      queryEngine.execute({}).events.map((item) => item.timestamp),
    ).toEqual([
      Date.parse("2026-01-01T12:00:00Z"),
      Date.parse("2026-01-01T10:00:00Z"),
    ]);

    expect(
      queryEngine
        .execute({
          orderBy: "timestamp",
        })
        .events.map((item) => item.timestamp),
    ).toEqual([
      Date.parse("2026-01-01T10:00:00Z"),
      Date.parse("2026-01-01T12:00:00Z"),
    ]);
  });

  it("intersects independent indexes for multi-dimensional queries", () => {
    const repository = new InMemoryEventRepository();
    const indexer = new EventIndexer("UTC");
    const queryEngine = new QueryEngine(repository, indexer);

    const events: NormalizedEvent[] = [
      {
        ...event("u1", "2026-01-01T10:00:00Z", "signup"),
        properties: {
          plan: "pro",
        },
      },
      {
        ...event("u1", "2026-01-01T10:01:00Z", "product_view"),
        properties: {
          plan: "pro",
          category: "fashion",
          productId: "p1",
        },
      },
      {
        ...event("u2", "2026-01-01T10:02:00Z", "product_view"),
        properties: {
          category: "beauty",
          productId: "p2",
        },
      },
    ];

    repository.append(events);
    indexer.append(events, 0);

    const result = queryEngine.execute({
      plans: ["pro"],
      categories: ["fashion"],
      productIds: ["p1"],
    });

    expect(result.total).toBe(1);
    expect(result.events[0]?.userId).toBe("u1");
  });
});
