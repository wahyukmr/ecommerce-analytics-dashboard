# Runtime Flow

## 1. Application bootstrap

```text
LocaleProvider
    ↓
SyntheticAnalyticsProvider
    ↓
useSyntheticAnalytics
    ↓
restore IndexedDB state if available
    ↓
otherwise start Web Worker generation
```

The dashboard is rendered immediately. Boot status is presented inside the dashboard instead of blocking the entire page behind a full-screen loading state.

## 2. Synthetic generation

```text
UserFactory.iterateUsers()
    ↓
EventBuilder.generateEventsForUser()
    ↓
ChunkEmitter
    ↓
worker postMessage()
    ↓
WorkerController
```

Users are generated lazily. Events are emitted into chunks rather than collecting the entire generated dataset in one temporary array.

## 3. Worker backpressure

```text
Worker
  ↓
Chunk
  ↓
Main thread
  ↓
ChunkProcessor
  ↓
AnalyticsEngine
  ↓
ACK
  ↓
Worker continues
```

The worker is prevented from outrunning the main-thread ingestion path.

Each generation receives a run ID. Responses from older or terminated runs are ignored.

## 4. Event ingestion

```text
RawEvent
    ↓
RawEventNormalizer
    ↓
AnalyticsEngine.append()
    ├── EventRepository.append()
    ├── EventIndexer.append()
    └── ProjectionRegistry.append()
            ├── UserProjection
            ├── PurchaseProjection
            ├── RevenueProjection
            ├── FunnelProjection
            ├── SessionProjection
            └── ProductProjection
                    ↓
             AnalyticsState
```

Every projection updates its owned analytical facts incrementally.

## 5. Read model publication

After a successful engine append:

```text
AnalyticsState mutated
      ↓
revision increment
      ↓
new AnalyticsReadModel object
      ↓
subscribers notified
```

The read model is a React-facing read handle, not a persistence snapshot.

## 6. Progressive dashboard

While synthetic generation is active:

```text
AnalyticsState
    ↓
maintained aggregates
    ↓
AnalyticsReadModel
    ↓
useSyncExternalStore
    ↓
buildProgressiveDashboardData()
    ↓
Dashboard sections update
```

The progressive path does not execute the raw-event `QueryEngine` path. It consumes:

```text
progressive summary
revenue by day
active users by day
purchase cohorts
product aggregates
```

Therefore the dashboard can visually follow the growing event stream without repeatedly rescanning all accumulated events.

## 7. Progressive sections

The following sections are backed by incremental state during generation:

```text
Metrics
Revenue Trend
Engagement
Funnel
Product Performance
Retention
```

Examples:

```text
payment_success
    ↓
RevenueProjection
    ↓
totalRevenue += amount
revenueByDay[day] += amount
```

```text
product_view
    ↓
ProductProjection
    ↓
product.views += 1
product.uniqueViewers.add(userId)
```

```text
payment_success
    ↓
PurchaseProjection
    ↓
purchase count / cohort / retention windows update
```

## 8. Final filtered dashboard

When preparation completes:

```text
Dashboard filters
    ↓
resolveDashboardDateRange()
    ↓
QueryEngine + maintained aggregates
    ↓
buildDashboardData()
    ↓
Dashboard sections
```

The final path exists because date/plan/category filters are scoped read-side concerns and some multidimensional calculations are not identical to cumulative aggregates.

## 9. Query path

`QueryEngine` can combine:

```text
byDay
byUser
byEventType
byPlan
byCategory
byProduct
```

The smallest candidate index sets are intersected first. Exact timestamp checks are still applied after index selection.

Timestamp ordering is opt-in:

```text
orderBy: "timestamp"
```

Queries that do not require chronological ordering are not sorted unnecessarily.

## 10. Persistence

During ingestion:

```text
AnalyticsEngine.append()
    ↓
AnalyticsState updated
    ↓
normalized events queued for persistence
```

After generation reaches a successful completion:

```text
flush event persistence
    ↓
whole-engine checkpoint
    ↓
IndexedDB
```

## 11. Recovery

```text
Application start
    ↓
IndexedDB
    ↓
load checkpoint
    ↓
restore state
    ↓
load event log
    ↓
rebuild event indexes
    ↓
rebuild required projection working state
    ↓
replay events after checkpoint
    ↓
publish read model
    ↓
Dashboard
```

If a persisted event log exists without a valid checkpoint, the incomplete dataset is cleared instead of being treated as recoverable state.

## 12. Reset / dataset change

```text
User selects another dataset
    ↓
current generation aborted
    ↓
old worker terminated
    ↓
old run responses ignored
    ↓
AnalyticsEngine.reset()
    ↓
new dataset key
    ↓
restore or generate
```

This prevents stale asynchronous work from one dataset from contaminating another dataset.
