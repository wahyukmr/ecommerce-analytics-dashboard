import { describe, expect, it } from "vitest";
import { downsampleTimeSeries } from "./downsample";

describe("downsampleTimeSeries", () => {
  it("returns the original reference when downsampling is unnecessary", () => {
    const data = [
      { date: "2026-01-01", value: 1 },
      { date: "2026-01-02", value: 2 },
    ] as const;

    expect(downsampleTimeSeries(data, 10, (point) => point.value)).toBe(data);
  });

  it("always preserves the first and last point", () => {
    const data = Array.from({ length: 20 }, (_, index) => ({
      date: `2026-01-${String(index + 1).padStart(2, "0")}`,
      value: index,
    }));

    const result = downsampleTimeSeries(data, 8, (point) => point.value);

    expect(result).toHaveLength(8);
    expect(result[0]).toBe(data[0]);
    expect(result.at(-1)).toBe(data.at(-1));
  });

  it("preserves a strong local spike", () => {
    const data = [
      { date: "2026-01-01", value: 10 },
      { date: "2026-01-02", value: 11 },
      { date: "2026-01-03", value: 100 },
      { date: "2026-01-04", value: 12 },
      { date: "2026-01-05", value: 13 },
      { date: "2026-01-06", value: 14 },
    ];

    const result = downsampleTimeSeries(data, 5, (point) => point.value);

    expect(result.some((point) => point.value === 100)).toBe(true);
  });
});
