import { type PropsWithChildren, useMemo } from "react";
import {
  SyntheticAnalyticsDataContext,
  SyntheticAnalyticsStatusContext,
} from "./SyntheticAnalyticsContext";
import type { GeneratorConfig } from "../types";
import { useSyntheticAnalytics } from "../hooks/useSyntheticAnalytics";

interface SyntheticAnalyticsProviderProps extends PropsWithChildren {
  config: GeneratorConfig;
}

export function SyntheticAnalyticsProvider({
  config,
  children,
}: SyntheticAnalyticsProviderProps) {
  const analytics = useSyntheticAnalytics(config);

  const dataValue = useMemo(
    () => ({
      readModel: analytics.readModel,
      setGeneratorConfig: analytics.setGeneratorConfig,
      refreshLocalStorageInfo: analytics.refreshLocalStorageInfo,
      removeCurrentSavedDataset: analytics.removeCurrentSavedDataset,
      clearAllSavedDatasets: analytics.clearAllSavedDatasets,
    }),
    [
      analytics.readModel,
      analytics.setGeneratorConfig,
      analytics.refreshLocalStorageInfo,
      analytics.removeCurrentSavedDataset,
      analytics.clearAllSavedDatasets,
    ],
  );

  const statusValue = useMemo(
    () => ({
      stage: analytics.stage,
      progress: analytics.progress,
      processedUsers: analytics.processedUsers,
      totalUsers: analytics.totalUsers,
      generatedEvents: analytics.generatedEvents,
      isBooting: analytics.isBooting,
      error: analytics.error,
      persistenceMode: analytics.persistenceMode,
      persistenceNotice: analytics.persistenceNotice,
      localStorageInfo: analytics.localStorageInfo,
      isManagingStorage: analytics.isManagingStorage,
      storageActionError: analytics.storageActionError,
    }),
    [
      analytics.stage,
      analytics.progress,
      analytics.processedUsers,
      analytics.totalUsers,
      analytics.generatedEvents,
      analytics.isBooting,
      analytics.error,
      analytics.persistenceMode,
      analytics.persistenceNotice,
      analytics.localStorageInfo,
      analytics.isManagingStorage,
      analytics.storageActionError,
    ],
  );

  return (
    <SyntheticAnalyticsDataContext value={dataValue}>
      <SyntheticAnalyticsStatusContext value={statusValue}>
        {children}
      </SyntheticAnalyticsStatusContext>
    </SyntheticAnalyticsDataContext>
  );
}
