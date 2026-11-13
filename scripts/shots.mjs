import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1560, height: 960 } });
await p.addInitScript(() => localStorage.setItem('lunanav:guest','1'));
await p.goto('http://localhost:3000/environment/spacesuit', { waitUntil: 'networkidle' });
await p.waitForTimeout(5500);
const modes = ['External Inspection','Internal Inspection','Exploded Assembly','Cross-Section','Dust Exposure'];
for (let i = 0; i < modes.length; i++) {
  await p.getByRole('tab', { name: modes[i] }).click();
  await p.waitForTimeout(1400);
  if (modes[i] === 'Cross-Section') { await p.locator('#sec-chk').check(); await p.locator('input[aria-label="Cut position"]').fill('0.12'); await p.waitForTimeout(900); }
  if (modes[i] === 'Exploded Assembly') { await p.locator('input[aria-label="Explode amount"]').first().fill('1'); await p.waitForTimeout(900); }
  await p.screenshot({ path: `/tmp/shots/m${i}.png` });
}
await b.close();
