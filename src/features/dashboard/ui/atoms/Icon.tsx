import type { SVGProps } from "react";

export type IconName =
  | "activity"
  | "arrow-up-right"
  | "calendar"
  | "cart"
  | "chevron-right"
  | "chevron-up"
  | "chevron-down"
  | "clock"
  | "database"
  | "filter"
  | "grid"
  | "info"
  | "layers"
  | "refresh"
  | "refresh-cw"
  | "trash-2"
  | "repeat"
  | "shopping-bag"
  | "spark"
  | "trend-down"
  | "trend-up"
  | "users"
  | "wallet"
  | "x";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  className?: string;
}

export default function Icon({
  name,
  size = 18,
  ...props
}: IconProps): React.JSX.Element {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      {...common}
      {...props}
    >
      {name === "activity" && (
        <>
          <path d="M3 12h3l2.1-5.2L12 17l2.8-8 2 4H21" />
        </>
      )}
      {name === "arrow-up-right" && <path d="m7 17 10-10M9 7h8v8" />}
      {name === "calendar" && (
        <>
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M7 3v3M17 3v3M3 9h18" />
        </>
      )}
      {name === "cart" && (
        <>
          <path d="M3 4h2l1.4 10.2a2 2 0 0 0 2 1.8h8.7a2 2 0 0 0 1.9-1.4L21 8H6" />
          <circle cx="9" cy="19" r="1.25" />
          <circle cx="18" cy="19" r="1.25" />
        </>
      )}
      {name === "chevron-right" && <path d="m9 6 6 6-6 6" />}
      {name === "chevron-up" && <path d="m6 15 6-6 6 6" />}
      {name === "chevron-down" && <path d="m6 9 6 6 6-6" />}
      {name === "clock" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {name === "database" && (
        <>
          <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
          <path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
        </>
      )}
      {name === "filter" && (
        <path d="M4 5h16l-6.2 7.1v5.5l-3.6 1.7v-7.2L4 5Z" />
      )}
      {name === "grid" && (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
        </>
      )}
      {name === "info" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 10.8v5M12 7.6h.01" />
        </>
      )}
      {name === "layers" && (
        <>
          <path d="m12 4 8 4-8 4-8-4 8-4Z" />
          <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
        </>
      )}
      {name === "refresh-cw" && (
        <>
          <path d="M20 11a8 8 0 0 0-13.7-5.6L4 7.7" />
          <path d="M4 4v3.7h3.7M4 13a8 8 0 0 0 13.7 5.6L20 16.3" />
          <path d="M20 20v-3.7h-3.7" />
        </>
      )}
      {name === "trash-2" && (
        <>
          <path d="M3.5 6.5h17M9 6.5V4h6v2.5M6 6.5l1 14h10l1-14" />
          <path d="M10 10v7M14 10v7" />
        </>
      )}
      {name === "refresh" && (
        <>
          <path d="M20 11a8 8 0 0 0-13.7-5.6L4 7.7" />
          <path d="M4 4v3.7h3.7M4 13a8 8 0 0 0 13.7 5.6L20 16.3" />
          <path d="M20 20v-3.7h-3.7" />
        </>
      )}
      {name === "repeat" && (
        <>
          <path d="M17 3.5 20.5 7 17 10.5M4 7h16M7 20.5 3.5 17 7 13.5M20 17H4" />
        </>
      )}
      {name === "shopping-bag" && (
        <>
          <path d="M5 8h14l-1 12H6L5 8Z" />
          <path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2" />
        </>
      )}
      {name === "spark" && (
        <>
          <path d="m12 3 1.3 5.1L18 10l-4.7 1.9L12 17l-1.3-5.1L6 10l4.7-1.9L12 3Z" />
          <path d="m19 14 .6 2.4L22 17l-2.4.6L19 20l-.6-2.4L16 17l2.4-.6L19 14Z" />
        </>
      )}
      {name === "trend-down" && <path d="M4 7l6 6 4-4 6 6M14 15h6v-6" />}
      {name === "trend-up" && <path d="M4 17l6-6 4 4 6-6M14 9h6v6" />}
      {name === "users" && (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M15.5 5.5a3 3 0 0 1 0 5.8M17 14a4.3 4.3 0 0 1 3.5 4.2" />
        </>
      )}
      {name === "wallet" && (
        <>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a2 2 0 0 1 2 2v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A2.5 2.5 0 0 1 4 16.5v-9Z" />
          <path d="M4 8h15M16 13h3" />
        </>
      )}
      {name === "x" && <path d="m7 7 10 10M17 7 7 17" />}
    </svg>
  );
}
