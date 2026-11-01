# Ecommerce Analytics Dashboard

A frontend ecommerce analytics study case built around an incremental event-processing core, indexed event queries, synthetic data generation, progressive analytics rendering, and browser-local persistence/recovery.

## What this project demonstrates

The application simulates ecommerce activity, processes events incrementally, maintains analytical aggregates, and exposes those aggregates to a React dashboard.

The main idea is:

```text
Synthetic events
      ↓
 Web Worker
      ↓
 Event normalization
      ↓
 AnalyticsEngine
      ↓
 Repository + Index + Projections
      ↓
 AnalyticsState
      ↓
 AnalyticsReadModel
      ↓
 Dashboard
```

The dashboard is progressive. It is visible while synthetic data is still being generated, and its cumulative analytics move as the engine processes more events. The progressive path reads maintained aggregates; it does not repeatedly rescan the growing raw-event repository.

## Architecture

```text
Synthetic UserFactory
        ↓
    EventBuilder
        ↓
    ChunkEmitter
        ↓
    Web Worker
        ↓
 WorkerController
        ↓
  ChunkProcessor
        ↓
 AnalyticsEngine
 ┌──────┼───────────────┐
 │      │               │
Repository  EventIndexer  ProjectionRegistry
 │      │               │
 │      │        ┌──────┼──────────────────────────┐
 │      │        │      │      │      │      │     │
 │      │      User  Purchase Revenue Funnel Session Product
 │      │        │      │      │      │      │      │
 └──────┴────────┴──────┴──────┴──────┴──────┴──────┘
                         ↓
                  AnalyticsState
                         ↓
                 AnalyticsReadModel
                    ↙            ↘
          Progressive read     Filtered query
                 ↓                   ↓
                 └────────┬─────────┘
                          ↓
                 Dashboard application
                          ↓
                    Dashboard UI
```

## Responsibilities

### Synthetic generator

`UserFactory` lazily produces users instead of materializing the complete user dataset. `EventBuilder` turns each user into a realistic ecommerce journey and streams generated events into `ChunkEmitter`.

### Web Worker

Generation runs off the main UI thread. `WorkerController` coordinates worker lifecycle, run IDs, stale-response protection, cancellation, chunk acknowledgements, and error propagation.

### Analytics engine

`AnalyticsEngine` is the orchestration boundary. It normalizes events, appends them to the event repository, updates indexes, feeds projections, publishes a new read model, and optionally persists the event stream/checkpoint.

### Repository

`InMemoryEventRepository` is the hot event-history store used by the v1 analytics engine.

### Indexer

`EventIndexer` maintains indexes for day, user, event type, plan, category, and product. `QueryEngine` uses these indexes to reduce candidate events before applying exact filter checks.

### Projections

The active projections are:

- `UserProjection` — users, plans, daily active users, returning users, and user/product activity facts.
- `PurchaseProjection` — first/second purchase, purchase counts, repeat customers, and compact purchase cohorts.
- `RevenueProjection` — revenue, order/payment totals, revenue by plan, and revenue by day.
- `FunnelProjection` — sequence-aware ecommerce funnel users.
- `SessionProjection` — sessions, cart sessions, and purchased sessions.
- `ProductProjection` — product views, unique viewers, cart activity, checkouts, purchases, and revenue.

Projection code updates its owned portion of `AnalyticsState`. Projections do not own persistence and do not implement `snapshot()`.

## Analytics state and read model

`AnalyticsState` is the cumulative analytical state maintained while events are processed.

`AnalyticsReadModel` is the stable read facade exposed to React. It provides both query access and maintained aggregate access:

```text
getProgressiveSummary()
getRevenueByDay()
getActiveUsersByDay()
getPurchaseCohorts()
getProductPerformance()
query()
```

The read model is not a persisted snapshot. It is a versioned React-facing read handle.

React consumes the engine through `useSyncExternalStore`, so engine mutation can invalidate the React read model without duplicating `AnalyticsState` inside component state.

## Dashboard behavior

The dashboard has two read paths.

### Progressive path

Used while synthetic data is still being prepared.

```text
AnalyticsState
    ↓
Maintained aggregates
    ↓
buildProgressiveDashboardData()
    ↓
Dashboard
```

The progressive path does not call the raw-event query path. Metrics, revenue trend, daily active users, funnel counts, product performance, and retention use maintained incremental state.

Progress updates and read-model updates are independently controlled. The UI does not attempt to render once per event or once per worker chunk.

### Final filtered path

Used after preparation completes.

```text
Dashboard filters
    ↓
resolveDashboardDateRange()
    ↓
QueryEngine
    ↓
filtered event set + maintained aggregates
    ↓
buildDashboardData()
    ↓
Dashboard
```

Date, plan, and category filters are read-side concerns. They do not mutate cumulative projection state.

