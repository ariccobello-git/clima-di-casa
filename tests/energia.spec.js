const { test, expect } = require('@playwright/test');
const STUB = require('./stub.js');
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-03T10:00:00'));
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
async function casa(page, extra) {
  await page.goto('/energia.html');
  await page.evaluate(x => { const E = window.ENERGIA, s = E.load(); Object.assign(s, { mq: 80, anno: 1975, fonte: 'elettrica', storico: { '2026-11': 'elettrica' } }, x); E.save(s); }, extra || {});
  await page.reload();
}
test('budget: validazione, salvataggio, sforamento e rimozione', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await login(page); await casa(page);
  await expect(page.locator('body')).toContainText('Budget del mese');
  await page.fill('#bud', '0'); await page.click('#bsave');
  await expect(page.locator('#berr')).toBeVisible();
  await page.fill('#bud', '5'); await page.click('#bsave');
  await expect(page.locator('body')).toContainText('Superi il budget');
  await page.fill('#bud', '2000'); await page.click('#bsave');
  await expect(page.locator('body')).toContainText('Sei dentro il budget');
  await page.click('#bdel');
  await expect(page.locator('#bdel')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/undefined|NaN|\[object/);
  expect(errs).toEqual([]);
});
test('report del mese concluso e novità', async ({ page }) => {
  await login(page); await casa(page, { budget: 10 });
  await expect(page.locator('body')).toContainText('Report di novembre');
  await expect(page.locator('body')).toContainText('Budget superato di');
  await page.goto('/novita.html');
  await expect(page.locator('body')).toContainText(/Report di novembre|Budget del mese a rischio/);
});
test('nuovi testi tradotti in inglese e francese', async ({ page }) => {
  await login(page); await casa(page, { budget: 5 });
  for (const l of ['en', 'fr']) {
    await page.evaluate(x => { localStorage.setItem('clima.lang', x); }, l);
    await page.reload(); await page.waitForTimeout(400);
    const miss = await page.evaluate(() => window.I18N.mancanti().filter(k => /budget|Budget|Report|Superi|Stima di|Con |Rispetto|mercato di oltre|Luce:|Gas:|Dati di mercato/.test(k)));
    expect(miss, l).toEqual([]);
    await expect(page.locator('body')).toContainText(l === 'en' ? 'Monthly budget' : 'Budget du mois');
  }
});
