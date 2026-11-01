import { describe, expect, it, vi } from "vitest";
import { AnalyticsEngine } from "./AnalyticsEngine";
import { RawEventNormalizer } from "../pipeline/RawEventNormalizer";
import type { RawEvent } from "../../types";
import type { AnalyticsPersistence } from "../persistence/AnalyticsPersistence";

function event(
  eventType: RawEvent["event_type"],
  userId: string,
  timestamp: string,
  properties?: RawEvent["properties"],
): RawEvent {
  return {
    event_type: eventType,
    user_id: userId,
    timestamp: Date.parse(timestamp),
    ...(properties !== undefined ? { properties } : {}),
  };
}

describe("AnalyticsEngine", () => {
  it("publishes a new read model when analytical state changes", () => {
    const engine = new AnalyticsEngine("UTC");
    const listener = vi.fn();
    const initialReadModel = engine.getReadModel();

    const unsubscribe = engine.subscribe(listener);

    expect(initialReadModel.revision).toBe(0);
    expect(initialReadModel.eventCount).toBe(0);

    engine.append([event("signup", "u1", "2026-01-01T10:00:00Z")]);

    const nextReadModel = engine.getReadModel();

    expect(nextReadModel.revision).toBe(1);
    expect(nextReadModel.eventCount).toBe(1);
    expect(nextReadModel).not.toBe(initialReadModel);
    expect(listener).toHaveBeenCalledTimes(1);

    engine.append([]);

    expect(engine.getReadModel()).toBe(nextReadModel);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    engine.reset();

    expect(engine.getReadModel().revision).toBe(2);
    expect(engine.getReadModel().eventCount).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps the read model query capability current without exposing mutable state", () => {
    const engine = new AnalyticsEngine("UTC");
    const queryBeforeAppend = engine.getReadModel().query;

    engine.append([
      event("signup", "u1", "2026-01-01T10:00:00Z"),
      event("payment_success", "u1", "2026-01-01T10:01:00Z", {
        sessionId: "s1",
        revenue: 100_000,
      }),
    ]);

    const afterAppend = engine.getReadModel();

    expect(queryBeforeAppend({}).total).toBe(2);
    expect(afterAppend.query({ eventTypes: ["payment_success"] }).total).toBe(
      1,
    );
    expect(afterAppend.query({}).events[0]?.eventType).toBe("signup");
  });

  it("normalizes, stores, indexes and projects one event stream", () => {
    const engine = new AnalyticsEngine("UTC");

    engine.append([
      event("signup", "u1", "2026-01-01T10:00:00Z", { plan: "pro" }),
      event("product_view", "u1", "2026-01-01T10:01:00Z", {
        sessionId: "s1",
        productId: "p1",
        category: "fashion",
      }),
      event("add_to_cart", "u1", "2026-01-01T10:02:00Z", {
        sessionId: "s1",
        productId: "p1",
        category: "fashion",
      }),
      event("checkout_started", "u1", "2026-01-01T10:02:30Z", {
        sessionId: "s1",
        productId: "p1",
        category: "fashion",
      }),
      event("payment_success", "u1", "2026-01-01T10:03:00Z", {
        sessionId: "s1",
        productId: "p1",
        category: "fashion",
        revenue: 100_000,
      }),
      event("payment_success", "u1", "2026-01-08T10:03:00Z", {
        sessionId: "s2",
        productId: "p1",
        category: "fashion",
        revenue: 150_000,
      }),
    ]);

    const state = engine.getState();

    expect(state.revenue.totalOrders).toBe(2);
    expect(state.revenue.totalRevenue).toBe(250_000);
    expect(state.users.totalUsers).toBe(1);
    expect(state.sessions.totalSessions).toBe(2);
    expect(state.products.products.get("p1")?.views).toBe(1);
    expect(state.products.products.get("p1")?.purchases).toBe(2);
    expect(state.products.products.get("p1")?.revenue).toBe(250_000);
    expect(state.products.products.get("p1")?.uniqueViewers.size).toBe(1);
    expect(state.purchase.repeatCustomerCount).toBe(1);
    expect(state.sessions.cartSessionIds.size).toBe(1);
    expect(state.sessions.purchasedSessionIds.size).toBe(2);
    expect(state.funnel.stepUsers.paymentSuccess.has("u1")).toBe(true);
    expect(state.funnel.wishlistUsers.size).toBe(0);
    expect(state.funnel.paymentFailedUsers.size).toBe(0);
    expect(state.funnel.paymentFailed).toBe(0);
    expect(
      state.purchase.userPurchases.get("u1")?.secondPurchase,
    ).toBeDefined();
    expect(
      state.purchase.cohorts.get("2026-01-01")?.repeatPurchases[0]?.elapsedDays,
    ).toBe(7);
    expect(engine.getReadModel().getRevenueByDay("pro").get("2026-01-01")).toBe(
      100_000,
    );
    expect(engine.getReadModel().getActiveUsersByDay().get("2026-01-01")).toBe(
      1,
    );
    expect(
      engine.getReadModel().getPurchaseCohorts("pro").get("2026-01-01")
        ?.repeatPurchases[0]?.elapsedDays,
    ).toBe(7);

    expect(engine.query({ eventTypes: ["payment_success"] }).total).toBe(2);
    expect(engine.query({ plans: ["pro"] }).total).toBe(6);
  });

  it("resets repository, indexes and projection state together", () => {
    const engine = new AnalyticsEngine("UTC");

    engine.append([
      event("signup", "u1", "2026-01-01T10:00:00Z"),
      event("payment_success", "u1", "2026-01-01T10:01:00Z", {
        sessionId: "s1",
        revenue: 10_000,
      }),
    ]);

    const previousState = engine.getState();
    engine.reset();

    expect(engine.getState()).not.toBe(previousState);
    expect(engine.getState().revenue.totalOrders).toBe(0);
    expect(engine.getState().revenue.totalRevenue).toBe(0);
    expect(engine.getState().sessions.totalSessions).toBe(0);
    expect(engine.getState().purchase.userPurchases.size).toBe(0);
    expect(engine.getState().purchase.cohorts.size).toBe(0);
    expect(engine.getState().purchase.cohortsByPlan.pro.size).toBe(0);
    expect(engine.getState().purchase.repeatCustomerCount).toBe(0);
    expect(engine.getState().products.products.size).toBe(0);
    expect(engine.getState().sessions.cartSessionIds.size).toBe(0);
    expect(engine.getState().sessions.purchasedSessionIds.size).toBe(0);
    expect(engine.getReadModel().getRevenueByDay().size).toBe(0);
    expect(engine.getReadModel().getActiveUsersByDay().size).toBe(0);
    expect(engine.query({}).total).toBe(0);
  });

  it("exposes asynchronous persistence failures without throwing from the event pipeline", async () => {
    const persistence: AnalyticsPersistence = {
      appendEvents: vi.fn(() =>
        Promise.reject(
          Object.assign(new Error("The storage quota was exceeded."), {
            name: "QuotaExceededError",
          }),
        ),
      ),
      loadEvents: vi.fn(() => Promise.resolve([])),
      loadCheckpoint: vi.fn(() => Promise.resolve(null)),
      saveCheckpoint: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
    };
    const engine = new AnalyticsEngine("UTC");
    engine.configurePersistence({ persistence, datasetKey: "quota-test" });

    engine.append([event("signup", "u-quota", "2026-01-01T10:00:00Z")]);
    await expect(engine.settlePersistenceQueue()).resolves.toBeUndefined();
    expect(engine.getPersistenceFailure()?.name).toBe("QuotaExceededError");
    expect(engine.getPersistenceFailure()?.message).toContain("quota");
  });

  it("does not partially accept invalid ingestion", () => {
    const normalizer = new RawEventNormalizer();

    expect(() =>
      normalizer.normalize([
        event("payment_success", "u1", "2026-01-01T10:00:00Z", {
          revenue: -1,
        }),
      ]),
    ).toThrow("Invalid revenue");
  });
});
