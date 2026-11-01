import { DATASET_PRESETS } from "../../../../constant";
import { Icon } from "../atoms";

interface Props {
  readonly currentUsers: number;
  readonly onSelect: (config: { totalUsers: number }) => void;
  readonly isBooting?: boolean;
}

export default function DatasetPresetSection({
  currentUsers,
  onSelect,
  isBooting = false,
}: Props): React.JSX.Element {
  return (
    <section
      className="dashboard-surface-quiet rounded-[1.1rem] p-3 sm:p-4"
      aria-label="Dataset scenario"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-text-secondary"
            aria-hidden="true"
          >
            <Icon name="database" size={17} />
          </span>
          <div className="min-w-0">
            <p className="control-label">Demo dataset</p>
            <p className="mt-0.5 truncate text-sm font-medium text-text-primary">
              Synthetic customer volume
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Switch scale to demonstrate how the analytics engine behaves under
              load.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:min-w-124 lg:max-w-2xl">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Current:{" "}
              <strong className="text-text-secondary">
                {currentUsers.toLocaleString()} users
              </strong>
            </span>
            {isBooting ? (
              <span className="status-pill" aria-live="polite">
                <span
                  className="status-dot status-dot-building"
                  aria-hidden="true"
                />
                Rebuilding
              </span>
            ) : null}
          </div>

          <div
            className="flex gap-2 overflow-x-auto pb-0.5"
            role="group"
            aria-label="Dataset size"
          >
            {DATASET_PRESETS.map((preset) => {
              const active = preset.totalUsers === currentUsers;
              return (
                <button
                  key={preset.totalUsers}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect({ totalUsers: preset.totalUsers })}
                  className="min-h-11 min-w-28 shrink-0 rounded-xl border px-3 text-sm font-semibold transition-colors duration-150 hover:border-border-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  style={
                    active
                      ? {
                          borderColor: "rgba(245,109,103,.38)",
                          background: "rgba(245,109,103,.10)",
                          color: "var(--ink-0)",
                        }
                      : undefined
                  }
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
