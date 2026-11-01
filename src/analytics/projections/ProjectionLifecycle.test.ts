import { describe, expect, it } from "vitest";
import { createAnalyticsState } from "../engine/AnalyticsState";
import { AnalyticsContext } from "../engine/AnalyticsContext";
import { SessionProjection } from "./SessionProjection";

const context = () => new AnalyticsContext("UTC", createAnalyticsState());

describe("Projection lifecycle", () => {
  it("initializes with context instead of requiring context in constructor", () => {
    const projection = new SessionProjection();
    const runtime = context();

    projection.initialize(runtime);
    projection.append([
      {
        eventType: "product_view",
        userId: "u1",
        timestamp: Date.parse("2026-01-01T00:00:00Z"),
        properties: { sessionId: "s1" },
      },
      {
        eventType: "add_to_cart",
        userId: "u1",
        timestamp: Date.parse("2026-01-01T00:01:00Z"),
        properties: { sessionId: "s1" },
      },
    ]);

    expect(runtime.state.sessions.totalSessions).toBe(1);

    projection.reset();
    expect(runtime.state.sessions.totalSessions).toBe(0);
  });
});
