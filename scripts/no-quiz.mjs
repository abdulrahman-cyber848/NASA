import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
await ctx.addInitScript(() => localStorage.setItem('lunanav:guest','1'));
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PE: ' + e.message.slice(0,100)));
p.on('console', m => { if (m.type()==='error') errs.push('CE: ' + m.text().slice(0,100)); });
const R=[]; const ok=(n,c)=>R.push(`${c?'PASS':'FAIL'} ${n}`);

for (const [route,label] of [['/learn','Learn'],['/environment/spacesuit','Suit Lab'],['/environment/dust','Dust Lab'],['/','Daily Guide'],['/explorer','3D Explorer']]) {
  await p.goto('http://localhost:3000'+route, { waitUntil:'domcontentloaded', timeout:60000 });
  await p.waitForTimeout(route==='/learn'?3000:7000);
  const txt = await p.evaluate(() => document.body.innerText);
  const hasQuizWord = /\bquiz\b|اختبار الأجزاء|اختبار سريع|Engineering knowledge quiz|Quick check/i.test(txt);
  ok(`${label}: no quiz text`, !hasQuizWord);
  const btns = await p.evaluate(() => [...document.querySelectorAll('button,a')].map(e=>e.textContent||'').filter(t=>/quiz|اختبار/i.test(t)));
  ok(`${label}: no quiz control`, btns.length===0);
}
// Arabic too
await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:60000 });
await p.waitForTimeout(2500);
await p.getByRole('button', { name:'Switch language' }).click();
await p.waitForTimeout(1200);
await p.goto('http://localhost:3000/environment/spacesuit', { waitUntil:'domcontentloaded', timeout:60000 });
await p.waitForTimeout(7000);
const arTxt = await p.evaluate(() => document.body.innerText);
ok('Arabic Suit Lab: no quiz', !/اختبار/.test(arTxt));
console.log(R.join('\n'));
console.log('\nERRORS:', errs.slice(0,5).join(' | ')||'none');
const f=R.filter(r=>r.startsWith('FAIL')).length;
console.log(`\nSUMMARY: ${R.length-f}/${R.length} passed`);
await b.close();
process.exit(f||errs.length?1:0);
