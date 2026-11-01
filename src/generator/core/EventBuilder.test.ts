import { describe, expect, it } from "vitest";
import { createGeneratorConfig } from "../../config/generatorConfig";
import type { RawEvent, User } from "../../types";
import { SimulationContext } from "../context/SimulationContext";
import { EventBuilder } from "./EventBuilder";
import { createUserRuntime } from "../runtime/UserRuntime";

function user(): User {
  return {
    id: "user_test",
    persona: "browser",
    plan: "free",

    signupTimestamp: Date.parse("2026-01-01T10:00:00Z"),

    preferredCategories: ["fashion"],

    intentScore: 0.2,
    hesitationScore: 0.9,
  };
}

describe("EventBuilder", () => {
  it("streams generated events through a sink and returns the emitted count", () => {
    const builder = new EventBuilder();

    const context = new SimulationContext(createGeneratorConfig(1));

    const generated: RawEvent[] = [];

    const count = builder.generateEventsForUser(
      user(),
      createUserRuntime("user_test"),
      context,
      (event) => {
        generated.push(event);
      },
    );

    expect(count).toBe(generated.length);

    expect(count).toBeGreaterThan(0);

    expect(generated[0]?.event_type).toBe("signup");
  });
});
