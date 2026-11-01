export default function SortIcon({
  active,
  asc,
}: {
  active: boolean;
  asc: boolean;
}) {
  return (
    <svg
      className={`w-3 h-3 transition-opacity ${active ? "opacity-100" : "opacity-30"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M6 9l6-6 6 6"
        transform={asc ? undefined : "scale(1,-1) translate(0,-18)"}
      />
    </svg>
  );
}
