import type { PurchasePlan, RawEvent } from "../../types";
import { EventIndexer } from "../indexes/EventIndexer";
import { RawEventNormalizer } from "../pipeline/RawEventNormalizer";
import { FunnelProjection } from "../projections/FunnelProjection";
import { PurchaseProjection } from "../projections/PurchaseProjection";
import { ProductProjection } from "../projections/ProductProjection";
import { RevenueProjection } from "../projections/RevenueProjection";
import { SessionProjection } from "../projections/SessionProjection";
import { UserProjection } from "../projections/UserProjection";
import { InMemoryEventRepository } from "../repository/EventRepository";
import { QueryEngine } from "../queries/QueryEngine";
import type { EventQuery } from "../queries/Query";
import type { QueryResult } from "../queries/QueryResult";
import type { Projection } from "../contracts/Projection";
import type { AnalyticsReadModel } from "../contracts/ReadModel";
import type {
  AnalyticsCheckpoint,
  AnalyticsPersistence,
} from "../persistence/AnalyticsPersistence";
import { AnalyticsContext } from "./AnalyticsContext";
import {
  createAnalyticsState,
  hydrateAnalyticsState,
  type AnalyticsState,
  type ProductAggregate,
  type PurchaseCohort,
} from "./AnalyticsState";
import { ProjectionRegistry } from "./ProjectionRegistry";

export interface AnalyticsPersistenceOptions {
  readonly persistence: AnalyticsPersistence;
  readonly datasetKey: string;
}

export interface AnalyticsRestoreResult {
  readonly restored: boolean;
  readonly eventCount: number;
  readonly revision: number;
  readonly replayedEventCount: number;
}

type AnalyticsListener = () => void;

type PersistenceTask = () => Promise<void>;

export class AnalyticsEngine {
  private _state: AnalyticsState;
  private _context: AnalyticsContext;

  private readonly _repository: InMemoryEventRepository;

  private readonly _indexer: EventIndexer;
  private readonly _normalizer = new RawEventNormalizer();
  private _registry: ProjectionRegistry;
  private readonly _queryEngine: QueryEngine;

  private readonly _listeners = new Set<AnalyticsListener>();

  private readonly _readModelQuery = (query: EventQuery): QueryResult =>
    this.query(query);

  private readonly _readModelRevenueByDay = (
    plan?: PurchasePlan,
  ): ReadonlyMap<string, number> =>
    plan === undefined
      ? this._state.revenue.revenueByDay
      : this._state.revenue.revenueByDayByPlan[plan];

  private readonly _readModelActiveUsersByDay = (): ReadonlyMap<
    string,
    number
  > => this._state.users.usersByDay;

  private readonly _readModelPurchaseCohorts = (
    plan?: PurchasePlan,
  ): ReadonlyMap<string, PurchaseCohort> =>
    plan === undefined
      ? this._state.purchase.cohorts
      : this._state.purchase.cohortsByPlan[plan];

  private readonly _readModelProductPerformance = (): ReadonlyMap<
    string,
    ProductAggregate
  > => this._state.products.products;

  private readonly _readModelProgressiveSummary = () => {
    const revenue = this._state.revenue;
    const users = this._state.users;
    const funnel = this._state.funnel;
    const sessions = this._state.sessions;

    return {
      totalUsers: users.totalUsers,
      newUsers: users.newUsers,
      totalOrders: revenue.totalOrders,
      totalRevenue: revenue.totalRevenue,
      averageOrderValue:
        revenue.totalOrders > 0
          ? revenue.totalRevenue / revenue.totalOrders
          : 0,
      successfulPayments: revenue.successfulPayments,
      failedPayments: revenue.failedPayments,
      productViewUsers: funnel.stepUsers.productView.size,
      addToCartUsers: funnel.stepUsers.addToCart.size,
      checkoutStartedUsers: funnel.stepUsers.checkoutStarted.size,
      paymentSuccessUsers: funnel.stepUsers.paymentSuccess.size,
      wishlistUsers: funnel.wishlistUsers.size,
      paymentFailedUsers: funnel.paymentFailedUsers.size,
      paymentFailedAttempts: funnel.paymentFailed,
      totalSessions: sessions.totalSessions,
      repeatCustomerRate:
        this._state.purchase.userPurchases.size > 0
          ? this._state.purchase.repeatCustomerCount /
            this._state.purchase.userPurchases.size
          : 0,
      cartAbandonmentRate:
        sessions.cartSessionIds.size > 0
          ? Math.max(
              0,
              sessions.cartSessionIds.size - sessions.purchasedSessionIds.size,
            ) / sessions.cartSessionIds.size
          : 0,
      productDepthPerUser:
        users.totalUsers > 0
          ? users.viewedUserProducts.size / users.totalUsers
          : 0,
    };
  };

