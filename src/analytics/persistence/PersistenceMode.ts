/**
 * Describes whether the current dataset is backed by durable browser storage.
 *
 * `session-only` means analytics data remains in the active AnalyticsEngine
 * instance but will not survive a page reload or a dataset change.
 */
export type PersistenceMode = "checking" | "persistent" | "session-only";
