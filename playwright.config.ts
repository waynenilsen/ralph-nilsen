import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Use 1 worker to avoid race conditions with database cleanup between test files
  workers: 1,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],

  // Global setup/teardown for test environment
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",

  // Test timeout
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  use: {
    baseURL: "http://localhost:40000",

    // Capture trace on first retry
    trace: "on-first-retry",

    // Capture screenshot on failure
    screenshot: "only-on-failure",

    // Capture video on failure
    video: "on-first-retry",

    // Accessibility testing
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "bun run dev",
    url: "http://localhost:40000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },

  // Output folder for test artifacts
  outputDir: "test-results",
});
