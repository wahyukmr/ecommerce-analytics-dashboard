import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const wcagTags = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

test("dashboard has no critical or serious automated WCAG A/AA violations", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Commerce performance, without the noise." }),
  ).toBeVisible();
  await expect(page.getByText("Live workspace", { exact: true })).toBeVisible({
    timeout: 75_000,
  });

  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const report = {
    url: page.url(),
    scannedAt: new Date().toISOString(),
    violations: results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    })),
  };

  await testInfo.attach("axe-wcag-report.json", {
    body: Buffer.from(JSON.stringify(report, null, 2)),
    contentType: "application/json",
  });

  const blockingViolations = results.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious",
  );

  expect(
    blockingViolations,
    `Critical/serious accessibility findings:\n${blockingViolations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`)
      .join("\n")}`,
  ).toEqual([]);
});
