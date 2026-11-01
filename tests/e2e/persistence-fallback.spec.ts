import { expect, test } from "@playwright/test";

test("keeps the dashboard usable when IndexedDB is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: undefined,
    });
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Commerce performance, without the noise." }),
  ).toBeVisible();

  await expect(page.getByText("Session-only dataset", { exact: true })).toBeVisible({
    timeout: 75_000,
  });
  await expect(page.getByText("Live workspace", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Business performance" })).toBeVisible();
});
