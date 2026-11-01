import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DatasetPresetSection from "./DatasetPresetSection";

describe("DatasetPresetSection", () => {
  it("exposes the selected preset state to assistive technology", () => {
    render(<DatasetPresetSection currentUsers={10_000} onSelect={vi.fn()} />);

    expect(
      screen.getByRole("group", { name: "Dataset size" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10k users" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "50k users" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("requests the selected dataset size when a preset is activated", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DatasetPresetSection currentUsers={10_000} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "50k users" }));

    expect(onSelect).toHaveBeenCalledWith({ totalUsers: 50_000 });
  });
});
