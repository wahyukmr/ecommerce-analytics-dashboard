import { memo, useMemo } from "react";
import { useLocale } from "../../../../context";
import { formatDecimal, formatNumber, formatChartDate } from "../../../../libs";
import type { EngagementData } from "../../application/types";
import { downsampleTimeSeries } from "../utils/downsample";
import {
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import SectionHeader from "./SectionHeader";
import { EmptyState, Icon } from "../atoms";

const MAX_CHART_POINTS = 180;

interface EngagementSectionProps {
  readonly data: EngagementData;
}

function EngagementSection({
  data,
}: EngagementSectionProps): React.JSX.Element {
  const { workspaceLocale, workspaceTimezone } = useLocale();

  const chartData = useMemo(
    () =>
      downsampleTimeSeries(
        data.dailyActiveUsers,
        MAX_CHART_POINTS,
        (point) => point.users,
      ),
    [data.dailyActiveUsers],
  );

  const stats = useMemo(
    () =>
      [
        [
          "Events / user",
          data.averageEventsPerUser,
          "Breadth of activity per customer.",
        ],
        [
          "Events / session",
          data.averageEventsPerSession,
          "Interaction density inside a session.",
        ],
        [
          "Sessions / user",
          data.averageSessionsPerUser,
          "How often customers return to the site.",
        ],
        [
          "Product depth / user",
          data.productDepthPerUser,
          "Distinct products viewed per customer.",
        ],
      ] as const,
    [
      data.averageEventsPerSession,
      data.averageEventsPerUser,
      data.averageSessionsPerUser,
      data.productDepthPerUser,
    ],
  );

  return (
    <section className="space-y-4" aria-labelledby="engagement-heading">
      <SectionHeader
        id="engagement-heading"
        kicker="Customer activity"
        title="Engagement"
        description="Understand whether the audience is browsing deeply, returning often, or simply passing through."
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.8fr)]">
        <div className="surface p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="metric-label">Daily active users</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Unique customers active on each day.
              </p>
            </div>
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-info/10 text-info"
              aria-hidden="true"
            >
              <Icon name="users" size={16} />
            </span>
          </div>

          <div className="chart-frame">
            {chartData.length === 0 ? (
              <EmptyState
                icon="users"
                title="No activity data yet"
                description="There are no active-user observations in the current scope."
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
                  width={56}
                  allowDecimals={false}
                  tickMargin={8}
                  tickFormatter={(value: number) =>
                    formatNumber(value, workspaceLocale)
                  }
                  tick={{ fill: "var(--ink-4)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--line-2)", strokeDasharray: "3 3" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const users = Number(payload[0]?.value ?? 0);
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
                          {formatNumber(users, workspaceLocale)} active users
                        </p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="var(--cyan-400)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 4.5,
                    fill: "var(--cyan-400)",
                    stroke: "var(--surface-0)",
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map(([label, value, description]) => (
            <article key={label} className="surface surface-hover min-w-0 p-4">
              <p className="metric-label truncate">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-text-primary">
                {value === null
                  ? "—"
                  : formatDecimal(Number(value), workspaceLocale)}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(EngagementSection);
