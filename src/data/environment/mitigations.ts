// Dust mitigation technologies — honest development-status taxonomy.
// demonstrated = flown or proven in relevant environment; prototype = built &
// tested in lab/vacuum; research = active investigation; concept = proposed.
import type { Bi } from './hazards';

export type MitigationStatus = 'demonstrated' | 'prototype' | 'research' | 'concept';
export interface Mitigation {
  id: string;
  name: Bi;
  problem: Bi;
  principle: Bi;
  limitations: Bi;
  status: MitigationStatus;
}

export const MITIGATIONS: Mitigation[] = [
  {
    id: 'eds', status: 'prototype',
    name: { en: 'Electrodynamic Dust Shield (EDS)', ar: 'درع الغبار الكهروديناميكي (EDS)' },
    problem: { en: 'Dust on optics, radiators, solar panels', ar: 'الغبار على البصريات والمشعات والألواح الشمسية' },
    principle: { en: 'Phased AC voltages on embedded electrodes create traveling electric fields that lift and sweep charged grains off the surface.', ar: 'جهود مترددة متعددة الأطوار على أقطاب مدمجة تولد مجالات كهربائية متنقلة ترفع الحبيبات المشحونة وتكنسها عن السطح.' },
    limitations: { en: 'Works best on flat surfaces; needs power and electrodes; less effective on thick or deeply embedded layers.', ar: 'أفضل على الأسطح المستوية؛ يحتاج طاقة وأقطابًا؛ أقل فاعلية مع الطبقات السميكة أو المغروسة.' },
  },
  {
    id: 'coatings', status: 'research',
    name: { en: 'Dust-resistant textiles & coatings', ar: 'نسائج وطلاءات مقاومة للغبار' },
    problem: { en: 'Adhesion and abrasion on suits', ar: 'الالتصاق والتآكل على البدلات' },
    principle: { en: 'Low-surface-energy and conductive finishes reduce van der Waals and electrostatic grip so grains shed instead of sticking.', ar: 'تشطيبات منخفضة طاقة السطح وموصلة تقلل قبضة فان دير فالس والقوى الكهروستاتيكية فتتساقط الحبيبات بدل الالتصاق.' },
    limitations: { en: 'Coatings wear and can change thermal optics; durability under flexing is unproven long-term.', ar: 'الطلاءات تتآكل وقد تغيّر الخواص الحرارية؛ المتانة تحت الانثناء غير مثبتة طويل الأمد.' },
  },
  {
    id: 'joints', status: 'prototype',
    name: { en: 'Dust-tolerant mechanical joints', ar: 'مفاصل ميكانيكية متحملة للغبار' },
    problem: { en: 'Bearing wear and seizure', ar: 'تآكل المحامل وتوقفها' },
    principle: { en: 'Labyrinth seals, hardened races and solid lubricants keep grains out of load paths and tolerate those that enter.', ar: 'أختام متاهية ومجاري مقساة ومشحمات صلبة تُبقي الحبيبات خارج مسارات الحمل وتتحمل ما يدخل.' },
    limitations: { en: 'Adds mass and complexity; cannot exclude the finest fraction indefinitely.', ar: 'يضيف كتلة وتعقيدًا؛ ولا يستبعد أدق جزء إلى ما لا نهاية.' },
  },
  {
    id: 'covers', status: 'demonstrated',
    name: { en: 'Protective connector covers', ar: 'أغطية واقية للموصلات' },
    problem: { en: 'Seal and connector contamination', ar: 'تلوث الأختام والموصلات' },
    principle: { en: 'Simple physical barriers keep dust off precision mating surfaces until the moment of connection.', ar: 'حواجز فيزيائية بسيطة تُبقي الغبار بعيدًا عن أسطح التعشيق الدقيقة حتى لحظة التوصيل.' },
    limitations: { en: 'Human-factor dependent — a cover left open defeats the protection.', ar: 'يعتمد على العامل البشري — غطاء يُترك مفتوحًا يلغي الحماية.' },
  },
  {
    id: 'airlock', status: 'prototype',
    name: { en: 'Airlock dust isolation / suitports', ar: 'عزل الغبار بغرفة العزل / منافذ البدلات' },
    problem: { en: 'Habitat contamination', ar: 'تلوث المسكن' },
    principle: { en: 'Suits dock outside the pressure hull (suitport) or dust is vacuumed in a staged airlock, so dusty layers never enter the cabin.', ar: 'تلتحم البدلات خارج هيكل الضغط (منفذ بدلة) أو يُشفط الغبار في غرفة عزل متدرجة، فلا تدخل الطبقات المغبرة المقصورة.' },
    limitations: { en: 'Suitports add hull complexity and suit-donning constraints; tested, not yet standard.', ar: 'المنافذ تعقد الهيكل وتقيد ارتداء البدلة؛ اختُبرت ولم تصبح قياسية بعد.' },
  },
  {
    id: 'filtration', status: 'demonstrated',
    name: { en: 'Cabin filtration systems', ar: 'أنظمة ترشيح هواء المقصورة' },
    problem: { en: 'Airborne fines', ar: 'الحبيبات الدقيقة المحمولة بالهواء' },
    principle: { en: 'HEPA-class filters capture respirable particles from recirculated cabin air.', ar: 'مرشحات فئة HEPA تلتقط الجسيمات القابلة للتنفس من هواء المقصورة المعاد تدويره.' },
    limitations: { en: 'Filters load up and need replacement; do not stop dust at the source.', ar: 'تتشبع المرشحات وتحتاج استبدالًا؛ ولا توقف الغبار عند منبعه.' },
  },
  {
    id: 'monitoring', status: 'research',
    name: { en: 'Contamination monitoring', ar: 'مراقبة التلوث' },
    problem: { en: 'Invisible dust loading', ar: 'تحميل غبار غير مرئي' },
    principle: { en: 'Optical and quartz-crystal sensors quantify deposited mass so cleaning happens before margins are lost.', ar: 'حساسات بصرية وكوارتزبلورية تقيس الكتلة المترسبة ليتم التنظيف قبل فقدان الهوامش.' },
    limitations: { en: 'Sensors themselves foul; calibration for lunar fines is immature.', ar: 'الحساسات نفسها تتلوث؛ معايرتها للحبيبات القمرية غير ناضجة.' },
  },
  {
    id: 'cleaning', status: 'demonstrated',
    name: { en: 'Controlled equipment cleaning', ar: 'تنظيف مضبوط للعتاد' },
    problem: { en: 'Accumulated surface dust', ar: 'غبار سطحي متراكم' },
    principle: { en: 'Brushes, vacuum and gas jets remove bulk dust; Apollo crews brushed suits before ingress with partial success.', ar: 'فرش وشفط ونفث غاز يزيل الغبار الكتلي؛ نظف طاقم أبولو بدلاتهم قبل الدخول بنجاح جزئي.' },
    limitations: { en: 'Brushing abrades coatings and leaves the finest, most adhesive fraction.', ar: 'الفرك يكشط الطلاءات ويترك أدق الأجزاء وأشد التصاقًا.' },
  },
  {
    id: 'operations', status: 'demonstrated',
    name: { en: 'Dust-aware mission operations', ar: 'عمليات واعية بالغبار' },
    problem: { en: 'Unnecessary disturbance', ar: 'إثارة غير ضرورية' },
    principle: { en: 'Slow approaches, standoff distances for landings, and traffic routing minimize the dust ever launched.', ar: 'اقتراب بطيء ومسافات أمان للهبوط وتنظيم مسارات الحركة يقلل الغبار المثار أصلًا.' },
    limitations: { en: 'Trades time and flexibility against cleanliness.', ar: 'يقايض الوقت والمرونة مقابل النظافة.' },
  },
];