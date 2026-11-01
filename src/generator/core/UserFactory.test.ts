import { describe, expect, it } from "vitest";
import { createGeneratorConfig } from "../../config/generatorConfig";
import { UserFactory } from "./UserFactory";

describe("UserFactory", () => {
  it("streams users through an iterable instead of materializing the full dataset", () => {
    const factory = new UserFactory();
    const iterable = factory.iterateUsers(createGeneratorConfig(10_000));
    const iterator = iterable[Symbol.iterator]();

    const first = iterator.next();
    const second = iterator.next();

    expect(first.done).toBe(false);
    expect(second.done).toBe(false);

    if (first.done || second.done) {
      throw new Error("Expected iterator to yield users");
    }

    expect(first.value.id).toBe("user_1");
    expect(second.value.id).toBe("user_2");
  });
});
