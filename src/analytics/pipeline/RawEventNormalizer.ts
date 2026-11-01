import type { NormalizedEvent, RawEvent } from "../../types";
import type { EventNormalizer } from "../contracts/Normalizer";

export class RawEventNormalizer implements EventNormalizer {
  normalize(events: readonly RawEvent[]): readonly NormalizedEvent[] {
    const normalized = new Array<NormalizedEvent>(events.length);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      if (!Number.isFinite(event.timestamp)) {
        throw new Error(`Invalid timestamp for event at index ${i}.`);
      }

      if (
        event.event_type === "payment_success" &&
        event.properties?.revenue !== undefined &&
        (!Number.isFinite(event.properties.revenue) ||
          event.properties.revenue < 0)
      ) {
        throw new Error(`Invalid revenue for event at index ${i}.`);
      }

      normalized[i] = {
        eventType: event.event_type,
        userId: event.user_id,
        timestamp: event.timestamp,
        ...(event.properties !== undefined
          ? { properties: event.properties }
          : {}),
      };
    }

    return normalized;
  }
}
