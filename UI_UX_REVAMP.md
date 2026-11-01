# UI/UX Revamp — Commerce Intelligence Dashboard

## Direction

The dashboard is intentionally dark, restrained, and analytical. It uses a quiet neutral canvas, one warm brand accent for primary actions and emphasis, and cool semantic colors only where status meaning matters.

The visual system avoids gradients as decoration, oversized cards, dense rainbow analytics, and speculative KPI deltas. The interface only presents values that exist in the current read model.

## Information architecture

The page follows the user's likely decision flow:

1. Overview — revenue, orders, conversion, AOV, customer health.
2. Trends — revenue and customer activity over time.
3. Customer journey — milestone funnel, leakage, intent and payment friction.
4. Catalog — product-level performance.
5. Retention — first-purchase cohorts and repeat purchase behavior.

A sticky local section navigator is used instead of a global sidebar because this is a single dashboard task surface rather than a multi-product application.

## Design tokens

Core tokens live in `src/App.css` and are consumed through Tailwind theme aliases plus CSS component classes.

- Canvas: `--canvas-0`, `--canvas-1`
- Surfaces: `--surface-0` through `--surface-3`
- Lines: `--line-0` through `--line-2`
- Brand: `--brand-300` through `--brand-600`
- Semantic: green success, amber warning, rose error, cyan information
- Focus: `--focus-ring`

The design uses a spacing rhythm based on 4px units and rounds controls/cards between 8px and 18px. Interactive targets are minimum 44px high.

## Responsive behavior

- Mobile: one-column layout, horizontal scrolling only for deliberate segmented/filter controls; product and retention data become cards.
- Tablet: two-column KPI/stat layouts where useful.
- Desktop: multi-column dashboard grid, full cohort heatmap, product table.
- Ultrawide: content remains capped at 1600px so reading lines and chart widths do not become excessive.

## UI state contract

Interactive components support default, hover, focus-visible, active/selected, disabled, loading/building, error, and success/live states where the state is meaningful.

Data sections define an educational empty state instead of rendering a blank container. Errors identify the preparation operation and expose a retry action. Building state does not block the dashboard; maintained aggregates continue to render progressively.

## Analytics integrity rules

The UI does not recompute the raw event store for progressive updates.

- Progressive dashboard: projections/read model → render.
- Final filtered dashboard: read model/query path → filtered aggregation → render.
- Funnel: milestone-based attainment model.
- Retention: repeat-purchase cohorts; immature windows render `—`, not `0%`.

## Performance UX

- Recharts animations remain disabled for high-volume analytical updates.
- Existing time-series downsampling remains in place.
- Existing product/retention virtualization remains in place for large datasets.
- React transition/deferred filtering behavior remains unchanged.
- Dashboard boot uses incremental aggregates rather than a blocking full-data screen.
- Skeleton treatment is reserved for content that is genuinely not available yet, not for data that can be shown progressively.

## Accessibility baseline

- Native buttons/selects are preserved for predictable keyboard behavior.
- `aria-pressed`, `aria-expanded`, `aria-live`, `aria-busy`, `role="alert"`, and descriptive `aria-label` values are used where state or semantics require them.
- Global `:focus-visible` treatment is provided.
- Reduced motion is respected with `prefers-reduced-motion`.
- Color is not the sole carrier of meaning; labels and values accompany status colors.
