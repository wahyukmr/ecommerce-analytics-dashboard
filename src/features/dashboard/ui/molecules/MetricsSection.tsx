import { memo, useMemo } from "react";
import type { DashboardMetrics } from "../../application/types";
import { formatCurrency, formatNumber, formatPercent } from "../../../../libs";
import { useLocale } from "../../../../context";
import MetricCard from "./MetricCard";
import SectionHeader from "./SectionHeader";

function MetricsSection({
  data,
}: {
  readonly data: DashboardMetrics;
}): React.JSX.Element {
  const { workspaceLocale, workspaceCurrency } = useLocale();

  const primary = useMemo(
    () =>
      [
        {
          label: "Revenue",
          value: formatCurrency(
            data.revenue,
            workspaceLocale,
            workspaceCurrency,
          ),
          description: "Successful payment revenue in the current scope.",
          tone: "success" as const,
          icon: "wallet" as const,
          featured: true,
        },
        {
          label: "Orders",
          value: formatNumber(data.orders, workspaceLocale),
          description: "Completed payment events represented as orders.",
          tone: "info" as const,
          icon: "shopping-bag" as const,
        },
        {
          label: "Conversion",
          value: formatPercent(data.conversionRate, workspaceLocale),
          description: "Purchasers among customers who viewed a product.",
          tone: "success" as const,
          icon: "trend-up" as const,
        },
        {
          label: "Average order value",
          value: formatCurrency(
            data.averageOrderValue,
            workspaceLocale,
            workspaceCurrency,
          ),
          description: "Average revenue generated per completed order.",
          tone: "default" as const,
          icon: "activity" as const,
        },
      ] as const,
    [data, workspaceCurrency, workspaceLocale],
  );

  const secondary = useMemo(
    () =>
      [
        {
          label: "Active users",
          value: formatNumber(data.activeUsers, workspaceLocale),
          description: "Customers with activity in the selected scope.",
          tone: "default" as const,
          icon: "users" as const,
        },
        {
          label: "Repeat customers",
          value:
            data.repeatCustomerRate === null
              ? "—"
              : formatPercent(data.repeatCustomerRate, workspaceLocale),
          description: "Share of purchasers who bought more than once.",
          tone: "info" as const,
          icon: "repeat" as const,
        },
        {
          label: "Failed payments",
          value: formatNumber(data.failedPayments, workspaceLocale),
          description: "Payment failures observed in the current scope.",
          tone: "warning" as const,
          icon: "trend-down" as const,
        },
        {
          label: "Cart abandonment",
          value:
            data.cartAbandonmentRate === null
              ? "—"
              : formatPercent(data.cartAbandonmentRate, workspaceLocale),
          description: "Cart sessions without a completed purchase.",
          tone:
            data.cartAbandonmentRate !== null && data.cartAbandonmentRate > 60
              ? ("warning" as const)
              : ("default" as const),
          icon: "cart" as const,
        },
      ] as const,
    [data, workspaceLocale],
  );

  return (
    <section
      id="overview"
      className="section-anchor space-y-5"
      aria-labelledby="metrics-heading"
    >
      <SectionHeader
        id="metrics-heading"
        kicker="01 · Overview"
        title="Business performance"
        description="Start with the four numbers that answer the commercial question fastest, then use customer-health metrics to explain why they moved."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {primary.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {secondary.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </section>
  );
}

export default memo(MetricsSection);
