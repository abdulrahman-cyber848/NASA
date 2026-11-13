import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-sandbox'] });
const R=[]; const ok=(n,c,x='')=>R.push(`${c?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const errs=[];

// ---------- 1 · legacy storage must migrate, not vanish ----------
const ctx = await b.newContext({ viewport:{width:1500,height:950} });
await ctx.addInitScript(() => {
  // simulate a pre-rename visitor: guest access + saved prefs under OLD keys
  localStorage.setItem('lunascope:guest','1');
  localStorage.setItem('lunascope:prefs:v1', JSON.stringify({
    lang:'ar', units:'mi', hemisphere:'south', equipment:'telescope',
    locationId:'london', customLat:30.0444, customLon:31.2357, customTz:'UTC',
  }));
});
const p = await ctx.newPage();
p.on('pageerror', e=>errs.push('PE: '+e.message.slice(0,100)));
p.on('console', m=>{ if(m.type()==='error') errs.push('CE: '+m.text().slice(0,100)); });
await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:60000 });
await p.waitForTimeout(5000);
const store = await p.evaluate(() => ({
  oldGuest: localStorage.getItem('lunascope:guest'),
  newGuest: localStorage.getItem('lunanav:guest'),
  oldPrefs: localStorage.getItem('lunascope:prefs:v1'),
  newPrefs: localStorage.getItem('lunanav:prefs:v1'),
}));
ok('legacy guest key migrated', store.newGuest==='1' && store.oldGuest===null, JSON.stringify({n:store.newGuest,o:store.oldGuest}));
ok('legacy prefs migrated', !!store.newPrefs && store.oldPrefs===null);
const migrated = store.newPrefs ? JSON.parse(store.newPrefs) : {};
ok('pref VALUES preserved', migrated.units==='mi' && migrated.hemisphere==='south' && migrated.locationId==='london', JSON.stringify({u:migrated.units,h:migrated.hemisphere,l:migrated.locationId}));
ok('guest not logged out by rename', !(await p.evaluate(()=>location.pathname.includes('login'))));
ok('Arabic pref applied after migration', await p.evaluate(()=>document.documentElement.lang==='ar'||document.documentElement.dir==='rtl'));

// ---------- 2 · brand visible everywhere ----------
const c2 = await b.newContext({ viewport:{width:1500,height:950} });
await c2.addInitScript(()=>localStorage.setItem('lunanav:guest','1'));
const q = await c2.newPage();
q.on('pageerror', e=>errs.push('PE2: '+e.message.slice(0,100)));
for (const [route,label] of [['/','Home'],['/explorer','Explorer'],['/environment/spacesuit','Suit Lab'],['/learn','Learn'],['/login','Login']]) {
  await q.goto('http://localhost:3000'+route, { waitUntil:'domcontentloaded', timeout:60000 });
  await q.waitForTimeout(route==='/learn'||route==='/login'?2500:6000);
  const txt = await q.evaluate(()=>document.body.innerText);
  ok(`${label}: no old name`, !/LUNASCOPE|لوناسكوب/i.test(txt));
}
await q.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:60000 });
await q.waitForTimeout(4000);
ok('navbar shows LunaNav', await q.locator('header').getByText('LunaNav').count()>0);
ok('footer shows LunaNav', await q.locator('footer').getByText('LunaNav').count()>0);
ok('document title rebranded', (await q.title()).includes('LunaNav'), await q.title());

console.log(R.join('\n'));
console.log('\nERRORS:', errs.slice(0,5).join(' | ')||'none');
const f=R.filter(r=>r.startsWith('FAIL')).length;
console.log(`\nSUMMARY: ${R.length-f}/${R.length} passed`);
await b.close();
process.exit(f||errs.length?1:0);
