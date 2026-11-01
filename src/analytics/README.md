# Analytics Core

The analytics core turns normalized ecommerce events into cumulative analytical state and exposes a stable read facade for the dashboard.

## Core flow

```text
RawEvent
  ↓
RawEventNormalizer
  ↓
AnalyticsEngine
  ├── EventRepository
  ├── EventIndexer
  └── ProjectionRegistry
        ├── UserProjection
        ├── PurchaseProjection
        ├── RevenueProjection
        ├── FunnelProjection
        ├── SessionProjection
        └── ProductProjection
              ↓
        AnalyticsState
              ↓
        AnalyticsReadModel
          ↙          ↘
 progressive       query
  aggregates       path
          ↓          ↓
          Dashboard application
```

## Projection contract

A projection has one job: transform normalized events into the part of `AnalyticsState` that it owns.

Lifecycle:

```text
construct
   ↓
initialize(context)
   ↓
append(events)
   ↓
append(events)
   ↓
reset()
```

Projection code does not implement persistence and does not expose `snapshot()`.

## Active projections

### UserProjection

Maintains:

- total users
- signup users
- returning users
- plan membership
- plan counts
- active users by day
- user/product activity facts

### PurchaseProjection

Maintains:

- first purchase
- second purchase
- purchase count by user
- repeat customer count
- purchase cohorts
- plan-specific cohorts
- retention-window counts

### RevenueProjection

Maintains:

- total revenue
- total orders
- successful payments
- failed payments
- revenue by plan
- revenue by day
- revenue by day and plan

### FunnelProjection

Maintains sequence-aware ecommerce funnel users:

```text
product_view
→ add_to_cart
→ checkout_started
→ payment_success
```

### SessionProjection

Maintains:

- unique session IDs
- cart sessions
- purchased sessions
- total sessions

### ProductProjection

Maintains:

- product views
- unique product viewers
- add-to-cart count
- checkout count
- purchase count
- product revenue

This projection is what allows Product Performance to participate in the progressive dashboard without scanning raw events for every update.

## AnalyticsState

`AnalyticsState` is cumulative. It contains the analytical facts needed for the active read model.

The state is divided by ownership:

```text
revenue
users
purchase
funnel
sessions
products
```

Derived ratios such as conversion rate and average order value are calculated from maintained facts instead of being duplicated as independent mutable sources of truth unless there is a demonstrated need.

## AnalyticsReadModel

`AnalyticsReadModel` is the React-facing read interface.

It exposes:

```text
query()
getProgressiveSummary()
getRevenueByDay()
getActiveUsersByDay()
getPurchaseCohorts()
getProductPerformance()
```

The read model is versioned by identity/revision and consumed through React's external-store integration.

It is not an immutable copy of `AnalyticsState`, and it is not the persistence snapshot format.

## Query engine

`EventIndexer` maintains indexes for:

```text
day
user
event type
plan
category
product
```

`QueryEngine` combines relevant indexes, applies exact event predicates, and sorts only when requested.

The event query path exists primarily for scoped/final dashboard reads and other multidimensional queries. The progressive dashboard path intentionally avoids it.

## Progressive dashboard

While generation is active:

```text
Projection
    ↓
AnalyticsState
    ↓
AnalyticsReadModel
    ↓
buildProgressiveDashboardData()
    ↓
Dashboard
```

The dashboard uses cumulative aggregates for:

- metrics
- revenue trend
- engagement
- funnel
- product performance
- retention

This lets the UI follow the growing event stream without repeatedly scanning the growing raw event store.

## Persistence

Persistence is owned by the engine boundary.

The persisted model consists of:

```text
normalized event log
+
whole-engine checkpoint
```

The checkpoint includes `AnalyticsState` and the repository event position. Recovery restores the state and replays only events after that position.

There is deliberately no projection-level snapshot contract.
