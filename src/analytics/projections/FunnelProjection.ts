import type { NormalizedEvent } from "../../types";
import type { Projection } from "../contracts/Projection";
import type { AnalyticsContext } from "../engine/AnalyticsContext";

type FunnelStep =
  | "productView"
  | "addToCart"
  | "checkoutStarted"
  | "paymentSuccess";

const STEPS: readonly {
  eventType: NormalizedEvent["eventType"];
  key: FunnelStep;
}[] = [
  {
    eventType: "product_view",
    key: "productView",
  },
  {
    eventType: "add_to_cart",
    key: "addToCart",
  },
  {
    eventType: "checkout_started",
    key: "checkoutStarted",
  },
  {
    eventType: "payment_success",
    key: "paymentSuccess",
  },
];

const STEP_BY_EVENT = new Map<NormalizedEvent["eventType"], number>(
  STEPS.map((step, index) => [step.eventType, index]),
);

export class FunnelProjection implements Projection {
  readonly name = "funnel";

  private _state: AnalyticsContext["state"]["funnel"] | undefined;

  initialize(context: AnalyticsContext): void {
    if (this._state !== undefined) {
      throw new Error(
        `Projection "${this.name}" has already been initialized.`,
      );
    }

    this._state = context.state.funnel;
  }

  append(events: readonly NormalizedEvent[]): void {
    const state = this.requireState();

    for (const event of events) {
      if (event.eventType === "wishlist_add") {
        state.wishlistUsers.add(event.userId);
        continue;
      }

      if (event.eventType === "payment_failed") {
        state.paymentFailed++;
        state.paymentFailedUsers.add(event.userId);
        continue;
      }

      const step = STEP_BY_EVENT.get(event.eventType);

      if (step === undefined) {
        continue;
      }

      const currentMask = state.userStepMasks.get(event.userId) ?? 0;
      const nextMask = currentMask | (1 << step);

      state.userStepMasks.set(event.userId, nextMask);
      this.updateContiguousMilestones(state, event.userId, nextMask);
    }
  }

  reset(): void {
    const state = this.requireState();

    state.stepUsers.productView.clear();
    state.stepUsers.addToCart.clear();
    state.stepUsers.checkoutStarted.clear();
    state.stepUsers.paymentSuccess.clear();
    state.userStepMasks.clear();
    state.wishlistUsers.clear();
    state.paymentFailedUsers.clear();
    state.paymentFailed = 0;
  }

  private updateContiguousMilestones(
    state: AnalyticsContext["state"]["funnel"],
    userId: string,
    mask: number,
  ): void {
    for (let stepIndex = 0; stepIndex < STEPS.length; stepIndex++) {
      if ((mask & (1 << stepIndex)) === 0) {
        break;
      }

      state.stepUsers[STEPS[stepIndex].key].add(userId);
    }
  }

  private requireState(): AnalyticsContext["state"]["funnel"] {
    if (this._state === undefined) {
      throw new Error(`Projection "${this.name}" is not initialized.`);
    }

    return this._state;
  }
}
