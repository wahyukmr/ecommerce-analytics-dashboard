import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { BootStage } from "../generator/engine/BootState";
import {
  AnalyticsEngine,
  type AnalyticsRestoreResult,
} from "../analytics/engine/AnalyticsEngine";
import { ChunkProcessor } from "../analytics/pipeline/ChunkProcessor";
import { useLocale } from "../context/LocaleContext";
import type { GeneratorConfig } from "../types";
import { WorkerController } from "../workers/WorkerController";
import { IndexedDBAnalyticsPersistence } from "../analytics/persistence/IndexedDBAnalyticsPersistence";
import type { AnalyticsReadModel } from "../analytics/contracts/ReadModel";
import { createAnalyticsDatasetKey } from "../analytics/persistence/datasetKey";
import { SessionOnlyAnalyticsPersistence } from "../analytics/persistence/SessionOnlyAnalyticsPersistence";
import type { PersistenceMode } from "../analytics/persistence/PersistenceMode";
import {
  EMPTY_LOCAL_STORAGE_INFO,
  type LocalStorageInfo,
} from "../analytics/persistence/LocalStorageInfo";
import {
  describePersistenceFailure,
  describeStorageClearFailure,
} from "../analytics/persistence/persistenceErrors";

function scheduleWhenIdle(
  task: () => void,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);

      if (idleHandle !== undefined) {
        const cancelIdle = (
          window as Window & {
            cancelIdleCallback?: (handle: number) => void;
          }
        ).cancelIdleCallback?.bind(window);

        cancelIdle?.(idleHandle);
        idleHandle = undefined;
      }

      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }
    };

    const finish = (execute: boolean) => {
      if (settled) return;

      settled = true;
      cleanup();

      if (execute && !signal.aborted) {
        try {
          task();
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }
      }

      resolve();
    };

    const onAbort = () => finish(false);

    signal.addEventListener("abort", onAbort, { once: true });

    const requestIdle = (
      window as Window & {
        requestIdleCallback?: (
          callback: () => void,
          options?: { timeout: number },
        ) => number;
      }
    ).requestIdleCallback?.bind(window);

    if (requestIdle) {
      idleHandle = requestIdle(() => finish(true), {
        timeout: 50,
      });
      return;
    }

    timeoutHandle = window.setTimeout(() => finish(true), 0);
  });
}

export interface SyntheticAnalyticsState {
  readModel: AnalyticsReadModel;
  stage: BootStage | null;
  progress: number;
  processedUsers: number;
  totalUsers: number;
  generatedEvents: number;
  isBooting: boolean;
  error: Error | null;
  persistenceMode: PersistenceMode;
  persistenceNotice: string | null;
  localStorageInfo: LocalStorageInfo;
  isManagingStorage: boolean;
  storageActionError: string | null;
  setGeneratorConfig: (config: GeneratorConfig) => void;
  refreshLocalStorageInfo: () => Promise<void>;
  removeCurrentSavedDataset: () => Promise<void>;
  clearAllSavedDatasets: () => Promise<void>;
}

const persistence = new IndexedDBAnalyticsPersistence();
const sessionOnlyPersistence = new SessionOnlyAnalyticsPersistence();

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function getPersistenceNotice(error: Error): string {
  return describePersistenceFailure(error);
}

