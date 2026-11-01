import { describe, expect, it } from "vitest";
import { AnalyticsEngine } from "./AnalyticsEngine";
import type {
  AnalyticsCheckpoint,
  AnalyticsPersistence,
} from "../persistence/AnalyticsPersistence";
import type { NormalizedEvent } from "../../types";

class MemoryPersistence implements AnalyticsPersistence {
  private readonly events = new Map<string, NormalizedEvent[]>();

  private readonly checkpoints = new Map<string, AnalyticsCheckpoint>();

  appendEvents(
    datasetKey: string,
    startIndex: number,
    events: readonly NormalizedEvent[],
  ): Promise<void> {
    let stored = this.events.get(datasetKey);

    if (!stored) {
      stored = [];
      this.events.set(datasetKey, stored);
    }

    for (let offset = 0; offset < events.length; offset++) {
      stored[startIndex + offset] = structuredClone(events[offset]);
    }

    return Promise.resolve();
  }

  loadEvents(datasetKey: string): Promise<readonly NormalizedEvent[]> {
    return Promise.resolve(structuredClone(this.events.get(datasetKey) ?? []));
  }

  loadCheckpoint(datasetKey: string): Promise<AnalyticsCheckpoint | null> {
    const checkpoint = this.checkpoints.get(datasetKey);

    return Promise.resolve(checkpoint ? structuredClone(checkpoint) : null);
  }

  saveCheckpoint(checkpoint: AnalyticsCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.datasetKey, structuredClone(checkpoint));
    return Promise.resolve();
  }

  clear(datasetKey: string): Promise<void> {
    this.events.delete(datasetKey);
    this.checkpoints.delete(datasetKey);
    return Promise.resolve();
  }
}

function normalizedEvent(
  eventType: NormalizedEvent["eventType"],
  userId: string,
  timestamp: string,
  properties?: NormalizedEvent["properties"],
): NormalizedEvent {
  return {
    eventType,
    userId,
    timestamp: Date.parse(timestamp),
    ...(properties ? { properties } : {}),
  };
}

function rawEvent(
  eventType: NormalizedEvent["eventType"],
  userId: string,
  timestamp: string,
  properties?: NormalizedEvent["properties"],
) {
  return {
    event_type: eventType,
    user_id: userId,
    timestamp: Date.parse(timestamp),
    ...(properties ? { properties } : {}),
  };
}

describe("AnalyticsEngine persistence", () => {
  it("restores a checkpoint and reconstructs projection working state", async () => {
    const persistence = new MemoryPersistence();

    const first = new AnalyticsEngine("UTC");

    first.configurePersistence({
      persistence,
      datasetKey: "dataset-test",
    });

    first.append([
      rawEvent("signup", "u1", "2026-01-01T10:00:00Z", { plan: "pro" }),
      rawEvent("product_view", "u1", "2026-01-01T10:01:00Z", {
        sessionId: "s1",
        productId: "p1",
        category: "fashion",
      }),
      rawEvent("add_to_cart", "u1", "2026-01-01T10:02:00Z", {
        sessionId: "s1",
        productId: "p1",
        category: "fashion",
      }),
    ]);

    await first.checkpoint();

    first.append([
      rawEvent("checkout_started", "u1", "2026-01-01T10:03:00Z", {
        sessionId: "s1",
        productId: "p1",
        category: "fashion",
      }),
      rawEvent("payment_success", "u1", "2026-01-01T10:04:00Z", {
        sessionId: "s1",
        productId: "p1",
        category: "fashion",
        revenue: 100_000,
      }),
    ]);

    await first.flushPersistence();

    const recovered = new AnalyticsEngine("UTC");

    const result = await recovered.restore({
      persistence,
      datasetKey: "dataset-test",
    });

    expect(result.restored).toBe(true);

    expect(result.replayedEventCount).toBe(2);

    expect(recovered.getState().revenue.totalRevenue).toBe(100_000);

    expect(recovered.getState().sessions.totalSessions).toBe(1);

    expect(recovered.getState().funnel.stepUsers.paymentSuccess.has("u1")).toBe(
      true,
    );

    expect(recovered.query({}).total).toBe(5);

    expect(
      recovered.getReadModel().getProductPerformance().get("p1")?.revenue,
    ).toBe(100_000);
  });

  it("rebuilds transient funnel state from persisted checkpoint state", async () => {
    const persistence = new MemoryPersistence();

    const first = new AnalyticsEngine("UTC");

    first.configurePersistence({
      persistence,
      datasetKey: "funnel-test",
    });

    first.append([
      rawEvent("signup", "u1", "2026-01-01T10:00:00Z"),
      rawEvent("product_view", "u1", "2026-01-01T10:01:00Z"),
      rawEvent("add_to_cart", "u1", "2026-01-01T10:02:00Z"),
    ]);

    await first.checkpoint();
    await first.flushPersistence();

    first.append([
      rawEvent("checkout_started", "u1", "2026-01-01T10:03:00Z"),
      rawEvent("payment_success", "u1", "2026-01-01T10:04:00Z", {
        revenue: 50_000,
      }),
    ]);

    await first.flushPersistence();

    const recovered = new AnalyticsEngine("UTC");

    await recovered.restore({
      persistence,
      datasetKey: "funnel-test",
    });

    expect(
      recovered.getState().funnel.stepUsers.checkoutStarted.has("u1"),
    ).toBe(true);

    expect(recovered.getState().funnel.stepUsers.paymentSuccess.has("u1")).toBe(
      true,
    );
    expect(recovered.getState().funnel.userStepMasks.get("u1")).toBe(15);
  });

  it("persists funnel milestone memory needed for out-of-order tail events", async () => {
    const persistence = new MemoryPersistence();
    const first = new AnalyticsEngine("UTC");

    first.configurePersistence({
      persistence,
      datasetKey: "funnel-mask-test",
    });

    first.append([
      rawEvent("product_view", "u1", "2026-01-01T10:00:00Z"),
      rawEvent("checkout_started", "u1", "2026-01-01T10:01:00Z"),
      rawEvent("payment_success", "u1", "2026-01-01T10:02:00Z"),
    ]);

    await first.checkpoint();

    const recovered = new AnalyticsEngine("UTC");
    await recovered.restore({
      persistence,
      datasetKey: "funnel-mask-test",
    });

    recovered.append([rawEvent("add_to_cart", "u1", "2026-01-01T09:59:00Z")]);

    expect(recovered.getState().funnel.stepUsers.productView.has("u1")).toBe(
      true,
    );
    expect(recovered.getState().funnel.stepUsers.addToCart.has("u1")).toBe(
      true,
    );
    expect(
      recovered.getState().funnel.stepUsers.checkoutStarted.has("u1"),
    ).toBe(true);
    expect(recovered.getState().funnel.stepUsers.paymentSuccess.has("u1")).toBe(
      true,
    );
  });

  it("clears an incomplete event log when no valid checkpoint exists", async () => {
    const persistence = new MemoryPersistence();

    await persistence.appendEvents("incomplete", 0, [
      normalizedEvent("signup", "u1", "2026-01-01T10:00:00Z"),
    ]);

    const engine = new AnalyticsEngine("UTC");

    const result = await engine.restore({
      persistence,
      datasetKey: "incomplete",
    });

    expect(result.restored).toBe(false);

    expect(await persistence.loadEvents("incomplete")).toHaveLength(0);
  });
});
