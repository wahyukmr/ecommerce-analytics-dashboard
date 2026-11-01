export class PerformanceProfiler {
  private readonly marks = new Map<string, number>();

  start(label: string) {
    this.marks.set(label, performance.now());
  }

  end(label: string) {
    const start = this.marks.get(label);

    if (start === undefined) return;

    console.log(`${label}: ${(performance.now() - start).toFixed(2)} ms`);
  }
}
