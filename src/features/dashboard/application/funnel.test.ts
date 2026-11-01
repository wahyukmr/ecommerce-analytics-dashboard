import { describe, expect, it } from "vitest";
import {
  buildFunnelDataFromCounts,
  buildFunnelDataFromMasks,
} from "./funnel";

describe("funnel application model", () => {
  it("builds conversion and drop-off metrics from progressive counts", () => {
    const data = buildFunnelDataFromCounts([
      100,
      70,
      40,
      20,
    ]);

    expect(data.steps).toEqual([
      expect.objectContaining({
        usersAtStep: 100,
        shareOfBase: 1,
        conversionRateFromPrevious: 1,
        dropOffFromPrevious: 0,
      }),
      expect.objectContaining({
        usersAtStep: 70,
        shareOfBase: 0.7,
        conversionRateFromPrevious: 0.7,
        dropOffFromPrevious: 30,
        dropOffRateFromPrevious: 0.3,
      }),
      expect.objectContaining({
        usersAtStep: 40,
        shareOfBase: 0.4,
        conversionRateFromPrevious: 40 / 70,
        dropOffFromPrevious: 30,
        dropOffRateFromPrevious: 30 / 70,
      }),
      expect.objectContaining({
        usersAtStep: 20,
        shareOfBase: 0.2,
        conversionRateFromPrevious: 0.5,
        dropOffFromPrevious: 20,
        dropOffRateFromPrevious: 0.5,
      }),
    ]);
  });

  it("applies prerequisite milestones without requiring timestamp order", () => {
    const data = buildFunnelDataFromMasks(
      new Map([
        ["u1", 0b1111],
        ["u2", 0b0111],
        ["u3", 0b1001],
        ["u4", 0b0011],
      ]),
    );

    expect(data.steps.map((step) => step.usersAtStep)).toEqual([
      4,
      3,
      2,
      1,
    ]);
  });

  it("keeps supporting signals separate from the funnel base", () => {
    const data = buildFunnelDataFromCounts(
      [100, 60, 30, 15],
      {
        wishlistUsers: 25,
        paymentFailedUsers: 8,
        paymentFailedAttempts: 11,
      },
    );

    expect(data.supportingSignals).toEqual([
      expect.objectContaining({
        label: "Wishlist / Interest",
        users: 25,
        rateFromBase: 0.25,
      }),
      expect.objectContaining({
        label: "Payment Failed",
        users: 8,
        rateFromBase: 0.08,
        eventCount: 11,
      }),
    ]);
  });
});
