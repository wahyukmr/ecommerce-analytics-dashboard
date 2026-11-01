import { memo } from "react";
import type { FunnelStep } from "../../application/types";
import { useLocale } from "../../../../context";
import { formatNumber, formatPercent } from "../../../../libs";
import { Icon } from "../atoms";

interface FunnelStepCardProps {
  readonly index: number;
  readonly totalBase: number;
  readonly step: FunnelStep;
  readonly isLast: boolean;
}

function getStepHelpText(step: string): string {
  switch (step) {
    case "Product View":
      return "Customers who showed product-level interest.";
    case "Add to Cart":
      return "Customers who committed at least one product to cart.";
    case "Checkout":
      return "Customers who entered the purchase flow.";
    case "Purchase":
      return "Customers with a successful payment.";
    default:
      return "Customers who reached this funnel milestone.";
  }
}

function FunnelStepCard({
  index,
  totalBase,
  step,
  isLast,
}: FunnelStepCardProps): React.JSX.Element {
  const { workspaceLocale } = useLocale();
  const isFirst = index === 0;
  const barWidth =
    totalBase > 0 && step.usersAtStep > 0
      ? Math.min(100, Math.max(2, step.shareOfBase * 100))
      : 0;
  const dropOffIsMaterial = !isFirst && step.dropOffRateFromPrevious >= 0.2;

  return (
    <div className="relative">
      {!isFirst ? (
        <div
          className="hidden md:absolute md:-top-3 md:left-[1.1rem] md:block md:h-3 md:border-l md:border-dashed md:border-border-hover"
          aria-hidden="true"
        />
      ) : null}

      <article
        className={[
          "surface surface-hover relative overflow-hidden p-4 sm:p-5",
          dropOffIsMaterial ? "border-warning/20" : "",
          isLast ? "border-success/20" : "",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(15rem,0.9fr)_minmax(0,1.8fr)_minmax(13rem,0.65fr)] lg:items-center lg:gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white/2.5 text-sm font-semibold tabular-nums text-text-secondary"
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-text-primary sm:text-base">
                  {step.step}
                </h3>
                {isLast ? (
                  <span className="status-pill min-h-7 border-success/20 bg-success/5 px-2 text-[10px] text-success">
                    Outcome
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {getStepHelpText(step.step)}
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold tabular-nums text-text-primary">
                {formatNumber(step.usersAtStep, workspaceLocale)} customers
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatPercent(step.shareOfBase, workspaceLocale)} of start
              </span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div
                className={
                  isLast
                    ? "progress-fill progress-fill-success"
                    : "progress-fill"
                }
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {isFirst
                ? "Starting population"
                : `${formatPercent(step.conversionRateFromPrevious, workspaceLocale)} continued from previous step`}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <div className="rounded-xl border border-border bg-white/2 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  Step conversion
                </span>
                {isFirst ? null : (
                  <Icon
                    name="arrow-up-right"
                    size={13}
                    className="text-success"
                  />
                )}
              </div>
              <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">
                {isFirst
                  ? "Baseline"
                  : formatPercent(
                      step.conversionRateFromPrevious,
                      workspaceLocale,
                    )}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-white/2 px-3 py-2.5">
              <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Drop-off
              </span>
              <p
                className={`mt-1 text-sm font-semibold tabular-nums ${dropOffIsMaterial ? "text-warning" : "text-text-primary"}`}
              >
                {isFirst
                  ? "—"
                  : formatNumber(step.dropOffFromPrevious, workspaceLocale)}
              </p>
            </div>
          </div>
        </div>

        {!isFirst && step.dropOffFromPrevious > 0 ? (
          <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span
              className={
                dropOffIsMaterial ? "text-warning" : "text-muted-foreground"
              }
            >
              {formatPercent(step.dropOffRateFromPrevious, workspaceLocale)} of
              the previous milestone did not continue here.
            </span>
            <span className="font-medium tabular-nums text-text-secondary">
              {formatNumber(step.dropOffFromPrevious, workspaceLocale)}{" "}
              customers
            </span>
          </div>
        ) : null}
      </article>
    </div>
  );
}

export default memo(FunnelStepCard);
