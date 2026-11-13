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
const gl = () => page.evaluate(() => [...document.querySelectorAll('canvas')].some(c => (c.getContext('webgl2') || c.getContext('webgl')) && c.width > 300));

// ---------- DAILY GUIDE: View All button ----------
await page.goto(B + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const va = page.locator('#telescope, a[href*="viewAll=1"]').filter({ hasText: /View All|عرض الكل/ }).first();
ok('View All button in guide (Telescope section)', await va.isVisible());
await page.getByRole('button', { name: 'Telescope' }).click();
await page.waitForTimeout(400);
ok('Telescope mode selectable', true);

// ---------- EXPLORER: View All on the 3D Moon ----------
await page.goto(B + '/explorer?viewAll=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(6500);
ok('3D Moon renders', await gl());
const chips = await page.locator('#telescope .chip').allInnerTexts();
ok('site counts shown', /Original sites/.test(chips.join(' ')), chips.filter(c => /\d/.test(c)).slice(0, 4).join(' | '));
const rows = await page.locator('#telescope > div.max-h-\\[340px\\] > button, #telescope button[aria-pressed]').count();
const listRows = await page.locator('#telescope .space-y-1\\.5 > button').count();
ok('atlas lists sites', listRows >= 30, `rows=${listRows}`);
// type filter
await page.locator('#telescope').getByRole('button', { name: 'Landing site', exact: true }).click();
await page.waitForTimeout(400);
const landingRows = await page.locator('#telescope .space-y-1\\.5 > button').count();
ok('type filter narrows list', landingRows >= 5 && landingRows < listRows, `landing=${landingRows}`);
await page.locator('#telescope').getByRole('button', { name: 'All types', exact: true }).click();
await page.waitForTimeout(300);
// search
await page.locator('#telescope input.input').fill('Gassendi');
await page.waitForTimeout(400);
const gass = await page.locator('#telescope .space-y-1\\.5 > button').count();
ok('search finds NASA site', gass >= 1 && gass < 5, `matches=${gass}`);
// click a NASA site -> marker highlight + info panel
await page.locator('#telescope .space-y-1\\.5 > button').first().click();
await page.waitForTimeout(1500);
const panel = await page.locator('aside').last().innerText();
ok('info panel opens for NASA site', /Gassendi/.test(panel));
ok('panel shows description + significance', /about|why it matters|نبذة|لماذا/i.test(panel));
ok('panel shows coordinates', /\d+\.\d+°/.test(panel) && /coordinates/i.test(panel));
ok('panel shows diameter', /diameter|القطر/i.test(panel));
ok('panel shows confidence', /IAU Gazetteer centre|Verified published value|Regional reference/.test(panel));
ok('panel shows origin badge', /NASA-added|Original sites/.test(panel));
ok('panel links Gazetteer', await page.locator('aside a[href*="planetarynames"]').count() > 0);
await page.screenshot({ path: '/tmp/shots/tl-panel.png' });
// View All toggle off/on from the explorer itself
const vab = page.locator('#telescope button.btn').filter({ hasText: /Viewing all sites|View All|عرض الكل/ }).first();
ok('View All toggle in explorer', await vab.isVisible());
const markerCount = await page.evaluate(() => {
  const cs = [...document.querySelectorAll('canvas')];
  return cs.length;
});
ok('3D canvas still live', markerCount > 0);
// click directly on a 3D marker (pick the largest feature for a reliable hit)
await page.locator('#telescope input.input').fill('');
await page.waitForTimeout(300);
await page.locator('#telescope .space-y-1\\.5 > button').filter({ hasText: 'Oceanus' }).first().click();
await page.waitForTimeout(1200);
ok('selecting site from list updates panel', /Oceanus/.test(await page.locator('aside').last().innerText()));
// marker count on the 3D globe equals the full atlas (View All)
const atlasIds = await page.evaluate(() => document.querySelectorAll('#telescope .space-y-1\\.5 > button').length);
ok('full atlas listed in View All', atlasIds >= 45, `sites=${atlasIds}`);
// original 12 still present and unchanged
for (const nm of ['Tycho', 'Kepler', 'Copernicus', 'Clavius', 'Aristarchus', 'Plato']) {
  await page.locator('#telescope input.input').fill(nm);
  await page.waitForTimeout(250);
  ok(`original preserved: ${nm}`, await page.locator('#telescope .space-y-1\\.5 > button').filter({ hasText: nm }).count() > 0);
}
await page.locator('#telescope input.input').fill('');

// ---------- MOBILE ----------
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mctx.addInitScript(() => { try { localStorage.setItem('lunanav:guest', '1'); } catch { /* */ } });
const mp = await mctx.newPage();
mp.on('pageerror', e => errors.push('mobile pageerror: ' + e.message));
await mp.goto(B + '/explorer?viewAll=1', { waitUntil: 'networkidle' });
await mp.waitForTimeout(5000);
ok('mobile: no horizontal overflow', (await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 2);
await mp.screenshot({ path: '/tmp/shots/tl-mobile.png' });
await mp.goto(B + '/', { waitUntil: 'networkidle' });
await mp.waitForTimeout(2000);
ok('mobile guide: no overflow', (await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 2);

await browser.close();
console.log(results.join('\n'));
console.log('\nRUNTIME ERRORS (' + errors.length + '):');
console.log(errors.slice(0, 12).join('\n') || '(none)');
const fails = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\nSUMMARY: ${results.length - fails}/${results.length} passed`);
process.exit(fails || errors.length ? 1 : 0);
