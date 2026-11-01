import type { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  return (
    <main className="app-shell">
      <a
        href="#overview"
        className="sr-only focus:not-sr-only fixed left-4 top-4 z-50 rounded-lg bg-text-primary px-3 py-2 text-sm font-semibold text-bg-primary shadow-xl"
      >
        Skip to dashboard content
      </a>
      <div className="dashboard-shell">{children}</div>
    </main>
  );
}