  private _revision = 0;
  private _readModel: AnalyticsReadModel;

  private _persistence: AnalyticsPersistenceOptions | undefined;

  private _persistenceQueue = Promise.resolve();

  private _persistenceFailure: Error | undefined;

  constructor(timezone = "UTC") {
    this._state = createAnalyticsState();
    this._context = new AnalyticsContext(timezone, this._state);

    this._repository = new InMemoryEventRepository();

    this._indexer = new EventIndexer(timezone);

    this._queryEngine = new QueryEngine(this._repository, this._indexer);

    this._registry = this.createProjectionRegistry();

    this._readModel = this.createReadModel();
  }

  append(events: readonly RawEvent[]): void {
    if (events.length === 0) {
      return;
    }

    const normalized = this._normalizer.normalize(events);

    const startIndex = this._repository.count();

    const existingPlans = this._state.users.planByUser;

    this._repository.append(normalized);

    this._indexer.append(normalized, startIndex, existingPlans);

    this._registry.append(normalized);

    const persistence = this._persistence;

    if (persistence) {
      this.enqueuePersistence(() =>
        persistence.persistence.appendEvents(
          persistence.datasetKey,
          startIndex,
          normalized,
        ),
      );
    }

    this.publish();
  }

  getState(): AnalyticsState {
    return this._state;
  }

  getReadModel(): AnalyticsReadModel {
    return this._readModel;
  }

  subscribe(listener: AnalyticsListener): () => void {
    this._listeners.add(listener);

    return () => {
      this._listeners.delete(listener);
    };
  }

  query(query: EventQuery): QueryResult {
    return this._queryEngine.execute(query);
  }

  configurePersistence(options: AnalyticsPersistenceOptions): void {
    const changed =
      this._persistence?.datasetKey !== options.datasetKey ||
      this._persistence?.persistence !== options.persistence;

    this._persistence = options;

    if (changed) {
      this._persistenceQueue = Promise.resolve();

      this._persistenceFailure = undefined;
    }
  }

  async restore(
    options?: AnalyticsPersistenceOptions,
    signal?: AbortSignal,
  ): Promise<AnalyticsRestoreResult> {
    if (options) {
      this.configurePersistence(options);
    }

    const configured = this.requirePersistence();

    await this.flushPersistence();

    if (signal?.aborted) {
      return {
        restored: false,
        eventCount: 0,
        revision: this._revision,
        replayedEventCount: 0,
      };
    }

    const checkpoint = await configured.persistence.loadCheckpoint(
      configured.datasetKey,
    );

    const events = await configured.persistence.loadEvents(
      configured.datasetKey,
    );

    if (signal?.aborted) {
      return {
        restored: false,
        eventCount: 0,
        revision: this._revision,
        replayedEventCount: 0,
      };
    }

    if (!checkpoint) {
      if (events.length > 0) {
        await configured.persistence.clear(configured.datasetKey);
      }

      return {
        restored: false,
        eventCount: 0,
        revision: 0,
        replayedEventCount: 0,
      };
    }

    this.assertCheckpoint(checkpoint, configured.datasetKey, events.length);

    if (signal?.aborted) {
      return {
        restored: false,
        eventCount: 0,
        revision: this._revision,
        replayedEventCount: 0,
      };
    }

    this._state = hydrateAnalyticsState(checkpoint.state);
    this._context = new AnalyticsContext(this._context.timezone, this._state);

    this._repository.clear();
    this._repository.append(events);

    this._indexer.reset();
    this._indexer.append(events, 0, this._state.users.planByUser);

    this._registry = this.createProjectionRegistry();

    const tail = events.slice(checkpoint.eventCount);

    this._registry.append(tail);

    this._revision = checkpoint.revision;

    if (tail.length > 0) {
      this._revision++;
    }

    this._readModel = this.createReadModel();

    this.notify();

    return {
      restored: true,
      eventCount: events.length,
      revision: this._revision,
      replayedEventCount: tail.length,
    };
  }

