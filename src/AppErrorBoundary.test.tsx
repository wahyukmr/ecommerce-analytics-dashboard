import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AppErrorBoundary", () => {
  it("renders children when the application is healthy", () => {
    render(
      <AppErrorBoundary>
        <p>Dashboard content</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText("Dashboard content")).toBeTruthy();
  });

  it("shows a recoverable fallback when a descendant throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    function BrokenWidget(): React.JSX.Element {
      throw new Error("Unexpected chart rendering failure");
    }

    render(
      <AppErrorBoundary>
        <BrokenWidget />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("The dashboard could not render")).toBeTruthy();
    expect(screen.getByText("Try rendering again")).toBeTruthy();
    expect(screen.getByText("Reload dashboard")).toBeTruthy();
  });
});
