import type { NormalizedEvent } from "../../types";
import { formatDateKey } from "../../libs";
import type { Projection } from "../contracts/Projection";
import type { AnalyticsContext } from "../engine/AnalyticsContext";

const DAY_MS = 86_400_000;

export class PurchaseProjection implements Projection {
  readonly name = "purchase";

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

    const state = context.state.purchase;

    const plans = context.state.users.planByUser;

    for (const event of events) {
      if (event.eventType !== "payment_success") {
        continue;
      }

      const userId = event.userId;

      const existing = state.userPurchases.get(userId);

      const plan = event.properties?.plan ?? plans.get(userId) ?? "free";

      const previousCount = state.purchaseCountByUser.get(userId) ?? 0;

      if (existing === undefined) {
        const firstPurchaseDateKey = formatDateKey(
          event.timestamp,
          context.timezone,
        );

        state.userPurchases.set(userId, {
          userId,
          plan,
          firstPurchase: event.timestamp,
          firstPurchaseDateKey,
        });

        state.purchaseCountByUser.set(userId, Math.max(1, previousCount + 1));

        this.getOrCreateCohort(state.cohorts, firstPurchaseDateKey).users++;

        this.getOrCreateCohort(state.cohortsByPlan[plan], firstPurchaseDateKey)
          .users++;

        continue;
      }

      if (
        existing.secondPurchase !== undefined ||
        event.timestamp <= existing.firstPurchase
      ) {
        continue;
      }

      existing.secondPurchase = event.timestamp;

      state.purchaseCountByUser.set(userId, Math.max(2, previousCount + 1));

      state.repeatCustomerCount++;

      const repeatPurchase = {
        timestamp: event.timestamp,

        elapsedDays: Math.floor(
          (event.timestamp - existing.firstPurchase) / DAY_MS,
        ),
      };

      this.appendRepeatPurchase(
        this.getOrCreateCohort(state.cohorts, existing.firstPurchaseDateKey),
        repeatPurchase,
      );

      this.appendRepeatPurchase(
        this.getOrCreateCohort(
          state.cohortsByPlan[existing.plan],
          existing.firstPurchaseDateKey,
        ),
        repeatPurchase,
      );
    }
  }

  reset(): void {
    const state = this.requireContext().state.purchase;

    state.userPurchases.clear();
    state.purchaseCountByUser.clear();
    state.repeatCustomerCount = 0;
    state.cohorts.clear();
    state.cohortsByPlan.free.clear();
    state.cohortsByPlan.pro.clear();
  }

  private appendRepeatPurchase(
    cohort: {
      users: number;

      repeatPurchases: {
        timestamp: number;
        elapsedDays: number;
      }[];

      retainedByDay?: {
        day1: number;
        day7: number;
        day30: number;
      };
    },

    repeatPurchase: {
      timestamp: number;
      elapsedDays: number;
    },
  ): void {
    cohort.repeatPurchases.push(repeatPurchase);

    const retained =
      cohort.retainedByDay ??
      (cohort.retainedByDay = {
        day1: 0,
        day7: 0,
        day30: 0,
      });

    if (repeatPurchase.elapsedDays <= 0) {
      return;
    }

    if (repeatPurchase.elapsedDays <= 1) {
      retained.day1++;
      retained.day7++;
      retained.day30++;
      return;
    }

    if (repeatPurchase.elapsedDays <= 7) {
      retained.day7++;
      retained.day30++;
      return;
    }

    if (repeatPurchase.elapsedDays <= 30) {
      retained.day30++;
    }
  }

  private getOrCreateCohort(
    cohorts: Map<
      string,
      {
        users: number;

        repeatPurchases: {
          timestamp: number;
          elapsedDays: number;
        }[];

        retainedByDay?: {
          day1: number;
          day7: number;
          day30: number;
        };
      }
    >,

    cohortDate: string,
  ) {
    let cohort = cohorts.get(cohortDate);

    if (!cohort) {
      cohort = {
        users: 0,
        repeatPurchases: [],

        retainedByDay: {
          day1: 0,
          day7: 0,
          day30: 0,
        },
      };

      cohorts.set(cohortDate, cohort);
    }

    return cohort;
  }

  private requireContext(): AnalyticsContext {
    if (this._context === undefined) {
      throw new Error(`Projection "${this.name}" is not initialized.`);
    }

    return this._context;
  }
}
