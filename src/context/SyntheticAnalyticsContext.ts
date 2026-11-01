import { createContext, use, useMemo } from "react";
import type { AnalyticsReadModel } from "../analytics/contracts/ReadModel";
import type { BootStage } from "../generator/engine/BootState";
import type { GeneratorConfig } from "../types";
import type { PersistenceMode } from "../analytics/persistence/PersistenceMode";
import type { LocalStorageInfo } from "../analytics/persistence/LocalStorageInfo";

export interface SyntheticAnalyticsDataContextValue {
  readonly readModel: AnalyticsReadModel;
  readonly setGeneratorConfig: (config: GeneratorConfig) => void;
  readonly refreshLocalStorageInfo: () => Promise<void>;
  readonly removeCurrentSavedDataset: () => Promise<void>;
  readonly clearAllSavedDatasets: () => Promise<void>;
}

export interface SyntheticAnalyticsStatusContextValue {
  readonly stage: BootStage | null;
  readonly progress: number;
  readonly processedUsers: number;
  readonly totalUsers: number;
  readonly generatedEvents: number;
  readonly isBooting: boolean;
  readonly error: Error | null;
  readonly persistenceMode: PersistenceMode;
  readonly persistenceNotice: string | null;
  readonly localStorageInfo: LocalStorageInfo;
  readonly isManagingStorage: boolean;
  readonly storageActionError: string | null;
}

export const SyntheticAnalyticsDataContext =
  createContext<SyntheticAnalyticsDataContextValue | null>(null);

export const SyntheticAnalyticsStatusContext =
  createContext<SyntheticAnalyticsStatusContextValue | null>(null);

export function useAnalyticsData(): SyntheticAnalyticsDataContextValue {
  const context = use(SyntheticAnalyticsDataContext);

  if (!context) {
    throw new Error(
      "useAnalyticsData must be used within SyntheticAnalyticsProvider.",
    );
  }

  return context;
}

export function useAnalyticsStatus(): SyntheticAnalyticsStatusContextValue {
  const context = use(SyntheticAnalyticsStatusContext);

  if (!context) {
    throw new Error(
      "useAnalyticsStatus must be used within SyntheticAnalyticsProvider.",
    );
  }

  return context;
}

export function useAnalytics() {
  const data = useAnalyticsData();
  const status = useAnalyticsStatus();

  return useMemo(
    () => ({
      ...data,
      ...status,
    }),
    [data, status],
  );
}
