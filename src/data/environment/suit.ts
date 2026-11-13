// Generic pressurized EVA suit architecture — an educational layer model.
// NOT the exact specification of any particular NASA suit (Apollo A7L, EMU,
// xEMU/AxEMU differ in detail). Sources: NASA Spacewalk Spacesuit Basics and
// Artemis Generation Spacesuits (see sources.ts).

export type SuitPartId =
  | 'lcvg' | 'bladder' | 'restraint' | 'tmg' | 'outer'
  | 'helmet' | 'gloves' | 'boots' | 'joints' | 'plss';

export interface Bi { en: string; ar: string }
export interface SuitPart {
  id: SuitPartId;
  name: Bi;
  layer: number;              // 0 innermost … 4 outermost (torso shells)
  color: string;
  purpose: Bi; physics: Bi; failure: Bi; dustVuln: Bi; protection: Bi;
}

export const SUIT_PARTS: SuitPart[] = [
  {
    id: 'lcvg', name: { en: 'Liquid Cooling & Ventilation Garment', ar: 'ثوب التبريد السائل والتهوية' }, layer: 0, color: '#3E7FC1',
    purpose: { en: 'A close-fitting garment of water tubes and air ducts that carries metabolic heat away from the skin.', ar: 'ثوب ضيق بأنابيب ماء وقنوات هواء ينقل الحرارة الأيضية بعيدًا عن الجلد.' },
    physics: { en: 'Forced convection into flowing water; heat capacity of water moves hundreds of watts to the PLSS heat exchanger.', ar: 'حمل قسري إلى ماء متدفق؛ السعة الحرارية للماء تنقل مئات الواطات إلى مبادل PLSS الحراري.' },
    failure: { en: 'Pump fault, blocked tube, or leak reduces cooling capacity.', ar: 'عطل مضخة أو انسداد أنبوب أو تسرب يقلل قدرة التبريد.' },
    dustVuln: { en: 'Protected inside the pressure layers, but connectors at the suit interface can admit grit.', ar: 'محمي داخل طبقات الضغط، لكن الوصلات عند واجهة البدلة قد تسمح بدخول الحبيبات.' },
    protection: { en: 'Sealed quick-disconnects with dust covers and redundant flow paths.', ar: 'وصلات سريعة محكمة بأغطية غبار ومسارات تدفق احتياطية.' },
  },
  {
    id: 'bladder', name: { en: 'Pressure Bladder', ar: 'غشاء الضغط' }, layer: 1, color: '#8FA6C8',
    purpose: { en: 'A gas-tight membrane that holds the breathable atmosphere around the body.', ar: 'غشاء مانع لتسرب الغاز يحفظ الغلاف الجوي القابل للتنفس حول الجسم.' },
    physics: { en: 'Contains the pressure differential against vacuum; membrane stress scales with pressure × radius.', ar: 'يحوي فرق الضغط مقابل الفراغ؛ إجهاد الغشاء يتناسب مع الضغط × نصف القطر.' },
    failure: { en: 'Puncture or seal leak causes pressure loss — a life-threatening emergency.', ar: 'ثقب أو تسرب ختم يسبب فقد ضغط — حالة طارئة مهددة للحياة.' },
    dustVuln: { en: 'Grit at disconnect seals can create leak paths across the bladder boundary.', ar: 'الحبيبات عند أختام الوصلات قد تنشئ مسارات تسرب عبر حدود الغشاء.' },
    protection: { en: 'Kept beneath restraint and insulation; redundant seals and leak checks.', ar: 'يبقى تحت طبقة التقييد والعزل؛ أختام مزدوجة وفحوص تسرب.' },
  },
  {
    id: 'restraint', name: { en: 'Restraint Layer', ar: 'طبقة التقييد' }, layer: 2, color: '#4A5568',
    purpose: { en: 'A woven structural layer that carries the pressure load so the bladder keeps its shape.', ar: 'طبقة منسوجة إنشائية تحمل حمل الضغط ليحافظ الغشاء على شكله.' },
    physics: { en: 'Tension structure: fibers take the hoop stress, preventing ballooning and setting joint geometry.', ar: 'بنية شد: تتحمل الألياف الإجهاد الطوقي فتمنع الانتفاخ وتحدد هندسة المفاصل.' },
    failure: { en: 'Broken fibers or seams distort the suit and overload the bladder.', ar: 'ألياف أو خياطات مقطوعة تشوه البدلة وتُحمّل الغشاء فوق طاقته.' },
    dustVuln: { en: 'Abrasion at flex points slowly weakens load-bearing fibers.', ar: 'التآكل عند نقاط الانثناء يضعف ألياف التحمل ببطء.' },
    protection: { en: 'Sits under the TMG; inspection intervals track flex-cycle wear.', ar: 'تقع تحت TMG؛ فترات الفحص تتابع تآكل دورات الانثناء.' },
  },
  {
    id: 'tmg', name: { en: 'Thermal Micrometeoroid Garment', ar: 'ثوب النيازك الدقيقة الحراري' }, layer: 3, color: '#C8A24A',
    purpose: { en: 'Stacked insulation and high-strength fabrics that buffer temperature extremes and small impacts.', ar: 'طبقات عزل وأنسجة عالية المتانة تخفف تقلبات الحرارة والصدمات الصغيرة.' },
    physics: { en: 'Many reflective layers cut radiative heat transfer; tough weaves break up hypervelocity micro-impacts.', ar: 'طبقات عاكسة كثيرة تقلل انتقال الحرارة إشعاعيًا؛ نسائج متينة تفتت الصدمات الدقيقة فائقة السرعة.' },
    failure: { en: 'Compression or tearing of layers degrades insulation and impact margin.', ar: 'انضغاط الطبقات أو تمزقها يضعف العزل وهامش الصدمات.' },
    dustVuln: { en: 'Dust between layers raises conductive coupling and abrades fibers.', ar: 'الغبار بين الطبقات يزيد الاقتران الحراري ويكشط الألياف.' },
    protection: { en: 'Outer cover sheds grains; damaged panels are replaceable.', ar: 'غطاء خارجي يطرد الحبيبات؛ الألواح المتضررة قابلة للاستبدال.' },
  },
  {
    id: 'outer', name: { en: 'Protective Outer Layer', ar: 'الطبقة الخارجية الواقية' }, layer: 4, color: '#E8ECF4',
    purpose: { en: 'The visible white shell: abrasion resistance, sunlight reflection, and the first dust barrier.', ar: 'الغلاف الأبيض الظاهر: مقاومة تآكل، عكس ضوء الشمس، وأول حاجز للغبار.' },
    physics: { en: 'High solar reflectance lowers absorbed heat; tight weaves resist cutting by angular grains.', ar: 'انعكاس شمسي عالٍ يقلل الحرارة الممتصة؛ نسائج محكمة تقاوم قطع الحبيبات الزاويّة.' },
    failure: { en: 'Wear, cuts, and soiling change its optical and mechanical properties.', ar: 'التآكل والجروح والاتساخ تغيّر خواصه البصرية والميكانيكية.' },
    dustVuln: { en: 'Directly exposed — dust darkens it, raising solar absorptivity over time.', ar: 'معرض مباشرة — يغمّقه الغبار فيرفع امتصاصه الشمسي مع الوقت.' },
    protection: { en: 'Coatings, replaceable overboots and gauntlets, post-EVA brushing protocols.', ar: 'طلاءات، أحذية وقفازات خارجية قابلة للاستبدال، وبروتوكولات تنظيف بعد الخروج.' },
  },
  {
    id: 'helmet', name: { en: 'Helmet & Visor', ar: 'الخوذة والواقي البصري' }, layer: 5, color: '#D4A017',
    purpose: { en: 'Pressure shell with a gold-coated sun visor protecting eyes from glare and UV.', ar: 'هيكل ضغط بواقي شمسي مطلي بالذهب يحمي العينين من الوهج والأشعة فوق البنفسجية.' },
    physics: { en: 'Thin gold film reflects infrared and UV while passing visible light; shell carries pressure load.', ar: 'غشاء ذهب رقيق يعكس تحت الحمراء وفوق البنفسجية ويمرر الضوء المرئي؛ الهيكل يحمل الضغط.' },
    failure: { en: 'Scratched coating, fogging, or seal leak at the neck ring.', ar: 'خدش الطلاء، ضبابية، أو تسرب عند حلقة العنق.' },
    dustVuln: { en: 'Charged fines adhere to the visor; wiping causes micro-scratches.', ar: 'تلتصق الحبيبات المشحونة بالواقي؛ والمسح يسبب خدوشًا دقيقة.' },
    protection: { en: 'Sacrificial outer visors, covers, no dry wiping.', ar: 'واقٍ خارجي قابل للاستبدال، أغطية، ومنع المسح الجاف.' },
  },
  {
    id: 'gloves', name: { en: 'Gloves', ar: 'القفازات' }, layer: 5, color: '#B9C2D4',
    purpose: { en: 'Pressurized hand protection preserving grip and fingertip sensation.', ar: 'حماية يد مضغوطة تحافظ على القبضة وإحساس أطراف الأصابع.' },
    physics: { en: 'Internal pressure stiffens every finger flex — work against P·ΔV tires forearm muscles.', ar: 'الضغط الداخلي يقاوم كل انثناء إصبع — الشغل ضد P·ΔV يرهق عضلات الساعد.' },
    failure: { en: 'Fingertip wear, nail delamination, reduced dexterity when pressurized.', ar: 'تآكل أطراف الأصابع، انفصال الأظافر، وضعف البراعة عند الضغط.' },
    dustVuln: { en: 'Constant contact makes gloves the highest dust-loading suit component.', ar: 'التلامس المستمر يجعل القفازات أكثر مكونات البدلة تحميلًا للغبار.' },
    protection: { en: 'Reinforced palms, replaceable outer gloves, tool-handle coatings.', ar: 'راحات مقواة، قفازات خارجية قابلة للاستبدال، طلاءات لمقابض الأدوات.' },
  },
  {
    id: 'boots', name: { en: 'Boots', ar: 'الأحذية' }, layer: 5, color: '#7A8496',
    purpose: { en: 'Insulated, abrasion-tough footwear for regolith contact and thermal isolation.', ar: 'أحذية عازلة شديدة مقاومة التآكل لملامسة الريغوليث والعزل الحراري.' },
    physics: { en: 'Conduction barrier to hot/cold ground; tread geometry balances grip in loose powder.', ar: 'حاجز توصيل أمام الأرض الحارة/الباردة؛ هندسة النقش توازن التماسك في المسحوق المفكك.' },
    failure: { en: 'Sole abrasion and stitching wear from sharp grains.', ar: 'تآكل النعل والخياطة بفعل الحبيبات الحادة.' },
    dustVuln: { en: 'Boots kick up and carry the most dust of any suit element.', ar: 'الأحذية تثير وتحمل من الغبار أكثر من أي عنصر آخر في البدلة.' },
    protection: { en: 'Replaceable overboots, brushing station at the airlock.', ar: 'أحذية خارجية قابلة للاستبدال، محطة تنظيف عند غرفة العزل.' },
  },
  {
    id: 'joints', name: { en: 'Mobility Joints', ar: 'مفاصل الحركة' }, layer: 5, color: '#53D8E8',
    purpose: { en: 'Bearings and convolutes that let shoulders, wrists, hips and knees bend under pressure.', ar: 'محامل وثنيات تتيح انثناء الكتفين والمعصمين والوركين والركبتين تحت الضغط.' },
    physics: { en: 'Rolling bearings minimize torque from pressure loads; convolutes fold at near-constant volume.', ar: 'محامل دوارة تقلل عزم أحمال الضغط؛ الثنيات تنطوي بحجم شبه ثابت.' },
    failure: { en: 'Increased friction, restricted travel, bearing seizure.', ar: 'زيادة احتكاك، حركة مقيدة، وتوقف المحمل.' },
    dustVuln: { en: 'Grit in the race raises torque — Apollo suits showed measurable joint wear.', ar: 'الحبيبات في مجرى المحمل ترفع العزم — أبدت بدلات أبولو تآكلًا مقاسًا في المفاصل.' },
    protection: { en: 'Sealed/labyrinth bearings, dust-tolerant designs, solid lubricants.', ar: 'محامل مختومة/متاهية، تصاميم متحملة للغبار، مشحمات صلبة.' },
  },
  {
    id: 'plss', name: { en: 'Portable Life Support System', ar: 'نظام الإسناد الحيوي المحمول' }, layer: 5, color: '#9AA6BC',
    purpose: { en: 'The backpack: oxygen supply, CO₂ removal, cooling water loop, power and communications.', ar: 'الحقيبة الظهرية: إمداد أكسجين، إزالة CO₂، دورة ماء تبريد، طاقة واتصالات.' },
    physics: { en: 'Sublimator/heat exchanger rejects loop heat to vacuum; fans drive ventilation through the suit.', ar: 'مُسامٍ/مبادل حراري يطرد حرارة الدورة إلى الفراغ؛ مراوح تدفع التهوية عبر البدلة.' },
    failure: { en: 'Fan, pump, or scrubber fault limits EVA duration.', ar: 'عطل مروحة أو مضخة أو مزيل CO₂ يحد مدة الخروج.' },
    dustVuln: { en: 'External dust can foul connectors and radiative surfaces on the pack.', ar: 'قد يلوث الغبار الخارجي الوصلات والأسطح المشعة في الحقيبة.' },
    protection: { en: 'Covers on connectors, filtered vents, post-EVA cleaning.', ar: 'أغطية على الوصلات، فتحات مرشحة، وتنظيف بعد الخروج.' },
  },
];

export const suitPartById = (id: SuitPartId) => SUIT_PARTS.find(p => p.id === id)!;