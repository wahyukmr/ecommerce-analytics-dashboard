import { formatDateKey } from "../../libs";
import type { NormalizedEvent, PurchasePlan } from "../../types";
import type { Projection } from "../contracts/Projection";
import type { AnalyticsContext } from "../engine/AnalyticsContext";

export class UserProjection implements Projection {
  readonly name = "user";

  private _context: AnalyticsContext | undefined;

  initialize(context: AnalyticsContext): void {
    if (this._context !== undefined) {
      throw new Error(
        `Projection "${this.name}" has already been initialized.`,
      );
    }

    this._context = context;
  }

  append(events: readonly NormalizedEvent[]): void {
    const context = this.requireContext();

    const state = context.state.users;

    for (const event of events) {
      const { userId } = event;

      if (!state.seenUsers.has(userId)) {
        state.seenUsers.add(userId);

        state.totalUsers++;
      }

      if (event.eventType === "signup" && !state.signedUpUsers.has(userId)) {
        state.signedUpUsers.add(userId);

        state.newUsers++;
      }

      if (
        event.eventType === "customer_return" &&
        !state.returningUserIds.has(userId)
      ) {
        state.returningUserIds.add(userId);

        state.returningUsers++;
      }

      const plan = event.properties?.plan;

      if (plan !== undefined) {
        this.updatePlan(state.planByUser, state, userId, plan);
      }

      if (event.eventType === "product_view" && event.properties?.productId) {
        state.viewedUserProducts.add(`${userId}:${event.properties.productId}`);
      }

      const day = formatDateKey(event.timestamp, context.timezone);

      const activeDayKey = `${day}:${userId}`;

      if (state.activeUserDays.has(activeDayKey)) {
        continue;
      }

      state.activeUserDays.add(activeDayKey);

      state.usersByDay.set(day, (state.usersByDay.get(day) ?? 0) + 1);
    }
  }

  reset(): void {
    const state = this.requireContext().state.users;

    state.totalUsers = 0;
    state.newUsers = 0;
    state.returningUsers = 0;
    state.proUsers = 0;
    state.freeUsers = 0;

    state.planByUser.clear();
    state.seenUsers.clear();
    state.signedUpUsers.clear();
    state.returningUserIds.clear();
    state.activeUserDays.clear();
    state.viewedUserProducts.clear();
    state.usersByDay.clear();
  }

  private updatePlan(
    plans: Map<string, PurchasePlan>,

    state: AnalyticsContext["state"]["users"],

    userId: string,

    nextPlan: PurchasePlan,
  ): void {
    const previousPlan = plans.get(userId);

    if (previousPlan === nextPlan) {
      return;
    }

    if (previousPlan === "pro") {
      state.proUsers--;
    } else if (previousPlan === "free") {
      state.freeUsers--;
    }

    plans.set(userId, nextPlan);

    if (nextPlan === "pro") {
      state.proUsers++;
    } else {
      state.freeUsers++;
    }
  }

  private requireContext(): AnalyticsContext {
    if (this._context === undefined) {
      throw new Error(`Projection "${this.name}" has not been initialized.`);
    }

    return this._context;
  }
}
