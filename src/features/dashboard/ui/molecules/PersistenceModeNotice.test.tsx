import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SyntheticAnalyticsStatusContext } from "../../../../context/SyntheticAnalyticsContext";
import type { SyntheticAnalyticsStatusContextValue } from "../../../../context/SyntheticAnalyticsContext";
import { EMPTY_LOCAL_STORAGE_INFO } from "../../../../analytics/persistence/LocalStorageInfo";
import PersistenceModeNotice from "./PersistenceModeNotice";

const baseStatus: SyntheticAnalyticsStatusContextValue = {
  stage: null,
  progress: 1,
  processedUsers: 25,
  totalUsers: 25,
  generatedEvents: 250,
  isBooting: false,
  error: null,
  persistenceMode: "persistent",
  persistenceNotice: null,
  localStorageInfo: EMPTY_LOCAL_STORAGE_INFO,
  isManagingStorage: false,
  storageActionError: null,
};

describe("PersistenceModeNotice", () => {
  it("explains the limitation when results are only held for the current session", () => {
    render(
      <SyntheticAnalyticsStatusContext
        value={{
          ...baseStatus,
          persistenceMode: "session-only",
          persistenceNotice:
            "Browser storage is unavailable. The dataset will be regenerated after reload.",
        }}
      >
        <PersistenceModeNotice />
      </SyntheticAnalyticsStatusContext>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Session-only dataset",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "regenerated after reload",
    );
  });

  it("does not render a warning when persistent storage is available", () => {
    const { container } = render(
      <SyntheticAnalyticsStatusContext value={baseStatus}>
        <PersistenceModeNotice />
      </SyntheticAnalyticsStatusContext>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
