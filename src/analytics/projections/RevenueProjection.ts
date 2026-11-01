import type { NormalizedEvent, PurchasePlan } from "../../types";
import { formatDateKey } from "../../libs";
import type { Projection } from "../contracts/Projection";
import type { AnalyticsContext } from "../engine/AnalyticsContext";

export class RevenueProjection implements Projection {
  readonly name = "revenue";

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
    const state = context.state.revenue;
    const users = context.state.users;
    const purchases = context.state.purchase;

    for (const event of events) {
      if (event.eventType === "payment_failed") {
        state.failedPayments++;
        continue;
      }

      if (event.eventType !== "payment_success") continue;

      state.successfulPayments++;
      state.totalOrders++;

      const amount = Number(event.properties?.revenue ?? 0);

      state.totalRevenue += amount;

      const plan = this.resolvePlan(
        event.userId,
        event.properties?.plan,
        users.planByUser,
        purchases.userPurchases,
      );

      state.revenueByPlan[plan] += amount;

      const day = formatDateKey(event.timestamp, context.timezone);

      state.revenueByDay.set(day, (state.revenueByDay.get(day) ?? 0) + amount);

      const planRevenueByDay = state.revenueByDayByPlan[plan];

      planRevenueByDay.set(day, (planRevenueByDay.get(day) ?? 0) + amount);
    }
  }

  reset(): void {
    const state = this.requireContext().state.revenue;

    state.totalRevenue = 0;
    state.totalOrders = 0;
    state.successfulPayments = 0;
    state.failedPayments = 0;

    state.revenueByPlan.free = 0;

    state.revenueByPlan.pro = 0;

    state.revenueByDay.clear();

    state.revenueByDayByPlan.free.clear();
    state.revenueByDayByPlan.pro.clear();
  }

  private resolvePlan(
    userId: string,
    eventPlan: PurchasePlan | undefined,
    userPlans: ReadonlyMap<string, PurchasePlan>,
    purchaseProfiles: ReadonlyMap<string, { plan: PurchasePlan }>,
  ): PurchasePlan {
    return (
      eventPlan ??
      purchaseProfiles.get(userId)?.plan ??
      userPlans.get(userId) ??
      "free"
    );
  }

  private requireContext(): AnalyticsContext {
    if (this._context === undefined) {
      throw new Error(`Projection "${this.name}" is not initialized.`);
    }

    return this._context;
  }
}
