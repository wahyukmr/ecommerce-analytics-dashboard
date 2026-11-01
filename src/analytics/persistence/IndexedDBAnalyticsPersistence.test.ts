import { describe, expect, it } from "vitest";
import { IndexedDBAnalyticsPersistence } from "./IndexedDBAnalyticsPersistence";

const hasIndexedDB = typeof indexedDB !== "undefined";

describe("IndexedDBAnalyticsPersistence", () => {
  it.skipIf(!hasIndexedDB)(
    "is constructible when IndexedDB is available",
    () => {
      const persistence = new IndexedDBAnalyticsPersistence();

      expect(persistence).toBeInstanceOf(IndexedDBAnalyticsPersistence);
    },
  );

  it.skipIf(hasIndexedDB)(
    "reports unsupported environments clearly",
    async () => {
      const persistence = new IndexedDBAnalyticsPersistence();

      await expect(persistence.loadEvents("test")).rejects.toThrow(
        "IndexedDB is not available in this environment.",
      );
    },
  );
});
