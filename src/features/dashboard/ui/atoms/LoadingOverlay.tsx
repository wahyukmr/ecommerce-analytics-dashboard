import Icon from "./Icon";

export default function LoadingOverlay(): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-overlay px-5 backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <div className="surface-raised w-full max-w-md p-5 text-left sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Icon name="activity" size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Preparing analytics
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              The dashboard will become interactive as aggregates become
              available. There is no need to wait for the entire dataset before
              viewing progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
