const { test, expect } = require('@playwright/test');
const STUB = require('./stub.js');
test.beforeEach(async ({ page }) => {
  await page.addInitScript(STUB);
  await page.addInitScript(() => localStorage.getItem('clima.lang') || localStorage.setItem('clima.lang', 'it'));
});
async function login(page) {
  await page.goto('/accesso.html');
  await page.click('[data-nome=Mario]');
  await page.fill('#pw', '123456');
  await page.click('#go');
  await page.waitForURL('**/index.html');
}
test('login, home e Cosa fare ora', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await login(page);
  await page.goto('/inverno.html');
  await expect(page.locator('#azione')).toBeVisible();
  await expect(page.locator('#azione')).not.toContainText(/undefined|NaN/);
  for (const u of ['index.html', 'estate.html', 'energia.html', 'meteo.html', 'novita.html', 'setup.html', 'account.html']) {
    await page.goto('/' + u);
    await expect(page.locator('body')).not.toContainText(/undefined|NaN|\[object/);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(ov).toBeLessThanOrEqual(2);
  }
  expect(errs).toEqual([]);
});
test('cambio lingua en/fr', async ({ page }) => {
  await page.goto('/accesso.html');
  await page.click('[data-lang=en]');
  await expect(page.locator('body')).toContainText('Choose your name');
  await page.click('[data-lang=fr]');
  await expect(page.locator('body')).toContainText('Choisissez votre nom');
});
