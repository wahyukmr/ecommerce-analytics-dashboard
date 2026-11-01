import { bench, describe } from "vitest";
import { createGeneratorConfig } from "../../config/generatorConfig";
import { SyntheticAnalyticsEngine } from "../engine/SyntheticAnalyticsEngine";

describe("SyntheticAnalyticsEngine generation", () => {
  bench(
    "generates and streams 10k users",
    async () => {
      const engine = new SyntheticAnalyticsEngine(
        createGeneratorConfig(10_000),
        {
          chunkSize: 10_000,
          progressIntervalUsers: 1_000,
        },
      );

      await engine.run({
        onChunk: () => undefined,
      });
    },
    {
      iterations: 1,
      warmupIterations: 0,
    },
  );

  bench(
    "generates and streams 100k users",
    async () => {
      const engine = new SyntheticAnalyticsEngine(
        createGeneratorConfig(100_000),
        {
          chunkSize: 10_000,
          progressIntervalUsers: 5_000,
        },
      );

      await engine.run({
        onChunk: () => undefined,
      });
    },
    {
      iterations: 1,
      warmupIterations: 0,
    },
  );
});
