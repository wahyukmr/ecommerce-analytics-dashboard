import type { NormalizedEvent } from "../../types";
import type { EventRepository as EventRepositoryContract } from "../contracts/Repository";

export class InMemoryEventRepository implements EventRepositoryContract {
  private readonly _events: NormalizedEvent[] = [];

  append(events: readonly NormalizedEvent[]): void {
    for (const event of events) {
      this._events.push(event);
    }
  }

  clear(): void {
    this._events.length = 0;
  }

  count(): number {
    return this._events.length;
  }

  events(): readonly NormalizedEvent[] {
    return this._events;
  }
}
