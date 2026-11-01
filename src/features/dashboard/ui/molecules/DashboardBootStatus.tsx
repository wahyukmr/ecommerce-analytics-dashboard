import { memo } from "react";
import { useAnalyticsStatus } from "../../../../context";
import type { BootStage } from "../../../../generator/engine/BootState";
import { Icon } from "../atoms";

const labels: Record<BootStage, string> = {
  initializing: "Starting analytics engine",
  restoring: "Restoring local checkpoint",
  loading_catalog: "Loading product catalog",
  generating_users: "Building customer population",
  generating_events: "Streaming ecommerce events",
  completed: "Finalizing dashboard",
  cancelled: "Generation cancelled",
  failed: "Generation failed",
};

interface Props {
  readonly onRetry?: () => void;
}

function DashboardBootStatus({ onRetry }: Props): React.JSX.Element | null {
  const {
    stage,
    progress,
    processedUsers,
    totalUsers,
    generatedEvents,
    isBooting,
    error,
  } = useAnalyticsStatus();

  if (error) {
    return (
      <section
        className="rounded-[1.1rem] border border-error/25 bg-error/5 p-4"
        role="alert"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error"
              aria-hidden="true"
            >
              <Icon name="trend-down" size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                Dataset preparation could not finish
              </p>
              <p className="mt-1 wrap-break-words text-sm leading-6 text-text-secondary">
                {error.message}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The existing dashboard state is preserved. Rebuild the selected
                dataset to try again.
              </p>
            </div>
          </div>
          {onRetry ? (
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border-hover bg-surface px-3 text-sm font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-hover"
              onClick={onRetry}
            >
              <Icon name="refresh" size={16} />
              Retry dataset
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (!isBooting) return null;

  const percentage = Math.max(0, Math.min(100, Math.round(progress * 100)));
  const label = stage ? labels[stage] : "Preparing analytics data";

  return (
    <section
      className="surface overflow-hidden"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="status-dot status-dot-building shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">
              {label}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Dashboard metrics are updating from the live aggregate state.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-xs tabular-nums text-muted-foreground">
          <span>
            {processedUsers.toLocaleString()} / {totalUsers.toLocaleString()}{" "}
            users
          </span>
          <span>{generatedEvents.toLocaleString()} events</span>
          <strong className="text-text-primary">{percentage}%</strong>
        </div>
      </div>
      <div className="progress-track rounded-none" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </section>
  );
}

export default memo(DashboardBootStatus);
