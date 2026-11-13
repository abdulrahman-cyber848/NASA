// Headless runtime verification of LunaNav against the production server.
import { chromium } from 'playwright';
import fs from 'node:fs';

const B = 'http://localhost:3000';
fs.mkdirSync('/tmp/shots', { recursive: true });
const results = [];
const errors = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });

// ---------- LOGIN GATE (first-time visitor) ----------
const gctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const gp = await gctx.newPage();
gp.on('pageerror', e => errors.push('gate pageerror: ' + e.message));
await gp.goto(B + '/', { waitUntil: 'networkidle' });
await gp.waitForURL(/\/login/, { timeout: 10000 });
ok('login page shown before home', gp.url().includes('/login'));
await gp.waitForTimeout(800);
await gp.screenshot({ path: '/tmp/shots/00-login.png' });
await gp.getByRole('button', { name: 'Continue as guest' }).click();
await gp.waitForFunction(() => location.pathname === '/', null, { timeout: 10000 });
await gp.waitForTimeout(1800);
ok('guest continue reaches home', (await gp.evaluate(() => document.querySelector('h1')?.textContent || '')).includes('Daily Moon Guide'));
await gctx.close();

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('lunanav:guest', '1'); } catch { /* */ } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', r => { if (!r.url().includes('fonts.g')) errors.push('netfail: ' + r.url()); });

// ---------- HOME ----------
await page.goto(B + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const litPixels = await page.evaluate(() => {
  const c = document.querySelector('.moon-stage canvas');
  if (!c) return -1;
  const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 40) if (d[i] > 60 && d[i + 3] > 200) n++;
  return n;
});
ok('moon canvas renders lit surface', litPixels > 500, `samples=${litPixels}`);
const markers = await page.locator('.marker').count();
ok('landmark markers on map', markers >= 4, `count=${markers}`);
ok('desktop: hamburger hidden', await page.getByRole('button', { name: 'Menu', exact: true }).isHidden());
const searchPad = await page.evaluate(() => {
  const el = document.querySelector('.moon-stage')?.closest('div')?.parentElement?.querySelector('input.input');
  const inp = el ?? document.querySelector('input.input.ps-10');
  return inp ? parseFloat(getComputedStyle(inp).paddingInlineStart) : -1;
});
ok('search icon does not overlap placeholder', searchPad >= 36, `padding=${searchPad}px`);

const dateVal = await page.locator('#dt-input').inputValue();
await page.getByRole('button', { name: 'Next day' }).click();
await page.waitForTimeout(900);
const dateVal2 = await page.locator('#dt-input').inputValue();
ok('next day changes date + recompute', dateVal !== dateVal2, `${dateVal} -> ${dateVal2}`);
await page.getByRole('button', { name: 'Today', exact: true }).click();
await page.waitForTimeout(600);

