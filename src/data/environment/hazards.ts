// "What can go wrong?" — seven lunar dust hazard scenarios.
// Qualitative engineering education. No invented failure probabilities and no
// claim that any simulated event is an actual NASA incident.

export type HazardId = 'visor' | 'abrasion' | 'seal' | 'joint' | 'habitat' | 'thermal' | 'solar';
export interface Bi { en: string; ar: string }
export interface Hazard {
  id: HazardId;
  letter: string;
  title: Bi;
  what: Bi; why: Bi; mechanism: Bi; components: Bi; consequences: Bi; mitigation: Bi; residual: Bi;
}

export const HAZARDS: Hazard[] = [
  {
    id: 'visor', letter: 'A',
    title: { en: 'Visor Contamination', ar: 'تلوث الخوذة البصرية' },
    what: { en: 'Fine grains cling to the visor and scatter light, cutting contrast and clarity.', ar: 'تلتصق الحبيبات الدقيقة بالواقي البصري وتشتت الضوء فتقلل التباين والوضوح.' },
    why: { en: 'Electrostatic charge and contact transfer deposit grains; dry wiping then drags them across the coating.', ar: 'الشحنة الكهروستاتيكية والتلامس ينقلان الحبيبات، والمسح الجاف يجرّها فوق الطلاء.' },
    mechanism: { en: 'Adhesion plus abrasion — angular, glassy particles micro-scratch optical coatings.', ar: 'التصاق مع تآكل — جسيمات زاويّة زجاجية تخدش الطلاءات البصرية بدقة.' },
    components: { en: 'Visor, anti-scratch and anti-fog coatings, sunshade assembly.', ar: 'الواقي البصري، طلاءات مقاومة الخدش والضباب، مجموعة الظليل الشمسي.' },
    consequences: { en: 'Degraded navigation and science observation; glare around bright terrain.', ar: 'ضعف الملاحة والرصد العلمي، ووهج حول التضاريس الساطعة.' },
    mitigation: { en: 'Never dry-wipe; use covers, gas purge, and researched electrodynamic cleaning.', ar: 'لا تمسح جافًا أبدًا؛ استخدم الأغطية ونفث الغاز والتنظيف الكهروديناميكي قيد البحث.' },
    residual: { en: 'Embedded fines and cumulative coating wear cannot be fully reversed in the field.', ar: 'لا يمكن ميدانيًا إزالة الحبيبات المغروسة وتآكل الطلاء التراكمي بالكامل.' },
  },
  {
    id: 'abrasion', letter: 'B',
    title: { en: 'Spacesuit Abrasion', ar: 'تآكل بدلة الفضاء' },
    what: { en: 'Sharp regolith grinds the outer suit layers, especially boots and flexing joints.', ar: 'يجرح الريغوليث الحاد الطبقات الخارجية للبدلة، خصوصًا الأحذية والمفاصل المنثنية.' },
    why: { en: 'Regolith is fragmented impact glass and mineral shards — angular, not water-worn like beach sand.', ar: 'الريغوليث زجاج صدمي وشظايا معدنية متكسرة — زاوي وليس مصقولًا بالماء كرمل الشاطئ.' },
    mechanism: { en: 'Three-body abrasion: hard grains trapped between flexing surfaces cut fibers each cycle.', ar: 'تآكل ثلاثي الأجسام: حبيبات صلبة بين أسطح منثنية تقطع الألياف كل دورة.' },
    components: { en: 'Protective outer layer, boot soles, knee and elbow flex zones.', ar: 'الطبقة الخارجية الواقية، نعال الأحذية، مناطق انثناء الركبة والمرفق.' },
    consequences: { en: 'Thinning fabric reduces thermal and micrometeoroid protection margins over time.', ar: 'ترقق النسيج يقلل هوامش الحماية الحرارية والوقاية من النيازك الدقيقة مع الوقت.' },
    mitigation: { en: 'Abrasion-resistant weaves and coatings, replaceable overboots, scheduled inspection.', ar: 'نسائج وطلاءات مقاومة للتآكل، أحذية خارجية قابلة للاستبدال، وفحص دوري.' },
    residual: { en: 'Cumulative wear is unavoidable wherever fabric flexes against dust.', ar: 'التآكل التراكمي حتمي أينما ينثني النسيج على الغبار.' },
  },
  {
    id: 'seal', letter: 'C',
    title: { en: 'Seal Contamination', ar: 'تلوث موانع التسرب' },
    what: { en: 'Grains lodge between mating seal surfaces of a hypothetical suit interface.', ar: 'تنحشر الحبيبات بين سطحي تماس مانع تسرب في وصلة بدلة افتراضية.' },
    why: { en: 'Charged dust coats every exposed surface, including precision sealing faces.', ar: 'الغبار المشحون يغطي كل سطح مكشوف، بما فيه أوجه الإحكام الدقيقة.' },
    mechanism: { en: 'Particles hold the seal open microscopically and score the sealing surface, opening leak paths.', ar: 'تبقي الجسيمات الإحكام مفتوحًا مجهريًا وتخدش سطحه، فتفتح مسارات تسرب.' },
    components: { en: 'Hatch seals, suit disconnects, pressure-bearing connectors.', ar: 'أختام الفتحات، وصلات البدلة، الموصلات الحاملة للضغط.' },
    consequences: { en: 'Higher leak risk. Loss of suit pressure is life-threatening — never an acceptable outcome.', ar: 'خطر تسرب أعلى. فقدان ضغط البدلة يهدد الحياة — وليس نتيجة مقبولة أبدًا.' },
    mitigation: { en: 'Protective covers, clean-before-mate procedures, redundant seals, routine leak checks.', ar: 'أغطية واقية، تنظيف قبل التعشيق، أختام احتياطية مزدوجة، وفحوص تسرب دورية.' },
    residual: { en: 'Microscopic grains are hard to detect; verification never reaches zero risk.', ar: 'يصعب كشف الحبيبات المجهرية؛ التحقق لا يصل بالخطر إلى الصفر.' },
  },
  {
    id: 'joint', letter: 'D',
    title: { en: 'Mechanical Joint Damage', ar: 'تلف المفاصل الميكانيكية' },
    what: { en: 'Dust works into bearings and joints; friction rises and travel becomes gritty.', ar: 'يتسلل الغبار إلى المحامل والمفاصل؛ يرتفع الاحتكاك وتصبح الحركة خشنة.' },
    why: { en: 'Hard, angular grains enter gaps that were never designed for abrasive contamination.', ar: 'حبيبات صلبة زاويّة تدخل فجوات لم تُصمم أصلًا لتلوث كاشط.' },
    mechanism: { en: 'Abrasive wear and jamming raise friction torque; debris accelerates further wear.', ar: 'تآكل كاشط وانحشار يرفعان عزم الاحتكاك؛ والحطام يسرّع تآكلًا إضافيًا.' },
    components: { en: 'Shoulder, wrist and hip bearings; rover wheel and steering joints.', ar: 'محامل الكتف والمعصم والورك؛ مفاصل عجلات وتوجيه العربة.' },
    consequences: { en: 'Restricted mobility, higher astronaut effort and fatigue, possible seizure.', ar: 'حركة مقيدة، جهد وإرهاق أكبر للرائد، واحتمال توقف المفصل.' },
    mitigation: { en: 'Dust-tolerant bearing designs, labyrinth seals, vacuum-compatible solid lubricants.', ar: 'تصاميم محامل متحملة للغبار، أختام متاهية، مواد تشحيم صلبة ملائمة للفراغ.' },
    residual: { en: 'Wear debris generated inside the joint keeps circulating.', ar: 'حطام التآكل المتولد داخل المفصل يستمر في الدوران.' },
  },
  {
    id: 'habitat', letter: 'E',
    title: { en: 'Habitat Contamination', ar: 'تلوث المسكن' },
    what: { en: 'Dust rides suits and samples from the surface into the airlock and cabin.', ar: 'ينقل الغبارُ البدلاتِ والعيناتِ من السطح إلى غرفة العزل والمقصورة.' },
    why: { en: 'Adhered dust sheds and re-suspends when airflow returns during repressurization.', ar: 'يتساقط الغبار الملتصق ويعود للتعليق عند عودة تدفق الهواء أثناء إعادة الضغط.' },
    mechanism: { en: 'Re-suspension of the fine, inhalable fraction into breathable air.', ar: 'إعادة تعليق الجزء الدقيق القابل للاستنشاق في الهواء المتنفس.' },
    components: { en: 'Airlock, filters, electronics, and crew airways.', ar: 'غرفة العزل، المرشحات، الإلكترونيات، والمسالك الهوائية للطاقم.' },
    consequences: { en: 'Equipment contamination and irritation exposure — Apollo crews reported "lunar hay fever".', ar: 'تلوث المعدات وتهيج تنفسي — أبلغت أطقم أبولو عن «حمى القمر».' },
    mitigation: { en: 'Suitports, airlock vacuuming, HEPA filtration, clean/dirty zoning.', ar: 'منافذ البدلات، الشفط في غرفة العزل، ترشيح HEPA، وفصل المناطق النظيفة والملوثة.' },
    residual: { en: 'The finest fraction stays airborne for long periods despite filtration.', ar: 'يبقى أدق جزء معلقًا في الهواء فترات طويلة رغم الترشيح.' },
  },
  {
    id: 'thermal', letter: 'F',
    title: { en: 'Thermal Management Problems', ar: 'مشكلات الإدارة الحرارية' },
    what: { en: 'Dust blankets radiators and thermal surfaces, changing their optical properties.', ar: 'يكسو الغبار المشعات والأسطح الحرارية فيغيّر خواصها البصرية.' },
    why: { en: 'Dark dust raises solar absorptivity while masking the radiating area.', ar: 'يرفع الغبار الداكن امتصاص الشمس بينما يحجب مساحة الإشعاع.' },
    mechanism: { en: 'More absorbed sunlight plus less effective emission ⇒ reduced net heat rejection.', ar: 'امتصاص شمسي أكبر مع انبعاث فعال أقل ⇒ انخفاض صافي طرد الحرارة.' },
    components: { en: 'Radiators, thermal coatings, heat exchangers.', ar: 'المشعات، الطلاءات الحرارية، المبادلات الحرارية.' },
    consequences: { en: 'Temperatures climb; cooling systems work harder and margins shrink.', ar: 'ترتفع الحرارة؛ تعمل أنظمة التبريد بجهد أكبر وتضيق الهوامش.' },
    mitigation: { en: 'Covers while parked, orientation away from dust sources, electrodynamic shields.', ar: 'أغطية أثناء التوقف، توجيه بعيدًا عن مصادر الغبار، دروع كهروديناميكية.' },
    residual: { en: 'Partial coverage persists between cleanings.', ar: 'يبقى تغطٍ جزئي بين عمليات التنظيف.' },
  },
  {
    id: 'solar', letter: 'G',
    title: { en: 'Solar Panel Contamination', ar: 'تلوث الألواح الشمسية' },
    what: { en: 'A dust film shades the cells and lowers electrical output.', ar: 'يحجب غشاء الغبار الخلايا ويخفض الخرج الكهربائي.' },
    why: { en: 'Deposited grains absorb and scatter incoming sunlight before it reaches the cell.', ar: 'تمتص الحبيبات المترسبة ضوء الشمس وتشتته قبل وصوله للخلية.' },
    mechanism: { en: 'Optical obscuration — power loss grows with coverage; documented on Apollo hardware.', ar: 'حجب بصري — يزداد فقد القدرة مع التغطية؛ موثق على عتاد أبولو.' },
    components: { en: 'PV cells, cover glass, array wiring.', ar: 'الخلايا الكهروضوئية، الزجاج الواقي، تمديدات المصفوفة.' },
    consequences: { en: 'Reduced power margin; batteries discharge sooner during load peaks.', ar: 'هامش قدرة أقل؛ وتفرغ البطاريات أسرع عند ذروات الحمل.' },
    mitigation: { en: 'Electrodynamic dust shields (lab-demonstrated), tilting, careful brushing.', ar: 'دروع غبار كهروديناميكية (أُثبتت مخبريًا)، إمالة، وتنظيف حذر بالفرشاة.' },
    residual: { en: 'The finest grains remain after any cleaning pass.', ar: 'تبقى أدق الحبيبات بعد أي عملية تنظيف.' },
  },
];

export const HAZARD_FIELDS = ['what', 'why', 'mechanism', 'components', 'consequences', 'mitigation', 'residual'] as const;
export type HazardField = typeof HAZARD_FIELDS[number];