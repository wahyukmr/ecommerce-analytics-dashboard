import { cn } from "../../../../libs";

type SkeletonProps = {
  readonly className?: string;
  readonly children?: React.ReactNode;
};

export default function Skeleton({
  className,
  children,
}: SkeletonProps): React.JSX.Element {
  return (
    <div
      className={cn("skeleton-sheen rounded-xl", className)}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
