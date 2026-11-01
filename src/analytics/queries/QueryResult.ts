import type { NormalizedEvent } from "../../types";

export interface QueryResult {
  readonly events: readonly NormalizedEvent[];

  readonly total: number;
}
