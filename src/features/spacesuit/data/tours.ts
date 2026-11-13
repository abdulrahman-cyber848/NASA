// Guided tours (Voyager-style): a camera move plus narration per step.
// Tours are an editorial path through the reconstruction — they assert nothing
// beyond what the component database already labels.
import type { Mode } from './annotations';

export interface TourStep {
  component: string;
  /** camera position for this step (metres) */
  camera: [number, number, number];
  title: { en: string; ar: string };
  body: { en: string; ar: string };
}

export interface Tour {
  id: string;
  label: { en: string; ar: string };
  blurb: { en: string; ar: string };
  mode: Mode;
  steps: TourStep[];
}

const S = (
  component: string, camera: [number, number, number],
  tEn: string, tAr: string, bEn: string, bAr: string,
): TourStep => ({ component, camera, title: { en: tEn, ar: tAr }, body: { en: bEn, ar: bAr } });

export const TOURS: Tour[] = [
  {
    id: 'overview',
    label: { en: 'Tour the suit', ar: 'جولة في البدلة' },
    blurb: { en: 'A top-to-bottom walk through the major assemblies.', ar: 'جولة من الأعلى إلى الأسفل في المجموعات الرئيسية.' },
    mode: 'external',
    steps: [
      S('helmet-shell', [1.5, 2.1, 2.4], 'Start at the helmet', 'ابدأ من الخوذة',
        'Everything above the neck has to hold pressure, protect the eyes and still let a crew member see well enough to work. Two visors do that job: a clear bubble and a gold sun shade.',
        'كل ما فوق الرقبة يجب أن يحفظ الضغط ويحمي العينين ويترك رؤية كافية للعمل. واقيان يؤديان ذلك: فقاعة شفافة وظليل ذهبي.'),
      S('hut-shell', [2.2, 1.4, 2.2], 'The hard torso is the chassis', 'الجذع الصلب هو الهيكل',
        'The hard upper torso is what the rest of the suit hangs from. Shoulder bearings, arm attachments and the backpack all load into this one shell.',
        'الجذع العلوي الصلب هو ما تتعلق به بقية البدلة. محامل الكتف ومراكز الذراع والحقيبة تُحمَّل كلها في هذا الهيكل الواحد.'),
      S('glove-outer', [1.7, 0.9, 1.9], 'Gloves are the compromise', 'القفازات هي الموازنة',
        'A pressurized glove fights back every time you close your hand. Suit designers spend more effort here than almost anywhere else.',
        'القفاز المضغوط يقاومك في كل مرة تغلق يدك. يبذل مصممو البدلات جهدًا هنا أكثر من أي مكان آخر تقريبًا.'),
      S('lta-waist', [1.9, 0.75, 2.0], 'Bending at the waist', 'الانحناء عند الخصر',
        'Walking, kneeling and reaching all pass through the waist bearing. Keep the pressure boundary continuous while the torso twists against the legs.',
        'المشي والركوع والمدّ كلها تمر بمحمل الخصر. أبقِ حد الضغط متصلًا بينما يدور الجذع مقابل الساقين.'),
      S('boot-sole', [1.8, 0.35, 2.1], 'And it ends at the boot', 'وينتهي عند الحذاء',
        'One square inch of sole carries the whole mass of suit plus crew — in gravity one sixth of Earth\'s, over sharp regolith that never wears smooth.',
        'بوصة مربعة واحدة من النعل تحمل كتلة البدلة والرائد كلها — في جاذبية سُدس الأرض، فوق ريغوليث حاد لا يصقل أبدًا.'),
      S('hut-hatch', [-0.4, 1.35, -2.6], 'You get in from the back', 'تدخل من الخلف',
        'The rear-entry hatch is the quiet innovation: one big structural seal instead of many body seals. Fewer seals means fewer leak paths.',
        'فتحة الدخول الخلفية هي الابتكار الصامت: ختم إنشائي كبير بدل أختام جسم كثيرة. أختام أقل تعني مسارات تسرب أقل.'),
    ],
  },
  {
    id: 'layers',
    label: { en: 'Inside the layers', ar: 'داخل الطبقات' },
    blurb: { en: 'Peel the pressure garment down to the skin.', ar: 'انزع ثوب الضغط حتى الجلد.' },
    mode: 'internal',
    steps: [
      S('layer-outer', [2.0, 1.3, 2.2], 'The white outer shell', 'الغلاف الأبيض الخارجي',
        'This is the layer you photograph. It reflects sunlight, resists abrasion and takes the dust — everything underneath depends on it staying intact.',
        'هذه الطبقة التي تصورها. تعكس ضوء الشمس وتقاوم التآكل وتستقبل الغبار — كل ما تحتها يعتمد على بقائها سليمة.'),
      S('layer-insulation', [1.8, 1.25, 2.0], 'Insulation and micrometeoroid layers', 'طبقات العزل والنيازك الدقيقة',
        'Stacked reflective films cut radiative heat transfer; tough weaves break up tiny high-speed impacts. NASA documents up to about 16 layers in some pressure garments — the exact AxEMU stack is not public.',
        'أغشية عاكسة متراكمة تقلل الانتقال الحراري الإشعاعي؛ نسائج متينة تفتت الصدمات الدقيقة السريعة. توثق ناسا نحو 16 طبقة في بعض أثواب الضغط — عدد طبقات AxEMU الدقيق غير معلن.',
      ),
      S('layer-restraint', [1.6, 1.2, 1.8], 'The restraint carries the load', 'التقييد يحمل الحمل',
        'Pressure wants to turn the suit into a rigid balloon. The woven restraint layer takes that hoop stress so the suit keeps a shape a human can move in.',
        'الضغط يريد تحويل البدلة إلى بالون صلب. طبقة التقييد المنسوجة تتحمل ذلك الإجهاد الطوقي فتبقى البدلة بشكل يستطيع الإنسان الحركة فيه.'),
      S('layer-bladder', [1.4, 1.15, 1.6], 'Then the gas-tight bladder', 'ثم غشاء الغاز',
        'Only this thin membrane is actually airtight. It works because it never has to be strong — only leak-free.',
        'هذا الغشاء الرقيق وحده محكم ضد الغاز. يعمل لأنه ليس مطالبًا بالقوة — فقط بعدم التسرب.'),
      S('layer-lcvg', [1.2, 1.0, 1.4], 'Cooling tubes against the skin', 'أنابيب التبريد على الجلد',
        'Metabolic heat leaves the body through water in these tubes. Without them a working astronaut overheats in minutes, even in vacuum.',
        'تخرج الحرارة الأيضية من الجسم عبر الماء في هذه الأنابيب. بدونها يرتفع حرارة الرائد العامل في دقائق حتى في الفراغ.'),
    ],
  },
  {
    id: 'plss',
    label: { en: 'Life support', ar: 'إسناد الحياة' },
    blurb: { en: 'Inside the backpack, subsystem by subsystem.', ar: 'داخل الحقيبة، نظامًا نظامًا.' },
    mode: 'internal',
    steps: [
      S('plss-o2', [0.9, 1.5, -2.4], 'Oxygen storage', 'تخزين الأكسجين',
        'High-pressure oxygen feeds the whole circuit. It has to be regulated down before it ever reaches the crew.',
        'أكسجين عالي الضغط يغذي الدورة كلها. يجب تنظيمه قبل أن يصل إلى الطاقم.'),
      S('plss-fan', [0.6, 1.45, -2.0], 'Ventilation moves the gas', 'التهوية تحرك الغاز',
        'A fan keeps gas circulating so carbon dioxide and moisture are carried away from the face to the scrubber.',
        'مروحة تبقي الغاز متدفقًا فيُحمل ثاني أكسيد الكربون والرطوبة عن الوجه إلى المزيل.'),
      S('plss-co2', [0.4, 1.25, -1.8], 'Scrubbing carbon dioxide', 'إزالة ثاني أكسيد الكربون',
        'Exhaled CO₂ is chemically removed from the loop. When the bed saturates, the EVA is over regardless of how much oxygen is left.',
        'يُزال ثاني أكسيد الكربون الزفيري كيميائيًا من الدورة. عند تشبع الوسط ينتهي الخروج مهما بقي من أكسجين.'),
      S('plss-water', [0.2, 1.05, -1.6], 'The cooling water loop', 'دورة ماء التبريد',
        'Water picks up body heat in the garment and carries it out to be rejected. This is the loop that keeps a human alive in a sealed bag.',
        'يلتقط الماء حرارة الجسم من الثوب ويحملها ليُطرد. هذه الدورة التي تُبقي إنسانًا حيًا في كيس محكم.'),
      S('plss-power', [0.1, 0.95, -1.5], 'Batteries and radio', 'البطاريات والراديو',
        'Fans, pumps, comms and telemetry all run from the backpack. Dust on its connectors raises resistance and quietly degrades every one of them.',
        'المراوح والمضخات والاتصال والقياس تعمل كلها من الحقيبة. الغبار على وصلاتها يرفع المقاومة ويوهن كل واحدة بصمت.'),
    ],
  },
  {
    id: 'dust',
    label: { en: 'The dust problem', ar: 'مشكلة الغبار' },
    blurb: { en: 'Where regolith attacks the suit, zone by zone.', ar: 'أين يهاجم الريغوليث البدلة، منطقة منطقة.' },
    mode: 'dust',
    steps: [
      S('boot-sole', [1.6, 0.35, 2.0], 'It starts at the boot', 'يبدأ من الحذاء',
        'Boots kick up and carry more dust than any other part of the suit. Everything that fails later starts with grains picked up here.',
        'الأحذية تثير وتحمل من الغبار أكثر من أي جزء آخر. كل ما يفشل لاحقًا يبدأ بحبيبات التُقطت هنا.'),
      S('leg-knee', [1.5, 0.5, 1.8], 'Then it works upward', 'ثم يعمل صعودًا',
        'Kneeling grinds grains into the knee convolute. Flex cycles then work them deeper into the fabric.',
        'الركوع يجرّ الحبيبات في ثنية الركبة. ثم تعمل دورات الانثناء على دفعها أعمق في النسيج.'),
      S('hut-shoulder', [1.4, 1.4, 1.7], 'Bearings are the weak point', 'المحامل نقطة الضعف',
        'Grit in a bearing race raises friction torque permanently. Apollo suit joints showed measurable wear after their missions.',
        'الحبيبات في مجرى المحمل ترفع عزم الاحتكاك بشكل دائم. أظهرت مفاصل بدلات أبولو تآكلًا مقاسًا بعد مهامها.'),
      S('helmet-visor', [1.2, 1.7, 1.6], 'And finally the visor', 'وأخيرًا الواقي البصري',
        'Charged fines cling to the visor and scatter light. Wiping them off dry drags them across the coating and scratches it — which is worse.',
        'تلتصق الدقائق المشحونة بالواقي وتشتت الضوء. مسحها جافًا يجرّها فوق الطلاء ويخدشه — وهذا أسوأ.',
      ),
      S('helmet-seal', [0.9, 1.45, 1.4], 'The risk that matters most', 'الخطر الأهم',
        'A single grain holding a seal open is a pressure-leak path. Loss of suit pressure is life-threatening — never an acceptable outcome.',
        'حبة واحدة تُبقي الختم مفتوحًا تكفي لمسار تسرب ضغط. فقدان ضغط البدلة يهدد الحياة — وليس نتيجة مقبولة أبدًا.'),
    ],
  },
];

export const tourById = (id: string) => TOURS.find(t => t.id === id);