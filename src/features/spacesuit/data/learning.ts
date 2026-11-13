// Component explainer layer.
// The "explainer" is a LOCAL rule-based generator over the curated component
// database — no external AI service is called, so every sentence it produces
// traces back to the same cited facts shown in the component dossier.
import { COMPONENTS, compById, type SuitComponent } from './axemu';

export interface ExplainerResult { text: string; textAr: string; follow: string[] }

const HAS = (s: string, ...words: string[]) => words.some(w => s.includes(w));

/** Plain-language explanation assembled from the component's own cited fields. */
export function explain(c: SuitComponent, lang: 'en' | 'ar'): ExplainerResult {
  const en = [
    `${c.name.en} is the ${c.category.en.toLowerCase()} of the ${assemblyName(c.assembly)} assembly.`,
    `In plain terms: ${c.fn.en}`,
    `It works because ${lower(c.principle.en)}`,
    `Its main materials are ${lower(c.materials.en)}`,
    `The failure to watch for is ${lower(c.failure.en)}`,
    `On the Moon, ${lower(c.dust.en)}`,
    `Engineers respond by: ${lower(c.protection.en)}`,
  ].join(' ');
  const ar = [
    `${c.name.ar} هو ${c.category.ar} في مجموعة ${assemblyNameAr(c.assembly)}.`,
    `ببساطة: ${c.fn.ar}`,
    `يعمل لأن ${lower(c.principle.ar)}`,
    `مواده الأساسية ${lower(c.materials.ar)}`,
    `الفشل الذي يجب مراقبته ${lower(c.failure.ar)}`,
    `على القمر، ${lower(c.dust.ar)}`,
    `ويستجيب المهندسون بـ: ${lower(c.protection.ar)}`,
  ].join(' ');
  return { text: en, textAr: ar, follow: followUps(c, lang) };
}

const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const assemblyName = (id: string) => ASSEMBLY_EN[id] ?? id;
const assemblyNameAr = (id: string) => ASSEMBLY_AR[id] ?? id;
const ASSEMBLY_EN: Record<string, string> = {
  helmet: 'helmet', hut: 'hard upper torso', arms: 'arm', gloves: 'glove',
  lta: 'lower torso', legs: 'leg', boots: 'boot', plss: 'PLSS', layers: 'pressure garment',
};
const ASSEMBLY_AR: Record<string, string> = {
  helmet: 'الخوذة', hut: 'الجذع العلوي الصلب', arms: 'الذراع', gloves: 'القفاز',
  lta: 'الجذع السفلي', legs: 'الساق', boots: 'الحذاء', plss: 'الإسناد الحيوي', layers: 'ثوب الضغط',
};

function followUps(c: SuitComponent, lang: 'en' | 'ar'): string[] {
  const others = COMPONENTS.filter(x => x.assembly === c.assembly && x.id !== c.id).slice(0, 2);
  const related = COMPONENTS.filter(x => x.assembly !== c.assembly && x.id !== c.id).slice(0, 2);
  return lang === 'ar'
    ? [`كيف يعمل ${c.name.ar} تحت الضغط؟`, ...others.map(o => `ما علاقة ${o.name.ar} به؟`), ...related.map(o => `لماذا يهم ${o.name.ar}؟`)]
    : [`How does ${c.name.en} work under pressure?`, ...others.map(o => `How does ${o.name.en} connect to it?`), ...related.map(o => `Why does ${o.name.en} matter?`)];
}

/** Keyword routing over the component database. Returns null when nothing matches. */
export function answer(question: string, lang: 'en' | 'ar'): ExplainerResult | null {
  const q = question.toLowerCase();
  let best: SuitComponent | null = null; let score = 0;
  for (const c of COMPONENTS) {
    let s = 0;
    const hay = `${c.name.en} ${c.name.ar} ${c.id.replace(/-/g, ' ')} ${c.category.en}`.toLowerCase();
    for (const token of hay.split(/\s+/)) if (token.length > 3 && q.includes(token)) s += 2;
    for (const w of ['dust', 'غبار', 'regolith', 'ريغوليث']) if (q.includes(w) && HAS(c.dust.en.toLowerCase(), w)) s += 3;
    for (const w of ['pressure', 'ضغط', 'leak', 'تسرب']) if (q.includes(w) && HAS((c.failure.en + c.principle.en).toLowerCase(), w)) s += 2;
    for (const w of ['cold', 'hot', 'حرارة', 'thermal', 'حراري']) if (q.includes(w) && c.category.en === 'Thermal') s += 3;
    for (const w of ['breathe', 'oxygen', 'أكسجين', 'تنفس', 'co2']) if (q.includes(w) && c.assembly === 'plss') s += 3;
    for (const w of ['move', 'bend', 'joint', 'مفصل', 'انثناء', 'حركة']) if (q.includes(w) && c.category.en === 'Mobility') s += 3;
    if (s > score) { score = s; best = c; }
  }
  return best && score >= 2 ? explain(best, lang) : null;
}
