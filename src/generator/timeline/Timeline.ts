import { DAY_MS } from "../../constant";

export class Timeline {
  static now(): number {
    return Date.now();
  }

  static randomTimestampWithinDays(days: number): number {
    const now = Date.now();
    const past = now - days * DAY_MS;
    return Math.floor(past + Math.random() * (now - past));
  }

  static isFuture(timestamp: number): boolean {
    return timestamp > Date.now();
  }

  static isValidTimestamp(timestamp: number): boolean {
    return Number.isFinite(timestamp) && timestamp <= Date.now();
  }
}