// equipment filter changes list
await page.getByRole('button', { name: 'All', exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Telescope' }).click();
await page.waitForTimeout(400);
const scopeCount = await page.locator('ul[role="list"] > li').count();
await page.getByRole('button', { name: 'Unaided eye' }).click();
await page.waitForTimeout(400);
const eyeCount = await page.locator('ul[role="list"] > li').count();
ok('equipment filter changes landmark list', scopeCount > eyeCount, `telescope=${scopeCount} eye=${eyeCount}`);
await page.getByRole('button', { name: 'Binoculars' }).click();
await page.waitForTimeout(400);

// option B (All): per-feature IAU links + full reference set
await page.getByRole('button', { name: 'All', exact: true }).click();
await page.waitForTimeout(600);
const rowCountB = await page.locator('ul[role="list"] > li').count();
const gazLinks = await page.locator('ul[role="list"] a[href*="planetarynames.wr.usgs.gov"]').count();
ok('option B rows carry IAU feature links', rowCountB > 0 && gazLinks >= rowCountB, `${gazLinks}/${rowCountB}`);
const allRefLinks = await page.locator('a.ref-link[target="_blank"]').count();
ok('full reference set rendered', allRefLinks >= 7, `count=${allRefLinks}`);
ok('footer reference links', await page.locator('footer a.ref-link').count() >= 7);

// marker click -> detail
await page.locator('.marker').first().click();
await page.waitForTimeout(500);
ok('marker opens detail panel', await page.locator('[role="region"]').count() > 0);
const view3d = await page.getByRole('link', { name: /View in 3D/ }).count();
ok('detail has View in 3D link', view3d > 0);
ok('detail panel IAU feature link', await page.locator('[role="region"] a[href*="planetarynames.wr.usgs.gov/Feature/"]').count() > 0);

// southern flip
await page.getByRole('button', { name: 'Southern' }).click();
await page.waitForTimeout(500);
const rotated = await page.evaluate(() => {
  const el = document.querySelector('.moon-stage > div');
  return el && getComputedStyle(el).transform !== 'none' && el.style.transform.includes('180');
});
ok('southern hemisphere rotates map 180°', !!rotated);
await page.getByRole('button', { name: 'Northern' }).click();

// km/mi
const distBefore = await page.evaluate(() => document.body.innerText.match(/[\d,]+ km/)?.[0]);
await page.getByRole('group', { name: 'Distance units' }).getByRole('button', { name: 'mi' }).click();
await page.waitForTimeout(500);
const distAfter = await page.evaluate(() => document.body.innerText.match(/[\d,]+ mi/)?.[0]);
ok('km/mi toggle converts values', !!distBefore && !!distAfter, `${distBefore} -> ${distAfter}`);
await page.getByRole('group', { name: 'Distance units' }).getByRole('button', { name: 'km' }).click();
await page.screenshot({ path: '/tmp/shots/01-home.png' });

// charts render
ok('recharts svg present', await page.locator('.recharts-surface').count() > 0);

// row-level "View in 3D" action in the landmark list (Recommended & All)
const rowLink = page.locator('ul[role="list"] a[href*="/explorer"]').first();
const rowHref = await rowLink.getAttribute('href');
ok('list rows expose View in 3D', !!rowHref && rowHref.includes('focus=') && rowHref.includes('d='), rowHref || 'missing');
await rowLink.click();
await page.waitForURL(/\/explorer\?focus=/, { timeout: 10000 });
await page.waitForTimeout(4500);
ok('row 3D link opens focused explorer', page.url().includes('/explorer?focus='));
await page.goto(B + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);

// Arabic RTL
await page.getByRole('button', { name: 'Switch language' }).click();
await page.waitForTimeout(1200);
const dir = await page.evaluate(() => document.documentElement.dir);
const arTitle = await page.evaluate(() => document.querySelector('h1')?.textContent);
ok('Arabic + RTL applied', dir === 'rtl' && /دليل/.test(arTitle || ''), `dir=${dir} h1=${arTitle}`);
await page.screenshot({ path: '/tmp/shots/02-home-ar.png' });
await page.getByRole('button', { name: 'تبديل اللغة' }).click();
await page.waitForTimeout(600);

// ---------- CALENDAR ----------
await page.goto(B + '/calendar', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const dayButtons = await page.locator('.grid-cols-7 > button').count();
ok('calendar month grid', dayButtons >= 28, `days=${dayButtons}`);
const eventItems = await page.locator('ul >> li >> button').count();
ok('calendar events listed', eventItems >= 3, `events=${eventItems}`);
await page.locator('ul >> li >> button').first().click();
await page.waitForTimeout(400);
ok('event modal opens with UTC', await page.locator('[role="dialog"]').count() === 1 && (await page.locator('[role="dialog"]').innerText()).includes('UTC'));
await page.screenshot({ path: '/tmp/shots/03-calendar.png' });
await page.keyboard.press('Escape');

// ---------- LEARN ----------
await page.goto(B + '/learn', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'Pause' }).click();
const scrub = page.locator('input[type="range"]').first();
await scrub.fill('250');
await page.waitForTimeout(700);
const phaseTxt = await page.evaluate(() => document.body.innerText.includes('First quarter') || document.body.innerText.includes('quarter') || document.body.innerText.includes('crescent'));
ok('learn player scrubs real phases', phaseTxt);
// quizzes were removed site-wide — the Learn page must not render one
ok('no quiz on Learn page', await page.getByText(/Quick check|اختبار سريع/).count() === 0);
await page.screenshot({ path: '/tmp/shots/04-learn.png' });

// ---------- EXPLORER ----------
await page.goto(B + '/explorer?focus=copernicus', { waitUntil: 'networkidle' }); // no viewAll => original marker set
await page.waitForTimeout(9000);
const glCanvas = await page.evaluate(() => {
  const cs = [...document.querySelectorAll('canvas')];
  const c = cs.find(x => x.getContext('webgl2') || x.getContext('webgl'));
  return c ? { w: c.width, h: c.height } : null;
});
ok('3D WebGL canvas active', !!glCanvas && glCanvas.w > 300, JSON.stringify(glCanvas));
const flyOptions = await page.locator('#fly-select option').count();
ok('explorer search options', flyOptions >= 12, `options=${flyOptions}`);
await page.getByRole('button', { name: 'Far side' }).click();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'Near side' }).click();
await page.waitForTimeout(1200);
// transparent labels over small surface-hugging markers
await page.getByRole('button', { name: 'Labels', exact: true }).click();
await page.waitForTimeout(900);
// drei <Html> labels are the only spans carrying an inline text shadow; verify
// they render with a transparent background so the surface stays readable.
const labelStyle = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('div span')].filter(s => s.style.textShadow && s.style.display !== 'none');
  const s = spans[0];
  return s ? { bg: getComputedStyle(s).backgroundColor, shadow: !!s.style.textShadow, n: spans.length } : null;
});
ok('3D labels transparent + readable', !!labelStyle && (labelStyle.bg === 'rgba(0, 0, 0, 0)' || labelStyle.bg === 'transparent') && labelStyle.shadow, JSON.stringify(labelStyle));
const overlaps = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('div span')].filter(s => s.style.textShadow && s.style.display !== 'none' && s.getBoundingClientRect().width > 0);
  const rects = spans.map(s => s.getBoundingClientRect());
  let n = 0;
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) n++;
  }
  return { visible: rects.length, overlaps: n };
});
ok('3D labels decluttered (no overlap)', overlaps.overlaps === 0 && overlaps.visible >= 3, JSON.stringify(overlaps));
await page.screenshot({ path: '/tmp/shots/05-explorer.png' });
// uniform lighting toggle works without crash
await page.getByRole('button', { name: 'Uniformly lit' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/shots/05b-explorer-uniform.png' });
await page.getByRole('button', { name: 'Sun at selected date' }).click();
// NASA GLB model loads (16.9 MB, meshopt) and renders without errors
const errBefore = errors.length;
await page.getByRole('button', { name: /NASA LRO mesh/ }).click();
await page.waitForTimeout(16000);
const glbCanvas = await page.evaluate(() => {
  const cs = [...document.querySelectorAll('canvas')];
  return cs.some(x => (x.getContext('webgl2') || x.getContext('webgl')) && x.width > 300);
});
ok('NASA GLB mesh renders', glbCanvas && errors.length === errBefore, `newErrors=${errors.length - errBefore}`);
await page.screenshot({ path: '/tmp/shots/09-glb.png' });
await page.getByRole('button', { name: /Calibrated sphere/ }).click();
await page.waitForTimeout(1200);

// ---------- LOGIN → WORKSPACE ----------
await page.goto(B + '/login', { waitUntil: 'networkidle' });
await page.fill('#email', 'smoke-b@test.dev');
await page.fill('#password', 'binocular8');
await page.getByRole('button', { name: 'Log in', exact: true }).last().click();
await page.waitForURL('**/workspace', { timeout: 10000 });
await page.waitForTimeout(1200);
ok('login redirects to workspace', page.url().includes('/workspace'));
ok('workspace shows tabs', (await page.evaluate(() => document.body.innerText)).includes('Observation journal'));
await page.screenshot({ path: '/tmp/shots/06-workspace.png' });

// ---------- MOBILE ----------
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mctx.addInitScript(() => { try { localStorage.setItem('lunanav:guest', '1'); } catch { /* */ } });
const mp = await mctx.newPage();
mp.on('pageerror', e => errors.push('mobile pageerror: ' + e.message));
await mp.goto(B + '/', { waitUntil: 'networkidle' });
await mp.waitForTimeout(2500);
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok('mobile: no horizontal overflow', overflow <= 2, `overflow=${overflow}px`);
await mp.screenshot({ path: '/tmp/shots/07-mobile.png' });
await mp.goto(B + '/explorer', { waitUntil: 'networkidle' });
await mp.waitForTimeout(5000);
const mOverflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok('mobile explorer: no overflow', mOverflow <= 2, `overflow=${mOverflow}px`);
await mp.screenshot({ path: '/tmp/shots/08-mobile-explorer.png' });

await browser.close();
console.log(results.join('\n'));
console.log('\nRUNTIME ERRORS (' + errors.length + '):');
console.log(errors.slice(0, 20).join('\n') || '(none)');
const fails = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\nSUMMARY: ${results.length - fails}/${results.length} passed`);
process.exit(fails || errors.length ? 1 : 0);