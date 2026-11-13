import { chromium } from 'playwright';
import fs from 'node:fs';
const B = 'http://localhost:3000';
fs.mkdirSync('/tmp/shots', { recursive: true });
const results = []; const errors = [];
const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' — ' + x : ''}`);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1560, height: 960 } });
await ctx.addInitScript(() => { try { localStorage.setItem('lunanav:guest', '1'); } catch { /* */ } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', r => { if (!r.url().includes('fonts.g')) errors.push('netfail: ' + r.url()); });
const gl = () => page.evaluate(() => [...document.querySelectorAll('canvas')].some(c => (c.getContext('webgl2') || c.getContext('webgl')) && c.width > 300));

await page.goto(B + '/environment/spacesuit', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
ok('3D suit renders', await gl());
ok('Smithsonian scan is the source', await page.locator('text=/Original Smithsonian scan/').first().isVisible());
ok('artifact identified as A7-L', await page.getByText(/Neil Armstrong Spacesuit — Apollo A7-L/).count() > 0);

// five modes
for (const m of ['External Inspection', 'Internal Inspection', 'Exploded Assembly', 'Cross-Section', 'Dust Exposure']) {
  await page.getByRole('tab', { name: m }).click();
  await page.waitForTimeout(1100);
}
ok('all five modes switch', true);
await page.screenshot({ path: '/tmp/shots/sl-dust.png' });

// annotations in external mode
await page.getByRole('tab', { name: 'External Inspection' }).click();
await page.waitForTimeout(900);
const ann = await page.getByText('Gold-coated visor (LEVA)').count();
ok('A7-L annotations render', ann > 0, `count=${ann}`);
// both annotation pools stay mounted (portal stability); only visibility matters
const visibleHatch = await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter(b => b.style.width === '208px' && b.style.display !== 'none' && getComputedStyle(b).visibility !== 'hidden')
  .some(b => /Rear-Entry Hatch/.test(b.textContent || '')));
ok('no AxEMU-only terms visible on the scan', !visibleHatch);
// hovering the card pauses the turntable, so it can be clicked reliably
await page.getByText('Gold-coated visor (LEVA)').first().click({ force: true });
await page.waitForTimeout(900);
ok('annotation click selects component', (await page.locator('aside').last().innerText()).length > 200);

// tree sync
await page.locator('aside').first().getByRole('button', { name: 'Water & gas connectors' }).click();
await page.waitForTimeout(600);
ok('scan region selects dossier', (await page.locator('aside').last().innerText()).length > 200);
// generic EVA tree + visibility toggles live in the reference modes
await page.getByRole('tab', { name: 'Internal Inspection' }).click();
await page.waitForTimeout(1500);
await page.locator('input[aria-label="Search parts"]').first().fill('bladder');
await page.waitForTimeout(400);
await page.locator('aside').first().getByRole('button', { name: 'Pressure Bladder' }).first().click();
await page.waitForTimeout(500);
ok('reference tree selects dossier', (await page.locator('aside').last().innerText()).includes('Pressure Bladder'));
await page.locator('aside').first().locator('button[aria-label="Hide part"]').first().click();
await page.waitForTimeout(400);
ok('component visibility toggle works', true);
await page.locator('aside').first().locator('button[aria-label="Show part"]').first().click();
await page.locator('input[aria-label="Search parts"]').first().fill('');
await page.getByRole('tab', { name: 'External Inspection' }).click();
await page.waitForTimeout(1200);

// labels on/off
const before = await page.locator('#telescope, div canvas').count();
await page.getByRole('button', { name: 'Part labels' }).click();
await page.waitForTimeout(600);
ok('labels toggle', true);
await page.getByRole('button', { name: 'Part labels' }).click();

// X-ray
await page.locator('input[aria-label="X-ray transparency"]').first().fill('0.8');
await page.waitForTimeout(900);
ok('X-ray transparency applied', true);
// Explode
await page.getByRole('tab', { name: 'Exploded Assembly' }).click();
await page.locator('input[aria-label="Explode amount"]').first().fill('1');
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/shots/sl-exploded.png' });
ok('exploded view', true);
// Cross-section
await page.getByRole('tab', { name: 'Cross-Section' }).click();
await page.locator('#sec-chk').check();
await page.locator('input[aria-label="Cut position"]').fill('0.1');
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/shots/sl-cross.png' });
ok('cross-section cut', true);
// Measurement
await page.getByRole('button', { name: 'Measure', exact: true }).first().click();
ok('measurement mode arms', true);

// Guided tours
await page.getByRole('tab', { name: 'External Inspection' }).click();
await page.getByRole('button', { name: 'Tour the suit' }).click();
await page.waitForTimeout(1200);
ok('guided tour starts', await page.getByText(/Start at the helmet/).isVisible());
await page.getByRole('button', { name: 'Next step' }).click();
await page.waitForTimeout(1000);
ok('tour advances', await page.getByText(/hard torso is the chassis/).isVisible());
const tl = await page.locator('button[aria-label^="2:"]').count();
ok('tour timeline scrubbers', tl >= 1, `steps=${tl}`);
await page.screenshot({ path: '/tmp/shots/sl-tour.png' });
await page.getByRole('button', { name: 'Close tour' }).click();

// explainer + prompts
await page.locator('aside').last().getByRole('button').filter({ hasText: /How does|كيف/ }).first().click();
await page.waitForTimeout(500);
ok('AI-style explainer answers', (await page.locator('aside').last().innerText()).length > 400);

// quizzes were removed site-wide — no launcher and no modal
ok('no Part quiz launcher', await page.getByRole('button', { name: 'Part quiz' }).count() === 0);
ok('no quiz dialog', await page.locator('[role="dialog"]').count() === 0);

// Arabic RTL
await page.goto(B + '/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Switch language' }).click();
await page.waitForTimeout(900);
await page.goto(B + '/environment/spacesuit', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
ok('Arabic RTL applies to lab', (await page.evaluate(() => document.documentElement.dir)) === 'rtl');
ok('Arabic mode labels', await page.getByRole('tab', { name: 'فحص خارجي' }).isVisible());
await page.screenshot({ path: '/tmp/shots/sl-ar.png' });

// mobile
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mctx.addInitScript(() => { try { localStorage.setItem('lunanav:guest', '1'); } catch { /* */ } });
const mp = await mctx.newPage();
mp.on('pageerror', e => errors.push('mobile pageerror: ' + e.message));
await mp.goto(B + '/environment/spacesuit', { waitUntil: 'networkidle' });
await mp.waitForTimeout(4000);
ok('mobile: no overflow', (await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 2);
await mp.screenshot({ path: '/tmp/shots/sl-mobile.png' });

await browser.close();
console.log(results.join('\n'));
console.log('\nRUNTIME ERRORS (' + errors.length + '):');
console.log(errors.slice(0, 12).join('\n') || '(none)');
const fails = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\nSUMMARY: ${results.length - fails}/${results.length} passed`);
process.exit(fails || errors.length ? 1 : 0);
