import { expect, test } from "@playwright/test";

async function openReadyDashboard(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Commerce performance, without the noise.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Live workspace", { exact: true })).toBeVisible({
    timeout: 75_000,
  });
}

async function readEventCountForTest(
  footer: import("@playwright/test").Locator,
): Promise<number> {
  const footerText = await footer.innerText();
  const match = footerText.match(/([\d,]+) events processed/);
  expect(match?.[1]).toBeTruthy();
  return Number(match?.[1]?.replaceAll(",", ""));
}

test.describe("dashboard release smoke", () => {
  test("loads the core business views after the dataset is prepared", async ({
    page,
  }) => {
    await openReadyDashboard(page);

    await expect(
      page.getByRole("heading", { name: "Business performance" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Revenue over time" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Purchase funnel" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Repeat purchase retention" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Dashboard sections" }),
    ).toBeVisible();
  });

  test("filters change the read-side scope without restarting generation", async ({
    page,
  }) => {
    await openReadyDashboard(page);

    const plan = page.getByLabel("Plan");
    const category = page.getByLabel("Category");
    await plan.selectOption("pro");
    await category.selectOption("beauty");

    const dateRange = page.getByRole("group", { name: "Date range" });
    const allTime = dateRange.getByRole("button", { name: "All time" });
    await allTime.click();

    await expect(plan).toHaveValue("pro");
    await expect(category).toHaveValue("beauty");
    await expect(allTime).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByText("Live workspace", { exact: true }),
    ).toBeVisible();
  });

  test("changes to a new dataset and finishes rebuilding", async ({ page }) => {
    await openReadyDashboard(page);

    await page.getByLabel("Plan").selectOption("pro");
    await page.getByLabel("Category").selectOption("beauty");

    const newPreset = page.getByRole("button", { name: "50 users" });
    await newPreset.click();

    await expect(newPreset).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Plan")).toHaveValue("all");
    await expect(page.getByLabel("Category")).toHaveValue("all");
    await expect(page.getByText("Live workspace", { exact: true })).toBeVisible(
      { timeout: 75_000 },
    );
    await expect(
      page.getByText("50 users", { exact: true }).first(),
    ).toBeVisible();
  });

  test("restores the selected dataset preset and its event log after reload", async ({
    page,
  }) => {
    await openReadyDashboard(page);

    const fiftyUsers = page.getByRole("button", {
      name: "50 users",
      exact: true,
    });
    await fiftyUsers.click();
    await expect(
      page.getByText("Building dataset", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Live workspace", { exact: true })).toBeVisible(
      { timeout: 75_000 },
    );

    const expectedEvents = await readEventCountForTest(page.locator("footer"));
    await page.reload();

    await expect(page.getByText("Live workspace", { exact: true })).toBeVisible(
      { timeout: 75_000 },
    );
    await expect(fiftyUsers).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("footer")).toContainText(
      `${expectedEvents.toLocaleString()} events processed`,
    );
  });

  test("restores the saved dataset after a page reload", async ({ page }) => {
    await openReadyDashboard(page);

    const footer = page.locator("footer");
    const beforeReload = await footer.innerText();
    const eventCount = beforeReload.match(/([\d,]+) events processed/);
    expect(eventCount?.[1]).toBeTruthy();

    await page.reload();
    await expect(page.getByText("Live workspace", { exact: true })).toBeVisible(
      { timeout: 75_000 },
    );
    await expect(footer).toContainText(`${eventCount?.[1]} events processed`);
  });

  test("supports keyboard navigation to the main dashboard content", async ({
    page,
  }) => {
    await openReadyDashboard(page);

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", {
      name: "Skip to dashboard content",
    });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#overview")).toBeInViewport();
  });

  test("mobile layout does not create document-level horizontal scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadyDashboard(page);

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(
      dimensions.viewportWidth + 1,
    );
  });
  test("removes only the active dataset's saved copy without clearing other sessions", async ({
    page,
  }) => {
    await openReadyDashboard(page);
    const footer = page.locator("footer");
    const eventCountBefore = await readEventCountForTest(footer);

    await page.getByRole("button", { name: /Manage storage/ }).click();
    await page
      .getByRole("button", { name: "Remove current saved copy" })
      .click();
    await expect(
      page.getByText("Remove the saved copy of this dataset?", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm deletion" }).click();

    await expect(page.locator('aside[role="status"]')).toContainText(
      "The saved copy of this dataset was removed",
      { timeout: 15_000 },
    );
    await expect(page.getByText(/0 saved datasets/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Live workspace", { exact: true }),
    ).toBeVisible();
    await expect(footer).toContainText(
      `${eventCountBefore.toLocaleString()} events processed`,
    );

    // The session-only decision must survive a dataset change. Otherwise a
    // cleared dataset could be re-created by the next effect run in the same tab.
    await page.getByRole("button", { name: "50 users", exact: true }).click();
    await expect(page.getByText("Live workspace", { exact: true })).toBeVisible(
      { timeout: 75_000 },
    );
    await expect(page.locator('aside[role="status"]')).toContainText(
      "Persistent storage is paused for this tab session",
    );
    await expect(page.getByText(/0 saved datasets/)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("clears all saved datasets while preserving the active in-memory dashboard", async ({
    page,
  }) => {
    await openReadyDashboard(page);
    const footer = page.locator("footer");
    const eventCountBefore = await readEventCountForTest(footer);

    await page.getByRole("button", { name: /Manage storage/ }).click();
    await expect(
      page.getByText("Datasets saved", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Clear all saved datasets" })
      .click();
    await expect(
      page.getByText("Clear every saved analytics dataset?", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm deletion" }).click();

    await expect(page.locator('aside[role="status"]')).toContainText(
      "All saved analytics datasets were removed",
      { timeout: 15_000 },
    );
    await expect(
      page.getByText("Live workspace", { exact: true }),
    ).toBeVisible();
    await expect(footer).toContainText(
      `${eventCountBefore.toLocaleString()} events processed`,
    );
    await expect(page.getByText(/0 saved datasets/)).toBeVisible({
      timeout: 15_000,
    });
  });
});
