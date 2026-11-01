# Accessibility release checklist

Automated axe scans are a regression detector, not a WCAG conformance certificate. Complete this checklist against the production build at desktop and mobile widths before release.

## Keyboard and focus

- [ ] Navigate the whole dashboard using only Tab, Shift+Tab, Enter, Space, arrow keys where native controls require them, and Escape where a popup is present.
- [ ] The skip link becomes visible on focus and moves focus to meaningful main content.
- [ ] Focus indicators remain visible against dark surfaces and are not clipped by cards, scroll containers, or sticky content.
- [ ] Dataset presets, range buttons, native selects, and section navigation expose a visible focus state and a meaningful accessible name.
- [ ] Focus order follows the visual and task order; there are no keyboard traps.

## Screen reader

- [ ] Test one desktop screen reader (NVDA with Firefox/Chrome or VoiceOver with Safari) on the major navigation, filters, status messages, KPI group, funnel, product table, and retention table/cards.
- [ ] Boot progress does not announce every rapidly changing count; important state transitions are announced without excessive repetition.
- [ ] Empty states explain why no data appears and give a next action.
- [ ] Error states expose the specific reason and the available recovery action.
- [ ] Recharts visualizations have a useful text summary and do not require color-only interpretation.
- [ ] Tables identify headers and row/column relationships; mobile cohort cards preserve the meaning of each retention window.

## Visual and responsive checks

- [ ] Check 320px, 390px, 768px, 1024px, 1440px, and 1920px viewport widths.
- [ ] Verify 200% browser zoom and long labels / translated strings do not hide controls or critical values.
- [ ] Verify normal, hover, focus, pressed, disabled, loading, error, empty, and success states.
- [ ] Verify text contrast against the actual rendered surface, including chart axes/tooltips and heatmap cells. Target WCAG 2.2 AA.
- [ ] Verify the experience with reduced motion enabled.

## Result recording

Record browser / assistive technology versions, date, tester, issues found, and follow-up issue IDs in the release PR. Do not mark the checklist complete solely because automated scans pass.
