const { test, expect } = require('@playwright/test');
const path = require('path');
const STUB = require('./stub.js');
const FX = n => path.join(__dirname, 'fixtures', n);
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
async function carica(page, tipo, file) {
  await page.click('[data-b=carica][data-k=' + tipo + ']');
  await page.setInputFiles('#bfile', FX(file));
  await expect(page.locator('#bform')).toBeVisible({ timeout: 20000 });
}
test('bolletta luce e gas: lettura, conferma, prezzi usati, elimina', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await login(page); await page.goto('/energia.html');
  await expect(page.locator('#bollette')).toBeVisible();
  await carica(page, 'luce', 'luce.pdf');
  await expect(page.locator('#bf-cons')).toHaveValue('412');
  await expect(page.locator('#bf-tot')).toHaveValue('142.37');
  await expect(page.locator('#bf-forn')).toHaveValue('Enel Energia');
  await expect(page.locator('#bf-sp')).toHaveValue('0.0111');
  await expect(page.locator('#bf-pr')).toContainText('0,3456');
  await page.click('[data-b=salva]');
  await expect(page.locator('#bform')).toHaveCount(0);
  await expect(page.locator('body')).toContainText('offerta indicizzata');
  await carica(page, 'gas', 'gas.pdf');
  await expect(page.locator('#bf-cons')).toHaveValue('187');
  await expect(page.locator('#bf-tot')).toHaveValue('251.9');
  await page.click('[data-b=salva]');
  await expect(page.locator('body')).toContainText('Luce e gas: prezzi dalla tua bolletta');
  const pr = await page.evaluate(() => { const E = window.ENERGIA; return E.prezzi(E.load(), null, new Date()); });
  expect(pr.fonteL).toBe('bolletta'); expect(pr.luce).toBeCloseTo(142.37 / 412, 4); expect(pr.gas).toBeCloseTo(251.9 / 187, 4);
  await page.click('[data-b=elimina][data-k=gas]');
  await page.click('[data-b=eliminaok][data-k=gas]');
  await expect(page.locator('[data-b=carica][data-k=gas]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/undefined|NaN|\[object/);
  expect(errs).toEqual([]);
});
test('PDF scansione, protetto e valori fuori scala', async ({ page }) => {
  await login(page); await page.goto('/energia.html');
  await carica(page, 'luce', 'scansione.pdf');
  await expect(page.locator('#bform')).toContainText('scansione');
  await page.click('[data-b=scarta]');
  await carica(page, 'luce', 'protetta.pdf');
  await expect(page.locator('#bform')).toContainText('password');
  await page.fill('#bf-cons', '10'); await page.fill('#bf-tot', '500');
  await page.click('[data-b=salva]');
  await expect(page.locator('#bf-err')).toContainText('fuori dal normale');
  await page.fill('#bf-cons', ''); await page.click('[data-b=salva]');
  await expect(page.locator('#bf-err')).toContainText('Servono consumo e totale');
});
test('bolletta gas caricata come luce: avviso', async ({ page }) => {
  await login(page); await page.goto('/energia.html');
  await carica(page, 'luce', 'gas.pdf');
  await expect(page.locator('#bform')).toContainText('Sembra una bolletta gas');
});
test('dopo 6 mesi di assenza: revisione con conferma', async ({ page }) => {
  await login(page); await page.goto('/energia.html');
  await carica(page, 'luce', 'luce.pdf'); await page.click('[data-b=salva]');
  await page.evaluate(() => { const N = window.NOVITA, s = N.stato(); s.ultima = new Date(Date.now() - 200 * 864e5).toISOString(); N.salva(s); });
  await page.goto('/index.html'); await page.waitForTimeout(800);
  await page.goto('/energia.html');
  await expect(page.locator('#brev')).toBeVisible();
  await expect(page.locator('#brev')).toContainText('Enel Energia');
  await page.click('#brev [data-b=conferma]');
  await expect(page.locator('#brev')).toHaveCount(0);
  await page.goto('/novita.html');
  await expect(page.locator('body')).toContainText('Bollette di riferimento da confermare');
});
test('testi bollette tradotti in en e fr', async ({ page }) => {
  await login(page); await page.goto('/energia.html');
  await carica(page, 'luce', 'luce.pdf');
  for (const l of ['en', 'fr']) {
    await page.evaluate(x => { window.I18N.azzera(); window.I18N.imposta(x); }, l);
    await page.waitForTimeout(300);
    const miss = await page.evaluate(() => window.I18N.mancanti());
    expect(miss, l).toEqual([]);
  }
  await page.evaluate(() => window.I18N.imposta('it'));
  await page.click('[data-b=salva]');
  await page.evaluate(() => { const E = window.ENERGIA, s = E.load(); s.revisione = true; E.save(s); });
  await page.reload();
  for (const l of ['en', 'fr']) {
    await page.evaluate(x => { localStorage.setItem('clima.lang', x); }, l);
    await page.reload(); await page.waitForTimeout(500);
    const miss = await page.evaluate(() => window.I18N.mancanti());
    expect(miss, l).toEqual([]);
  }
});
