import { memo, useMemo } from "react";
import type { FunnelData } from "../../application/types";
import { useLocale } from "../../../../context";
import { formatNumber, formatPercent } from "../../../../libs";
import FunnelStepCard from "./FunnelStepCard";
import SupportingSignalCard from "./SupportingSignalCard";
import SectionHeader from "./SectionHeader";
import { EmptyState, Icon } from "../atoms";

function FunnelSection({
  data,
}: {
  readonly data: FunnelData;
}): React.JSX.Element {
  const { workspaceLocale } = useLocale();
  const base = data.steps[0]?.usersAtStep ?? 0;
  const purchase = data.steps.at(-1)?.usersAtStep ?? 0;
  const finalRate = base > 0 ? purchase / base : 0;

  const biggestDropOff = useMemo(
    () =>
      data.steps
        .slice(1)
        .reduce<FunnelData["steps"][number] | null>((current, step) => {
          if (!current) return step;
          return step.dropOffFromPrevious > current.dropOffFromPrevious
            ? step
            : current;
        }, null),
    [data.steps],
  );

  const hasData = data.steps.some((step) => step.usersAtStep > 0);

  return (
    <section
      id="journey"
      className="section-anchor space-y-4"
      aria-labelledby="funnel-heading"
    >
      <SectionHeader
        id="funnel-heading"
        kicker="03 · Customer journey"
        title="Purchase funnel"
        description="A milestone-based view of the path from product interest to completed payment. Event timestamp order is not required, but each milestone depends on the previous milestone being present."
        action={
          <span className="status-pill">
            <span className="status-dot" aria-hidden="true" />
            Milestone model
          </span>
        }
      />

      {!hasData ? (
        <div className="surface p-4 sm:p-5">
          <EmptyState
            icon="layers"
            title="There is no funnel activity in this scope"
            description="The selected filters do not contain enough customer journey activity to populate the funnel."
            hint="Broaden the date range or choose All plans / All categories."
          />
        </div>
      ) : (
        <div className="surface p-3 sm:p-4 lg:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <FunnelSummary
              label="Starting customers"
              value={formatNumber(base, workspaceLocale)}
            />
            <FunnelSummary
              label="Purchasers"
              value={formatNumber(purchase, workspaceLocale)}
            />
            <FunnelSummary
              label="Final conversion"
              value={formatPercent(finalRate, workspaceLocale)}
              highlighted
            />
          </div>

          <div className="mt-4 space-y-3">
            {data.steps.map((step, index) => (
              <FunnelStepCard
                key={step.step}
                index={index}
                totalBase={base}
                step={step}
                isLast={index === data.steps.length - 1}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.62fr)]">
            <div className="dashboard-surface-quiet rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info"
                  aria-hidden="true"
                >
                  <Icon name="spark" size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Supporting signals
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Interest and payment-friction signals that help explain the
                    journey without becoming mandatory funnel steps.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {data.supportingSignals.map((signal) => (
                  <SupportingSignalCard key={signal.label} signal={signal} />
                ))}
              </div>
            </div>

            {biggestDropOff && biggestDropOff.dropOffFromPrevious > 0 ? (
              <aside
                className="rounded-xl border border-warning/20 bg-warning/4.5 p-4"
                aria-label="Largest funnel drop-off"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning"
                    aria-hidden="true"
                  >
                    <Icon name="trend-down" size={16} />
                  </span>
                  <div>
                    <p className="control-label text-warning">
                      Largest leakage
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-text-primary">
                      {biggestDropOff.step}
                    </h3>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-text-secondary">
                  {formatNumber(
                    biggestDropOff.dropOffFromPrevious,
                    workspaceLocale,
                  )}{" "}
                  customers did not continue from the previous milestone.
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-warning/15 pt-3 text-xs">
                  <span className="text-muted-foreground">Step drop-off</span>
                  <span className="font-semibold tabular-nums text-warning">
                    {formatPercent(
                      biggestDropOff.dropOffRateFromPrevious,
                      workspaceLocale,
                    )}
                  </span>
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function FunnelSummary({
  label,
  value,
  highlighted = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly highlighted?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${highlighted ? "border-success/20 bg-success/4.5" : "border-border bg-white/[0.018]"}`}
    >
      <p className="metric-label">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tracking-tight tabular-nums ${highlighted ? "text-success" : "text-text-primary"}`}
      >
        {value}
      </p>
    </div>
  );
}

export default memo(FunnelSection);
