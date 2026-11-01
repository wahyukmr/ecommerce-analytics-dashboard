import { useRef, useState } from "react";
import { useAnalyticsData, useAnalyticsStatus } from "../../../../context";
import { formatBytes } from "../../../../analytics/persistence/LocalStorageInfo";
import Icon from "../atoms/Icon";

type ClearAction = "current" | "all" | null;

function formatMeasuredAt(value: number): string {
  if (!value) return "Not checked yet";

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LocalDatasetManagement(): React.JSX.Element {
  const {
    refreshLocalStorageInfo,
    removeCurrentSavedDataset,
    clearAllSavedDatasets,
  } = useAnalyticsData();
  const {
    isBooting,
    persistenceMode,
    localStorageInfo,
    isManagingStorage,
    storageActionError,
  } = useAnalyticsStatus();
  const [expanded, setExpanded] = useState(false);
  const [confirmation, setConfirmation] = useState<ClearAction>(null);
  const managementButtonRef = useRef<HTMLButtonElement>(null);

  const busy = isBooting || isManagingStorage;
  const savedCount = localStorageInfo.savedDatasetCount;
  const hasSavedDatasets = savedCount === null || savedCount > 0;

  async function confirmClear(): Promise<void> {
    const action = confirmation;

    if (action === "current") {
      await removeCurrentSavedDataset();
    } else if (action === "all") {
      await clearAllSavedDatasets();
    }

    setConfirmation(null);
    managementButtonRef.current?.focus();
  }

  return (
    <section className="dashboard-surface-quiet overflow-hidden rounded-2xl border border-border">
      <button
        ref={managementButtonRef}
        type="button"
        className="flex min-h-12 w-full flex-col gap-2 px-4 py-3 text-left transition-colors duration-200 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset sm:flex-row sm:items-center sm:justify-between"
        aria-expanded={expanded}
        aria-controls="local-dataset-management-panel"
        onClick={() => {
          setExpanded((value) => !value);
          setConfirmation(null);
        }}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary">
            <Icon name="database" size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-text-primary">
              Local data
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              {savedCount === null
                ? "Browser storage details unavailable"
                : `${savedCount.toLocaleString()} saved ${savedCount === 1 ? "dataset" : "datasets"} · ${formatBytes(localStorageInfo.usageBytes)} used by this site`}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-text-secondary">
          <span>{expanded ? "Hide details" : "Manage storage"}</span>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={15} />
        </span>
      </button>

      <div
        id="local-dataset-management-panel"
        hidden={!expanded}
        className="space-y-4 border-t border-border px-4 py-4"
      >
        <p className="max-w-3xl text-sm leading-6 text-text-secondary">
          Analytics data is stored in this browser for this site. It is not
          uploaded to a server. Storage usage is an origin-wide browser estimate
          and may include other data stored by this application.
        </p>

        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <StorageStat
            label="Datasets saved"
            value={
              savedCount === null ? "Unavailable" : savedCount.toLocaleString()
            }
          />
          <StorageStat
            label="Estimated usage"
            value={formatBytes(localStorageInfo.usageBytes)}
          />
          <StorageStat
            label="Estimated quota"
            value={formatBytes(localStorageInfo.quotaBytes)}
          />
          <StorageStat
            label="Storage durability"
            value={
              localStorageInfo.isPersistent === null
                ? "Not reported"
                : localStorageInfo.isPersistent
                  ? "Persistent permission granted"
                  : "Browser-managed"
            }
          />
        </dl>

        {localStorageInfo.inspectionError ? (
          <p
            className="wrap-break-word rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs leading-5 text-text-secondary"
            role="status"
          >
            {localStorageInfo.inspectionError}
          </p>
        ) : null}

        {storageActionError ? (
          <p
            className="wrap-break-word rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm leading-5 text-text-secondary"
            role="alert"
          >
            {storageActionError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || !hasSavedDatasets}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setConfirmation("current")}
          >
            <Icon name="database" size={15} />
            Remove current saved copy
          </button>
          <button
            type="button"
            disabled={busy || savedCount === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm font-medium text-error transition-colors duration-200 hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setConfirmation("all")}
          >
            <Icon name="trash-2" size={15} />
            Clear all saved datasets
          </button>
          <button
            type="button"
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void refreshLocalStorageInfo()}
          >
            <Icon name="refresh-cw" size={15} />
            Refresh estimate
          </button>
        </div>

        {confirmation ? (
          <div
            className="rounded-xl border border-warning/30 bg-warning/5 p-4"
            aria-labelledby="local-data-confirm-title"
          >
            <p
              id="local-data-confirm-title"
              className="text-sm font-semibold text-text-primary"
            >
              {confirmation === "current"
                ? "Remove the saved copy of this dataset?"
                : "Clear every saved analytics dataset?"}
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
              {confirmation === "current"
                ? "Only the persistent copy for the active dataset will be removed. Other saved datasets stay untouched. The dashboard remains in memory and persistence pauses for this tab, so the saved copy will not be recreated immediately."
                : "All event records and checkpoints saved by this dashboard for this site will be deleted. The current dashboard remains available in memory, but it will not survive a reload. Close other dashboard tabs first; another active tab may recreate its own saved dataset. This action cannot be undone."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                autoFocus
                disabled={busy}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-error/30 bg-error/10 px-4 py-2 text-sm font-semibold text-error transition-colors duration-200 hover:bg-error/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error disabled:opacity-50"
                onClick={() => void confirmClear()}
              >
                {isManagingStorage ? "Clearing…" : "Confirm deletion"}
              </button>
              <button
                type="button"
                disabled={busy}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                onClick={() => {
                  setConfirmation(null);
                  managementButtonRef.current?.focus();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Last checked: {formatMeasuredAt(localStorageInfo.measuredAt)} ·
          Persistence mode: {persistenceMode}
        </p>
      </div>
    </section>
  );
}

function StorageStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface/50 px-3 py-2.5">
      <dt className="control-label">{label}</dt>
      <dd className="mt-1 wrap-break-words text-sm font-semibold text-text-primary">
        {value}
      </dd>
    </div>
  );
}
