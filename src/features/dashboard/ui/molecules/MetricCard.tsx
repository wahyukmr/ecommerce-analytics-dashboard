import { memo } from "react";
import { Icon } from "../atoms";
import type { IconName } from "../atoms/Icon";

type MetricTone = "default" | "success" | "warning" | "danger" | "info";

interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly tone?: MetricTone;
  readonly icon?: IconName;
  readonly featured?: boolean;
}

const toneClass: Record<MetricTone, string> = {
  default: "text-text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-error",
  info: "text-info",
};

const iconClass: Record<MetricTone, string> = {
  default: "bg-white/5 text-text-secondary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-error/10 text-error",
  info: "bg-info/10 text-info",
};

function MetricCard({
  label,
  value,
  description,
  tone = "default",
  icon = "activity",
  featured = false,
}: MetricCardProps): React.JSX.Element {
  return (
    <article
      className={[
        "metric-hero surface surface-hover min-w-0 p-4 sm:p-5",
        featured ? "border-primary/25" : "",
      ].join(" ")}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="metric-label min-w-0 truncate">{label}</p>
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass[tone]}`}
          aria-hidden="true"
        >
          <Icon name={icon} size={18} />
        </span>
      </div>

      <p className={`metric-value relative z-10 ${toneClass[tone]}`}>{value}</p>
      <p className="metric-description relative z-10">{description}</p>
    </article>
  );
}

export default memo(MetricCard);
