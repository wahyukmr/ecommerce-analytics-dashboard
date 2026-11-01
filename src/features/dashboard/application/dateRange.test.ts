import { describe, expect, it } from "vitest";
import { resolveDashboardDateRange } from "./dateRange";

describe("resolveDashboardDateRange", () => {
  it("resolves calendar-day boundaries in the workspace timezone", () => {
    const now = Date.parse("2026-03-09T18:00:00.000Z");
    const range = resolveDashboardDateRange("today", now, "Asia/Jakarta");

    expect(range).toEqual({
      from: Date.parse("2026-03-09T17:00:00.000Z"),
      to: Date.parse("2026-03-10T16:59:59.999Z"),
    });
  });
});
