# Optimization Roadmap

## Locked architecture direction

The platform is an incremental ecommerce analytics engine with a progressive dashboard and browser-local persistence for v1.

The governing principle is:

> Process incrementally, aggregate incrementally, render incrementally.

Projection responsibilities are limited to event-to-state transformation. `AnalyticsState` is the analytical source of truth. `AnalyticsReadModel` is the React-facing read facade and is not a persisted snapshot.

## Phase 0 — Correctness & concurrency

Status: **Implemented**

- Worker responses carry monotonically increasing run IDs.
- Superseded/terminated worker responses are ignored.
- Worker cancellation is supported.
- Idle chunk processing is cancellable.
- Worker ACK is sent only after the active chunk has been accepted by the main-thread processing path.
- Dataset changes abort old asynchronous work before starting a new generation.
- Lifecycle tests cover superseded runs, acknowledgement ordering, and termination.

## Phase 1 — Read-path optimization

Status: **Implemented**

- Dashboard aggregation uses a consolidated event pass for the multidimensional final filtered view.
- Retention no longer depends on repeatedly scanning the complete payment history.
- Timestamp sorting is opt-in.
- Index candidates are intersected starting with smaller candidate sets.
- Sorted index arrays are merged without unnecessary Set materialization.

## Phase 2 — Streaming & memory

Status: **Implemented**

- Users are generated lazily through `UserFactory.iterateUsers()`.
- `RuntimeStore` was removed from the generation path.
- `UserRuntime` is created per user.
- `EventBuilder` streams events directly to the chunk emitter.
- Chunk buffers are pooled.
- Progress updates are throttled.
- Benchmark scaffolding exists before low-level event packing optimizations.

## Phase 3 — Projection / read-model optimization

Status: **Implemented**

- `UserProjection` maintains user totals, plan counts, and daily active-user counts incrementally.
- `RevenueProjection` maintains total and plan-specific daily revenue.
- `PurchaseProjection` maintains first/second purchases, repeat customers, and compact cohorts.
- `ProductProjection` maintains product performance incrementally.
- `RetentionProjection` and `RetentionState` were removed.
- `AnalyticsReadModel` exposes maintained revenue, active-user, purchase-cohort, product, and progressive-summary read APIs.
- Dashboard revenue trend no longer requires a raw-event scan.
- Progressive dashboard analytics do not use the raw query path.

## Phase 4 — UI optimization

Status: **Implemented**

- Large tables use adaptive virtualization.
- Long time-series are downsampled with LTTB before chart rendering.
- Heavy filter updates use transition/deferred React APIs.
- Recharts animation is disabled for analytical datasets.
- Heavy presentation components are memoized.
- Progress and dashboard data contexts are separated.
- The dashboard remains visible during generation.
- Read-model notifications are coalesced to prevent a render for every worker chunk.

## Phase 5 — Persistence / recovery

Status: **Implemented for frontend-local v1**

- IndexedDB event log.
- Stable dataset keys.
- Whole-engine checkpoint containing `AnalyticsState` and repository event position.
- Restore and event-log replay after checkpoint.
- Reconstruction of projection working state from persisted analytical state/event history.
- Protection against incomplete logs without valid checkpoints.
- Persistence writes are queued so they do not become the hot-path event-processing mechanism.

Server-side persistence, distributed recovery, and cross-device synchronization remain outside the current scope.

## Progressive dashboard — final strategy

Status: **Implemented**

Earlier progressive implementation recalculated the full dashboard against the growing raw-event repository and caused excessive CPU usage. That strategy is explicitly retired.

The final strategy is:

```text
Worker generates events
        ↓
Engine processes events incrementally
        ↓
Projections update aggregates incrementally
        ↓
Read model exposes latest aggregates
        ↓
Dashboard renders latest aggregates
```

During generation, all visible sections can update from cumulative state:

```text
Metrics
Revenue Trend
Engagement
Funnel
Product Performance
Retention
```

No section should perform a complete raw-event rescan on every progressive update.

After generation completes, the normal filtered dashboard path becomes active.

## Next optimization policy

No new optimization should be added merely because it sounds sophisticated.

Before introducing:

- TypedArrays
- binary event packing
- aggressive object pooling
- more worker partitioning
- more caching layers

first measure:

```text
generation time
ingestion time
projection time
query time
dashboard aggregation time
render time
peak memory
worker message count
```

The next work should be driven by profiler/benchmark evidence or an explicit new product requirement.
