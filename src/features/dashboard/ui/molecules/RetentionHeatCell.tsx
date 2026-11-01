import { memo } from "react";
import { useLocale } from "../../../../context";
import { formatNumber, formatPercent } from "../../../../libs";
import type { RetentionCohortRow } from "../../application/types";

function clampRetentionRatio(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function retentionHeatmapBackground(value: number): string {
  const ratio = clampRetentionRatio(value);
  if (ratio <= 0) return "rgba(255,255,255,0.015)";
  const alpha = Math.round(8 + ratio * 48);
  return `color-mix(in srgb, var(--brand-500) ${alpha}%, var(--surface-1))`;
}

interface Props {
  readonly row: RetentionCohortRow;
  readonly day: number;
  readonly isPrimary: boolean;
  readonly compact?: boolean;
}

function RetentionHeatCell({
  row,
  day,
  isPrimary,
  compact = false,
}: Props): React.JSX.Element {
  const { workspaceLocale } = useLocale();
  const key = `day${day}`;
  const eligible = row.eligibleByDay[key] ?? 0;
  const retained = row.retainedByDay[key] ?? 0;
  const value = row.retention[key] ?? null;

  if (value === null || eligible <= 0) {
    return (
      <div
        aria-label={`Within ${day} days: not mature yet`}
        title={`This cohort is ${row.ageDays} days old and cannot be measured reliably for the ${day}-day window yet.`}
        className={[
          "flex min-h-11 items-center justify-center rounded-lg border border-border bg-white/[0.012] px-2 py-2 text-sm font-semibold text-text-disabled",
          isPrimary ? "ring-1 ring-primary/30" : "",
          compact ? "min-h-12" : "",
        ].join(" ")}
      >
        —
      </div>
    );
  }

  const ratio = clampRetentionRatio(value);

  return (
    <div
      aria-label={`Within ${day} days: ${formatPercent(ratio, workspaceLocale)}, ${formatNumber(retained, workspaceLocale)} of ${formatNumber(eligible, workspaceLocale)}`}
      title={`${formatNumber(retained, workspaceLocale)} of ${formatNumber(eligible, workspaceLocale)} eligible customers bought again within ${day} days.`}
      className={[
        "min-h-11 rounded-lg border px-2.5 py-2 text-right transition-transform duration-150 hover:-translate-y-px",
        compact ? "min-h-12" : "",
        isPrimary
          ? "border-primary/30 ring-1 ring-primary/15"
          : "border-transparent",
      ].join(" ")}
      style={{ background: retentionHeatmapBackground(ratio) }}
    >
      <div className="text-sm font-semibold tabular-nums text-text-primary">
        {formatPercent(ratio, workspaceLocale)}
      </div>
      <div className="mt-0.5 text-[10px] tabular-nums text-text-primary">
        {formatNumber(retained, workspaceLocale)} /{" "}
        {formatNumber(eligible, workspaceLocale)}
      </div>
    </div>
  );
}

export default memo(RetentionHeatCell);
