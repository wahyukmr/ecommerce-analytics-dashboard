import { memo, useMemo, useState } from "react";
import type {
  RetentionCohortRow,
  RetentionData,
} from "../../application/types";
import { useLocale } from "../../../../context";
import { formatChartDate, formatNumber, formatPercent } from "../../../../libs";
import RetentionHeatCell from "./RetentionHeatCell";
import SectionHeader from "./SectionHeader";
import { EmptyState, Icon } from "../atoms";

const VIRTUALIZATION_THRESHOLD = 120;
const ROW_HEIGHT = 62;
const VIEWPORT_HEIGHT = 500;
const OVERSCAN_ROWS = 8;

interface RetentionSectionProps {
  readonly data: RetentionData;
}

function RetentionSection({ data }: RetentionSectionProps): React.JSX.Element {
  const { workspaceLocale, workspaceTimezone } = useLocale();
  const [showDefinition, setShowDefinition] = useState(false);
  const summary = data.summary;
  const cohorts = data.cohorts;
  const retentionDays = data.retentionDaysUsed;

  const bestCohortKey = useMemo(() => {
    const primaryKey = `day${summary.primaryWindow}`;
    let best: RetentionCohortRow | null = null;
    let bestRate = -1;

    for (const row of cohorts) {
      const rate = row.retention[primaryKey] ?? null;
      if (
        rate !== null &&
        row.eligibleByDay[primaryKey] !== undefined &&
        rate > bestRate
      ) {
        best = row;
        bestRate = rate;
      }
    }

    return best?.cohortDate ?? null;
  }, [cohorts, summary.primaryWindow]);

  const matureCohorts = useMemo(() => {
    const key = `day${summary.primaryWindow}`;
    return cohorts.filter((row) => row.retention[key] !== null).length;
  }, [cohorts, summary.primaryWindow]);

  if (cohorts.length === 0) {
    return (
      <section
        id="retention"
        className="section-anchor space-y-4"
        aria-labelledby="retention-heading"
      >
        <SectionHeader
          id="retention-heading"
          kicker="05 · Retention"
          title="Repeat purchase retention"
          description="Customer cohorts grouped by first successful purchase, measured by how often they return for a second purchase."
        />
        <div className="surface p-4 sm:p-5">
          <EmptyState
            icon="repeat"
            title="No purchase cohorts in this scope"
            description="Retention needs at least one successful first purchase. Try a wider date range or a broader plan/category scope."
          />
        </div>
      </section>
    );
  }

  const heroValue =
    summary.primaryWindowRetentionRate === null
      ? "—"
      : formatPercent(summary.primaryWindowRetentionRate, workspaceLocale);
  const heroReliable = summary.primaryWindowEligibleCustomers >= 100;

  return (
    <section
      id="retention"
      className="section-anchor space-y-4"
      aria-labelledby="retention-heading"
    >
      <SectionHeader
        id="retention-heading"
        kicker="05 · Retention"
        title="Repeat purchase retention"
        description="A cohort view of customer quality: how reliably first-time buyers return for a second purchase within the measurement window."
        action={
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white/2 px-3.5 text-sm font-semibold text-text-secondary transition-colors duration-150 hover:border-border-hover hover:bg-white/4 hover:text-text-primary"
            aria-expanded={showDefinition}
            aria-controls="retention-definition"
            onClick={() => setShowDefinition((value) => !value)}
          >
            <Icon name="info" size={15} />
            {showDefinition ? "Hide definition" : "How to read"}
          </button>
        }
      />

      {showDefinition ? (
        <div
          id="retention-definition"
          className="dashboard-surface-quiet rounded-xl border border-border p-4 text-sm leading-6 text-text-secondary"
          role="note"
        >
          <strong className="text-text-primary">Cohort:</strong> customers are
          grouped by the date of their first successful purchase.{" "}
          <strong className="text-text-primary">Retention:</strong> the share of
          customers who are old enough to be measured for a window and made a
          second purchase inside that window.{" "}
          <strong className="text-text-primary">—:</strong> not enough time has
          passed; it is not zero retention.
        </div>
      ) : null}

      <div className="surface overflow-hidden p-3 sm:p-4">
        <div className="rounded-[0.95rem] border border-primary/15 bg-[linear-gradient(135deg,rgba(245,109,103,0.08),rgba(14,20,29,0.12))] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="control-label text-primary">Primary retention</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-4xl font-semibold tracking-tight tabular-nums text-text-primary sm:text-5xl">
                  {heroValue}
                </span>
                <span className="text-sm font-medium text-text-secondary">
                  within {summary.primaryWindow} days
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {heroReliable
                  ? `${formatNumber(summary.primaryWindowRetainedCustomers, workspaceLocale)} of ${formatNumber(summary.primaryWindowEligibleCustomers, workspaceLocale)} eligible customers returned.`
                  : `${formatNumber(summary.primaryWindowEligibleCustomers, workspaceLocale)} eligible customers are currently measured; treat this rate as directional.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[18rem]">
              <StatChip
                label="Repeat customers"
                value={formatNumber(summary.repeatCustomers, workspaceLocale)}
              />
              <StatChip
                label="Cohort days measured"
                value={formatNumber(matureCohorts, workspaceLocale)}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <RetentionMetric
            label="Overall repeat rate"
            value={formatPercent(summary.repeatPurchaseRate, workspaceLocale)}
            description={`${formatNumber(summary.repeatCustomers, workspaceLocale)} of ${formatNumber(summary.totalCustomers, workspaceLocale)} customers made a second purchase.`}
          />
          <RetentionMetric
            label="Median time to repeat"
            value={
              summary.medianTimeToSecondPurchaseDays === null
                ? "—"
                : `${formatNumber(summary.medianTimeToSecondPurchaseDays, workspaceLocale)}d`
            }
            description="The middle observed time from first to second purchase."
          />
          <RetentionMetric
            label="Average time to repeat"
            value={
              summary.averageTimeToSecondPurchaseDays === null
                ? "—"
                : `${formatNumber(summary.averageTimeToSecondPurchaseDays, workspaceLocale)}d`
            }
            description="Mean elapsed time; long-return customers can increase it."
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-white/[0.012] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="control-label">Cohort coverage</p>
            <p className="mt-1 text-sm text-text-secondary">
              {formatNumber(cohorts.length, workspaceLocale)} cohorts through{" "}
              {formatChartDate(
                data.todayKey,
                workspaceLocale,
                workspaceTimezone,
              )}
            </p>
          </div>
          {bestCohortKey ? (
            <div className="flex items-center gap-2 text-xs">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success"
                aria-hidden="true"
              >
                <Icon name="trend-up" size={14} />
              </span>
              <span className="text-muted-foreground">Best mature cohort</span>
              <strong className="text-text-secondary">
                {formatChartDate(
                  bestCohortKey,
                  workspaceLocale,
                  workspaceTimezone,
                )}
              </strong>
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Cohort heatmap
              </h3>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                Each cell shows retained customers / eligible customers. Warmer
                cells indicate stronger repeat-purchase retention. Recent
                cohorts show — until they have enough age for that window.
              </p>
            </div>
            <RetentionLegend
              retentionDays={retentionDays}
              primaryWindow={summary.primaryWindow}
            />
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <div className="hidden md:block">
              {cohorts.length <= VIRTUALIZATION_THRESHOLD ? (
                <RetentionTable
                  cohorts={cohorts}
                  retentionDays={retentionDays}
                  primaryWindow={summary.primaryWindow}
                  bestCohortKey={bestCohortKey}
                  workspaceLocale={workspaceLocale}
                  workspaceTimezone={workspaceTimezone}
                />
              ) : (
                <VirtualizedRetentionTable
                  cohorts={cohorts}
                  retentionDays={retentionDays}
                  primaryWindow={summary.primaryWindow}
                  bestCohortKey={bestCohortKey}
                  workspaceLocale={workspaceLocale}
                  workspaceTimezone={workspaceTimezone}
                />
              )}
            </div>

            <div className="space-y-2 p-2 md:hidden">
              {cohorts.map((row) => (
                <RetentionMobileCard
                  key={row.cohortDate}
                  row={row}
                  retentionDays={retentionDays}
                  primaryWindow={summary.primaryWindow}
                  isBest={row.cohortDate === bestCohortKey}
                  workspaceLocale={workspaceLocale}
                  workspaceTimezone={workspaceTimezone}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <LegendNote
            title="Mature"
            body="Enough calendar time has passed to measure the selected window."
          />
          <LegendNote
            title="0%"
            body="Mature cohort, but no second purchase landed inside the window."
          />
          <LegendNote
            title="—"
            body="Not measurable yet. This prevents young cohorts from looking artificially weak."
          />
        </div>
      </div>
    </section>
  );
}

function StatChip({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-surface/55 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">
        {value}
      </p>
    </div>
  );
}

function RetentionMetric({
  label,
  value,
  description,
}: {
  readonly label: string;
  readonly value: string;
  readonly description: string;
}): React.JSX.Element {
  return (
    <article className="dashboard-surface-quiet surface-hover rounded-xl p-4">
      <p className="metric-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-text-primary">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </article>
  );
}

function RetentionLegend({
  retentionDays,
  primaryWindow,
}: {
  readonly retentionDays: readonly number[];
  readonly primaryWindow: number;
}): React.JSX.Element {
  return (
    <div
      className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
      aria-label="Retention heatmap legend"
    >
      {retentionDays.map((day) => (
        <span
          key={day}
          className={`inline-flex min-h-7 items-center rounded-lg border px-2.5 ${day === primaryWindow ? "border-primary/25 bg-primary/5 text-text-secondary" : "border-border"}`}
        >
          {day === primaryWindow ? "Primary · " : ""}
          {day}d
        </span>
      ))}
    </div>
  );
}

function LegendNote({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-white/[0.012] px-3 py-2.5 text-xs leading-5">
      <span className="font-semibold text-text-secondary">{title}</span>
      <span className="text-muted-foreground"> · {body}</span>
    </div>
  );
}

function RetentionTable({
  cohorts,
  retentionDays,
  primaryWindow,
  bestCohortKey,
  workspaceLocale,
  workspaceTimezone,
}: {
  readonly cohorts: readonly RetentionCohortRow[];
  readonly retentionDays: readonly number[];
  readonly primaryWindow: number;
  readonly bestCohortKey: string | null;
  readonly workspaceLocale: string;
  readonly workspaceTimezone: string;
}): React.JSX.Element {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-2xl">
        <div className="grid grid-cols-[minmax(10rem,1.15fr)_6rem_repeat(3,minmax(6.5rem,1fr))] gap-1 border-b border-border bg-surface px-2 py-2">
          <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Cohort
          </div>
          <div className="px-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Customers
          </div>
          {retentionDays.map((day) => (
            <div
              key={day}
              className={`px-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] ${day === primaryWindow ? "text-primary" : "text-muted-foreground"}`}
            >
              {day}d
            </div>
          ))}
        </div>
        <div>
          {cohorts.map((row) => (
            <RetentionGridRow
              key={row.cohortDate}
              {...{
                row,
                retentionDays,
                primaryWindow,
                isBest: row.cohortDate === bestCohortKey,
                workspaceLocale,
                workspaceTimezone,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VirtualizedRetentionTable({
  cohorts,
  retentionDays,
  primaryWindow,
  bestCohortKey,
  workspaceLocale,
  workspaceTimezone,
}: {
  readonly cohorts: readonly RetentionCohortRow[];
  readonly retentionDays: readonly number[];
  readonly primaryWindow: number;
  readonly bestCohortKey: string | null;
  readonly workspaceLocale: string;
  readonly workspaceTimezone: string;
}): React.JSX.Element {
  const [scrollTop, setScrollTop] = useState(0);
  const visibleStart = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
  );
  const visibleEnd = Math.min(
    cohorts.length,
    Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN_ROWS,
  );
  const visibleRows = cohorts.slice(visibleStart, visibleEnd);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-2xl">
        <div className="grid grid-cols-[minmax(10rem,1.15fr)_6rem_repeat(3,minmax(6.5rem,1fr))] gap-1 border-b border-border bg-surface px-2 py-2">
          <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Cohort
          </div>
          <div className="px-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Customers
          </div>
          {retentionDays.map((day) => (
            <div
              key={day}
              className={`px-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] ${day === primaryWindow ? "text-primary" : "text-muted-foreground"}`}
            >
              {day}d
            </div>
          ))}
        </div>
        <div
          className="overflow-y-auto"
          style={{ height: VIEWPORT_HEIGHT }}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          <div
            className="relative"
            style={{ height: cohorts.length * ROW_HEIGHT }}
          >
            {visibleRows.map((row, relativeIndex) => {
              const index = visibleStart + relativeIndex;
              return (
                <div
                  key={row.cohortDate}
                  className="absolute inset-x-0"
                  style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                >
                  <RetentionGridRow
                    row={row}
                    retentionDays={retentionDays}
                    primaryWindow={primaryWindow}
                    isBest={row.cohortDate === bestCohortKey}
                    workspaceLocale={workspaceLocale}
                    workspaceTimezone={workspaceTimezone}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RetentionGridRow({
  row,
  retentionDays,
  primaryWindow,
  isBest,
  workspaceLocale,
  workspaceTimezone,
}: {
  readonly row: RetentionCohortRow;
  readonly retentionDays: readonly number[];
  readonly primaryWindow: number;
  readonly isBest: boolean;
  readonly workspaceLocale: string;
  readonly workspaceTimezone: string;
}): React.JSX.Element {
  return (
    <div
      className={`grid min-h-15.5 grid-cols-[minmax(10rem,1.15fr)_6rem_repeat(3,minmax(6.5rem,1fr))] items-center gap-1 border-b border-border px-2 ${isBest ? "bg-success/2.5" : "data-row"}`}
    >
      <div className="min-w-0 px-2">
        <p className="truncate text-xs font-semibold text-text-primary">
          {formatChartDate(row.cohortDate, workspaceLocale, workspaceTimezone)}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {row.ageDays}d old{isBest ? " · best mature cohort" : ""}
        </p>
      </div>
      <div className="px-2 text-right text-xs font-semibold tabular-nums text-text-secondary">
        {formatNumber(row.cohortSize, workspaceLocale)}
      </div>
      {retentionDays.map((day) => (
        <RetentionHeatCell
          key={day}
          row={row}
          day={day}
          isPrimary={day === primaryWindow}
        />
      ))}
    </div>
  );
}

function RetentionMobileCard({
  row,
  retentionDays,
  primaryWindow,
  isBest,
  workspaceLocale,
  workspaceTimezone,
}: {
  readonly row: RetentionCohortRow;
  readonly retentionDays: readonly number[];
  readonly primaryWindow: number;
  readonly isBest: boolean;
  readonly workspaceLocale: string;
  readonly workspaceTimezone: string;
}): React.JSX.Element {
  return (
    <article
      className={`rounded-xl border p-3 ${isBest ? "border-success/20 bg-success/2.5" : "border-border bg-white/[0.012]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">
            {formatChartDate(
              row.cohortDate,
              workspaceLocale,
              workspaceTimezone,
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatNumber(row.cohortSize, workspaceLocale)} customers ·{" "}
            {row.ageDays}d old
          </p>
        </div>
        {isBest ? (
          <span className="status-pill border-success/20 bg-success/5 px-2 text-[10px] text-success">
            Best
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {retentionDays.map((day) => (
          <div key={day}>
            <p
              className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${day === primaryWindow ? "text-primary" : "text-muted-foreground"}`}
            >
              {day}d
            </p>
            <RetentionHeatCell
              row={row}
              day={day}
              isPrimary={day === primaryWindow}
              compact
            />
          </div>
        ))}
      </div>
    </article>
  );
}

export default memo(RetentionSection);
