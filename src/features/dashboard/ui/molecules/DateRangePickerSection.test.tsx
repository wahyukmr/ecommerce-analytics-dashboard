import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DashboardFilters } from "../../application/types";
import DateRangePickerSection from "./DateRangePickerSection";

const filters: DashboardFilters = {
  dateRange: "last_30_days",
  plan: "all",
  category: "all",
};

describe("DateRangePickerSection", () => {
  it("disables all scope controls while the progressive dataset is building", () => {
    render(
      <DateRangePickerSection filters={filters} onChange={vi.fn()} disabled />,
    );

    expect(screen.getByLabelText("Plan")).toBeDisabled();
    expect(screen.getByLabelText("Category")).toBeDisabled();
    expect(screen.getByRole("button", { name: "All time" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "30 days" })).toBeDisabled();
  });

  it("emits typed scope changes without modifying the supplied filter object", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePickerSection filters={filters} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Plan"), "pro");
    await user.selectOptions(screen.getByLabelText("Category"), "beauty");
    await user.click(screen.getByRole("button", { name: "All time" }));

    expect(onChange).toHaveBeenNthCalledWith(1, { plan: "pro" });
    expect(onChange).toHaveBeenNthCalledWith(2, { category: "beauty" });
    expect(onChange).toHaveBeenNthCalledWith(3, { dateRange: "all" });
    expect(filters).toEqual({
      dateRange: "last_30_days",
      plan: "all",
      category: "all",
    });
  });
});
