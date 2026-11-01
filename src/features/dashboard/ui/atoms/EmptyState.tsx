import Icon, { type IconName } from "./Icon";

export default function EmptyState({
  title,
  description,
  icon = "database",
  hint,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon?: IconName;
  readonly hint?: string;
}): React.JSX.Element {
  return (
    <div className="empty-state">
      <div className="max-w-md">
        <span
          className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-white/3 text-muted-foreground"
          aria-hidden="true"
        >
          <Icon name={icon} size={18} />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-text-primary">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {hint ? (
          <p className="mt-2 text-xs leading-5 text-text-secondary">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
