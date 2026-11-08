const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60000,
  use: { baseURL: 'http://localhost:8765', serviceWorkers: 'block' },
  webServer: { command: 'python3 -m http.server 8765', url: 'http://localhost:8765/accesso.html', reuseExistingServer: true },
  projects: [
    { name: 'iPhone-Safari', use: { ...devices['iPhone 13'] } },
    { name: 'iPad-Safari', use: { ...devices['iPad Pro 11'] } },
    { name: 'Android-Chrome', use: { ...devices['Pixel 7'] } },
    { name: 'Android-Tablet', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'Mac-Safari', use: { browserName: 'webkit', viewport: { width: 1440, height: 900 } } },
    { name: 'Win-Chrome', use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } } },
    { name: 'Win-Firefox', use: { browserName: 'firefox', viewport: { width: 1366, height: 768 } } },
  ],
});
