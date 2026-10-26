import { defineConfig, devices } from "playwright/test";
const externalPreview = process.env.PREVIEW_URL;
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 3,
  timeout: 30000,
  expect: { timeout: 7000 },
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: externalPreview || "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        ...(chromiumExecutable
          ? {
              launchOptions: {
                executablePath: chromiumExecutable,
                args: [
                  "--no-sandbox",
                  "--disable-dev-shm-usage",
                  "--disable-gpu",
                ],
              },
            }
          : {}),
      },
    },
    ...(process.env.ALL_BROWSERS
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
        ]
      : []),
  ],
  webServer: externalPreview
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 15000,
      },
});
