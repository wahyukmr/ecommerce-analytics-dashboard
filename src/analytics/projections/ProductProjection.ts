import type { NormalizedEvent } from "../../types";
import type { Projection } from "../contracts/Projection";
import type { AnalyticsContext } from "../engine/AnalyticsContext";
import type { ProductAggregate } from "../engine/AnalyticsState";

export class ProductProjection implements Projection {
  readonly name = "product";

  private _state: AnalyticsContext["state"]["products"] | undefined;

  initialize(context: AnalyticsContext): void {
    if (this._state !== undefined) {
      throw new Error(
        `Projection "${this.name}" has already been initialized.`,
      );
    }

    this._state = context.state.products;
  }

  append(events: readonly NormalizedEvent[]): void {
    const state = this.requireState();

    for (const event of events) {
      const productId = event.properties?.productId;

      if (!productId) {
        continue;
      }

      const product = this.getOrCreateProduct(state.products, productId, event);

      if (event.properties?.productName) {
        product.productName = event.properties.productName;
      }

      if (event.properties?.category) {
        product.category = event.properties.category;
      }

      switch (event.eventType) {
        case "product_view":
          product.views++;
          product.uniqueViewers.add(event.userId);
          break;

        case "add_to_cart":
          product.addToCart++;
          break;

        case "checkout_started":
          product.checkouts++;
          break;

        case "payment_success":
          product.purchases++;
          product.revenue += Number(event.properties?.revenue ?? 0);
          break;
      }
    }
  }

  reset(): void {
    this.requireState().products.clear();
  }

  private getOrCreateProduct(
    products: Map<string, ProductAggregate>,
    productId: string,
    event: NormalizedEvent,
  ): ProductAggregate {
    const existing = products.get(productId);

    if (existing) {
      return existing;
    }

    const product: ProductAggregate = {
      productName: event.properties?.productName ?? productId,

      category: event.properties?.category ?? "unknown",

      views: 0,

      uniqueViewers: new Set<string>(),

      addToCart: 0,
      checkouts: 0,
      purchases: 0,
      revenue: 0,
    };

    products.set(productId, product);

    return product;
  }

  private requireState(): AnalyticsContext["state"]["products"] {
    if (this._state === undefined) {
      throw new Error(`Projection "${this.name}" is not initialized.`);
    }

    return this._state;
  }
}