  async checkpoint(): Promise<void> {
    const configured = this.requirePersistence();

    await this.flushPersistence();

    const checkpoint: AnalyticsCheckpoint = {
      schemaVersion: 1,
      datasetKey: configured.datasetKey,
      revision: this._revision,
      eventCount: this._repository.count(),
      createdAt: Date.now(),
      state: structuredClone(this._state),
    };

    await configured.persistence.saveCheckpoint(checkpoint);
  }

  async clearPersistentData(): Promise<void> {
    const configured = this.requirePersistence();

    await this.flushPersistence();

    await configured.persistence.clear(configured.datasetKey);
  }

  /** Waits for queued writes to settle, without masking a prior write failure. */
  async settlePersistenceQueue(): Promise<void> {
    await this._persistenceQueue;
  }

  getPersistenceFailure(): Error | null {
    return this._persistenceFailure ?? null;
  }

  async flushPersistence(): Promise<void> {
    try {
      await this._persistenceQueue;
    } catch (error) {
      this._persistenceFailure =
        error instanceof Error ? error : new Error(String(error));
    }

    if (this._persistenceFailure) {
      throw this._persistenceFailure;
    }
  }

  reset(): void {
    // Replace the full state graph, not just its current projection contents.
    // This also recovers cleanly if a failed checkpoint restore partially
    // replaced the state/context before throwing.
    this._state = createAnalyticsState();
    this._context = new AnalyticsContext(this._context.timezone, this._state);
    this._repository.clear();
    this._indexer.reset();
    this._registry = this.createProjectionRegistry();

    this.publish();
  }

  private createProjectionRegistry(): ProjectionRegistry {
    const registry = new ProjectionRegistry();

    const projections: readonly Projection[] = [
      new UserProjection(),
      new PurchaseProjection(),
      new RevenueProjection(),
      new FunnelProjection(),
      new SessionProjection(),
      new ProductProjection(),
    ];

    for (const projection of projections) {
      registry.register(projection);
    }

    registry.initialize(this._context);

    return registry;
  }

  private publish(): void {
    this._revision++;
    this._readModel = this.createReadModel();
    this.notify();
  }

  private createReadModel(): AnalyticsReadModel {
    return Object.freeze({
      revision: this._revision,

      eventCount: this._repository.count(),

      query: this._readModelQuery,

      getProgressiveSummary: this._readModelProgressiveSummary,

      getRevenueByDay: this._readModelRevenueByDay,

      getActiveUsersByDay: this._readModelActiveUsersByDay,

      getPurchaseCohorts: this._readModelPurchaseCohorts,

      getProductPerformance: this._readModelProductPerformance,
    });
  }

  private notify(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }

  private enqueuePersistence(task: PersistenceTask): void {
    if (!this._persistence) {
      return;
    }

    this._persistenceQueue = this._persistenceQueue.then(async () => {
      if (this._persistenceFailure) {
        return;
      }

      await task();
    });

    this._persistenceQueue = this._persistenceQueue.catch((error: unknown) => {
      this._persistenceFailure =
        error instanceof Error ? error : new Error(String(error));
    });
  }

  private requirePersistence(): AnalyticsPersistenceOptions {
    if (!this._persistence) {
      throw new Error("Analytics persistence has not been configured.");
    }

    return this._persistence;
  }

  private assertCheckpoint(
    checkpoint: AnalyticsCheckpoint,
    datasetKey: string,
    eventCount: number,
  ): void {
    if ((checkpoint.schemaVersion as number) !== 1) {
      throw new Error(
        `Unsupported analytics checkpoint schema version: ${checkpoint.schemaVersion}.`,
      );
    }

    if (checkpoint.datasetKey !== datasetKey) {
      throw new Error(
        "Analytics checkpoint dataset does not match the requested dataset.",
      );
    }

    if (checkpoint.eventCount < 0 || checkpoint.eventCount > eventCount) {
      throw new Error(
        "Analytics checkpoint event count is inconsistent with the persisted event log.",
      );
    }
  }
}
