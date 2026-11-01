export const BootStage = {
  Initializing: "initializing",
  Restoring: "restoring",
  LoadingCatalog: "loading_catalog",
  GeneratingUsers: "generating_users",
  GeneratingEvents: "generating_events",
  Completed: "completed",
  Cancelled: "cancelled",
  Failed: "failed",
} as const;

export type BootStage = (typeof BootStage)[keyof typeof BootStage];

export interface BootState {
  stage: BootStage;
  progress: number;
  processedUsers: number;
  totalUsers: number;
  generatedEvents: number;
  startedAt: number;
  finishedAt?: number;
  error?: string;
}

export function createBootState(): BootState {
  return {
    stage: BootStage.Initializing,

    progress: 0,

    processedUsers: 0,

    totalUsers: 0,

    generatedEvents: 0,

    startedAt: Date.now(),
  };
}

export class BootStateController {
  private state: BootState = this.create();

  get snapshot(): BootState {
    return { ...this.state };
  }

  reset(): void {
    this.state = this.create();
  }

  setStage(stage: BootStage): void {
    this.state.stage = stage;
  }

  setTotalUsers(totalUsers: number): void {
    this.state.totalUsers = totalUsers;
  }

  updateProcessedUsers(processedUsers: number): void {
    this.state.processedUsers = processedUsers;
    this.state.progress =
      this.state.totalUsers === 0 ? 0 : processedUsers / this.state.totalUsers;
  }

  incrementGeneratedEvents(count: number): void {
    this.state.generatedEvents += count;
  }

  complete(): void {
    this.state.stage = BootStage.Completed;
    this.state.progress = 1;
    this.state.finishedAt = Date.now();
  }

  cancel(): void {
    this.state.stage = BootStage.Cancelled;
    this.state.finishedAt = Date.now();
  }

  fail(message: string): void {
    this.state.stage = BootStage.Failed;
    this.state.error = message;
    this.state.finishedAt = Date.now();
  }

  private create(): BootState {
    return {
      stage: BootStage.Initializing,
      progress: 0,
      processedUsers: 0,
      totalUsers: 0,
      generatedEvents: 0,
      startedAt: Date.now(),
    };
  }
}
