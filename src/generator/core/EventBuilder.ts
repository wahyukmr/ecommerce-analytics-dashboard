import { DAY_MS } from "../../constant";
import type {
  ECommerceProduct,
  EventProperties,
  EventType,
  RawEvent,
  ReasonFailure,
  User,
  UserPersona,
} from "../../types";
import { Timeline } from "../timeline/Timeline";
import type { SimulationContext } from "../context/SimulationContext";
import type { UserRuntime } from "../runtime/UserRuntime";

type EventSink = (event: RawEvent) => void;

type JourneyResult = {
  viewedProductIds: string[];
  lastTimestamp: number;
};

const FAILURE_REASONS: ReasonFailure[] = [
  "card_declined",
  "insufficient_funds",
  "payment_gateway_timeout",
  "suspected_fraud",
  "currency_not_supported",
  "user_cancelled",
];

export class EventBuilder {
  generateEventsForUser(
    user: User,
    runtime: UserRuntime,
    context: SimulationContext,
    onEvent: EventSink,
  ): number {
    let emittedEvents = 0;

    const emit: EventSink = (event) => {
      onEvent(event);
      emittedEvents++;
    };

    const signupTime = user.signupTimestamp;

    emit(
      this.createEvent("signup", user.id, signupTime, {
        plan: user.plan,
      }),
    );

    const sessionCount = this.getSessionCount(user.persona);

    let cursorTime = signupTime;

    for (let i = 0; i < sessionCount; i++) {
      cursorTime = this.advanceSessionTime(cursorTime, user.persona);

      if (Timeline.isFuture(cursorTime)) {
        break;
      }

      const sessionId = `session_${user.id}_${i}`;

      runtime.sessionId = sessionId;

      if (Math.random() < 0.35 && runtime.lastViewedProducts.length > 2) {
        runtime.lastViewedProducts.splice(
          0,
          runtime.lastViewedProducts.length - 2,
        );
      }

      const journey = this.generatePersonaSession(
        user,
        runtime,
        context,
        sessionId,
        cursorTime,
        emit,
      );

      cursorTime = journey.lastTimestamp;
    }

    return emittedEvents;
  }

  private generatePersonaSession(
    user: User,
    runtime: UserRuntime,
    context: SimulationContext,
    sessionId: string,
    startTime: number,
    emit: EventSink,
  ): JourneyResult {
    switch (user.persona) {
      case "browser":
        return this.browserFlow(
          user,
          runtime,
          context,
          sessionId,
          startTime,
          emit,
        );

      case "interested":
        return this.interestedFlow(
          user,
          runtime,
          context,
          sessionId,
          startTime,
          emit,
        );

      case "buyer":
        return this.buyerFlow(
          user,
          runtime,
          context,
          sessionId,
          startTime,
          emit,
        );

      case "loyal_customer":
        return this.loyalFlow(
          user,
          runtime,
          context,
          sessionId,
          startTime,
          emit,
        );
    }
  }

  private browserFlow(
    user: User,
    runtime: UserRuntime,
    context: SimulationContext,
    sessionId: string,
    start: number,
    emit: EventSink,
  ): JourneyResult {
    const viewedProductIds: string[] = [];
    let cursor = start;
    let lastTimestamp = start;

    const viewCount =
      user.persona === "browser" ? this.random(1, 3) : this.random(2, 6);

    for (let i = 0; i < viewCount; i++) {
      cursor = this.nextTimestamp(cursor, 10, 60);

      if (Timeline.isFuture(cursor)) {
        break;
      }

      const product = this.pickProduct(runtime, context);

      runtime.lastViewedProducts.push(product.id);

      if (runtime.lastViewedProducts.length > 5) {
        runtime.lastViewedProducts.splice(
          0,
          runtime.lastViewedProducts.length - 5,
        );
      }

      viewedProductIds.push(product.id);

      this.emit(emit, "product_view", user.id, cursor, {
        sessionId,
        productId: product.id,
        productName: product.name,
        category: product.category,
      });

      lastTimestamp = cursor;

      const wishlistProbability = user.persona === "browser" ? 0.08 : 0.3;

      if (Math.random() < wishlistProbability) {
        cursor = this.nextTimestamp(cursor, 5, 45);

        if (Timeline.isFuture(cursor)) {
          break;
        }

        this.emit(emit, "wishlist_add", user.id, cursor, {
          sessionId,
          productId: product.id,
          productName: product.name,
          category: product.category,
        });

        lastTimestamp = cursor;
      }
    }

    return {
      viewedProductIds,
      lastTimestamp,
    };
  }

