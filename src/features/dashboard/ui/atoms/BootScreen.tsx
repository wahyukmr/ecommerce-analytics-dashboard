import type { BootStage } from "../../../../generator/engine/BootState";
import Icon from "./Icon";

interface Props {
  readonly progress: number;
  readonly stage: BootStage | null;
}

const labels: Record<BootStage, string> = {
  initializing: "Starting analytics engine",
  restoring: "Restoring local checkpoint",
  loading_catalog: "Loading product catalog",
  generating_users: "Building customer population",
  generating_events: "Streaming ecommerce events",
  completed: "Finalizing dashboard",
  cancelled: "Generation cancelled",
  failed: "Generation failed",
};

export default function BootScreen({
  progress,
  stage,
}: Props): React.JSX.Element {
  const percentage = Math.max(0, Math.min(100, Math.round(progress * 100)));

  return (
    <main className="app-shell grid min-h-screen place-items-center px-5 py-10">
      <section
        className="surface-raised w-full max-w-lg p-6 text-left sm:p-7"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Icon name="activity" size={19} />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Commerce intelligence</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
              Preparing your workspace
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {stage ? labels[stage] : "Starting analytics pipeline"}
            </p>
          </div>
        </div>
        <div className="mt-6 progress-track">
          <div className="progress-fill" style={{ width: `${percentage}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs tabular-nums text-muted-foreground">
          <span>Live preparation</span>
          <strong className="text-text-primary">{percentage}%</strong>
        </div>
      </section>
    </main>
  );
}
