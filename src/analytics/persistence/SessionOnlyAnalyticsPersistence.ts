import type { NormalizedEvent } from "../../types";
import type {
  AnalyticsCheckpoint,
  AnalyticsPersistence,
} from "./AnalyticsPersistence";

/**
 * No-op persistence adapter used when IndexedDB is unavailable or fails.
 *
 * The active AnalyticsEngine remains the source of truth for the current page
 * session. This adapter intentionally does not duplicate its event repository
 * in memory, which would multiply memory usage for large generated datasets.
 */
export class SessionOnlyAnalyticsPersistence implements AnalyticsPersistence {
  appendEvents(
    _datasetKey: string,
    _startIndex: number,
    _events: readonly NormalizedEvent[],
  ): Promise<void> {
    // The AnalyticsEngine already retains this session's events in its repository.
    return Promise.resolve();
  }

  loadEvents(_datasetKey: string): Promise<readonly NormalizedEvent[]> {
    return Promise.resolve([]);
  }

  loadCheckpoint(_datasetKey: string): Promise<AnalyticsCheckpoint | null> {
    return Promise.resolve(null);
  }

  saveCheckpoint(_checkpoint: AnalyticsCheckpoint): Promise<void> {
    // Intentionally no-op: session-only data is not durable.
    return Promise.resolve();
  }

  clear(_datasetKey: string): Promise<void> {
    // Intentionally no-op: the current engine owns in-session state.
    return Promise.resolve();
  }
}
