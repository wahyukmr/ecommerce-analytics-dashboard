import { memo } from "react";
import type { FunnelSignal } from "../../application/types";
import { useLocale } from "../../../../context";
import { formatNumber, formatPercent } from "../../../../libs";
import { Icon } from "../atoms";

function SupportingSignalCard({
  signal,
}: {
  readonly signal: FunnelSignal;
}): React.JSX.Element {
  const { workspaceLocale } = useLocale();
  const isFailure = signal.label.toLowerCase().includes("failed");

  return (
    <article className="dashboard-surface-quiet surface-hover rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isFailure ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}
          aria-hidden="true"
        >
          <Icon name={isFailure ? "trend-down" : "spark"} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-text-primary">
              {signal.label}
            </h4>
            <span className="text-xs font-semibold tabular-nums text-text-secondary">
              {formatPercent(signal.rateFromBase, workspaceLocale)}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {signal.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold tabular-nums text-text-primary">
              {formatNumber(signal.users, workspaceLocale)} customers
            </span>
            {signal.eventCount !== undefined ? (
              <span className="text-muted-foreground">
                {formatNumber(signal.eventCount, workspaceLocale)} attempts
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(SupportingSignalCard);
