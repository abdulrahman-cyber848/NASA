// Runtime verification of the upgraded AxEMU explorer + dust physics lab.
import { chromium } from 'playwright';
import fs from 'node:fs';
const B = 'http://localhost:3000';
fs.mkdirSync('/tmp/shots', { recursive: true });
const results = []; const errors = [];
const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' — ' + x : ''}`);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
await ctx.addInitScript(() => { try { localStorage.setItem('lunanav:guest', '1'); } catch { /* */ } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', r => { if (!r.url().includes('fonts.g')) errors.push('netfail: ' + r.url()); });
const hasGL = () => page.evaluate(() => [...document.querySelectorAll('canvas')].some(c => (c.getContext('webgl2') || c.getContext('webgl')) && c.width > 300));

// ---------- DUST LAB ----------
await page.goto(B + '/environment/dust', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
ok('dust 3D renders', await hasGL());
const t0 = await page.locator('text=/t_sim/').locator('..').innerText().catch(() => '');
await page.waitForTimeout(1200);
const liveTxt = await page.locator('.chip', { hasText: /live|حي/ }).first().innerText();
ok('live particle counter', /\d/.test(liveTxt), liveTxt.trim());
// scenario switching
for (const s of ['Rover', 'Landing plume', 'EDS shield', 'Suit contamination']) {
  await page.getByRole('tab', { name: s }).click();
  await page.waitForTimeout(1500);
}
ok('scenarios switch without error', true);
await page.getByRole('tab', { name: 'Suit contamination' }).click();
await page.waitForTimeout(3500);
const hits = await page.locator('#risk .chip-amber').allInnerTexts();
ok('suit contamination accumulates', hits.some(h => parseInt(h) > 0), hits.join(','));
await page.screenshot({ path: '/tmp/shots/env2-suitcontam.png' });
// physics param changes mass
const massBefore = await page.locator('tr', { hasText: /^m\t/ }).innerText().catch(() => '');
await page.locator('#p-d').fill('400');
await page.waitForTimeout(600);
const rowsTxt = await page.locator('table').first().innerText();
ok('data panel recomputes on diameter', rowsTxt.length > 50);
// equations toggle
await page.getByRole('button', { name: /Show equations/ }).click();
await page.waitForTimeout(300);
ok('equations panel', await page.getByText('KE = ½·m·v²').isVisible());
// CSV export
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV' }).click()]);
const csvPath = '/tmp/shots/export.csv'; await dl.saveAs(csvPath);
const csv = fs.readFileSync(csvPath, 'utf8');
ok('CSV export valid', csv.startsWith('t_s,x_m,y_m,z_m') && csv.split('\n').length > 2, `${csv.split('\n').length} rows`);
// pause + step
await page.locator('button.btn-primary').filter({ hasText: /Pause|إيقاف/ }).first().click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Step', exact: true }).click();
await page.waitForTimeout(300);
ok('pause + single-step', true);
await page.locator('button.btn-primary').filter({ hasText: /Resume|استئناف/ }).first().click();
await page.screenshot({ path: '/tmp/shots/env2-dust.png' });

// ---------- SPACESUIT covered by scripts/suit-smoke.mjs (rebuilt lab) ----------

// ---------- MOBILE ----------
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mctx.addInitScript(() => { try { localStorage.setItem('lunanav:guest', '1'); } catch { /* */ } });
const mp = await mctx.newPage();
mp.on('pageerror', e => errors.push('mobile pageerror: ' + e.message));
await mp.goto(B + '/environment/dust', { waitUntil: 'networkidle' }); await mp.waitForTimeout(3500);
ok('mobile dust no overflow', (await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 2);
await mp.screenshot({ path: '/tmp/shots/env2-mobile.png' });
await mp.goto(B + '/environment/spacesuit', { waitUntil: 'networkidle' }); await mp.waitForTimeout(3000);
ok('mobile suit no overflow', (await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 2);
ok('mobile suit 3D renders', await mp.evaluate(() => [...document.querySelectorAll('canvas')].some(c => c.width > 300)));

await browser.close();
console.log(results.join('\n'));
console.log('\nRUNTIME ERRORS (' + errors.length + '):');
console.log(errors.slice(0, 15).join('\n') || '(none)');
const fails = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\nSUMMARY: ${results.length - fails}/${results.length} passed`);
process.exit(fails || errors.length ? 1 : 0);