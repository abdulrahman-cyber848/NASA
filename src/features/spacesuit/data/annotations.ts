// Spatially anchored annotations (Smithsonian/Voyager pattern).
// Anchors are in the same world space as the reconstructed suit geometry and
// were placed against the reference reconstruction, NOT against any CAD model.
import type { Bi } from './axemu';

export interface Annotation {
  id: string;
  /** world-space anchor on the suit surface (metres) */
  anchor: [number, number, number];
  /** label offset direction so the card reads away from the body */
  dir: [number, number, number];
  title: Bi;
  body: Bi;
  /** which component this annotation selects */
  component: string;
  /** visible in these modes */
  modes: Mode[];
}

export type Mode = 'external' | 'internal' | 'exploded' | 'cross' | 'dust';

export const MODES: { id: Mode; label: Bi; hint: Bi }[] = [
  { id: 'external', label: { en: 'External Inspection', ar: 'فحص خارجي' }, hint: { en: 'The original Smithsonian Armstrong A7-L scan, with spatially anchored annotations.', ar: 'مسح سميثسونيان الأصلي لبدلة أرمسترونغ A7-L، مع تعليقات مثبتة مكانيًا.' } },
  { id: 'internal', label: { en: 'Internal Inspection', ar: 'فحص داخلي' }, hint: { en: 'The same scan remains visible; internal arrangements are not present in this merged surface.', ar: 'يبقى المسح نفسه ظاهرًا؛ الترتيبات الداخلية غير موجودة في هذا السطح المدمج.' } },
  { id: 'exploded', label: { en: 'Exploded Assembly', ar: 'تجميع مفكك' }, hint: { en: 'The scanned A7-L is one merged surface and cannot be separated into authentic assemblies.', ar: 'مسح A7-L سطح مدمج واحد ولا يمكن فصله إلى تجميعات أصلية.' } },
  { id: 'cross', label: { en: 'Cross-Section', ar: 'مقطع عرضي' }, hint: { en: 'A clipping plane cuts the same scan; hidden internal layers are not part of the mesh.', ar: 'يقطع مستوى القص المسح نفسه؛ الطبقات الداخلية المخفية ليست جزءًا من الشبكة.' } },

  { id: 'dust', label: { en: 'Dust Exposure', ar: 'تعرض للغبار' }, hint: { en: 'Regolith grains strike the real scan; accumulation is graphical, not a validated deposition model.', ar: 'حبيبات الريغوليث تصطدم بالمسح الأصلي؛ التراكم رسومي وليس نموذج ترسب مُتحققًا منه.' } },
];

const A = (
  id: string, component: string, anchor: [number, number, number], dir: [number, number, number],
  tEn: string, tAr: string, bEn: string, bAr: string, modes: Mode[],
): Annotation => ({ id, component, anchor, dir, title: { en: tEn, ar: tAr }, body: { en: bEn, ar: bAr }, modes });

