import type { NormalizedEvent } from "../../types";
import type { AnalyticsContext } from "../engine/AnalyticsContext";

export interface Projection {
  readonly name: string;

  initialize(context: AnalyticsContext): void;

  append(events: readonly NormalizedEvent[]): void;

  reset(): void;
}
