import type { RawEvent } from "../../types";
import type { AnalyticsEngine } from "../engine/AnalyticsEngine";

export class ChunkProcessor {
  private readonly analytics: AnalyticsEngine;

  constructor(analytics: AnalyticsEngine) {
    this.analytics = analytics;
  }

  process(rawEvents: readonly RawEvent[]): void {
    this.analytics.append(rawEvents);
  }

  getState() {
    return this.analytics.getState();
  }

  reset(): void {
    this.analytics.reset();
  }
}
