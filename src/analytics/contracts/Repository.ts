import type { NormalizedEvent } from "../../types";

export interface EventRepository {
  append(events: readonly NormalizedEvent[]): void;

  clear(): void;

  count(): number;

  events(): readonly NormalizedEvent[];
}
