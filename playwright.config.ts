import { defineConfig, devices } from "@playwright/test";

// Target Android per §Stack — bukan iOS, jadi Chromium desktop + emulasi
// Pixel (persis Chrome for Android) sudah cukup, tanpa perlu unduh WebKit.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
});
