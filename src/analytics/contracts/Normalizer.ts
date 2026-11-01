import type { NormalizedEvent, RawEvent } from "../../types";

export interface EventNormalizer {
  normalize(events: readonly RawEvent[]): readonly NormalizedEvent[];
}
