# Codebase Reconciliation

This repository is the reconciled result of two earlier implementations:

1. An incremental analytics-engine implementation with normalization, append-oriented storage, indexes, projections, workers, chunk backpressure, and local persistence.
2. The original feature-oriented dashboard implementation with date filtering, engagement analytics, funnel presentation, product/table presentation, and retention UI.

The current repository keeps the strongest pieces of both while translating the analytics domain from SaaS product analytics into ecommerce analytics.

## 1. Final architecture

```text
Synthetic Generator + Worker
          ↓
        RawEvent
          ↓
    EventNormalizer
          ↓
   AnalyticsEngine
   ┌──────┼──────────────┐
   ↓      ↓              ↓
Repository Indexer   ProjectionRegistry
                          ↓
                    AnalyticsState
                          ↓
                   AnalyticsReadModel
                     ↙          ↘
          progressive read     query/read-side
                ↓                    ↓
                └─────────┬──────────┘
                          ↓
                  Dashboard feature
```

## 2. Decisions retained from the incremental engine

- `AnalyticsEngine` is the orchestration boundary.
- `EventRepository` is the event-history store.
- `EventIndexer` provides query acceleration.
- `QueryEngine` owns event-level filtering and optional ordering.
- `ProjectionRegistry` owns projection lifecycle.
- Worker generation uses chunk acknowledgements and run IDs.
- IndexedDB stores normalized events and whole-engine checkpoints.
- Recovery replays post-checkpoint events instead of using projection-specific snapshots.

## 3. Decisions retained from the original dashboard

- `features/dashboard` remains the dashboard feature boundary.
- Dashboard filters remain read-side concerns.
- Product/table presentation and local sorting remain independent from the analytics engine.
- Engagement, funnel, product performance, and retention remain first-class dashboard capabilities.
- Date-range behavior remains part of the dashboard read flow.

## 4. Domain translation

The original repository was SaaS-oriented. The reconciled platform is ecommerce-oriented.

```text
Feature Usage
    ↓
Product Performance
```

```text
SaaS funnel
    ↓
product_view
→ add_to_cart
→ checkout_started
→ payment_success
```

```text
Signup/activity retention
    ↓
First purchase/repeat purchase retention
```

These are deliberate semantic translations, not exact metric preservation.

## 5. Projection ownership

```text
UserProjection
    → user facts, plans, DAU

PurchaseProjection
    → purchase facts, repeat customers, cohorts

RevenueProjection
    → revenue and payment facts

FunnelProjection
    → sequence-aware funnel facts

SessionProjection
    → session facts

ProductProjection
    → product-level performance facts
```

There is no `RetentionProjection`. Retention is derived from the purchase cohort facts maintained by `PurchaseProjection`.

There is no `MetricsProjection`. Headline dashboard ratios that can be derived from maintained facts are read-side values rather than duplicated persistent state.

## 6. State ownership

```text
EventRepository
  owns event history

EventIndexer
  owns query indexes

Projection
  owns event → state transformation

AnalyticsState
  owns cumulative analytical facts

AnalyticsReadModel
  owns stable React-facing read access

QueryEngine
  owns event-level filtered reads

Dashboard application
  owns scoped multidimensional presentation aggregation

Dashboard UI
  owns presentation and controls
```

## 7. Progressive dashboard strategy

The project deliberately uses two read paths.

### Progressive read path

Used during synthetic generation.

```text
AnalyticsState
    ↓
maintained aggregates
    ↓
AnalyticsReadModel
    ↓
buildProgressiveDashboardData()
```

This path covers all visible dashboard sections:

```text
Metrics
Revenue
Engagement
Funnel
Product Performance
Retention
```

The progressive path must not query and rescan the raw repository for every worker chunk.

### Final filtered read path

Used after data preparation.

```text
Dashboard filters
    ↓
QueryEngine
    ↓
scoped event data + maintained aggregates
    ↓
buildDashboardData()
```

This path supports user-selected date, plan, and category filters.

## 8. Why the read model exists

React should not directly depend on mutable internal `AnalyticsState`.

`AnalyticsReadModel` provides a stable external-store contract and a revisioned object identity. `useSyncExternalStore` observes changes and lets React render from the latest read-side state.

The read model is deliberately not named or treated as a persistence snapshot.

## 9. Persistence semantics

Persistence is implemented at the engine boundary.

```text
Normalized event log
        +
Whole AnalyticsState checkpoint
        +
Repository event position
```

Recovery restores the state and replays events after the checkpoint.

Projection `snapshot()` was intentionally removed from the contract.

## 10. Performance decisions

The project prioritizes these optimizations:

- lazy user generation
- streamed events
- worker generation
- ACK-based chunk backpressure
- stale run protection
- cancellable idle processing
- index intersection
- optional timestamp sorting
- incremental projection aggregates
- progressive dashboard read-side rendering
- throttled read-model UI notifications
- chart downsampling
- adaptive table virtualization

TypedArray/object-packing work is intentionally deferred until benchmarks demonstrate a need.

## 11. Historical cleanup

The reconciliation removed or replaced:

- per-projection `snapshot()` methods
- duplicate metrics state
- duplicate plan maps in projections/indexer
- `RetentionProjection`
- `RetentionState`
- legacy SaaS `feature_used` read artifacts
- dataset-wide `RuntimeStore`
- repeated raw-event retention scans
- dashboard boot behavior that blocked the UI until generation completed

## 12. Known scope boundaries

The platform is still a frontend v1 study case.

Out of scope:

- backend event ingestion
- REST/webhook production sources
- server-side durable event storage
- distributed processing
- multi-device synchronization
- distributed recovery
- real production ecommerce event source

## 13. Validation notes

The repository contains unit, lifecycle, persistence, progressive-read, and benchmark tests.

Full local validation should be performed with:

```bash
npm install
npm run build
npm run lint
npm test
npm run benchmark
```

The environment used to prepare the reconciled artifacts did not always have the complete dependency cache required for a full Vite/ESLint/Vitest run, so local CI remains the final authority.
