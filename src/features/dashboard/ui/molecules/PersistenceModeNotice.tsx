import { memo } from "react";
import { useAnalyticsStatus } from "../../../../context";
import Icon from "../atoms/Icon";

function PersistenceModeNotice(): React.JSX.Element | null {
  const { persistenceMode, persistenceNotice } = useAnalyticsStatus();

  if (persistenceMode !== "session-only" || !persistenceNotice) {
    return null;
  }

  return (
    <aside
      className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="mt-0.5 shrink-0 text-warning" aria-hidden="true">
        <Icon name="database" size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">
          Session-only dataset
        </p>
        <p className="mt-1 wrap-break-word text-sm leading-6 text-text-secondary">
          {persistenceNotice}
        </p>
      </div>
    </aside>
  );
}

export default memo(PersistenceModeNotice);