export function useSyntheticAnalytics(
  initialConfig: GeneratorConfig,
): SyntheticAnalyticsState {
  const { workspaceTimezone } = useLocale();
  const [config, setConfig] = useState(initialConfig);
  const [stage, setStage] = useState<BootStage | null>(BootStage.Restoring);
  const [progress, setProgress] = useState(0);
  const [processedUsers, setProcessedUsers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(initialConfig.totalUsers);
  const [generatedEvents, setGeneratedEvents] = useState(0);
  const [isBooting, setIsBooting] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [persistenceMode, setPersistenceMode] =
    useState<PersistenceMode>("checking");
  const [persistenceNotice, setPersistenceNotice] = useState<string | null>(
    null,
  );
  const [localStorageInfo, setLocalStorageInfo] = useState<LocalStorageInfo>(
    EMPTY_LOCAL_STORAGE_INFO,
  );
  const [isManagingStorage, setIsManagingStorage] = useState(false);
  const [storageActionError, setStorageActionError] = useState<string | null>(
    null,
  );
  const storageManagementLock = useRef(false);
  const persistencePausedForPageSession = useRef(false);
  const sessionOnlyNoticeForPageSession = useRef<string | null>(null);

  const datasetKey = useMemo(
    () => createAnalyticsDatasetKey(config, workspaceTimezone),
    [config, workspaceTimezone],
  );

  const runtime = useMemo(
    () => new AnalyticsEngine(workspaceTimezone),
    [workspaceTimezone],
  );

  const processor = useMemo(() => new ChunkProcessor(runtime), [runtime]);

  const subscribe = useCallback(
    (listener: () => void) => {
      let pending = false;
      let timer: number | undefined;

      const notify = () => {
        pending = false;
        timer = undefined;
        listener();
      };

      const unsubscribe = runtime.subscribe(() => {
        if (!isBooting) {
          listener();
          return;
        }

        if (pending) return;

        pending = true;
        timer = window.setTimeout(notify, 750);
      });

      return () => {
        unsubscribe();

        if (timer !== undefined) {
          window.clearTimeout(timer);
          timer = undefined;
        }
      };
    },
    [runtime, isBooting],
  );

  const getReadModel = useCallback(() => runtime.getReadModel(), [runtime]);

  const readModel = useSyncExternalStore(subscribe, getReadModel, getReadModel);

  const refreshLocalStorageInfo = useCallback(async () => {
    let savedDatasetCount: number | null = null;
    let usageBytes: number | null = null;
    let quotaBytes: number | null = null;
    let isPersistent: boolean | null = null;
    const inspectionErrors: string[] = [];

    try {
      savedDatasetCount = (await persistence.listDatasetKeys()).length;
    } catch (inspectionError: unknown) {
      inspectionErrors.push(
        `Could not count saved datasets: ${toError(inspectionError).message}`,
      );
    }

    const storageManager =
      typeof navigator !== "undefined" ? navigator.storage : undefined;

    if (storageManager?.estimate) {
      try {
        const estimate = await storageManager.estimate();
        usageBytes = typeof estimate.usage === "number" ? estimate.usage : null;
        quotaBytes = typeof estimate.quota === "number" ? estimate.quota : null;
      } catch (inspectionError: unknown) {
        inspectionErrors.push(
          `Could not estimate browser storage: ${toError(inspectionError).message}`,
        );
      }
    }

    if (storageManager?.persisted) {
      try {
        isPersistent = await storageManager.persisted();
      } catch {
        // Storage durability reporting is optional and browser-dependent.
      }
    }

    setLocalStorageInfo({
      savedDatasetCount,
      usageBytes,
      quotaBytes,
      isPersistent,
      inspectionError:
        inspectionErrors.length > 0 ? inspectionErrors.join(" ") : null,
      measuredAt: Date.now(),
    });
  }, []);

  const pausePersistenceForPageSession = useCallback(
    (datasetKeyForSession: string, notice: string) => {
      persistencePausedForPageSession.current = true;
      sessionOnlyNoticeForPageSession.current = notice;
      runtime.configurePersistence({
        persistence: sessionOnlyPersistence,
        datasetKey: datasetKeyForSession,
      });
      setPersistenceMode("session-only");
      setPersistenceNotice(notice);
    },
    [runtime],
  );

  const removeCurrentSavedDataset = useCallback(async () => {
    if (isBooting || storageManagementLock.current) return;

    storageManagementLock.current = true;
    setIsManagingStorage(true);
    setStorageActionError(null);

    try {
      // Let any accepted event chunk finish its persistence transaction before
      // deleting the dataset, otherwise a queued write could recreate it.
      await runtime.settlePersistenceQueue();
      await persistence.clear(datasetKey);
      pausePersistenceForPageSession(
        datasetKey,
        "The saved copy of this dataset was removed. Persistent storage is paused for this tab session, so any dataset changes in this tab will stay in memory only.",
      );
    } catch (clearError: unknown) {
      const failure = toError(clearError);
      pausePersistenceForPageSession(
        datasetKey,
        describeStorageClearFailure(failure),
      );
      setStorageActionError(describeStorageClearFailure(failure));
    } finally {
      await refreshLocalStorageInfo();
      storageManagementLock.current = false;
      setIsManagingStorage(false);
    }
  }, [
    datasetKey,
    isBooting,
    refreshLocalStorageInfo,
    runtime,
    pausePersistenceForPageSession,
  ]);

  const clearAllSavedDatasets = useCallback(async () => {
    if (isBooting || storageManagementLock.current) return;

    storageManagementLock.current = true;
    setIsManagingStorage(true);
    setStorageActionError(null);

    try {
      await runtime.settlePersistenceQueue();
      await persistence.clearAll();
      pausePersistenceForPageSession(
        datasetKey,
        "All saved analytics datasets were removed from this site's browser storage. The active dashboard remains available, and persistent storage is paused for this tab session.",
      );
    } catch (clearError: unknown) {
      const failure = toError(clearError);
      pausePersistenceForPageSession(
        datasetKey,
        describeStorageClearFailure(failure),
      );
      setStorageActionError(describeStorageClearFailure(failure));
    } finally {
      await refreshLocalStorageInfo();
      storageManagementLock.current = false;
      setIsManagingStorage(false);
    }
  }, [
    datasetKey,
    isBooting,
    refreshLocalStorageInfo,
    runtime,
    pausePersistenceForPageSession,
  ]);

  useEffect(() => {
    const refreshHandle = window.setTimeout(() => {
      void refreshLocalStorageInfo();
    }, 0);

    return () => window.clearTimeout(refreshHandle);
  }, [refreshLocalStorageInfo]);

  const requestConfig = useCallback((nextConfig: GeneratorConfig) => {
    setStage(BootStage.Restoring);
    setProgress(0);
    setProcessedUsers(0);
    setTotalUsers(nextConfig.totalUsers);
    setGeneratedEvents(0);
    setIsBooting(true);
    setError(null);
    setStorageActionError(null);

    if (persistencePausedForPageSession.current) {
      const notice =
        "Persistent storage is paused for this tab session. The active dataset stays in memory only and will be regenerated after a reload.";
      sessionOnlyNoticeForPageSession.current = notice;
      setPersistenceMode("session-only");
      setPersistenceNotice(notice);
    } else {
      setPersistenceMode("checking");
      setPersistenceNotice(null);
    }

    setConfig(nextConfig);
  }, []);

  useEffect(() => {
    const runAbortController = new AbortController();
    const persistenceOptions = {
      persistence,
      datasetKey,
    } as const;
    const sessionOnlyOptions = {
      persistence: sessionOnlyPersistence,
      datasetKey,
    } as const;

    const pageSessionOnly = persistencePausedForPageSession.current;
    runtime.configurePersistence(
      pageSessionOnly ? sessionOnlyOptions : persistenceOptions,
    );
    runtime.reset();

    if (pageSessionOnly) {
      setPersistenceMode("session-only");
      setPersistenceNotice(
        sessionOnlyNoticeForPageSession.current ??
          "Persistent storage is paused for this tab session. The active dataset stays in memory only and will be regenerated after a reload.",
      );
    } else {
      setPersistenceMode("checking");
      setPersistenceNotice(null);
    }

    const worker = new Worker(
      new URL("../workers/event-generator.worker.ts", import.meta.url),
      { type: "module" },
    );

    const controller = new WorkerController(worker, {
      onChunk: (events) =>
        scheduleWhenIdle(() => {
          if (runAbortController.signal.aborted) return;
          processor.process(events);
        }, runAbortController.signal),

      onProgress: (next) => {
        if (runAbortController.signal.aborted) return;

        setProcessedUsers(next.processedUsers);
        setTotalUsers(next.totalUsers);
        setGeneratedEvents(next.generatedEvents);
        setProgress(next.progress);

        // Detect a failed IndexedDB chunk write as soon as the worker reports
        // progress again, rather than waiting until the final checkpoint.
        const persistenceFailure = runtime.getPersistenceFailure();
        if (persistenceFailure) {
          pausePersistenceForPageSession(
            datasetKey,
            getPersistenceNotice(persistenceFailure),
          );
          void refreshLocalStorageInfo();
        }
      },

      onStage: (nextStage) => {
        if (runAbortController.signal.aborted) return;
        setStage(nextStage);
      },

      onComplete: (count) => {
        if (runAbortController.signal.aborted) return;

        void (async () => {
          try {
            await runtime.checkpoint();
          } catch (persistenceError: unknown) {
            if (runAbortController.signal.aborted) return;

            // The analytics state is already in the active engine. Switch only
            // persistence; do not reset or duplicate the in-memory repository.
            pausePersistenceForPageSession(
              datasetKey,
              getPersistenceNotice(toError(persistenceError)),
            );
          }

          if (runAbortController.signal.aborted) return;

          void refreshLocalStorageInfo();
          setGeneratedEvents(count);
          setProgress(1);
          setProcessedUsers(config.totalUsers);
          setTotalUsers(config.totalUsers);
          setStage(BootStage.Completed);
          setIsBooting(false);
        })().catch((nextError: unknown) => {
          if (runAbortController.signal.aborted) return;

          setError(
            nextError instanceof Error
              ? nextError
              : new Error(String(nextError)),
          );

          setIsBooting(false);
        });
      },

      onError: (nextError) => {
        if (runAbortController.signal.aborted) return;

        setError(nextError);
        setIsBooting(false);
      },
    });

    void (async () => {
      try {
        setStage(BootStage.Restoring);

        if (pageSessionOnly) {
          controller.start(config);
          return;
        }

        let restored: AnalyticsRestoreResult;

        try {
          restored = await runtime.restore(
            persistenceOptions,
            runAbortController.signal,
          );
          setPersistenceMode("persistent");
        } catch (restoreError: unknown) {
          if (runAbortController.signal.aborted) return;

          const storageError = toError(restoreError);
          pausePersistenceForPageSession(
            datasetKey,
            getPersistenceNotice(storageError),
          );
          runtime.reset();
          void refreshLocalStorageInfo();

          // Restore failure is not fatal to the analytics experience. Start a
          // fresh generated dataset using the engine's own in-memory state.
          controller.start(config);
          return;
        }

        if (runAbortController.signal.aborted) return;

        if (restored.restored) {
          void refreshLocalStorageInfo();
          setGeneratedEvents(restored.eventCount);
          setProcessedUsers(config.totalUsers);
          setTotalUsers(config.totalUsers);
          setProgress(1);
          setStage(BootStage.Completed);
          setIsBooting(false);
          controller.terminate();
          return;
        }

        controller.start(config);
      } catch (restoreError: unknown) {
        if (runAbortController.signal.aborted) {
          return;
        }

        setError(toError(restoreError));
        setIsBooting(false);
        controller.terminate();
      }
    })();

    return () => {
      runAbortController.abort();
      controller.cancel();
      controller.terminate();
    };
  }, [
    config,
    datasetKey,
    pausePersistenceForPageSession,
    refreshLocalStorageInfo,
    processor,
    runtime,
  ]);

  return {
    readModel,
    stage,
    progress,
    processedUsers,
    totalUsers,
    generatedEvents,
    isBooting,
    error,
    persistenceMode,
    persistenceNotice,
    localStorageInfo,
    isManagingStorage,
    storageActionError,
    refreshLocalStorageInfo,
    removeCurrentSavedDataset,
    clearAllSavedDatasets,
    setGeneratorConfig: requestConfig,
  };
}
