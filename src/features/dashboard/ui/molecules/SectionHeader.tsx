import type { ReactNode } from "react";

interface SectionHeaderProps {
  readonly id?: string;
  readonly kicker?: string;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export default function SectionHeader({
  id,
  kicker,
  title,
  description,
  action,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <div className="section-heading">
      <div className="min-w-0">
        {kicker ? <p className="section-kicker">{kicker}</p> : null}
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {description ? (
          <p className="section-description">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
