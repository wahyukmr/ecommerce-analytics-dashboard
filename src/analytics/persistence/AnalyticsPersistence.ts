import type { NormalizedEvent } from "../../types";
import type { AnalyticsState } from "../engine/AnalyticsState";

export interface AnalyticsCheckpoint {
  readonly schemaVersion: 1;
  readonly datasetKey: string;
  readonly revision: number;
  readonly eventCount: number;
  readonly createdAt: number;
  readonly state: AnalyticsState;
}

export interface AnalyticsPersistence {
  appendEvents(
    datasetKey: string,
    startIndex: number,
    events: readonly NormalizedEvent[],
  ): Promise<void>;

  loadEvents(datasetKey: string): Promise<readonly NormalizedEvent[]>;

  loadCheckpoint(datasetKey: string): Promise<AnalyticsCheckpoint | null>;

  saveCheckpoint(checkpoint: AnalyticsCheckpoint): Promise<void>;

  clear(datasetKey: string): Promise<void>;
}

export function cloneAnalyticsState(state: AnalyticsState): AnalyticsState {
  return structuredClone(state);
}
