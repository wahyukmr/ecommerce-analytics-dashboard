import { describe, expect, it } from "vitest";
import {
  classifyPersistenceFailure,
  describePersistenceFailure,
  describeStorageClearFailure,
} from "./persistenceErrors";

describe("persistence error classification", () => {
  it("identifies browser quota failures by error name", () => {
    expect(
      classifyPersistenceFailure({
        name: "QuotaExceededError",
        message: "The operation failed",
      }),
    ).toBe("quota");
  });

  it("identifies quota failures by a useful message when the name is missing", () => {
    expect(
      classifyPersistenceFailure(new Error("Storage quota exceeded")),
    ).toBe("quota");
  });

  it("distinguishes browser storage access failures", () => {
    expect(classifyPersistenceFailure({ name: "SecurityError" })).toBe(
      "blocked",
    );
  });

  it("provides actionable copy for quota failures", () => {
    expect(
      describePersistenceFailure({ name: "QuotaExceededError" }),
    ).toContain("clear saved datasets");
  });

  it("explains that a failed deletion did not prove the stored data was removed", () => {
    expect(describeStorageClearFailure(new Error("denied"))).toContain(
      "saved data may still exist",
    );
  });
});
