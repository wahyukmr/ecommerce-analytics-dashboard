import { describe, expect, it, vi } from "vitest";
import { WorkerController } from "./WorkerController";
import { WorkerMessageType, type WorkerResponse } from "./worker-protocol";
import type { GeneratorConfig } from "../types";

class FakeWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;

  onerror: ((event: ErrorEvent) => void) | null = null;

  readonly messages: unknown[] = [];

  terminated = false;

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: WorkerResponse): void {
    this.onmessage?.({
      data: message,
    } as MessageEvent<WorkerResponse>);
  }
}

const config: GeneratorConfig = {
  totalUsers: 1,
  days: 1,
  products: [],

  personaDistribution: {
    browser: 1,
    interested: 0,
    buyer: 0,
    loyal_customer: 0,
  },
};

describe("WorkerController", () => {
  it("ignores responses from superseded runs", () => {
    const worker = new FakeWorker();

    const onProgress = vi.fn();

    const controller = new WorkerController(worker as unknown as Worker, {
      onProgress,
    });

    const firstRunId = controller.start(config);

    const secondRunId = controller.start(config);

    worker.emit({
      type: WorkerMessageType.Progress,

      payload: {
        runId: firstRunId,

        processedUsers: 1,
        totalUsers: 10,
        generatedEvents: 10,
        progress: 0.1,
      },
    });

    worker.emit({
      type: WorkerMessageType.Progress,

      payload: {
        runId: secondRunId,

        processedUsers: 2,
        totalUsers: 10,
        generatedEvents: 20,
        progress: 0.2,
      },
    });

    expect(onProgress).toHaveBeenCalledTimes(1);

    expect(onProgress).toHaveBeenCalledWith({
      processedUsers: 2,
      totalUsers: 10,
      generatedEvents: 20,
      progress: 0.2,
    });
  });

  it("posts an acknowledgement only after the current chunk has been processed", async () => {
    const worker = new FakeWorker();

    let resolveChunk: (() => void) | undefined;

    const controller = new WorkerController(worker as unknown as Worker, {
      onChunk: () =>
        new Promise<void>((resolve) => {
          resolveChunk = resolve;
        }),
    });

    const runId = controller.start(config);

    worker.emit({
      type: WorkerMessageType.Chunk,

      payload: {
        runId,
        events: [],
      },
    });

    await Promise.resolve();

    expect(worker.messages).toHaveLength(1);

    resolveChunk?.();

    await Promise.resolve();

    expect(worker.messages).toHaveLength(2);

    expect(worker.messages[1]).toEqual({
      type: WorkerMessageType.Ack,

      payload: {
        runId,
      },
    });
  });

  it("stops delivering callbacks after termination", () => {
    const worker = new FakeWorker();

    const onProgress = vi.fn();

    const controller = new WorkerController(worker as unknown as Worker, {
      onProgress,
    });

    const runId = controller.start(config);

    controller.terminate();

    worker.emit({
      type: WorkerMessageType.Progress,

      payload: {
        runId,
        processedUsers: 1,
        totalUsers: 1,
        generatedEvents: 1,
        progress: 1,
      },
    });

    expect(onProgress).not.toHaveBeenCalled();

    expect(worker.terminated).toBe(true);
  });
});
