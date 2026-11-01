import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("explains the empty result and offers a useful next action hint", () => {
    render(
      <EmptyState
        title="There is no revenue to chart"
        description="No successful purchases were found in this scope."
        hint="Broaden the date range or change the plan filter."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "There is no revenue to chart" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No successful purchases were found in this scope."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Broaden the date range or change the plan filter."),
    ).toBeInTheDocument();
  });
});
