// Educational mission scenarios with engineering choices and consequences.
// These are teaching situations — NOT official NASA flight procedures.
import type { Bi } from './hazards';

export type MissionViz = 'walk' | 'instrument' | 'rover' | 'airlock' | 'seal';
export interface MissionOption {
  label: Bi;
  quality: 'good' | 'partial' | 'poor';
  outcome: Bi;
}
export interface Mission {
  id: string;
  viz: MissionViz;
  title: Bi;
  setup: Bi;
  hazard: Bi;
  physics: Bi;
  options: MissionOption[];
  residual: Bi;
}

export const MISSIONS: Mission[] = [
  {
    id: 'walk', viz: 'walk',
    title: { en: 'Crossing a dusty plain', ar: 'عبور سهل مغبر' },
    setup: { en: 'An astronaut walks across fresh regolith; dust cakes the boots with every step.', ar: 'يسير رائد فوق ريغوليث طري؛ يتراكم الغبار على الحذاءين مع كل خطوة.' },
    hazard: { en: 'Boot abrasion and heavy dust carry-back to the airlock.', ar: 'تآكل الأحذية ونقل كميات غبار كبيرة إلى غرفة العزل.' },
    physics: { en: 'Each footfall launches grains on ballistic arcs (g = 1.62 m/s², no drag); fines adhere electrostatically to fabric.', ar: 'كل خطوة تقذف حبيبات في أقواس قذيفية (g = 1.62 م/ث²، بلا مقاومة)؛ وتلتصق الدقائق كهروستاتيكيًا بالنسيج.' },
    options: [
      { label: { en: 'Slow the pace and use the brush station before ingress', ar: 'إبطاء الخطى واستخدام محطة الفرشاة قبل الدخول' }, quality: 'good', outcome: { en: 'Lower launch rate and most bulk dust removed outside; only fines remain.', ar: 'معدل إثارة أقل وإزالة معظم الغبار الكتلي خارجًا؛ تبقى الدقائق فقط.' } },
      { label: { en: 'Walk normally and wipe boots inside the airlock', ar: 'السير عاديًا ومسح الحذاءين داخل غرفة العزل' }, quality: 'partial', outcome: { en: 'Bulk dust stays in the airlock, but wiping re-suspends fines into the air you will breathe.', ar: 'يبقى الغبار الكتلي في الغرفة، لكن المسح يعيد تعليق الدقائق في هواء ستتنفسه.' } },
      { label: { en: 'Jog to spend less time in the dust', ar: 'الهرولة لقضاء وقت أقل في الغبار' }, quality: 'poor', outcome: { en: 'Faster, higher footfalls launch far more dust and accelerate boot wear — time saved is margin lost.', ar: 'خطوات أسرع وأعلى تقذف غبارًا أكثر بكثير وتسرع تآكل الحذاء — الوقت الموفر هامش مفقود.' } },
    ],
    residual: { en: 'The finest fraction always rides home on the suit.', ar: 'أدق جزء يعود دائمًا على البدلة.' },
  },
  {
    id: 'instrument', viz: 'instrument',
    title: { en: 'Approaching a science instrument', ar: 'الاقتراب من جهاز علمي' },
    setup: { en: 'A telescope-style instrument waits downrange; your approach path crosses loose powder toward its open optics.', ar: 'جهاز شبيه بالتلسكوب ينتظر؛ يعبر مسارك مسحوقًا مفككًا باتجاه بصرياته المكشوفة.' },
    hazard: { en: 'Footfall ejecta settling on the instrument’s mirrors and lenses.', ar: 'مقذوفات الخطوات تترسب على مرايا الجهاز وعدساته.' },
    physics: { en: 'Shallow-angle ejecta travel meters in vacuum; even a monolayer scatters light and cuts contrast.', ar: 'المقذوفات الضحلة تقطع أمتارًا في الفراغ؛ حتى طبقة أحادية تشتت الضوء وتقلص التباين.' },
    options: [
      { label: { en: 'Approach slowly from down-slope with the cover closed until hookup', ar: 'الاقتراب ببطء من جهة الانحدار مع إبقاء الغطاء مغلقًا حتى التوصيل' }, quality: 'good', outcome: { en: 'Low-energy ejecta fall short; optics stay covered during the riskiest phase.', ar: 'مقذوفات منخفضة الطاقة تسقط قبل الجهاز؛ وتبقى البصريات مغطاة في أخطر مرحلة.' } },
      { label: { en: 'Open the cover first so you can see the alignment marks', ar: 'فتح الغطاء أولًا لرؤية علامات المحاذاة' }, quality: 'poor', outcome: { en: 'Exposed optics collect every grain your approach launches — alignment is easier, data is worse.', ar: 'البصريات المكشوفة تلتقط كل حبة يثيرها اقترابك — المحاذاة أسهل والبيانات أسوأ.' } },
      { label: { en: 'Ask the rover to drop you right beside it', ar: 'طلب توصيل العربة لك بجانبه تمامًا' }, quality: 'partial', outcome: { en: 'Fewer footfalls, but wheel rooster-tails are energetic; a close stop trades one source for a stronger one.', ar: 'خطوات أقل، لكن ذيول العربة المقذوفة عالية الطاقة؛ التوقف القريب يستبدل مصدرًا بآخر أقوى.' } },
    ],
    residual: { en: 'Micrometeoroid gardening keeps a slow dust rain falling regardless.', ar: '«بستنة» النيازك الدقيقة تُبقي مطر غبار بطيئًا على أي حال.' },
  },
  {
    id: 'rover', viz: 'rover',
    title: { en: 'Rover rendezvous', ar: 'التقاء العربة' },
    setup: { en: 'A rover approaches you across the plain, wheels throwing bright rooster-tails of grains.', ar: 'تقترب عربة منك عبر السهل، وعجلاتها تقذف ذيولًا لامعة من الحبيبات.' },
    hazard: { en: 'High-speed wheel ejecta sandblasting your suit and visor.', ar: 'مقذوفات العجلات السريعة تسفع بدلتك وواقيك البصري.' },
    physics: { en: 'Wheel shear launches grains faster and farther than footsteps; in vacuum nothing slows them until impact.', ar: 'قص العجلات يقذف الحبيبات أسرع وأبعد من الخطوات؛ وفي الفراغ لا شيء يبطئها حتى الارتطام.' },
    options: [
      { label: { en: 'Hold position behind a boulder and have the rover stop 10 m out', ar: 'الثبات خلف صخرة وطلب توقف العربة على بعد 10 أمتار' }, quality: 'good', outcome: { en: 'Terrain shadows you from the ejecta cone; the final approach is on foot at walking energy.', ar: 'التضاريس تحجبك عن مخروط المقذوفات؛ والاقتراب الأخير سيرًا بطاقة المشي.' } },
      { label: { en: 'Wave it closer so you can grab the sample bags', ar: 'التلويح لها بالاقتراب لأخذ أكياس العينات' }, quality: 'poor', outcome: { en: 'You stand inside the ejecta cone — visor micro-pitting and suit loading rise sharply.', ar: 'تقف داخل مخروط المقذوفات — يرتفع نقر الواقي وتحميل البدلة بحدة.' } },
      { label: { en: 'Turn your back and let it pass, then continue', ar: 'إدارة ظهرك وتركها تمر ثم المتابعة' }, quality: 'partial', outcome: { en: 'The PLSS takes the hit instead of your visor — better, but the pack’s connectors still foul.', ar: 'تتلقى الحقيبة الضربة بدل الواقي — أفضل، لكن وصلات الحقيبة تتلوث.' } },
    ],
    residual: { en: 'Deposited fines still migrate into joints during later flexing.', ar: 'الدقائق المترسبة ما تزال تهاجر إلى المفاصل مع الانثناء اللاحق.' },
  },
  {
    id: 'airlock', viz: 'airlock',
    title: { en: 'Returning to the habitat', ar: 'العودة إلى المسكن' },
    setup: { en: 'EVA complete. Your suit is visibly gray from boots to knees as the airlock hatch opens.', ar: 'انتهى الخروج. بدلتك رمادية بوضوح من الحذاءين إلى الركبتين مع فتح باب غرفة العزل.' },
    hazard: { en: 'Dust re-suspending into breathable air at repressurization.', ar: 'إعادة تعليق الغبار في الهواء المتنفس عند إعادة الضغط.' },
    physics: { en: 'Returning airflow lifts the inhalable fraction off fabric; particles then circulate with the cabin loop.', ar: 'الهواء العائد يرفع الجزء القابل للاستنشاق عن النسيج؛ ثم تدور الجسيمات مع دورة هواء المقصورة.' },
    options: [
      { label: { en: 'Vacuum the suit in the staged airlock before repress', ar: 'شفط البدلة بالمكنسة في غرفة العزل المتدرجة قبل إعادة الضغط' }, quality: 'good', outcome: { en: 'Most mobile dust is captured while still in vacuum; filters handle the remainder.', ar: 'يُلتقط معظم الغبار المتحرك وهو ما يزال في الفراغ؛ وتتكفل المرشحات بالباقي.' } },
      { label: { en: 'Repress quickly — the schedule is tight', ar: 'إعادة الضغط بسرعة — الجدول ضيق' }, quality: 'poor', outcome: { en: 'A fast gas rush strips dust off the suit straight into the cabin air path.', ar: 'اندفاع الغاز السريع ينتزع الغبار عن البدلة مباشرة إلى مسار هواء المقصورة.' } },
      { label: { en: 'Brush off outside, then repress slowly', ar: 'التنظيف بالفرشاة خارجًا ثم إعادة ضغط بطيئة' }, quality: 'partial', outcome: { en: 'Apollo-style brushing helps, but leaves charged fines that a slow repress still lifts.', ar: 'فرك بأسلوب أبولو يفيد، لكنه يترك دقائق مشحونة يرفعها حتى الضغط البطيء.' } },
    ],
    residual: { en: 'Some fraction always reaches the cabin filters.', ar: 'جزء ما يصل دائمًا إلى مرشحات المقصورة.' },
  },
  {
    id: 'seal', viz: 'seal',
    title: { en: 'Inspecting a contaminated seal', ar: 'فحص ختم ملوث' },
    setup: { en: 'A sample-container sealing face shows a faint gray ring of dust before mating.', ar: 'يظهر وجه إحكام حاوية عينات حلقة غبار رمادية باهتة قبل التعشيق.' },
    hazard: { en: 'Grains creating a leak path across a pressure boundary.', ar: 'حبيبات تنشئ مسار تسرب عبر حد ضغط.' },
    physics: { en: 'A single hard grain can hold soft seal material open; leak rate grows with the gap it props.', ar: 'حبة صلبة واحدة قد تُبقي مادة الإحكام اللينة مفتوحة؛ ويتزايد التسرب مع الفجوة التي تبقيها.' },
    options: [
      { label: { en: 'Gas-jet clean, inspect under light, then mate and leak-check', ar: 'تنظيف بنفث الغاز، فحص تحت الضوء، ثم تعشيق وفحص تسرب' }, quality: 'good', outcome: { en: 'Visible and most microscopic grains removed; the leak check verifies the boundary.', ar: 'أُزيلت الحبيبات المرئية ومعظم المجهرية؛ ويثبت فحص التسرب سلامة الحد.' } },
      { label: { en: 'Wipe it with a gloved finger and mate', ar: 'مسحه بإصبع مقفّز ثم التعشيق' }, quality: 'poor', outcome: { en: 'The wipe grinds grains into the seal surface and adds glove-borne dust — worst of both.', ar: 'المسح يجرح سطح الإحكام بالحبيبات ويضيف غبار القفاز — أسوأ الاحتمالين.' } },
      { label: { en: 'Mate it as-is; the seal is redundant anyway', ar: 'التعشيق كما هو؛ فالختم مزدوج على أي حال' }, quality: 'poor', outcome: { en: 'Redundancy is a backup, not a permission slip — both seals now share the same contamination.', ar: 'الازدواجية احتياط لا تصريح — الختمان الآن يتقاسمان التلوث نفسه.' } },
    ],
    residual: { en: 'Sub-visual grains remain; only the leak check bounds the risk.', ar: 'تبقى حبيبات دون مرئية؛ وحده فحص التسرب يحدّ الخطر.' },
  },
];