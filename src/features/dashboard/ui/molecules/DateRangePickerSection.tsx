import type {
  DashboardDateRangePreset,
  DashboardFilters,
} from "../../application/types";
import type { ProductCategory, PurchasePlan } from "../../../../types";
import { Icon } from "../atoms";

interface Props {
  readonly filters: DashboardFilters;
  readonly onChange: (patch: Partial<DashboardFilters>) => void;
  readonly disabled?: boolean;
}

const ranges: readonly { value: DashboardDateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last_7_days", label: "7 days" },
  { value: "last_30_days", label: "30 days" },
  { value: "this_month", label: "This month" },
  { value: "all", label: "All time" },
];

const plans: readonly { value: "all" | PurchasePlan; label: string }[] = [
  { value: "all", label: "All plans" },
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
];

const categories: readonly { value: "all" | ProductCategory; label: string }[] =
  [
    { value: "all", label: "All categories" },
    { value: "fashion", label: "Fashion" },
    { value: "beauty", label: "Beauty" },
    { value: "footwear", label: "Footwear" },
    { value: "accessories", label: "Accessories" },
  ];

function SelectControl({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly { value: string; label: string }[];
  readonly onChange: (value: string) => void;
  readonly disabled: boolean;
}): React.JSX.Element {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-42">
      <span className="control-label">{label}</span>
      <select
        className="control-select w-full"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function DateRangePickerSection({
  filters,
  onChange,
  disabled = false,
}: Props): React.JSX.Element {
  return (
    <section className="surface p-3 sm:p-4" aria-labelledby="filters-heading">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 xl:max-w-208">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-text-secondary"
              aria-hidden="true"
            >
              <Icon name="filter" size={16} />
            </span>
            <div>
              <p className="control-label">Analysis scope</p>
              <h2
                id="filters-heading"
                className="mt-0.5 text-sm font-semibold text-text-primary"
              >
                Filter the answer, not the underlying data
              </h2>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
            These controls only change the dashboard view. The cumulative
            analytics state remains intact, so switching scope does not trigger
            a data rebuild.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-136 xl:max-w-2xl">
          <SelectControl
            label="Plan"
            value={filters.plan}
            options={plans}
            disabled={disabled}
            onChange={(value) =>
              onChange({ plan: value as DashboardFilters["plan"] })
            }
          />
          <SelectControl
            label="Category"
            value={filters.category}
            options={categories}
            disabled={disabled}
            onChange={(value) =>
              onChange({ category: value as DashboardFilters["category"] })
            }
          />
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="control-label">Date range</span>
          <span className="text-xs text-muted-foreground">
            {disabled
              ? "Live data is building; scope controls unlock when preparation finishes."
              : "Updates are applied without mutating the analytics engine."}
          </span>
        </div>
        <div className="mt-2 overflow-x-auto">
          <div
            className="segmented-control min-w-xl"
            role="group"
            aria-label="Date range"
          >
            {ranges.map((range) => (
              <button
                key={range.value}
                type="button"
                className="segmented-button"
                aria-pressed={filters.dateRange === range.value}
                disabled={disabled}
                onClick={() => onChange({ dateRange: range.value })}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
