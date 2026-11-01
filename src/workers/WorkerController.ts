import {
  WorkerMessageType,
  type WorkerResponse,
  type WorkerRunId,
} from "./worker-protocol";
import type { RawEvent, GeneratorConfig } from "../types";
import type { BootStage } from "../generator/engine/BootState";

export interface WorkerControllerOptions {
  onChunk?(events: readonly RawEvent[]): void | Promise<void>;

  onProgress?(progress: {
    processedUsers: number;
    totalUsers: number;
    generatedEvents: number;
    progress: number;
  }): void;

  onStage?(stage: BootStage): void;

  onComplete?(generatedEvents: number): void;

  onError?(error: Error): void;
}

export class WorkerController {
  private readonly worker: Worker;

  private readonly options: WorkerControllerOptions;

  private runId = 0;

  private disposed = false;

  constructor(worker: Worker, options: WorkerControllerOptions) {
    this.worker = worker;
    this.options = options;

    this.worker.onmessage = this.handleMessage;

    this.worker.onerror = this.handleWorkerError;
  }

  start(config: GeneratorConfig): WorkerRunId {
    this.assertActive();

    this.runId++;

    const runId = this.runId;

    this.worker.postMessage({
      type: WorkerMessageType.Bootstrap,

      payload: {
        runId,
        config,
      },
    });

    return runId;
  }

  cancel(): void {
    if (this.disposed || this.runId === 0) {
      return;
    }

    this.worker.postMessage({
      type: WorkerMessageType.Cancel,

      payload: {
        runId: this.runId,
      },
    });
  }

  terminate(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    this.runId++;

    this.worker.onmessage = null;
    this.worker.onerror = null;

    this.worker.terminate();
  }

  private handleMessage = async (
    event: MessageEvent<WorkerResponse>,
  ): Promise<void> => {
    if (this.disposed) {
      return;
    }

    const message = event.data;

    const messageRunId = message.payload.runId;

    if (messageRunId !== this.runId) {
      return;
    }

    switch (message.type) {
      case WorkerMessageType.Chunk:
        try {
          await this.options.onChunk?.(message.payload.events);
        } catch (error) {
          const exception =
            error instanceof Error ? error : new Error(String(error));

          this.options.onError?.(exception);

          this.cancel();
          return;
        }

        if (this.disposed || messageRunId !== this.runId) {
          return;
        }

        this.worker.postMessage({
          type: WorkerMessageType.Ack,

          payload: {
            runId: messageRunId,
          },
        });

        break;

      case WorkerMessageType.Progress:
        this.options.onProgress?.({
          processedUsers: message.payload.processedUsers,

          totalUsers: message.payload.totalUsers,

          generatedEvents: message.payload.generatedEvents,

          progress: message.payload.progress,
        });

        break;

      case WorkerMessageType.Stage:
        this.options.onStage?.(message.payload.stage);

        break;

      case WorkerMessageType.Complete:
        this.options.onComplete?.(message.payload.generatedEvents);

        break;

      case WorkerMessageType.Error: {
        const error = new Error(message.payload.message);

        if (message.payload.stack) {
          error.stack = message.payload.stack;
        }

        this.options.onError?.(error);

        break;
      }
    }
  };

  private handleWorkerError = (event: ErrorEvent): void => {
    if (this.disposed) {
      return;
    }

    this.options.onError?.(new Error(event.message || "Worker error."));
  };

  private assertActive(): void {
    if (this.disposed) {
      throw new Error("WorkerController has already been terminated.");
    }
  }
}
