import { describe, expect, it } from "vitest";
import { InMemoryEventRepository } from "./EventRepository";
import type { NormalizedEvent } from "../../types";

describe("InMemoryEventRepository", () => {
  it("appends a large restored event log without spreading it into a function call", () => {
    const repository = new InMemoryEventRepository();
    const events: NormalizedEvent[] = Array.from(
      { length: 200_000 },
      (_, index) => ({
        eventType: "product_view",
        userId: `u-${index}`,
        timestamp: index,
      }),
    );

    expect(() => repository.append(events)).not.toThrow();
    expect(repository.count()).toBe(200_000);
  });
});
