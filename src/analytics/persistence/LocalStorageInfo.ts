/** Origin-scoped browser storage information. Byte values are estimates from the browser. */
export interface LocalStorageInfo {
  readonly savedDatasetCount: number | null;
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
  readonly isPersistent: boolean | null;
  readonly inspectionError: string | null;
  readonly measuredAt: number;
}

export const EMPTY_LOCAL_STORAGE_INFO: LocalStorageInfo = {
  savedDatasetCount: null,
  usageBytes: null,
  quotaBytes: null,
  isPersistent: null,
  inspectionError: null,
  measuredAt: 0,
};

export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) {
    return "Unavailable";
  }

  if (bytes < 1024) return `${Math.round(bytes)} B`;

  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
}
