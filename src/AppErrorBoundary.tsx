import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly error: Error | null;
}

/** Last-resort render boundary. Worker and persistence failures are handled closer to their source. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep technical detail in developer tools; the UI shows a recoverable message.
    console.error(
      "[commerce-dashboard] Unhandled render error",
      error,
      info.componentStack,
    );
  }

  private retryRender = (): void => {
    this.setState({ error: null });
  };

  private reloadApplication = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-4 py-12">
        <section
          className="surface w-full max-w-xl space-y-5 p-6 sm:p-8"
          role="alert"
          aria-labelledby="app-error-title"
        >
          <div className="flex items-start gap-4">
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-error/30 bg-error/10 text-error"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3 22 20H2L12 3Z" />
                <path d="M12 9v4M12 16.5h.01" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="eyebrow">Application recovery</p>
              <h1
                id="app-error-title"
                className="mt-1 text-xl font-semibold tracking-tight text-text-primary"
              >
                The dashboard could not render
              </h1>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                The interface encountered an unexpected rendering error. Reload
                the dashboard to start a clean application session. Your
                browser-local dataset is not deliberately cleared by this
                action.
              </p>
              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="min-h-11 cursor-pointer content-center font-medium text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                  Technical details
                </summary>
                <p className="mt-2 wrap-break-word rounded-lg border border-border bg-surface-quiet p-3">
                  {this.state.error.message}
                </p>
              </details>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              onClick={this.retryRender}
            >
              Try rendering again
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors duration-150 hover:brightness-110  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              onClick={this.reloadApplication}
            >
              Reload dashboard
            </button>
          </div>
        </section>
      </main>
    );
  }
}
