import { describe, expect, it } from "vitest";
import { AnalyticsContext } from "../engine/AnalyticsContext";
import { createAnalyticsState } from "../engine/AnalyticsState";
import { ProductProjection } from "./ProductProjection";
import type { NormalizedEvent } from "../../types";

function createContext() {
  return new AnalyticsContext("UTC", createAnalyticsState());
}

function event(
  eventType: NormalizedEvent["eventType"],
  userId: string,
  properties?: NormalizedEvent["properties"],
): NormalizedEvent {
  return {
    eventType,
    userId,
    timestamp: Date.parse("2026-01-01T10:00:00Z"),

    ...(properties ? { properties } : {}),
  };
}

describe("ProductProjection", () => {
  it("maintains product aggregates incrementally", () => {
    const context = createContext();

    const projection = new ProductProjection();

    projection.initialize(context);

    projection.append([
      event("product_view", "u1", {
        productId: "p1",

        productName: "Sneaker",

        category: "footwear",
      }),

      event("product_view", "u2", {
        productId: "p1",
      }),

      event("add_to_cart", "u1", {
        productId: "p1",
      }),

      event("checkout_started", "u1", {
        productId: "p1",
      }),

      event("payment_success", "u1", {
        productId: "p1",

        revenue: 125_000,
      }),
    ]);

    const product = context.state.products.products.get("p1");

    expect(product).toMatchObject({
      productName: "Sneaker",

      category: "footwear",

      views: 2,
      addToCart: 1,
      checkouts: 1,
      purchases: 1,
      revenue: 125_000,
    });

    expect(product?.uniqueViewers.size).toBe(2);
  });

  it("resets all product aggregates", () => {
    const context = createContext();

    const projection = new ProductProjection();

    projection.initialize(context);

    projection.append([
      event("product_view", "u1", {
        productId: "p1",
      }),
    ]);

    projection.reset();

    expect(context.state.products.products.size).toBe(0);
  });
});
