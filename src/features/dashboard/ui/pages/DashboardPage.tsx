import { startTransition, useDeferredValue, useMemo, useState } from "react";
import {
  useAnalyticsData,
  useAnalyticsStatus,
  useLocale,
} from "../../../../context";
import DashboardLayout from "../templates/DashboardLayout";
import {
  DashboardBootStatus,
  DashboardSectionNav,
  DateRangePickerSection,
  MetricsSection,
  RevenueTrendSection,
  EngagementSection,
  FunnelSection,
  ProductPerformanceTable,
  RetentionSection,
  DatasetPresetSection,
  PersistenceModeNotice,
  LocalDatasetManagement,
} from "../molecules";
import { DATASET_PRESETS } from "../../../../constant";
import { createGeneratorConfig } from "../../../../config/generatorConfig";
import { buildDashboardData } from "../../application/buildDashboardData";
import { buildProgressiveDashboardData } from "../../application/buildProgressiveDashboardData";
import type { DashboardFilters } from "../../application/types";
import { Icon } from "../atoms";
import {
  INITIAL_DATASET_USERS,
  persistPreferredDatasetUsers,
  resolveInitialDatasetUsers,
} from "../../../../config/runtimeConfig";

const DEFAULT_FILTERS: DashboardFilters = {
  dateRange: "last_30_days",
  plan: "all",
  category: "all",
};

export default function DashboardPage(): React.JSX.Element {
  const { workspaceTimezone } = useLocale();
  const { readModel, setGeneratorConfig } = useAnalyticsData();
  const { isBooting, error } = useAnalyticsStatus();
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [datasetUsers, setDatasetUsers] = useState(resolveInitialDatasetUsers);
  const deferredFilters = useDeferredValue(filters);

  const dashboard = useMemo(
    () =>
      isBooting
        ? buildProgressiveDashboardData(readModel, workspaceTimezone)
        : buildDashboardData(readModel, deferredFilters, workspaceTimezone),
    [isBooting, readModel, deferredFilters, workspaceTimezone],
  );

  function updateFilters(patch: Partial<DashboardFilters>): void {
    startTransition(() => {
      setFilters((previous) => ({ ...previous, ...patch }));
    });
  }

  function rebuildDataset(): void {
    setGeneratorConfig(createGeneratorConfig(datasetUsers));
  }

  const currentUsers = datasetUsers || INITIAL_DATASET_USERS;
  const activePresetLabel =
    DATASET_PRESETS.find((preset) => preset.totalUsers === currentUsers)
      ?.label ?? `${currentUsers.toLocaleString()} users`;

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-5">
        <header className="dashboard-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow">Commerce intelligence</p>
                <span className="status-pill">
                  <span
                    className={`status-dot ${error ? "status-dot-error" : isBooting ? "status-dot-building" : "status-dot-live"}`}
                    aria-hidden="true"
                  />
                  {error
                    ? "Attention required"
                    : isBooting
                      ? "Building dataset"
                      : "Live workspace"}
                </span>
              </div>
              <h1 className="mt-2 page-title">
                Commerce performance, without the noise.
              </h1>
              <p className="mt-3 page-subtitle">
                A decision-focused view of revenue, customer journey, product
                performance, and repeat purchasing. Synthetic data is used for
                this frontend study case; the analytical model is designed
                around incremental event processing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
              <WorkspaceMeta
                icon="database"
                label="Dataset"
                value={activePresetLabel}
              />
              <WorkspaceMeta
                icon="layers"
                label="Events"
                value={readModel.eventCount.toLocaleString()}
              />
              <WorkspaceMeta
                icon="calendar"
                label="Timezone"
                value={workspaceTimezone}
              />
            </div>
          </div>
        </header>

        <DashboardSectionNav />

        <section aria-label="Dashboard controls" className="space-y-2">
          <DatasetPresetSection
            currentUsers={currentUsers}
            isBooting={isBooting}
            onSelect={({ totalUsers }) => {
              setFilters(DEFAULT_FILTERS);
              setDatasetUsers(totalUsers);
              persistPreferredDatasetUsers(totalUsers);
              setGeneratorConfig(createGeneratorConfig(totalUsers));
            }}
          />
          <DateRangePickerSection
            filters={filters}
            disabled={isBooting}
            onChange={updateFilters}
          />
        </section>

        <LocalDatasetManagement />
        <DashboardBootStatus onRetry={rebuildDataset} />
        <PersistenceModeNotice />

        <div className="space-y-10 pt-2 lg:space-y-14">
          <MetricsSection data={dashboard.metrics} />
          <RevenueTrendSection data={dashboard.revenueTrend} />
          <EngagementSection data={dashboard.engagement} />
          <FunnelSection data={dashboard.funnel} />
          <ProductPerformanceTable
            data={dashboard.products}
            isPreparing={isBooting}
          />
          <RetentionSection data={dashboard.retention} />
        </div>

        <footer className="border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Analytics state is cumulative; filters only shape the read-side
              view.
            </span>
            <span>
              {readModel.eventCount.toLocaleString()} events processed ·{" "}
              {workspaceTimezone}
            </span>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}

function WorkspaceMeta({
  icon,
  label,
  value,
}: {
  readonly icon: "database" | "layers" | "calendar";
  readonly label: string;
  readonly value: string;
}): React.JSX.Element {
  return (
    <div className="dashboard-surface-quiet min-w-0 rounded-xl border border-border px-3 py-2.5 sm:min-w-[8.7rem]">
      <div className="flex items-center gap-2">
        <Icon
          name={icon}
          size={14}
          className="shrink-0 text-muted-foreground"
        />
        <span className="control-label">{label}</span>
      </div>
      <p
        className="mt-1 truncate text-xs font-semibold text-text-secondary"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
