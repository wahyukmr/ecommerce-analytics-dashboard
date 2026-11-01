import { describe, expect, it } from "vitest";
import { createGeneratorConfig } from "../../config/generatorConfig";
import { createAnalyticsDatasetKey } from "./datasetKey";

describe("createAnalyticsDatasetKey", () => {
  it("returns the same key for equivalent generator configuration", () => {
    const first = createGeneratorConfig(10_000);

    const second = createGeneratorConfig(10_000);

    expect(createAnalyticsDatasetKey(first, "UTC")).toBe(
      createAnalyticsDatasetKey(second, "UTC"),
    );
  });

  it("changes when the dataset size changes", () => {
    expect(
      createAnalyticsDatasetKey(createGeneratorConfig(10_000), "UTC"),
    ).not.toBe(
      createAnalyticsDatasetKey(createGeneratorConfig(100_000), "UTC"),
    );
  });

  it("changes when the workspace timezone changes", () => {
    const config = createGeneratorConfig(10_000);

    expect(createAnalyticsDatasetKey(config, "UTC")).not.toBe(
      createAnalyticsDatasetKey(config, "Asia/Jakarta"),
    );
  });
});
