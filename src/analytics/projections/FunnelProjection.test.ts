import { describe, expect, it } from "vitest";
import { AnalyticsContext } from "../engine/AnalyticsContext";
import { createAnalyticsState } from "../engine/AnalyticsState";
import { FunnelProjection } from "./FunnelProjection";
import type { NormalizedEvent } from "../../types";

function event(
  userId: string,
  eventType: NormalizedEvent["eventType"],
  minute: number,
): NormalizedEvent {
  return {
    userId,
    eventType,
    timestamp: Date.parse("2026-01-01T10:00:00Z") + minute * 60_000,
  };
}

describe("FunnelProjection", () => {
  it("counts unique users by milestone when prerequisites are present regardless of event timestamp order", () => {
    const state = createAnalyticsState();
    const projection = new FunnelProjection();
    projection.initialize(new AnalyticsContext("UTC", state));

    projection.append([
      event("u1", "product_view", 0),
      event("u1", "checkout_started", 1),
      event("u1", "payment_success", 2),
      event("u1", "add_to_cart", 3),
      event("u2", "product_view", 5),
      event("u2", "add_to_cart", 6),
      event("u3", "checkout_started", 7),
    ]);

    expect(state.funnel.stepUsers.productView).toEqual(new Set(["u1", "u2"]));
    expect(state.funnel.stepUsers.addToCart).toEqual(new Set(["u1", "u2"]));
    expect(state.funnel.stepUsers.checkoutStarted).toEqual(new Set(["u1"]));
    expect(state.funnel.stepUsers.paymentSuccess).toEqual(new Set(["u1"]));
  });

  it("keeps supporting signals separate from funnel progression", () => {
    const state = createAnalyticsState();
    const projection = new FunnelProjection();
    projection.initialize(new AnalyticsContext("UTC", state));

    projection.append([
      event("u1", "wishlist_add", 0),
      event("u1", "wishlist_add", 1),
      event("u2", "payment_failed", 2),
      event("u2", "payment_failed", 3),
    ]);

    expect(state.funnel.wishlistUsers).toEqual(new Set(["u1"]));
    expect(state.funnel.paymentFailedUsers).toEqual(new Set(["u2"]));
    expect(state.funnel.paymentFailed).toBe(2);
    expect(state.funnel.stepUsers.productView.size).toBe(0);
  });

  it("resets milestone masks and supporting signal state", () => {
    const state = createAnalyticsState();
    const projection = new FunnelProjection();
    projection.initialize(new AnalyticsContext("UTC", state));

    projection.append([
      event("u1", "product_view", 0),
      event("u1", "wishlist_add", 1),
      event("u1", "payment_failed", 2),
    ]);

    projection.reset();

    expect(state.funnel.userStepMasks.size).toBe(0);
    expect(state.funnel.wishlistUsers.size).toBe(0);
    expect(state.funnel.paymentFailedUsers.size).toBe(0);
    expect(state.funnel.paymentFailed).toBe(0);
    expect(state.funnel.stepUsers.productView.size).toBe(0);
  });
});
