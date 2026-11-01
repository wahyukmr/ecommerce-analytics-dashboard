export interface TimeSeriesPoint {
  readonly date: string;
}

/**
 * Largest-Triangle-Three-Buckets downsampling for chronological series.
 * The first and last points are always retained.
 *
 * The original reference is returned when no reduction is required.
 */
export function downsampleTimeSeries<T extends TimeSeriesPoint>(
  data: readonly T[],
  maxPoints: number,
  getValue: (point: T) => number,
): readonly T[] {
  if (maxPoints < 3 || data.length <= maxPoints) {
    return data;
  }

  const result: T[] = [data[0]];
  const bucketSize = (data.length - 2) / (maxPoints - 2);

  let previousSelectedIndex = 0;

  for (let bucket = 0; bucket < maxPoints - 2; bucket++) {
    const currentStart = Math.floor(bucket * bucketSize) + 1;
    const currentEnd = Math.floor((bucket + 1) * bucketSize) + 1;

    const nextStart = currentEnd;
    const nextEnd = Math.min(
      data.length - 1,
      Math.floor((bucket + 2) * bucketSize) + 1,
    );

    const nextAverage = getBucketAverage(data, nextStart, nextEnd, getValue);

    const previousValue = getValue(data[previousSelectedIndex]);

    let selectedIndex = currentStart;
    let maxArea = -1;

    for (
      let index = currentStart;
      index < currentEnd && index < data.length - 1;
      index++
    ) {
      const currentValue = getValue(data[index]);
      const area = triangleArea(
        previousValue,
        currentValue,
        nextAverage,
        index - currentStart,
      );

      if (area > maxArea) {
        maxArea = area;
        selectedIndex = index;
      }
    }

    result.push(data[selectedIndex]);
    previousSelectedIndex = selectedIndex;
  }

  result.push(data[data.length - 1]);

  return result;
}

function getBucketAverage<T extends TimeSeriesPoint>(
  data: readonly T[],
  start: number,
  end: number,
  getValue: (point: T) => number,
): number {
  const safeStart = Math.min(Math.max(start, 0), data.length - 1);

  const safeEnd = Math.min(Math.max(end, safeStart + 1), data.length);

  let total = 0;

  for (let index = safeStart; index < safeEnd; index++) {
    total += getValue(data[index]);
  }

  return total / (safeEnd - safeStart);
}

function triangleArea(
  previousValue: number,
  currentValue: number,
  nextValue: number,
  indexInBucket: number,
): number {
  const ax = 0;
  const ay = previousValue;
  const bx = indexInBucket + 1;
  const by = currentValue;
  const cx = indexInBucket + 2;
  const cy = nextValue;

  return Math.abs((ax - cx) * (by - ay) - (ax - bx) * (cy - ay));
}
