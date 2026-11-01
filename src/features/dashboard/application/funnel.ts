import { ECOMMERCE_FUNNEL_CONFIG, ZERO_SIGNAL_COUNTS } from "../../../constant";
import type { FunnelData, FunnelSignal, FunnelStep } from "./types";

export interface FunnelSignalCounts {
  readonly wishlistUsers: number;
  readonly paymentFailedUsers: number;
  readonly paymentFailedAttempts: number;
}

export function buildFunnelDataFromCounts(
  usersAtStep: readonly number[],
  signals: FunnelSignalCounts = ZERO_SIGNAL_COUNTS,
): FunnelData {
  const base = usersAtStep[0] ?? 0;

  const steps: FunnelStep[] = ECOMMERCE_FUNNEL_CONFIG.STEPS.map(
    ({ label }, index) => {
      const users = Math.max(0, usersAtStep[index] ?? 0);
      const previous = index > 0 ? Math.max(0, usersAtStep[index - 1] ?? 0) : 0;
      const dropOff = index === 0 ? 0 : Math.max(0, previous - users);

      return {
        step: label,
        usersAtStep: users,
        shareOfBase: base > 0 ? users / base : 0,
        conversionRateFromPrevious:
          index === 0 ? 1 : previous > 0 ? users / previous : 0,
        dropOffFromPrevious: dropOff,
        dropOffRateFromPrevious: previous > 0 ? dropOff / previous : 0,
      };
    },
  );

  return {
    steps,
    supportingSignals: buildSupportingSignals(base, signals),
  };
}

export function buildFunnelDataFromMasks(
  userStepMasks: ReadonlyMap<string, number>,
  signals: FunnelSignalCounts = ZERO_SIGNAL_COUNTS,
): FunnelData {
  const usersAtStep = Array<number>(ECOMMERCE_FUNNEL_CONFIG.STEPS.length).fill(
    0,
  );

  for (const mask of userStepMasks.values()) {
    for (
      let stepIndex = 0;
      stepIndex < ECOMMERCE_FUNNEL_CONFIG.STEPS.length;
      stepIndex++
    ) {
      if ((mask & (1 << stepIndex)) === 0) {
        break;
      }

      usersAtStep[stepIndex] = (usersAtStep[stepIndex] ?? 0) + 1;
    }
  }

  return buildFunnelDataFromCounts(usersAtStep, signals);
}

function buildSupportingSignals(
  baseUsers: number,
  signals: FunnelSignalCounts,
): readonly FunnelSignal[] {
  return [
    {
      label: ECOMMERCE_FUNNEL_CONFIG.SUPPORTING_SIGNALS[0].label,
      description: ECOMMERCE_FUNNEL_CONFIG.SUPPORTING_SIGNALS[0].description,
      users: Math.max(0, signals.wishlistUsers),
      rateFromBase:
        baseUsers > 0 ? Math.max(0, signals.wishlistUsers) / baseUsers : 0,
    },
    {
      label: ECOMMERCE_FUNNEL_CONFIG.SUPPORTING_SIGNALS[1].label,
      description: ECOMMERCE_FUNNEL_CONFIG.SUPPORTING_SIGNALS[1].description,
      users: Math.max(0, signals.paymentFailedUsers),
      rateFromBase:
        baseUsers > 0 ? Math.max(0, signals.paymentFailedUsers) / baseUsers : 0,
      eventCount: Math.max(0, signals.paymentFailedAttempts),
    },
  ];
}
