import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SyntheticAnalyticsStatusContext } from "../../../../context/SyntheticAnalyticsContext";
import {
  BootStage,
  type BootStage as BootStageType,
} from "../../../../generator/engine/BootState";
import type { PersistenceMode } from "../../../../analytics/persistence/PersistenceMode";
import { EMPTY_LOCAL_STORAGE_INFO } from "../../../../analytics/persistence/LocalStorageInfo";
import DashboardBootStatus from "./DashboardBootStatus";

function renderWithStatus(
  overrides: Partial<{
    stage: BootStageType | null;
    progress: number;
    processedUsers: number;
    totalUsers: number;
    generatedEvents: number;
    isBooting: boolean;
    error: Error | null;
    persistenceMode: PersistenceMode;
    persistenceNotice: string | null;
  }> = {},
) {
  const value = {
    stage: BootStage.GeneratingEvents,
    progress: 0.42,
    processedUsers: 42,
    totalUsers: 100,
    generatedEvents: 812,
    isBooting: true,
    error: null,
    persistenceMode: "persistent" as PersistenceMode,
    persistenceNotice: null,
    localStorageInfo: EMPTY_LOCAL_STORAGE_INFO,
    isManagingStorage: false,
    storageActionError: null,
    ...overrides,
  };

  return render(
    <SyntheticAnalyticsStatusContext value={value}>
      <DashboardBootStatus onRetry={overrides.error ? vi.fn() : undefined} />
    </SyntheticAnalyticsStatusContext>,
  );
}

describe("DashboardBootStatus", () => {
  it("announces the active boot stage and exposes progress while preparing", () => {
    const { container } = renderWithStatus();

    expect(screen.getByText("Streaming ecommerce events")).toBeInTheDocument();
    expect(screen.getByText("42 / 100 users")).toBeInTheDocument();
    expect(screen.getByText("812 events")).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("exposes a specific error and a retry action when preparation fails", () => {
    const onRetry = vi.fn();
    render(
      <SyntheticAnalyticsStatusContext
        value={{
          stage: BootStage.Failed,
          progress: 0.42,
          processedUsers: 42,
          totalUsers: 100,
          generatedEvents: 812,
          isBooting: false,
          error: new Error("IndexedDB quota was exceeded."),
          persistenceMode: "persistent",
          persistenceNotice: null,
          localStorageInfo: EMPTY_LOCAL_STORAGE_INFO,
          isManagingStorage: false,
          storageActionError: null,
        }}
      >
        <DashboardBootStatus onRetry={onRetry} />
      </SyntheticAnalyticsStatusContext>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Dataset preparation could not finish",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "IndexedDB quota was exceeded.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry dataset" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders nothing after preparation is complete", () => {
    const { container } = renderWithStatus({
      stage: BootStage.Completed,
      isBooting: false,
      progress: 1,
    });
    expect(container).toBeEmptyDOMElement();
  });
});
