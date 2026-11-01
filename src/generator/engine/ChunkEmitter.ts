import type { RawEvent } from "../../types";
import { EventArrayPool } from "./EventArrayPool";

export interface ChunkEmitterOptions {
  readonly chunkSize: number;

  readonly onChunk: (chunk: readonly RawEvent[]) => void | Promise<void>;
}

export class ChunkEmitter {
  private readonly pool = new EventArrayPool();

  private readonly chunkSize: number;

  private readonly onChunk: (events: readonly RawEvent[]) => Promise<void>;

  private buffer = this.pool.acquire();

  constructor(options: ChunkEmitterOptions) {
    if (!Number.isInteger(options.chunkSize) || options.chunkSize <= 0) {
      throw new Error("Chunk size must be a positive integer.");
    }

    this.chunkSize = options.chunkSize;

    this.onChunk = async (events) => {
      await options.onChunk(events);
    };
  }

  emit(event: RawEvent): void {
    this.buffer.push(event);
  }

  async flushIfNeeded(): Promise<void> {
    if (this.buffer.length < this.chunkSize) {
      return;
    }

    await this.flush();
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const chunk = this.buffer;

    this.buffer = this.pool.acquire();

    try {
      await this.onChunk(chunk);
    } finally {
      this.pool.release(chunk);
    }
  }

  clear(): void {
    this.buffer.length = 0;
  }

  get size(): number {
    return this.buffer.length;
  }
}