  private interestedFlow(
    user: User,
    runtime: UserRuntime,
    context: SimulationContext,
    sessionId: string,
    start: number,
    emit: EventSink,
  ): JourneyResult {
    const journey = this.browserFlow(
      user,
      runtime,
      context,
      sessionId,
      start,
      emit,
    );

    if (journey.viewedProductIds.length === 0) {
      return journey;
    }

    let cursor = journey.lastTimestamp;

    if (Math.random() < 0.7) {
      cursor = this.nextTimestamp(cursor, 30, 180);

      if (!Timeline.isFuture(cursor)) {
        const selectedProductId =
          journey.viewedProductIds[
            this.random(0, journey.viewedProductIds.length - 1)
          ];

        const selectedProduct = context.productIndex.get(selectedProductId);

        this.emit(emit, "add_to_cart", user.id, cursor, {
          sessionId,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          category: selectedProduct.category,
        });

        runtime.abandonedCart = [selectedProduct.id];

        journey.lastTimestamp = cursor;
      }
    }

    return journey;
  }

  private buyerFlow(
    user: User,
    runtime: UserRuntime,
    context: SimulationContext,
    sessionId: string,
    start: number,
    emit: EventSink,
  ): JourneyResult {
    const journey = this.browserFlow(
      user,
      runtime,
      context,
      sessionId,
      start,
      emit,
    );

    if (journey.viewedProductIds.length === 0) {
      return journey;
    }

    let cursor = journey.lastTimestamp;

    const favoriteProbability = user.persona === "loyal_customer" ? 0.75 : 0.4;

    let selectedProductId: string;

    if (runtime.abandonedCart.length > 0 && Math.random() < 0.55) {
      selectedProductId = runtime.abandonedCart[0];
    } else if (Math.random() < favoriteProbability) {
      selectedProductId = journey.viewedProductIds[0];
    } else {
      selectedProductId =
        journey.viewedProductIds[
          this.random(0, journey.viewedProductIds.length - 1)
        ];
    }

    const selectedProduct = context.productIndex.get(selectedProductId);

    if (Math.random() < 0.35) {
      cursor = this.nextTimestamp(cursor, 60, 600);

      if (!Timeline.isFuture(cursor)) {
        this.emit(emit, "product_view", user.id, cursor, {
          sessionId,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          category: selectedProduct.category,
        });

        runtime.lastViewedProducts.push(selectedProduct.id);

        if (runtime.lastViewedProducts.length > 5) {
          runtime.lastViewedProducts.splice(
            0,
            runtime.lastViewedProducts.length - 5,
          );
        }

        journey.lastTimestamp = cursor;
      }
    }

    cursor = this.nextTimestamp(cursor, 30, 180);

    if (Timeline.isFuture(cursor)) {
      return journey;
    }

    this.emit(emit, "add_to_cart", user.id, cursor, {
      sessionId,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      category: selectedProduct.category,
    });

    runtime.abandonedCart = [selectedProduct.id];

    journey.lastTimestamp = cursor;

    if (Math.random() < 0.15) {
      return journey;
    }

    cursor = this.nextTimestamp(cursor, 30, 300);

    if (Timeline.isFuture(cursor)) {
      return journey;
    }

    this.emit(emit, "checkout_started", user.id, cursor, {
      sessionId,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      category: selectedProduct.category,
    });

    journey.lastTimestamp = cursor;

    if (Math.random() < 0.2) {
      return journey;
    }

    cursor = this.nextTimestamp(cursor, 60, 300);

    if (Timeline.isFuture(cursor)) {
      return journey;
    }

    const success = Math.random() < 0.85;

    if (success) {
      this.emit(emit, "payment_success", user.id, cursor, {
        sessionId,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        category: selectedProduct.category,
        revenue: this.generateRevenue(selectedProduct),
        plan: user.plan,
        success: true,
      });

      runtime.abandonedCart = [];
      runtime.favoriteProductId = selectedProduct.id;
      runtime.purchaseCount++;
      runtime.hasPurchased = true;
      runtime.lastPurchaseTimestamp = cursor;
      journey.lastTimestamp = cursor;

      return journey;
    }

    this.emit(emit, "payment_failed", user.id, cursor, {
      sessionId,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      category: selectedProduct.category,
      reason: this.randomPaymentFailureReason(),
      success: false,
    });

    journey.lastTimestamp = cursor;

    if (Math.random() < 0.45) {
      cursor = this.nextTimestamp(cursor, 30, 300);

      if (!Timeline.isFuture(cursor)) {
        const retrySuccess = Math.random() < 0.75;

        this.emit(
          emit,
          retrySuccess ? "payment_success" : "payment_failed",
          user.id,
          cursor,
          retrySuccess
            ? {
                sessionId,
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                category: selectedProduct.category,
                revenue: this.generateRevenue(selectedProduct),
                plan: user.plan,
                retryAttempt: true,
                success: true,
              }
            : {
                sessionId,
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                category: selectedProduct.category,
                reason: this.randomPaymentFailureReason(),
                retryAttempt: true,
                success: false,
              },
        );

        journey.lastTimestamp = cursor;

        if (retrySuccess) {
          runtime.abandonedCart = [];
          runtime.favoriteProductId = selectedProduct.id;
          runtime.purchaseCount++;
          runtime.hasPurchased = true;
          runtime.lastPurchaseTimestamp = cursor;
        }
      }
    }

    return journey;
  }

