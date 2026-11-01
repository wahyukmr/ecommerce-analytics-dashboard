import type { RawEvent } from "../../types";

import { ObjectPool } from "./ObjectPool";

export class EventArrayPool {
  private readonly pool = new ObjectPool<RawEvent[]>(() => []);

  acquire(): RawEvent[] {
    return this.pool.acquire();
  }

  release(events: RawEvent[]): void {
    events.length = 0;

    this.pool.release(events);
  }
}
