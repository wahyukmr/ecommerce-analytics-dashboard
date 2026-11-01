import { memo, useMemo } from "react";
import {
  formatAxis,
  formatCurrency,
  formatChartDate,
  formatNumber,
} from "../../../../libs";
import { useLocale } from "../../../../context";
import type { RevenuePoint } from "../../application/types";
import { downsampleTimeSeries } from "../utils/downsample";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, Icon } from "../atoms";
import SectionHeader from "./SectionHeader";

const MAX_CHART_POINTS = 180;

interface RevenueTrendSectionProps {
  readonly data: readonly RevenuePoint[];
}

function RevenueTrendSection({
  data,
}: RevenueTrendSectionProps): React.JSX.Element {
  const { workspaceLocale, workspaceTimezone, workspaceCurrency } = useLocale();

  const chartData = useMemo(
    () =>
      downsampleTimeSeries(data, MAX_CHART_POINTS, (point) => point.revenue),
    [data],
  );

  const summary = useMemo(() => {
    let total = 0;
    let peak = 0;
    let peakDate = data[0]?.date ?? null;

    for (const point of data) {
      total += point.revenue;
      if (point.revenue > peak) {
        peak = point.revenue;
        peakDate = point.date;
      }
    }

    return { total, peak, peakDate };
  }, [data]);

  return (
    <section
      id="trends"
      className="section-anchor space-y-4"
      aria-labelledby="revenue-heading"
    >
      <SectionHeader
        id="revenue-heading"
        kicker="02 · Trends"
        title="Revenue over time"
        description="Daily successful-payment revenue. Use the shape of the curve to spot demand concentration and weak trading days."
        action={
          <span className="status-pill">
            <span className="status-dot status-dot-live" aria-hidden="true" />
            {formatNumber(data.length, workspaceLocale)} days
          </span>
        }
      />

      <div className="surface p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="dashboard-surface-quiet rounded-xl p-3.5">
            <p className="metric-label">Period revenue</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
              {formatCurrency(
                summary.total,
                workspaceLocale,
                workspaceCurrency,
              )}
            </p>
          </div>
          <div className="dashboard-surface-quiet rounded-xl p-3.5">
            <p className="metric-label">Peak day</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
              {summary.peakDate
                ? formatChartDate(
                    summary.peakDate,
                    workspaceLocale,
                    workspaceTimezone,
                  )
                : "—"}
            </p>
          </div>
          <div className="dashboard-surface-quiet rounded-xl p-3.5">
            <p className="metric-label">Peak revenue</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
              {formatCurrency(summary.peak, workspaceLocale, workspaceCurrency)}
            </p>
          </div>
        </div>

        <div className="mt-3 chart-frame chart-frame--tall">
          {data.length === 0 ? (
            <EmptyState
              icon="wallet"
              title="There is no revenue to chart"
              description="No successful purchases were found in the current analysis scope. Broaden the date range or change the plan/category filters."
            />
          ) : (
            <LineChart
              data={chartData}
              style={{ width: "100%", height: "100%" }}
              responsive
              margin={{ top: 10, right: 10, bottom: 6, left: 4 }}
            >
              <CartesianGrid
                stroke="var(--line-0)"
                strokeDasharray="3 5"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tickFormatter={(value: string) =>
                  formatChartDate(value, workspaceLocale, workspaceTimezone)
                }
                tick={{ fill: "var(--ink-4)", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={64}
                tickMargin={8}
                tickFormatter={(value: number) =>
                  formatAxis(value, workspaceLocale)
                }
                tick={{ fill: "var(--ink-4)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke: "var(--line-2)", strokeDasharray: "3 3" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const revenue = Number(payload[0]?.value ?? 0);
                  return (
                    <div className="rounded-xl border border-border-hover bg-surface px-3.5 py-3 shadow-2xl">
                      <p className="text-xs text-muted-foreground">
                        {formatChartDate(
                          String(label),
                          workspaceLocale,
                          workspaceTimezone,
                        )}
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">
                        {formatCurrency(
                          revenue,
                          workspaceLocale,
                          workspaceCurrency,
                        )}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--brand-400)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 4.5,
                  fill: "var(--brand-400)",
                  stroke: "var(--surface-0)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon name="info" size={13} />
          Revenue reflects successful payments only. Failed payment attempts are
          tracked separately in Business performance.
        </p>
      </div>
    </section>
  );
}

export default memo(RevenueTrendSection);