## Dashboard capabilities

The active dashboard provides:

- dataset presets
- date-range filtering
- plan filtering
- category filtering
- headline metrics
- revenue trend
- engagement
- strict ecommerce funnel
- product performance
- independent product-table sorting
- repeat-purchase retention cohorts

The original SaaS `feature_used` concept was deliberately translated into ecommerce product performance rather than retained as a legacy event model.

## Retention semantics

Retention is defined as repeat-purchase retention:

```text
First purchase
     ↓
Repeat purchase
     ↓
Day 1 / Day 7 / Day 30 retention
```

`PurchaseProjection` maintains the first-purchase cohort and cumulative retention-window counts so the progressive dashboard does not need to rescan raw payment events.

## Persistence and recovery

V1 persistence is browser-local and uses IndexedDB.

The event log stores normalized events. A whole-engine checkpoint stores `AnalyticsState` together with the repository position.

Recovery is:

```text
IndexedDB
   ↓
load checkpoint
   ↓
restore AnalyticsState
   ↓
rebuild indexes
   ↓
replay events after checkpoint
   ↓
AnalyticsReadModel
   ↓
Dashboard
```

If IndexedDB cannot be read or a persistence write/checkpoint fails, the active analytics engine switches to a session-only adapter. The dashboard remains usable without duplicating the event repository in memory, and a visible notice explains that the dataset will be regenerated after a reload or dataset change. Session-only data is not durable and is not presented as successfully saved.

The project intentionally does not implement per-projection snapshots.

Server-side persistence, API ingestion, multi-device synchronization, distributed recovery, and backend event streaming are outside the current v1 scope.

## Performance strategy

The project intentionally prioritizes high-value optimizations before low-level memory tricks:

- lazy user generation
- streamed event generation
- worker-based generation
- chunked ingestion with ACK-based backpressure
- stale worker response protection
- cancellable idle scheduling
- indexed event queries
- optional timestamp ordering
- incremental projection aggregates
- progressive read-model rendering
- throttled/coalesced UI notifications
- chart downsampling
- adaptive table virtualization
- benchmark scaffolding before TypedArray/object-packing work

The guiding principle is:

> Process incrementally, aggregate incrementally, render incrementally.

## Runtime constraints

- React client application.
- Synthetic ecommerce workload for controlled experimentation.
- No backend integration in v1.
- Browser-local IndexedDB persistence.
- Analytics core is kept independent from dashboard presentation.

## Development

Use Node.js 24 by default. CI also verifies Node.js 22.12+ to protect the supported runtime range.

```bash
nvm install
nvm use
npm ci
npm run dev
```

Validation commands:

```bash
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
npm run benchmark
```

`npm test` remains available for local watch mode. CI uses `npm run test:ci` so the suite exits with a reliable pass/fail result. Coverage and Vitest UI scripts are intentionally not exposed until their optional provider packages can be added together with a regenerated, verified lockfile.

The benchmark suite is intended to establish evidence before introducing low-level data-packing optimizations. The staged release gates are tracked in [`RELEASE_HARDENING_ROADMAP.md`](./RELEASE_HARDENING_ROADMAP.md).

## UI/UX revamp

The dashboard presentation follows a production-oriented dark analytics system with task-driven information architecture, semantic design tokens, 44px minimum interactive targets, responsive mobile/card fallbacks, explicit empty/error/loading states, and restrained motion.

The visual specification is documented in [`UI_UX_REVAMP.md`](./UI_UX_REVAMP.md).

## Release hardening and automated verification

Phase 3 adds the following developer commands:

```bash
npm run test:ci
npm run test:coverage
npm run test:e2e:install
npm run test:e2e
```

The Playwright web server sets `VITE_E2E_MODE=true`, which swaps only the test server to deterministic 25/50-user fixtures. Standard development and production builds retain the 10k/50k/100k dataset presets. The browser suite covers dashboard boot, filters, dataset rebuild, IndexedDB recovery, the session-only fallback, keyboard skip navigation, mobile horizontal overflow, and an axe WCAG A/AA scan. The axe report is attached to the Playwright test result; automated checks do not replace manual WCAG 2.2 AA verification.

The V8 coverage provider emits text, HTML, and LCOV reports under `coverage/`. A minimum percentage gate is intentionally not guessed before the first trustworthy baseline run; record that baseline, then set a threshold in a separate reviewed change.

**Lockfile sync required for this patch:** Phase 3 adds three exact-version developer tools. The package registry was unreachable from the authoring environment, so `package-lock.json` could not be regenerated here. After applying the patch, run `npm install`, review the lockfile diff, and commit the regenerated `package-lock.json` before running CI or merging. Do not consider the release gate complete while `npm ci` cannot install from the committed lockfile.
s
