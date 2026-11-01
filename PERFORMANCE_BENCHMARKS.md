# Performance benchmark protocol

The performance suite is intentionally separate from the fast Playwright E2E suite. It generates real 10k, 50k, and 100k-user datasets and can take several minutes or longer depending on the computer.

## Run a benchmark

```bash
npm run test:performance
```

To run only selected presets:

```bash
PERFORMANCE_PRESETS=10k,50k BENCHMARK_OUTPUT=performance-results/run-1.json npm run test:performance
```

The application always performs its initial 10k-user boot; the variable selects which dataset results are reported. For full baseline collection, keep all three presets and use a new output path for each run:

```bash
BENCHMARK_OUTPUT=performance-results/run-1.json npm run test:performance
BENCHMARK_OUTPUT=performance-results/run-2.json npm run test:performance
BENCHMARK_OUTPUT=performance-results/run-3.json npm run test:performance
node scripts/derive-performance-budgets.mjs performance-results/run-1.json performance-results/run-2.json performance-results/run-3.json
```

Do not compare numbers captured on different devices, browser versions, power profiles, or substantially different browser configurations. Close competing heavy workloads and record the hardware/browser alongside archived reports when using the results as portfolio evidence. The harness records Node version, browser user agent, viewport, and timestamp, but does not infer CPU/RAM specifications; record those manually with the report.

## Measurements

- `generationMs`: first page load or dataset switch until the dashboard reports `Live workspace`.
- `restoreMs`: reload-to-ready time for the dataset just saved.
- `planFilterRoundTripMs` / `categoryFilterRoundTripMs`: control change plus two browser animation frames. This is a practical interaction-latency proxy, not a pure React render duration.
- `eventCount`: event records exposed by the dashboard after generation.
- `sampledPeakJsHeapBytes`: maximum Chromium JavaScript heap usage sampled every 500ms while generating and restoring. This is not total browser RAM.
- `storageUsageBytes` / `storageQuotaBytes`: browser estimates for this origin, and may vary by browser and storage policy.

## Budgets

Do not invent absolute millisecond or memory limits before measurements exist. Collect at least three runs on the same machine, derive the nearest-rank P95, and use the generated `performance-budgets.json` as a **warning baseline**. It applies an initial 25% regression tolerance; that tolerance is a policy choice and should be revised after observing normal variance. It is not enabled as a CI blocker in this phase because the authoring environment has not executed a trustworthy baseline.

A stable release environment can later compare fresh results with the checked-in baseline. Keep device-sensitive performance checks separate from unit tests to avoid flaky CI.
