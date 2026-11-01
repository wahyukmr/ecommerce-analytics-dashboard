import type { BootStage } from "../generator/engine/BootState";
import type { GeneratorConfig, RawEvent } from "../types";

export const WorkerMessageType = {
  Bootstrap: "bootstrap",
  Chunk: "chunk",
  Ack: "ack",
  Progress: "progress",
  Stage: "stage",
  Complete: "complete",
  Error: "error",
  Cancel: "cancel",
} as const;

export type WorkerRunId = number;

export interface BootstrapMessage {
  type: typeof WorkerMessageType.Bootstrap;

  payload: {
    runId: WorkerRunId;
    config: GeneratorConfig;
  };
}

export interface ChunkMessage {
  type: typeof WorkerMessageType.Chunk;

  payload: {
    runId: WorkerRunId;
    events: RawEvent[];
  };
}

export interface AckMessage {
  type: typeof WorkerMessageType.Ack;

  payload: {
    runId: WorkerRunId;
  };
}

export interface ProgressMessage {
  type: typeof WorkerMessageType.Progress;

  payload: {
    runId: WorkerRunId;
    processedUsers: number;
    totalUsers: number;
    generatedEvents: number;
    progress: number;
  };
}

export interface StageMessage {
  type: typeof WorkerMessageType.Stage;

  payload: {
    runId: WorkerRunId;
    stage: BootStage;
  };
}

export interface CompleteMessage {
  type: typeof WorkerMessageType.Complete;

  payload: {
    runId: WorkerRunId;
    generatedEvents: number;
  };
}

export interface ErrorMessage {
  type: typeof WorkerMessageType.Error;

  payload: {
    runId: WorkerRunId;
    message: string;
    stack?: string;
  };
}

export interface CancelMessage {
  type: typeof WorkerMessageType.Cancel;

  payload: {
    runId: WorkerRunId;
  };
}

export type WorkerRequest = BootstrapMessage | AckMessage | CancelMessage;

export type WorkerResponse =
  | ChunkMessage
  | ProgressMessage
  | StageMessage
  | CompleteMessage
  | ErrorMessage;
