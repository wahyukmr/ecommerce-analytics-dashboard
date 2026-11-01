# Release Hardening Roadmap

This roadmap is tied to the current Ecommerce Analytics Dashboard baseline, including the dark UI revamp, milestone-based funnel, repeat-purchase retention, incremental projections, progressive read model, Web Worker pipeline, and IndexedDB checkpoint recovery.

The objective of these phases is to qualify the existing product for a reliable public portfolio/demo release. A commercial analytics service with real customer data would additionally require a backend, authentication, tenant isolation, ingestion controls, and operational monitoring.

## Phase 1 — Repeatable quality gates

**Implemented in this batch; successful CI execution is still pending.**

- Move local/default runtime from the end-of-life Node 20 line to Node 24.
- Support Node 22.12+ and Node 24 in CI.
- Add a GitHub Actions workflow for `npm ci`, dependency audit, lint, unit/integration tests, and production build.
- Add a non-watch `test:ci` command.
- Remove `test:ui` and `coverage` scripts until their optional provider packages can be added with a regenerated and verified lockfile. Do not treat these features as installed today.
- Enable weekly Dependabot updates for npm dependencies and GitHub Actions.

## Phase 2 — Runtime resilience

**Implemented in this batch; browser-level failure scenarios still need execution.**

- Add a global React error boundary with retry/reload actions.
- Add a session-only adapter when IndexedDB is unavailable or restore fails.
- Preserve the active in-memory dashboard if persistence writes or checkpointing fail.
- Surface a non-blocking, accessible persistence-mode notice.
- Add focused tests for the session-only adapter and error boundary.

Still to verify in Phase 3: quota behavior and corrupted-checkpoint paths in a real browser, plus any additional regression cases revealed by the test run.

## Phase 3 — UI, browser, and accessibility verification

**Implementation added; execution and lockfile synchronization are still required.**

- Add Playwright E2E coverage for first boot, dataset change, filters, IndexedDB reload recovery, session-only fallback, keyboard skip navigation, and mobile horizontal overflow.
- Add a test-only 25/50-user fixture enabled by `VITE_E2E_MODE=true`; production presets are unchanged.
- Add the Vitest V8 coverage provider and text/HTML/LCOV reports. Do not enforce an arbitrary percentage before capturing a trustworthy baseline.
- Add component tests for boot loading/success/error, empty-state guidance, filter disabled/active states, and dataset preset selection.
- Add an axe WCAG A/AA automated scan. The full findings report is attached to Playwright; critical/serious violations are configured to fail the test.
- Add `ACCESSIBILITY_MANUAL_CHECKLIST.md` for keyboard, screen-reader, contrast, responsive, zoom, and reduced-motion checks.
- **Required setup before CI:** `package.json` contains exact new test-tool versions, but `package-lock.json` could not be regenerated because the authoring sandbox could not resolve `registry.npmjs.org`. Run `npm install`, review and commit the resulting lockfile before relying on the `npm ci` workflow.
- WCAG 2.2 AA must still be manually verified. Automated scans alone are not a conformance claim.

## Phase 4 — Storage lifecycle and performance budgets

**Implementation added; browser execution and measured baselines are still pending.**

- Add an expandable Local data panel that reports saved dataset count, browser-estimated origin usage/quota, storage durability status, and inspection errors.
- Add confirmation flows to remove the active dataset's saved copy or clear all saved event records/checkpoints. The live in-memory dashboard remains available, and writes switch to session-only mode for the entire current tab session so changing presets cannot silently recreate cleared data.
- Enumerate dataset keys with the IndexedDB `datasetKey` index rather than loading full event records into memory.
- Make multi-record IndexedDB writes abort atomically on synchronous request errors and reset failed database-open promises so a later retry is possible.
- Classify quota/access errors and show specific recovery instructions. Add focused unit tests for failure classification.
- Add a separate Playwright performance harness for 10k/50k/100k-user generation, restore, filter-interaction latency, sampled Chromium JavaScript heap, and origin storage estimate. It is opt-in and does not slow the standard CI suite.
- Add `scripts/derive-performance-budgets.mjs` to derive a warning baseline from at least three measured runs on the same environment. A 25% regression threshold is only an initial policy tolerance, not an empirically established guarantee.
- **Still required:** run `npm run test:performance` on a representative machine, collect at least three same-environment reports, and review derived budgets. The authoring environment has not run this benchmark, so no absolute performance threshold is claimed yet.

## Phase 5 — Deployment hardening

- Add the real Open Graph image and final canonical URL when the public deployment domain is known.
- Configure hosting security headers and cache policy.
- Test the production bundle through the preview/hosting environment, including refresh/deep-link fallback behavior.

## Phase 6 — Release qualification

- Run the entire quality gate on a clean environment.
- Verify storage failure and recovery paths in a real browser.
- Review audit results and resolve high/critical dependency advisories.
- Confirm responsive behavior and accessibility manually.
- Publish only when all release gates have evidence recorded.
