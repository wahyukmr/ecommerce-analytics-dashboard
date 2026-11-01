import { SyntheticAnalyticsEngine } from "../generator/engine/SyntheticAnalyticsEngine";
import {
  WorkerMessageType,
  type WorkerRequest,
  type WorkerRunId,
} from "./worker-protocol";

let engine: SyntheticAnalyticsEngine | undefined;
let activeRunId: WorkerRunId | undefined;
let pendingAck:
  | {
      runId: WorkerRunId;
      resolve: () => void;
      reject: (error: Error) => void;
    }
  | undefined;
let cancelled = false;

function waitForAck(runId: WorkerRunId): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    pendingAck = {
      runId,
      resolve,
      reject,
    };
  });
}

function cancelPendingAck(runId?: WorkerRunId): void {
  if (!pendingAck) return;
  if (runId !== undefined && pendingAck.runId !== runId) return;

  const current = pendingAck;
  pendingAck = undefined;
  current.reject(new Error("Synthetic analytics generation cancelled."));
}

function isActive(runId: WorkerRunId): boolean {
  return activeRunId === runId && !cancelled;
}

self.onmessage = async (
  messageEvent: MessageEvent<WorkerRequest>,
): Promise<void> => {
  const message = messageEvent.data;

  if (message.type === WorkerMessageType.Ack) {
    if (pendingAck?.runId !== message.payload.runId) {
      return;
    }

    const current = pendingAck;
    pendingAck = undefined;
    current.resolve();
    return;
  }

  if (message.type === WorkerMessageType.Cancel) {
    if (activeRunId !== message.payload.runId) {
      return;
    }

    cancelled = true;
    engine?.cancel();
    cancelPendingAck(message.payload.runId);
    return;
  }

  if (message.type !== WorkerMessageType.Bootstrap) {
    return;
  }

  const runId = message.payload.runId;

  engine?.cancel();
  cancelPendingAck();

  activeRunId = runId;
  cancelled = false;
  engine = new SyntheticAnalyticsEngine(message.payload.config);

  try {
    await engine.run({
      onChunk: async (events) => {
        if (!isActive(runId)) return;

        self.postMessage({
          type: WorkerMessageType.Chunk,
          payload: {
            runId,
            events: Array.from(events),
          },
        });

        await waitForAck(runId);
      },

      onProgress: (progress) => {
        if (!isActive(runId)) return;

        self.postMessage({
          type: WorkerMessageType.Progress,
          payload: {
            runId,
            ...progress,
          },
        });
      },

      onStage: (stage) => {
        if (!isActive(runId)) return;

        self.postMessage({
          type: WorkerMessageType.Stage,
          payload: {
            runId,
            stage,
          },
        });
      },

      onComplete: (state) => {
        if (!isActive(runId)) return;

        self.postMessage({
          type: WorkerMessageType.Complete,
          payload: {
            runId,
            generatedEvents: state.generatedEvents,
          },
        });
      },

      onError: (error) => {
        if (!isActive(runId)) return;

        self.postMessage({
          type: WorkerMessageType.Error,
          payload: {
            runId,
            message: error.message,
            stack: error.stack,
          },
        });
      },
    });
  } catch (error) {
    if (!isActive(runId)) return;

    const exception = error instanceof Error ? error : new Error(String(error));

    self.postMessage({
      type: WorkerMessageType.Error,
      payload: {
        runId,
        message: exception.message,
        stack: exception.stack,
      },
    });
  } finally {
    if (activeRunId === runId) {
      pendingAck = undefined;
    }
  }
};
