import type { NormalizedEvent } from "../../types";
import type { Projection } from "../contracts/Projection";
import type { AnalyticsContext } from "./AnalyticsContext";

export class ProjectionRegistry {
  private readonly projections: Projection[] = [];

  register(projection: Projection): void {
    if (this.projections.some((current) => current.name === projection.name)) {
      throw new Error(`Projection "${projection.name}" is already registered.`);
    }

    this.projections.push(projection);
  }

  initialize(context: AnalyticsContext): void {
    for (const projection of this.projections) {
      projection.initialize(context);
    }
  }

  append(events: readonly NormalizedEvent[]): void {
    if (events.length === 0) return;

    for (const projection of this.projections) {
      projection.append(events);
    }
  }

  reset(): void {
    for (const projection of this.projections) {
      projection.reset();
    }
  }

  values(): readonly Projection[] {
    return this.projections;
  }
}
