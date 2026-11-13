// LunaNav landmark dataset.
// Coordinates and diameters: IAU Gazetteer of Planetary Nomenclature (planetocentric,
// east-positive selenographic degrees). Only well-established values are included.

export type LandmarkType = 'crater' | 'mare' | 'mountain' | 'rille' | 'basin';
export type Equipment = 'eye' | 'binoculars' | 'telescope';

export interface Landmark {
  id: string;
  name: string;
  nameAr: string;
  type: LandmarkType;
  lat: number;
  lon: number;
  diameterKm: number;
  /** Recommended equipment for a satisfying view — NOT a geometric visibility limit. */
  minEquipment: Equipment;
  description: string;
  descriptionAr: string;
  significance: string;
  significanceAr: string;
  sourceNote: string;
}

const IAU = 'IAU Gazetteer of Planetary Nomenclature';

export const LANDMARKS: Landmark[] = [
  {
    id: 'tycho', name: 'Tycho', nameAr: 'فوهة تيكو', type: 'crater',
    lat: -43.31, lon: -11.36, diameterKm: 85, minEquipment: 'binoculars',
    description: 'A young, sharp-rimmed impact crater about 108 million years old, 4.8 km deep, with a central peak. Its bright ray system spreads over 1,500 km and is obvious to the naked eye near Full Moon.',
    descriptionAr: 'فوهة صدمية شابة حادة الحواف يبلغ عمرها نحو 108 ملايين سنة وعمقها 4.8 كم، تتوسطها قمة مركزية. يمتد نظام أشعتها الساطعة أكثر من 1500 كم ويُرى بالعين المجردة قرب البدر.',
    significance: 'One of the youngest large craters on the Moon; Surveyor 7 landed on its northern rim in 1968.',
    significanceAr: 'من أحدث الفوهات الكبيرة على القمر؛ هبطت مركبة سيرفيور 7 قرب حافتها الشمالية عام 1968.',
    sourceNote: IAU,
  },
  {
    id: 'kepler', name: 'Kepler', nameAr: 'فوهة كبلر', type: 'crater',
    lat: 8.12, lon: -38.01, diameterKm: 31, minEquipment: 'telescope',
    description: 'A crisp, bowl-shaped crater between Oceanus Procellarum and Mare Insularum, surrounded by a bright ray system that overlaps rays from Copernicus.',
    descriptionAr: 'فوهة واضحة المعالم بين محيط العواصف وبحر الجزر، تحيط بها أشعة ساطعة تتداخل مع أشعة كوبرنيكوس.',
    significance: 'Named for Johannes Kepler; its rays make it easy to locate even in small instruments.',
    significanceAr: 'سُمّيت تكريمًا ليوهانس كبلر؛ أشعتها الساطعة تسهّل العثور عليها حتى بأجهزة صغيرة.',
    sourceNote: IAU,
  },
  {
    id: 'copernicus', name: 'Copernicus', nameAr: 'فوهة كوبرنيكوس', type: 'crater',
    lat: 9.62, lon: -20.08, diameterKm: 93, minEquipment: 'binoculars',
    description: 'The archetype of a complex crater: terraced walls, a cluster of central peaks and a blanket of ejecta. Near the terminator its floor is still shadowed while the rim catches sunrise.',
    descriptionAr: 'النموذج الأمثل للفوهات المعقدة: جدران مدرّجة وقمم مركزية وغطاء من المقذوفات. قرب خط الشروق يظل قاعها مظلمًا بينما تضيء الشمس حافتها.',
    significance: 'About 800 million years old; material from its impact was sampled by Apollo 12.',
    significanceAr: 'يبلغ عمرها نحو 800 مليون سنة؛ جمعت بعثة أبولو 12 عينات من مقذوفاتها.',
    sourceNote: IAU,
  },
  {
    id: 'clavius', name: 'Clavius', nameAr: 'فوهة كلافيوس', type: 'crater',
    lat: -58.38, lon: -14.41, diameterKm: 225, minEquipment: 'telescope',
    description: 'One of the largest crater formations on the near side, an ancient walled plain in the southern highlands with a graceful arc of smaller craters curving across its floor.',
    descriptionAr: 'من أضخم التكوينات الفوهية على الوجه القريب، سهل قديم مسوّر في المرتفعات الجنوبية يعبر قاعه قوس أنيق من الفوهات الأصغر.',
    significance: 'A classic test of small telescopes: resolving the craterlet chain Clavius D–C–N–J.',
    significanceAr: 'اختبار كلاسيكي للتلسكوبات الصغيرة: تمييز سلسلة الفوهات داخلها.',
    sourceNote: IAU,
  },
  {
    id: 'aristarchus', name: 'Aristarchus', nameAr: 'فوهة أريستارخوس', type: 'crater',
    lat: 23.73, lon: -47.49, diameterKm: 40, minEquipment: 'binoculars',
    description: 'The brightest large feature on the Moon, a deep terraced crater on the Aristarchus Plateau. So reflective it can be glimpsed in earthshine on the dark limb.',
    descriptionAr: 'ألمع المعالم الكبيرة على القمر، فوهة عميقة مدرّجة على هضبة أريستارخوس. شديدة الانعكاس حتى يمكن لمحها في ضوء الأرض على الجانب المظلم.',
    significance: 'A hotspot for reported transient lunar phenomena; beside Schröter’s Valley, the Moon’s largest sinuous rille.',
    significanceAr: 'موقع متكرر لتقارير عن ظواهر قمرية عابرة؛ تجاورها وادي شروتر، أكبر الأخاديد المتعرجة على القمر.',
    sourceNote: IAU,
  },
  {
    id: 'plato', name: 'Plato', nameAr: 'فوهة أفلاطون', type: 'crater',
    lat: 51.62, lon: -9.38, diameterKm: 101, minEquipment: 'telescope',
    description: 'A dark, lava-flooded ring on the northern shore of Mare Imbrium. Its smooth basalt floor contrasts sharply with the bright Alps nearby when the Sun is low.',
    descriptionAr: 'حلقة داكنة غمرتها الحمم على الشاطئ الشمالي لبحر الأمطار. يتناقض قاعها البازلتي الأملس بحدّة مع جبال الألب القمرية الساطعة عندما تكون الشمس منخفضة.',
    significance: 'A favourite target for craterlet hunters and historic studies of transient phenomena.',
    significanceAr: 'هدف مفضل لهواة اقتناص الفوهات الصغيرة والدراسات التاريخية للظواهر العابرة.',
    sourceNote: IAU,
  },
  {
    id: 'mare-tranquillitatis', name: 'Mare Tranquillitatis', nameAr: 'بحر الهدوء', type: 'mare',
    lat: 8.5, lon: 31.4, diameterKm: 873, minEquipment: 'eye',
    description: 'The Sea of Tranquility: a vast basalt plain, slightly bluish in enhanced color, where humanity first walked on another world.',
    descriptionAr: 'بحر الهدوء: سهل بازلتي شاسع يميل لونه إلى الزرقة في الصور المعززة، حيث وطئت أقدام البشرية عالمًا آخر لأول مرة.',
    significance: 'Apollo 11 landing site (July 20, 1969) lies in its southwestern region.',
    significanceAr: 'في منطقته الجنوبية الغربية يقع موقع هبوط أبولو 11 في 20 يوليو 1969.',
    sourceNote: IAU,
  },
  {
    id: 'mare-serenitatis', name: 'Mare Serenitatis', nameAr: 'بحر الصفاء', type: 'mare',
    lat: 28.0, lon: 17.5, diameterKm: 674, minEquipment: 'eye',
    description: 'The Sea of Serenity, a nearly circular lava plain bordered by mountain ranges, with a lighter interior crossed by a subtle wrinkle ridge and dark outer basalt rings.',
    descriptionAr: 'بحر الصفاء، سهل حممي شبه دائري تحيط به سلاسل جبلية، يتميز بقلب أفتح تعبره تجعدات دقيقة وحلقات بازلتية داكنة عند أطرافه.',
    significance: 'Apollo 17 explored its eastern rim — the last crewed lunar landing to date (1972).',
    significanceAr: 'استكشفت أبولو 17 حافته الشرقية — آخر هبوط بشري على القمر حتى اليوم (1972).',
    sourceNote: IAU,
  },
  {
    id: 'mare-imbrium', name: 'Mare Imbrium', nameAr: 'بحر الأمطار', type: 'mare',
    lat: 32.8, lon: -15.6, diameterKm: 1146, minEquipment: 'eye',
    description: 'The Sea of Rains fills a giant impact basin about 3.9 billion years old, ringed by the Apennine, Caucasus and Alps mountains — spectacular relief near the terminator.',
    descriptionAr: 'يملأ بحر الأمطار حوض صدمة عملاقًا عمره نحو 3.9 مليار سنة، وتطوقه جبال الأبينيني والقوقاز والألب — تضاريس مبهرة قرب خط الشروق.',
    significance: 'The Apennine front is the Moon’s most dramatic mountain scarp; Apollo 15 landed at its foot.',
    significanceAr: 'جبهة الأبينيني أكثر المنحدرات الجبلية إثارة على القمر؛ هبطت أبولو 15 عند سفحها.',
    sourceNote: IAU,
  },
  {
    id: 'mare-vaporum', name: 'Mare Vaporum', nameAr: 'بحر البخار', type: 'mare',
    lat: 13.3, lon: 3.6, diameterKm: 245, minEquipment: 'binoculars',
    description: 'The Sea of Vapors, a small dark patch of old lava just south of the Apennines, almost at the center of the near side. The delicate Hyginus Rille cuts nearby terrain.',
    descriptionAr: 'بحر البخار، رقعة داكنة صغيرة من الحمم القديمة جنوب جبال الأبينيني، تكاد تتوسط الوجه القريب. يشق التضاريس المجاورة أخدود هيغينوس الدقيق.',
    significance: 'The first mare named by Giovanni Riccioli in his 1651 lunar map.',
    significanceAr: 'أول "بحر" يمنحه اسمَه جيوفاني ريتشيولي في خريطته القمرية عام 1651.',
    sourceNote: IAU,
  },
  {
    id: 'mare-crisium', name: 'Mare Crisium', nameAr: 'بحر الأزمات', type: 'mare',
    lat: 17.0, lon: 59.1, diameterKm: 556, minEquipment: 'eye',
    description: 'The Sea of Crises: an isolated oval basalt plain near the eastern limb, clearly separated from the other maria. Libration tips it toward or away from us each month.',
    descriptionAr: 'بحر الأزمات: سهل بازلتي بيضاوي معزول قرب الحافة الشرقية، منفصل بوضوح عن بقية البحار. يُظهره التأرجح الشهري تارة أقرب إلينا وتارة أبعد.',
    significance: 'Luna 24 returned the last Soviet sample from here in 1976; a favorite libration indicator.',
    significanceAr: 'أعادت لونا 24 آخر عينة سوفيتية من هنا عام 1976؛ مؤشر مفضل لرصد التأرجح القمري.',
    sourceNote: IAU,
  },
  {
    id: 'oceanus-procellarum', name: 'Oceanus Procellarum', nameAr: 'محيط العواصف', type: 'mare',
    lat: 18.4, lon: -57.4, diameterKm: 2568, minEquipment: 'eye',
    description: 'The Ocean of Storms — the only "ocean" on the Moon, a sprawling dark expanse over 2,500 km across covering much of the western near side.',
    descriptionAr: 'محيط العواصف — "المحيط" الوحيد على القمر، امتداد داكن شاسع يتجاوز 2500 كم يغطي معظم الجهة الغربية من الوجه القريب.',
    significance: 'Landing region of Luna 9 (first soft landing, 1966), Surveyor 1 and Chang’e 5 (2020 samples).',
    significanceAr: 'منطقة هبوط لونا 9 (أول هبوط سلس، 1966) وسيرفيور 1 وتشانغ آه 5 (عينات 2020).',
    sourceNote: IAU,
  },
];

export function landmarkById(id: string): Landmark | undefined {
  return LANDMARKS.find(l => l.id === id);
}

export const EQUIPMENT_ORDER: Record<Equipment, number> = { eye: 0, binoculars: 1, telescope: 2 };