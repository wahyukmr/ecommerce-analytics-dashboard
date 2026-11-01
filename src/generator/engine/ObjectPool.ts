export class ObjectPool<T> {
  private readonly pool: T[] = [];
  private readonly factory: () => T;

  constructor(factory: () => T) {
    this.factory = factory;
  }

  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  release(value: T): void {
    this.pool.push(value);
  }
}