export const ANNOTATIONS: Annotation[] = [
  // ---- helmet ----
  A('an-visor', 'helmet-visor', [0, 1.7, 0.28], [0.35, 0.25, 1],
    'Protective sun visor', 'الواقي الشمسي',
    'A metallic coating reflects infrared and ultraviolet light while passing enough visible light to work by. Dragged down over the clear pressure bubble, it is the suit\'s sunglasses.',
    'يعكس طلاء معدني تحت الحمراء وفوق البنفسجية ويمرر ضوءًا مرئيًا كافيًا للعمل. يُسحب فوق فقاعة الضغط الشفافة فيعمل كنظارة شمس البدلة.',
    ['external', 'exploded']),
  A('an-bubble', 'helmet-shell', [0, 1.72, -0.15], [-0.6, 0.3, -1],
    'Pressure helmet bubble', 'فقاعة خوذة الضغط',
    'The transparent shell holds breathing pressure around the head. Its near-spherical shape spreads the pressure load evenly, so the wall can stay thin and light.',
    'يحفظ الهيكل الشفاف ضغط التنفس حول الرأس. شكله شبه الكروي يوزع حمل الضغط بانتظام فيبقى الجدار رقيقًا وخفيفًا.',
    ['external', 'internal', 'exploded']),
  A('an-neck', 'helmet-seal', [0, 1.44, 0.14], [0.5, -0.2, 1],
    'Neck disconnect & seal', 'وصلة وختم العنق',
    'A locking ring and elastomer seal join the helmet to the hard torso. Any grain of dust held in this seal can open a leak path, so the faces are covered until mating.',
    'حلقة قفل وختم مطاطي يصلان الخوذة بالجذع الصلب. أي حبة غبار داخل هذا الختم قد تفتح مسار تسرب، لذا تُغطى الأوجه حتى التعشيق.',
    ['external', 'exploded', 'dust']),
  // ---- torso ----
  A('an-hatch', 'hut-hatch', [0, 1.16, -0.44], [0, 0.35, -1],
    'Rear-entry hatch', 'فتحة الدخول الخلفية',
    'AxEMU crews climb in from behind and seal against the backpack. One large structural seal replaces a set of body seals, cutting leak paths and donning time.',
    'يدخل الطاقم من الخلف ويُحكم على الحقيبة. ختم إنشائي كبير واحد يستبدل مجموعة أختام الجسم فيقلل مسارات التسرب وزمن الارتداء.',
    ['external', 'exploded']),
  A('an-hut', 'hut-shell', [0.3, 1.2, 0.2], [1, 0.35, 1],
    'Hard upper torso', 'الجذع العلوي الصلب',
    'The rigid composite shell is the suit\'s chassis. It carries the shoulder bearings, the arm attachments and the backpack loads so the soft garments can stay flexible.',
    'الهيكل المركب الصلب هو هيكل البدلة. يحمل محامل الكتف ومراكز الذراع وأحمال الحقيبة لتبقى الثياب اللينة مرنة.',
    ['external', 'internal', 'exploded']),
  A('an-cm', 'hut-shell', [0, 1.05, 0.36], [0, -0.25, 1],
    'Chest control module', 'وحدة التحكم الصدرية',
    'Valves and displays on the chest let a crew member check pressure, switch fans and manage cooling without seeing the backpack.',
    'صمامات وشاشات على الصدر تتيح للرائد فحص الضغط وتبديل المراوح وإدارة التبريد دون رؤية الحقيبة.',
    ['external']),
  A('an-shoulder', 'hut-shoulder', [0.42, 1.4, 0.05], [1, 0.5, 0.4],
    'Shoulder bearing', 'محمل الكتف',
    'A rolling bearing lets the whole arm swing while the joint stays sealed. Apollo suits showed measurable wear here — grit in the race raises the torque needed to move.',
    'محمل دوار يتيح تأرجح الذراع كاملة مع بقاء المفصل محكمًا. أظهرت بدلات أبولو تآكلًا مقاسًا هنا — الحبيبات في المجاري ترفع العزم اللازم للحركة.',
    ['external', 'exploded', 'dust']),
  // ---- arms / gloves ----
  A('an-elbow', 'arm-elbow', [0.56, 0.98, 0.08], [1, 0, 1],
    'Elbow convolute', 'ثنية المرفق',
    'A folding fabric convolute bends at nearly constant volume, so bending does not have to compress a large volume of breathing gas. Less P·ΔV work means less fatigue.',
    'ثنية قماشية تنطوي بحجم شبه ثابت، فلا يتطلب الانثناء ضغط حجم كبير من الغاز. شغل أقل يعني إرهاقًا أقل.',
    ['external', 'exploded']),
  A('an-glove', 'glove-outer', [0.68, 0.56, 0.2], [1, -0.2, 1],
    'Pressure glove', 'قفاز الضغط',
    'The hardest working part of the suit. Every finger bend works against internal pressure, so glove design is a direct trade between protection and how long you can work before your hands tire.',
    'أكثر أجزاء البدلة عملًا. كل انثناء إصبع يعمل ضد الضغط الداخلي، لذا تصميم القفاز موازنة مباشرة بين الحماية وطول مدة العمل قبل تعب اليدين.',
    ['external', 'exploded', 'dust']),
  // ---- lower ----
  A('an-waist', 'lta-waist', [0, 0.74, 0.16], [0, 0, 1],
    'Waist bearing', 'محمل الخصر',
    'Bending to pick up a sample means the torso rotates against the legs. The waist bearing and hip convolutes carry that motion while keeping the pressure boundary continuous.',
    'الانحناء لأخذ عينة يعني دوران الجذع مقابل الساقين. محمل الخصر وثنيات الورك ينقلان الحركة مع بقاء حد الضغط متصلًا.',
    ['external', 'exploded']),
  A('an-knee', 'leg-knee', [0.16, 0.36, 0.1], [0.4, 0, 1],
    'Knee joint', 'مفصل الركبة',
    'Kneeling on regolith puts the knee convolute straight into the dust, so this joint gets both abrasion and flex wear at once.',
    'الركوع على الريغوليث يضع ثنية الركبة مباشرة في الغبار، فيجمع هذا المفصل التآكل وانثناء الحركة معًا.',
    ['external', 'exploded', 'dust']),
  A('an-boot', 'boot-sole', [0.15, 0.02, 0.2], [0.3, -0.5, 1],
    'Lunar boot & tread', 'الحذاء القمري ونقشه',
    'The sole is the only part that ever touches the ground. Tread geometry has to grip loose powder, insulate against hot and cold regolith, and survive constant abrasion.',
    'النعل هو الجزء الوحيد الذي يلامس الأرض. يجب أن توازن هندسة النقش التماسك في المسحوق المفكك، والعزل عن الريغوليث الحار والبارد، ومقاومة التآكل المستمر.',
    ['external', 'exploded', 'dust']),
  // ---- PLSS ----
  A('an-plss', 'hut-hatch', [0, 1.28, -0.6], [0, 0.4, -1],
    'PLSS backpack', 'حقيبة الإسناد الحيوي',
    'Everything the suit needs to stay alive: oxygen storage and regulation, ventilation, CO₂ removal, the cooling water loop, heat rejection, batteries and radio. In cutaway mode each subsystem is selectable.',
    'كل ما تحتاجه البدلة لبقاء حي: تخزين الأكسجين وتنظيمه، التهوية، إزالة CO₂، دورة ماء التبريد، طرد الحرارة، البطاريات والراديو. في وضع المقطع يمكن اختيار كل نظام.',
    ['external', 'internal', 'exploded']),
  A('an-sub', 'plss-heat', [0, 1.55, -0.66], [0, 0.5, -1],
    'Heat rejection', 'طرد الحرارة',
    'In vacuum there is no air to carry heat away, so the loop dumps energy by sublimating water or by radiating infrared. Dust on these surfaces quietly ruins their performance.',
    'في الفراغ لا هواء يحمل الحرارة، فتطرد الدورة الطاقة بتسامٍ الماء أو بالإشعاع تحت الأحمر. الغبار على هذه الأسطح يفسد أدائها بصمت.',
    ['internal', 'exploded', 'dust']),
  // ---- internal ----
  A('an-lcvg', 'layer-lcvg', [0, 0.95, 0.2], [0.4, 0, 1],
    'Cooling garment tubes', 'أنابيب ثوب التبريد',
    'Water circulates through tubing sewn against the skin, picking up metabolic heat and carrying it to the backpack. It is the only reason an astronaut can work hard for hours.',
    'يدور الماء عبر أنابيب مخيطة على الجلد، فيلتقط الحرارة الأيضية ويحملها إلى الحقيبة. هو السبب الوحيد لقدرة الرائد على العمل ساعات.',
    ['internal', 'cross', 'exploded']),
  A('an-bladder', 'layer-bladder', [0, 1.3, 0.22], [0.5, 0.2, 1],
    'Pressure bladder', 'غشاء الضغط',
    'The gas-tight membrane that actually holds the air. Restraint fabric outside it carries the structural load so the thin bladder is never asked to be strong.',
    'الغشاء المانع للغاز الذي يحفظ الهواء فعليًا. نسيج التقييد خارجه يحمل الحمل الإنشائي فلا يُطلب من الغشاء الرقيق أن يكون قويًا.',
    ['internal', 'cross']),
];