  private loyalFlow(
    user: User,
    runtime: UserRuntime,
    context: SimulationContext,
    sessionId: string,
    start: number,
    emit: EventSink,
  ): JourneyResult {
    const journey = this.buyerFlow(
      user,
      runtime,
      context,
      sessionId,
      start,
      emit,
    );

    if (journey.viewedProductIds.length === 0) {
      return journey;
    }

    if (Math.random() >= 0.45 || !runtime.favoriteProductId) {
      return journey;
    }

    let cursor = this.nextTimestamp(journey.lastTimestamp, 300, 1800);

    if (Timeline.isFuture(cursor)) {
      return journey;
    }

    const product = context.productIndex.get(runtime.favoriteProductId);

    this.emit(emit, "customer_return", user.id, cursor, {
      sessionId,
    });

    journey.lastTimestamp = cursor;

    cursor = this.nextTimestamp(cursor, 30, 180);

    if (Timeline.isFuture(cursor)) {
      return journey;
    }

    this.emit(emit, "product_view", user.id, cursor, {
      sessionId,
      productId: product.id,
      productName: product.name,
      category: product.category,
    });

    runtime.lastViewedProducts.push(product.id);

    journey.lastTimestamp = cursor;

    cursor = this.nextTimestamp(cursor, 30, 180);

    if (Timeline.isFuture(cursor)) {
      return journey;
    }

    this.emit(emit, "add_to_cart", user.id, cursor, {
      sessionId,
      productId: product.id,
      productName: product.name,
      category: product.category,
    });

    journey.lastTimestamp = cursor;

    cursor = this.nextTimestamp(cursor, 30, 120);

    if (Timeline.isFuture(cursor)) {
      return journey;
    }

    this.emit(emit, "payment_success", user.id, cursor, {
      sessionId,
      productId: product.id,
      productName: product.name,
      category: product.category,
      revenue: this.generateRevenue(product),
      plan: user.plan,
      repeatOrder: true,
      success: true,
    });

    runtime.purchaseCount++;
    runtime.hasPurchased = true;
    runtime.lastPurchaseTimestamp = cursor;
    runtime.abandonedCart = [];

    journey.lastTimestamp = cursor;

    return journey;
  }

  private emit(
    sink: EventSink,
    eventType: EventType,
    userId: string,
    timestamp: number,
    properties?: EventProperties,
  ): void {
    sink(this.createEvent(eventType, userId, timestamp, properties));
  }

  private createEvent(
    eventType: EventType,
    userId: string,
    timestamp: number,
    properties?: EventProperties,
  ): RawEvent {
    return {
      event_type: eventType,
      user_id: userId,
      timestamp,

      ...(properties ? { properties } : {}),
    };
  }

  private getSessionCount(persona: UserPersona): number {
    switch (persona) {
      case "browser":
        return this.random(1, 2);

      case "interested":
        return this.random(2, 4);

      case "buyer":
        return this.random(3, 5);

      case "loyal_customer":
        return this.random(5, 10);
    }
  }

  private advanceSessionTime(
    currentTime: number,
    persona: UserPersona,
  ): number {
    switch (persona) {
      case "browser":
        return currentTime + this.random(5, 20) * DAY_MS;

      case "interested":
        return currentTime + this.random(2, 7) * DAY_MS;

      case "buyer":
        return currentTime + this.random(1, 5) * DAY_MS;

      case "loyal_customer":
        return currentTime + this.random(1, 3) * DAY_MS;
    }
  }

  private generateRevenue(product: ECommerceProduct): number {
    return this.random(product.priceRange.min, product.priceRange.max);
  }

  private pickProduct(
    runtime: UserRuntime,
    context: SimulationContext,
  ): ECommerceProduct {
    if (runtime.favoriteProductId && Math.random() < 0.4) {
      const favorite = context.productIndex.getOrUndefined(
        runtime.favoriteProductId,
      );

      if (favorite) {
        return favorite;
      }
    }

    if (runtime.lastViewedProducts.length && Math.random() < 0.45) {
      const revisitedId =
        runtime.lastViewedProducts[
          this.random(0, runtime.lastViewedProducts.length - 1)
        ];

      const revisited = context.productIndex.getOrUndefined(revisitedId);

      if (revisited) {
        return revisited;
      }
    }

    return context.WeightedProduct.pick();
  }

  private random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private nextTimestamp(
    current: number,
    minSeconds: number,
    maxSeconds: number,
  ): number {
    return current + this.random(minSeconds, maxSeconds) * 1000;
  }

  private randomPaymentFailureReason(): ReasonFailure {
    return FAILURE_REASONS[this.random(0, FAILURE_REASONS.length - 1)];
  }
}
