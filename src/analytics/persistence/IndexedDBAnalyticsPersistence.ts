import type { NormalizedEvent } from "../../types";
import type {
  AnalyticsCheckpoint,
  AnalyticsPersistence,
} from "./AnalyticsPersistence";

const DATABASE_NAME = "commerce-intelligence-analytics";

const DATABASE_VERSION = 1;

const EVENTS_STORE = "events";
const CHECKPOINTS_STORE = "checkpoints";

interface EventRecord {
  readonly datasetKey: string;
  readonly index: number;
  readonly event: NormalizedEvent;
}

export class IndexedDBAnalyticsPersistence implements AnalyticsPersistence {
  private _databasePromise: Promise<IDBDatabase> | undefined;

  private getDatabase(): Promise<IDBDatabase> {
    if (this._databasePromise) {
      return this._databasePromise;
    }

    if (typeof indexedDB === "undefined") {
      return Promise.reject(
        new Error("IndexedDB is not available in this environment."),
      );
    }

    this._databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(EVENTS_STORE)) {
          const events = database.createObjectStore(EVENTS_STORE, {
            keyPath: ["datasetKey", "index"],
          });

          events.createIndex("datasetKey", "datasetKey", {
            unique: false,
          });
        }

        if (!database.objectStoreNames.contains(CHECKPOINTS_STORE)) {
          database.createObjectStore(CHECKPOINTS_STORE, {
            keyPath: "datasetKey",
          });
        }
      };

      request.onsuccess = () => {
        const database = request.result;

        database.onversionchange = () => {
          database.close();
          this._databasePromise = undefined;
        };

        resolve(database);
      };

      request.onerror = () => {
        this._databasePromise = undefined;
        reject(
          request.error ??
            new Error("Failed to open analytics IndexedDB database."),
        );
      };

      request.onblocked = () => {
        this._databasePromise = undefined;
        reject(
          new Error(
            "Analytics IndexedDB upgrade is blocked by another open tab. Close other dashboard tabs and retry.",
          ),
        );
      };
    });

    return this._databasePromise;
  }

  async appendEvents(
    datasetKey: string,
    startIndex: number,
    events: readonly NormalizedEvent[],
  ): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const database = await this.getDatabase();

    await this.transaction(database, EVENTS_STORE, "readwrite", (store) => {
      for (let offset = 0; offset < events.length; offset++) {
        const event = events[offset];

        if (!event) {
          continue;
        }

        store.put({
          datasetKey,
          index: startIndex + offset,
          event,
        } satisfies EventRecord);
      }
    });
  }

  async loadEvents(datasetKey: string): Promise<readonly NormalizedEvent[]> {
    const database = await this.getDatabase();

    return this.readAll<EventRecord>(
      database,
      EVENTS_STORE,
      IDBKeyRange.bound([datasetKey, 0], [datasetKey, Number.MAX_SAFE_INTEGER]),
    ).then((records) =>
      records
        .sort((left, right) => left.index - right.index)
        .map((record) => record.event),
    );
  }

  async loadCheckpoint(
    datasetKey: string,
  ): Promise<AnalyticsCheckpoint | null> {
    const database = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(CHECKPOINTS_STORE, "readonly");

      const request = transaction
        .objectStore(CHECKPOINTS_STORE)
        .get(datasetKey);

      request.onsuccess = () => {
        resolve((request.result as AnalyticsCheckpoint | undefined) ?? null);
      };

      request.onerror = () => {
        reject(
          request.error ?? new Error("Failed to load analytics checkpoint."),
        );
      };
    });
  }

  async saveCheckpoint(checkpoint: AnalyticsCheckpoint): Promise<void> {
    const database = await this.getDatabase();

    await this.transaction(
      database,
      CHECKPOINTS_STORE,
      "readwrite",
      (store) => {
        store.put(checkpoint);
      },
    );
  }

  /**
   * Returns unique dataset keys without materializing every event record.
   * The datasetKey index uses nextunique, so cost scales with indexed keys rather
   * than deserializing millions of stored event payloads into memory.
   */
  async listDatasetKeys(): Promise<readonly string[]> {
    const database = await this.getDatabase();

    return new Promise<readonly string[]>((resolve, reject) => {
      const keys = new Set<string>();
      const transaction = database.transaction(
        [EVENTS_STORE, CHECKPOINTS_STORE],
        "readonly",
      );
      const eventKeys = transaction
        .objectStore(EVENTS_STORE)
        .index("datasetKey")
        .openKeyCursor(undefined, "nextunique");
      const checkpointKeys = transaction
        .objectStore(CHECKPOINTS_STORE)
        .openKeyCursor();

      eventKeys.onsuccess = () => {
        const cursor = eventKeys.result;
        if (!cursor) return;
        if (typeof cursor.key === "string") keys.add(cursor.key);
        cursor.continue();
      };

      checkpointKeys.onsuccess = () => {
        const cursor = checkpointKeys.result;
        if (!cursor) return;
        if (typeof cursor.key === "string") keys.add(cursor.key);
        cursor.continue();
      };

      transaction.oncomplete = () => resolve([...keys].sort());
      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Failed to inspect saved analytics datasets."),
        );
      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("Analytics dataset inspection was aborted."),
        );
    });
  }

  /** Clears all persisted datasets in one atomic IndexedDB transaction. */
  async clearAll(): Promise<void> {
    const database = await this.getDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        [EVENTS_STORE, CHECKPOINTS_STORE],
        "readwrite",
      );

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Failed to clear saved analytics datasets."),
        );
      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("Clearing saved analytics datasets was aborted."),
        );

      try {
        transaction.objectStore(EVENTS_STORE).clear();
        transaction.objectStore(CHECKPOINTS_STORE).clear();
      } catch (error: unknown) {
        try {
          transaction.abort();
        } catch {
          // The browser may already have aborted this transaction.
        }
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  async clear(datasetKey: string): Promise<void> {
    const database = await this.getDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        [EVENTS_STORE, CHECKPOINTS_STORE],
        "readwrite",
      );

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Failed to clear analytics persistence."),
        );
      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("Analytics persistence clear transaction was aborted."),
        );

      try {
        const events = transaction.objectStore(EVENTS_STORE);
        events.delete(
          IDBKeyRange.bound(
            [datasetKey, 0],
            [datasetKey, Number.MAX_SAFE_INTEGER],
          ),
        );
        transaction.objectStore(CHECKPOINTS_STORE).delete(datasetKey);
      } catch (error: unknown) {
        try {
          transaction.abort();
        } catch {
          // The browser may already have aborted this transaction.
        }
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private transaction(
    database: IDBDatabase,
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => void,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction = database.transaction(storeName, mode);
      } catch (error: unknown) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Analytics persistence transaction failed."),
        );
      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("Analytics persistence transaction was aborted."),
        );

      try {
        operation(transaction.objectStore(storeName));
      } catch (error: unknown) {
        // A synchronous IDB request error (including quota failures) must abort
        // the whole transaction. Never leave a partially written event chunk.
        try {
          transaction.abort();
        } catch {
          // The transaction may already have been auto-aborted by the browser.
        }
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private readAll<T>(
    database: IDBDatabase,
    storeName: string,
    range: IDBKeyRange,
  ): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");

      const request = transaction.objectStore(storeName).getAll(range);

      request.onsuccess = () => {
        resolve((request.result as T[]) ?? []);
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error("Failed to read analytics persistence records."),
        );
      };
    });
  }
}
