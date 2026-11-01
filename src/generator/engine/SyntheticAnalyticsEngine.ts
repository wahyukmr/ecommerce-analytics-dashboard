import type { GeneratorConfig, RawEvent } from "../../types";
import { EventBuilder } from "../core/EventBuilder";
import type { UserFactoryInterface } from "../core/UserFactory";
import { UserFactory } from "../core/UserFactory";
import { SimulationContext } from "../context/SimulationContext";
import { BootStateController, BootStage, type BootState } from "./BootState";
import { ChunkEmitter } from "./ChunkEmitter";
import { createUserRuntime } from "../runtime/UserRuntime";

export interface GenerationProgress {
  processedUsers: number;
  totalUsers: number;
  generatedEvents: number;
  progress: number;
}

export interface SyntheticAnalyticsCallbacks {
  onChunk?(events: readonly RawEvent[]): void | Promise<void>;
  onProgress?(progress: GenerationProgress): void;
  onStage?(stage: BootStage): void;
  onComplete?(state: Readonly<BootState>): void;
  onError?(error: Error): void;
}

export interface SyntheticAnalyticsEngineOptions {
  readonly eventBuilder?: EventBuilder;
  readonly userFactory?: UserFactoryInterface;
  readonly chunkSize?: number;
  readonly progressIntervalUsers?: number;
}

export class SyntheticAnalyticsEngine {
  private readonly config: GeneratorConfig;
  private readonly eventBuilder: EventBuilder;
  private readonly userFactory: UserFactoryInterface;
  private readonly boot = new BootStateController();
  private readonly chunkSize: number;
  private readonly progressIntervalUsers: number;

  private isRunning = false;

  private cancelled = false;

  constructor(
    config: GeneratorConfig,
    options: SyntheticAnalyticsEngineOptions = {},
  ) {
    this.config = config;
    this.eventBuilder = options.eventBuilder ?? new EventBuilder();
    this.userFactory = options.userFactory ?? new UserFactory();
    this.chunkSize = options.chunkSize ?? 10_000;
    this.progressIntervalUsers =
      options.progressIntervalUsers ??
      Math.max(
        1,
        Math.min(250, Math.ceil(Math.max(config.totalUsers, 1) / 100)),
      );
  }

  cancel(): void {
    this.cancelled = true;
    this.boot.cancel();
  }

  async run(callbacks: SyntheticAnalyticsCallbacks = {}): Promise<void> {
    if (this.isRunning) {
      throw new Error("SyntheticAnalyticsEngine is already running.");
    }

    this.isRunning = true;
    this.cancelled = false;
    this.boot.reset();

    try {
      this.changeStage(BootStage.LoadingCatalog, callbacks);

      const context = new SimulationContext(this.config);

      this.boot.setTotalUsers(this.config.totalUsers);

      this.changeStage(BootStage.GeneratingUsers, callbacks);

      const emitter = new ChunkEmitter({
        chunkSize: this.chunkSize,

        onChunk: async (events) => {
          await callbacks.onChunk?.(events);
        },
      });

      this.changeStage(BootStage.GeneratingEvents, callbacks);

      let processedUsers = 0;

      for (const user of this.userFactory.iterateUsers(this.config)) {
        if (this.cancelled) {
          return;
        }

        const runtime = createUserRuntime(user.id);

        const generatedEvents = this.eventBuilder.generateEventsForUser(
          user,
          runtime,
          context,
          (event) => emitter.emit(event),
        );

        this.boot.incrementGeneratedEvents(generatedEvents);

        processedUsers++;

        this.boot.updateProcessedUsers(processedUsers);

        await emitter.flushIfNeeded();

        if (
          processedUsers % this.progressIntervalUsers === 0 ||
          processedUsers === this.config.totalUsers
        ) {
          callbacks.onProgress?.(this.boot.snapshot);
        }
      }

      if (this.cancelled) return;

      await emitter.flush();

      if (this.cancelled) return;

      this.boot.complete();

      this.changeStage(BootStage.Completed, callbacks);

      callbacks.onComplete?.(this.boot.snapshot);
    } catch (error) {
      const exception =
        error instanceof Error ? error : new Error(String(error));

      this.boot.fail(exception.message);

      callbacks.onError?.(exception);
    } finally {
      this.isRunning = false;
    }
  }

  get bootState(): Readonly<BootState> {
    return this.boot.snapshot;
  }

  private changeStage(
    stage: BootStage,
    callbacks: SyntheticAnalyticsCallbacks,
  ): void {
    this.boot.setStage(stage);
    callbacks.onStage?.(stage);
  }
}
