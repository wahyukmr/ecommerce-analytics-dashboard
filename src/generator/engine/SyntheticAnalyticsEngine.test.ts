import { describe, expect, it } from "vitest";
import { createGeneratorConfig } from "../../config/generatorConfig";
import { SyntheticAnalyticsEngine } from "./SyntheticAnalyticsEngine";

describe("SyntheticAnalyticsEngine", () => {
  it("streams users and throttles progress notifications", async () => {
    const engine = new SyntheticAnalyticsEngine(createGeneratorConfig(100), {
      chunkSize: 25,
      progressIntervalUsers: 20,
    });

    let chunks = 0;

    const progressUpdates: number[] = [];

    let generatedEvents = 0;

    await engine.run({
      onChunk: (events) => {
        chunks++;
        generatedEvents += events.length;
      },

      onProgress: (progress) => {
        progressUpdates.push(progress.processedUsers);
      },
    });

    expect(chunks).toBeGreaterThan(0);

    expect(generatedEvents).toBe(engine.bootState.generatedEvents);

    expect(engine.bootState.processedUsers).toBe(100);

    expect(engine.bootState.progress).toBe(1);

    expect(progressUpdates).toEqual([20, 40, 60, 80, 100]);
  });

  it("does not materialize the full user collection before generation begins", async () => {
    const generatedIndexes: number[] = [];

    const config = createGeneratorConfig(3);

    const userFactory = {
      *iterateUsers(input: typeof config) {
        for (let index = 0; index < input.totalUsers; index++) {
          generatedIndexes.push(index);

          yield {
            id: `user_${index + 1}`,

            persona: "browser" as const,

            plan: "free" as const,

            signupTimestamp: Date.parse("2026-01-01T10:00:00Z"),

            preferredCategories: ["fashion" as const],

            intentScore: 0.2,

            hesitationScore: 0.9,
          };
        }
      },
    };

    const engine = new SyntheticAnalyticsEngine(config, {
      userFactory,
      progressIntervalUsers: 1,
      chunkSize: 1_000,
    });

    let firstChunkObserved = false;

    await engine.run({
      onChunk: () => {
        firstChunkObserved = true;

        expect(generatedIndexes.length).toBeLessThanOrEqual(3);
      },
    });

    expect(firstChunkObserved).toBe(true);

    expect(generatedIndexes).toEqual([0, 1, 2]);
  });
});