export const annotationsFor = (m: Mode) => ANNOTATIONS.filter(a => a.modes.includes(m));
export const annotationFor = (id: string) => ANNOTATIONS.find(a => a.id === id);
// ---------------------------------------------------------------------------
// Annotations for the REAL Smithsonian Armstrong A7-L scan.
// The A7-L is a soft Apollo suit: it has NO hard upper torso and NO rear-entry
// hatch (those are AxEMU/EMU features). Anchors below are in the fitted display
// space (suit stands on y=0, 1.8 m tall) measured against the scan geometry.
// Facts follow Smithsonian/NASM and NASA Apollo A7-L documentation.
// ---------------------------------------------------------------------------
export const SCAN_ANNOTATIONS: Annotation[] = [
  A('scan-leva', 'helmet-visor', [0.02, 1.62, 0.30], [0.5, 0.35, 1],
    'Gold-coated visor (LEVA)', 'الواقي الذهبي (LEVA)',
    'The Lunar Extravehicular Visor Assembly sits over the pressure helmet. Its thin gold coating reflects infrared and ultraviolet light while passing enough visible light to work by — the reason Apollo visors look like mirrors.',
    'مجموعة الواقي للخروج القمري تُركَّب فوق خوذة الضغط. طلاؤها الذهبي الرقيق يعكس تحت الحمراء وفوق البنفسجية ويمرر ضوءًا مرئيًا كافيًا للعمل — لهذا تبدو واقيات أبولو كالمرآة.',
    ['external', 'dust']),
  A('scan-neckring', 'helmet-seal', [0, 1.42, 0.16], [-0.55, 0.1, 1],
    'Helmet neck ring', 'حلقة العنق',
    'A machined metal ring locks the helmet to the soft torso and carries the pressure seal. Unlike later suits, the A7-L torso itself is flexible fabric, not a rigid shell.',
    'حلقة معدنية مشغّلة تقفل الخوذة على الجذع اللين وتحمل ختم الضغط. بخلاف البدلات الأحدث، جذع A7-L نفسه نسيج مرن وليس هيكلًا صلبًا.',
    ['external', 'dust']),
  A('scan-connectors', 'hut-shell', [0.02, 1.14, 0.34], [0.6, 0.05, 1],
    'Water & gas connectors', 'وصلات الماء والغاز',
    'The blue and red fittings on the chest connect the suit to the Portable Life Support System: oxygen in, and cooling water circulating through tubes sewn into the undergarment.',
    'الوصلات الزرقاء والحمراء على الصدر تصل البدلة بنظام الإسناد الحيوي المحمول: أكسجين داخل، وماء تبريد يدور في أنابيب مخيطة في الثوب الداخلي.',
    ['external', 'dust']),
  A('scan-layers', 'layer-outer', [0.26, 0.98, 0.26], [1, 0.1, 0.7],
    '21-layer pressure garment', 'ثوب ضغط من 21 طبقة',
    'Armstrong\'s A7-L was built by ILC Dover from 21 layers of nylon, neoprene and Mylar. The Smithsonian\'s conservation study documented that stack — it is specific to this Apollo garment, not to AxEMU.',
    'بدلة أرمسترونغ A7-L صنعتها ILC Dover من 21 طبقة من النايلون والنيوبرين والمايلر. دراسة الحفظ في سميثسونيان وثّقت تلك الكومة — وهي خاصة بهذه البدلة الأبولوجية وليست AxEMU.',
    ['external', 'dust']),
  A('scan-glove', 'glove-outer', [0.40, 0.70, 0.12], [1, -0.15, 0.8],
    'Lunar glove', 'القفاز القمري',
    'Apollo gloves used Chromel-R — a woven nickel-chromium metal fabric — over the fingertips and back to resist abrasion from sharp regolith. Even so, Armstrong and Aldrin reported fingernail-level fatigue and worn fingertips.',
    'استخدمت قفازات أبولو نسيج Chromel-R المعدني المنسوج من النيكل والكروم فوق أطراف الأصابع والظهر لمقاومة تآكل الريغوليث الحاد. ومع ذلك أبلغ أرمسترونغ وألدرين عن إرهاق وتآكل في أطراف الأصابع.',
    ['external', 'dust']),
  A('scan-overshoe', 'boot-sole', [0.16, 0.09, 0.20], [0.5, -0.45, 1],
    'Lunar overshoe', 'الحذاء القمري الخارجي',
    'A separate silicone-rubber-soled overshoe was worn over the pressure boot. Its ribbed tread made the bootprints still visible in the regolith — the sole that touched another world.',
    'حذاء خارجي بنعل مطاط سيليكوني منفصل يُلبس فوق حذاء الضغط. نقشه المضلّع صنع آثار الأقدام ما تزال مرئية في الريغوليث — النعل الذي لمس عالمًا آخر.',
    ['external', 'dust']),
  A('scan-dust', 'layer-dust', [-0.24, 0.55, 0.24], [-1, -0.1, 0.8],
    'Dust still in the fabric', 'غبار ما زال في النسيج',
    'Smithsonian conservators deliberately did NOT remove the lunar dust embedded in the outer Beta cloth — it is part of the artifact\'s history and evidence of where it has been.',
    'حافظو سميثسونيان تعمّدوا عدم إزالة الغبار القمري المتغلغل في قماش بيتا الخارجي — فهو جزء من تاريخ القطعة ودليل على أين كانت.',
    ['external', 'dust']),
];

/** Annotations appropriate to the model actually on screen. */
export function annotationsForMode(mode: Mode, usingScan: boolean): Annotation[] {
  const pool = usingScan ? SCAN_ANNOTATIONS : ANNOTATIONS;
  return pool.filter(a => a.modes.includes(mode));
}
