const { test, expect } = require('@playwright/test');
const STUB = require('./stub.js');
test.beforeEach(async ({ page }) => {
  await page.addInitScript(STUB);
  await page.addInitScript(() => localStorage.getItem('clima.lang') || localStorage.setItem('clima.lang', 'it'));
});
async function login(page, nome) {
  await page.addInitScript(n => localStorage.setItem('__who', n), nome);
  await page.goto('/accesso.html');
  await page.click('[data-nome=' + nome + ']');
  await page.fill('#pw', '123456');
  await page.click('#go');
  await page.waitForURL('**/index.html');
}
test('reset utente: richiesta, codice errato, codice giusto', async ({ page }) => {
  await page.goto('/accesso.html');
  await page.click('#forgot');
  await expect(page.locator('.err')).toContainText('Prima scegli il tuo nome');
  await page.click('[data-nome=Mario]');
  await page.click('#forgot');
  await page.fill('#tel', '12');
  await page.click('#send');
  await expect(page.locator('.err')).toContainText('Numero non valido');
  await page.fill('#tel', '+39 333 1234567');
  await page.click('#send');
  await expect(page.locator('body')).toContainText('L’amministratore vede il codice');
  await page.fill('#cod', '222222'); await page.fill('#np', '654321'); await page.click('#conf');
  await expect(page.locator('.err')).toContainText('Codice o numero non corretti');
  await page.fill('#cod', '111111'); await page.fill('#np', '654321'); await page.click('#conf');
  await expect(page.locator('.ok')).toContainText('Password cambiata');
  await expect(page.locator('#pw')).toBeVisible();
});
test('reset admin: messaggio chiaro, nessun codice atteso', async ({ page }) => {
  await page.goto('/accesso.html');
  await page.click('[data-nome=Admin]');
  await page.click('#forgot');
  await page.fill('#tel', '+39 333 1234567');
  await page.click('#send');
  await expect(page.locator('.err')).toContainText('non si reimposta dall’app');
  await expect(page.locator('#cod')).toHaveCount(0);
});
test('guida reset aperta senza login', async ({ page }) => {
  await page.goto('/accesso.html');
  await page.click('a[href="guida-reset.html"]');
  await expect(page).toHaveURL(/guida-reset/);
  await expect(page.locator('h1')).toContainText('Reset password');
  await expect(page.locator('.back')).toHaveAttribute('href', 'accesso.html');
});
test('cambio password: controlli e messaggio nella sua scheda', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await login(page, 'Admin');
  await page.goto('/account.html');
  const card = page.locator('section.card').first();
  await page.fill('#old', '12'); await page.fill('#new', '654321'); await page.click('[data-a=chg]');
  await expect(card.locator('.err')).toContainText('attuale ha 6 cifre');
  await page.fill('#old', '123456'); await page.fill('#new', '123456'); await page.click('[data-a=chg]');
  await expect(card.locator('.err')).toContainText('diversa');
  await page.fill('#old', '000000'); await page.fill('#new', '654321'); await page.click('[data-a=chg]');
  await expect(card.locator('.err')).toContainText('attuale non è corretta');
  await page.fill('#old', '123456'); await page.fill('#new', '654321'); await page.click('[data-a=chg]');
  await expect(card.locator('.ok')).toContainText('Password cambiata');
  expect(errs).toEqual([]);
});
test('admin: codice reset con invio WhatsApp', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('__utenti', JSON.stringify([{ id: 2, nome: 'Mario', telefono: '+393331234567', admin: false, bloccato: false, codice: '482913' }])));
  await login(page, 'Admin');
  await page.goto('/account.html');
  const a = page.locator('a', { hasText: 'Invia codice su WhatsApp' });
  await expect(a).toHaveAttribute('href', /wa\.me\/393331234567\?text=.*482913/);
});
test('versione 1.11 in accesso', async ({ page }) => {
  await page.goto('/accesso.html');
  await expect(page.locator('.ver')).toContainText('1.11');
});
test('nuovi testi tradotti in en', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('clima.lang', 'en'));
  await page.goto('/accesso.html');
  await page.click('[data-nome=Admin]');
  await page.click('#forgot');
  await page.fill('#tel', '+39 333 1234567');
  await page.click('#send');
  await expect(page.locator('.err')).toContainText('cannot be reset from the app');
});
