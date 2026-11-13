import { chromium } from 'playwright';
import { copyFileSync } from 'node:fs';
// stand-in mesh: proves the store round-trips a real .glb without shipping one
copyFileSync('public/assets/moon-model.glb', '/tmp/suit-test.glb');
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1560, height: 960 } });
await ctx.addInitScript(() => localStorage.setItem('lunanav:guest','1'));
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PE: ' + e.message.slice(0,110)));
p.on('console', m => { if (m.type()==='error') errs.push('CE: ' + m.text().slice(0,110)); });
const R = [];
const ok = (n,c,x='') => R.push(`${c?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);

await p.goto('http://localhost:3000/environment/spacesuit', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(5000);
// the optional high-res uploader lives in a collapsed disclosure
await p.getByText(/Load a higher-resolution export instead/).click();
await p.waitForTimeout(600);
ok('dropzone present', await p.getByText(/Drop the Smithsonian/).first().isVisible());

// 1 · upload
await p.locator('input[type="file"]').setInputFiles('/tmp/suit-test.glb');
await p.waitForTimeout(6000);
ok('model loaded', await p.locator('text=/^Loaded$/').first().isVisible());
ok('persistence confirmed', await p.getByText(/Saved in this browser/).first().isVisible());

// 2 · RELOAD — the whole point
await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(8000);
await p.getByText(/Load a higher-resolution export instead/).click().catch(()=>{});
await p.waitForTimeout(500);
const stillThere = await p.getByText('suit-test.glb').count() > 0;
ok('survives page reload', stillThere);
ok('still marked saved', await p.getByText(/Saved in this browser/).first().isVisible().catch(()=>false));

// 3 · navigate away and back
await p.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(2000);
await p.goto('http://localhost:3000/environment/spacesuit', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(9000);
await p.getByText(/Load a higher-resolution export instead/).click().catch(()=>{});
await p.waitForTimeout(500);
ok('survives navigation', await p.getByText('suit-test.glb').count() > 0);

// 4 · clear removes it permanently
await p.locator('button[aria-label="Remove model"]').click();
await p.waitForTimeout(1500);
await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(6000);
await p.getByText(/Load a higher-resolution export instead/).click().catch(()=>{});
await p.waitForTimeout(500);
ok('clear is permanent', await p.getByText('suit-test.glb').count() === 0);

console.log(R.join('\n'));
console.log('\nERRORS:', errs.slice(0,5).join(' | ') || 'none');
const fails = R.filter(r=>r.startsWith('FAIL')).length;
console.log(`\nSUMMARY: ${R.length-fails}/${R.length} passed`);
await b.close();
process.exit(fails || errs.length ? 1 : 0);
