export type PersistenceFailureKind = "quota" | "blocked" | "unknown";

function getErrorName(error: unknown): string {
  if (typeof error === "object" && error !== null && "name" in error) {
    const name = (error as { name?: unknown }).name;
    return typeof name === "string" ? name : "";
  }

  return "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

export function classifyPersistenceFailure(
  error: unknown,
): PersistenceFailureKind {
  const name = getErrorName(error).toLowerCase();
  const message = getErrorMessage(error).toLowerCase();

  if (
    name === "quotaexceedederror" ||
    name === "ns_error_dom_quota_reached" ||
    /quota.{0,40}(exceed|full|limit)|storage.{0,40}(full|quota)|disk is full/.test(
      message,
    )
  ) {
    return "quota";
  }

  if (
    name === "securityerror" ||
    name === "notallowederror" ||
    name === "invalidstateerror" ||
    /indexeddb.{0,30}(blocked|unavailable|denied)|storage access.{0,20}denied/.test(
      message,
    )
  ) {
    return "blocked";
  }

  return "unknown";
}

export function describePersistenceFailure(error: unknown): string {
  const kind = classifyPersistenceFailure(error);
  const detail = getErrorMessage(error).trim().slice(0, 180);

  if (kind === "quota") {
    return "The browser storage quota has been reached. The active dashboard is still available in this tab. Open Local data and clear saved datasets to free space; the current session will not be saved after that. This browser-reported error may be caused by other data stored for this site as well.";
  }

  if (kind === "blocked") {
    return "The browser blocked access to local storage. The dashboard will continue in session-only mode; its current data will be lost after reload or when switching datasets.";
  }

  return `Browser storage could not be used, so the dashboard is running in session-only mode. The current dataset stays available while this page is open, but it will be regenerated after a reload or dataset change.${detail ? ` Details: ${detail}` : ""}`;
}

export function describeStorageClearFailure(error: unknown): string {
  const kind = classifyPersistenceFailure(error);

  if (kind === "quota") {
    return "The browser reported a storage quota error while clearing data; saved data may still exist. The active dashboard has been kept in memory and persistence has been paused for this tab. Try clearing this site's data in browser settings.";
  }

  if (kind === "blocked") {
    return "The browser blocked deletion of saved analytics data. The active dashboard remains available for this tab, but saved data may still exist. Check this site's storage permissions in browser settings.";
  }

  const detail = getErrorMessage(error).trim().slice(0, 180);
  return `Saved analytics data could not be cleared; saved data may still exist. The active dashboard remains available for this tab and persistence has been paused.${detail ? ` Details: ${detail}` : ""}`;
}
