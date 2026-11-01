import type { NormalizedEvent } from "../../types";
import type { Projection } from "../contracts/Projection";
import type { AnalyticsContext } from "../engine/AnalyticsContext";

export class SessionProjection implements Projection {
  readonly name = "session";

  private _state: AnalyticsContext["state"]["sessions"] | undefined;

  initialize(context: AnalyticsContext): void {
    if (this._state !== undefined) {
      throw new Error(
        `Projection "${this.name}" has already been initialized.`,
      );
    }

    this._state = context.state.sessions;
  }

  append(events: readonly NormalizedEvent[]): void {
    const state = this.requireState();

    for (const event of events) {
      const sessionId = event.properties?.sessionId;

      if (sessionId && !state.sessionIds.has(sessionId)) {
        state.sessionIds.add(sessionId);

        state.totalSessions++;
      }

      if (event.eventType === "add_to_cart" && sessionId) {
        state.cartSessionIds.add(sessionId);
      }

      if (event.eventType === "payment_success" && sessionId) {
        state.purchasedSessionIds.add(sessionId);
      }
    }
  }

  reset(): void {
    const state = this.requireState();

    state.totalSessions = 0;
    state.sessionIds.clear();
    state.cartSessionIds.clear();
    state.purchasedSessionIds.clear();
  }

  private requireState(): AnalyticsContext["state"]["sessions"] {
    if (!this._state) {
      throw new Error(`Projection "${this.name}" is not initialized.`);
    }

    return this._state;
  }
}
