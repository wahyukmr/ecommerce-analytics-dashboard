import { describe, expect, it } from "vitest";
import { createAnalyticsState } from "../engine/AnalyticsState";
import { SessionOnlyAnalyticsPersistence } from "./SessionOnlyAnalyticsPersistence";

describe("SessionOnlyAnalyticsPersistence", () => {
  it("does not claim that session data can be restored", async () => {
    const persistence = new SessionOnlyAnalyticsPersistence();

    await expect(persistence.loadEvents("dataset-a")).resolves.toEqual([]);
    await expect(persistence.loadCheckpoint("dataset-a")).resolves.toBeNull();
  });

  it("accepts write and clear operations without duplicating events", async () => {
    const persistence = new SessionOnlyAnalyticsPersistence();

    await expect(persistence.appendEvents("dataset-a", 0, [])).resolves.toBeUndefined();
    await expect(
      persistence.saveCheckpoint({
        schemaVersion: 1,
        datasetKey: "dataset-a",
        revision: 0,
        eventCount: 0,
        createdAt: 0,
        state: createAnalyticsState(),
      }),
    ).resolves.toBeUndefined();
    await expect(persistence.clear("dataset-a")).resolves.toBeUndefined();
  });
});
