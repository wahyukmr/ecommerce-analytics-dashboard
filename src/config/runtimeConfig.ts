import { DATASET_PRESETS } from "../constant";

const PREFERRED_DATASET_KEY = "commerce-intelligence:preferred-dataset-users";

/**
 * The small fixture is selected only by Playwright's local web-server env.
 * A selected preset is preserved across reloads so the matching IndexedDB
 * dataset can be restored instead of silently booting a different size.
 */
export const INITIAL_DATASET_USERS =
  import.meta.env.VITE_E2E_MODE === "true"
    ? (DATASET_PRESETS[0]?.totalUsers ?? 25)
    : (DATASET_PRESETS[0]?.totalUsers ?? 10_000);

export function resolveInitialDatasetUsers(): number {
  if (typeof window === "undefined") return INITIAL_DATASET_USERS;

  try {
    const storedValue = window.localStorage.getItem(PREFERRED_DATASET_KEY);
    if (!storedValue) return INITIAL_DATASET_USERS;

    const storedUsers = Number(storedValue);
    return DATASET_PRESETS.some((preset) => preset.totalUsers === storedUsers)
      ? storedUsers
      : INITIAL_DATASET_USERS;
  } catch {
    // Preference storage is optional. A blocked localStorage must not block boot.
    return INITIAL_DATASET_USERS;
  }
}

export function persistPreferredDatasetUsers(totalUsers: number): void {
  if (!DATASET_PRESETS.some((preset) => preset.totalUsers === totalUsers))
    return;

  try {
    window.localStorage.setItem(PREFERRED_DATASET_KEY, String(totalUsers));
  } catch {
    // The analytics engine has its own session-only fallback; preset preference
    // is a convenience only and must not interrupt dataset generation.
  }
}
