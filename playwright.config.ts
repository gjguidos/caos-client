import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  use: {
    baseURL: process.env.CAOS_E2E_BASE_URL || "http://localhost:4000",
    headless: true,
    channel: process.env.CAOS_E2E_CHANNEL,
    screenshot: "only-on-failure",
    trace: "off",
  },
  reporter: [["list"]],
});
