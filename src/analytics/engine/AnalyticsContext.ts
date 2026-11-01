import type { AnalyticsState } from "./AnalyticsState";

export class AnalyticsContext {
  readonly timezone: string;
  readonly state: AnalyticsState;

  constructor(timezone: string, state: AnalyticsState) {
    this.timezone = timezone;
    this.state = state;

    if (!timezone) {
      throw new Error("Analytics timezone is required.");
    }
  }
}
