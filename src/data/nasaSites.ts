// LunaNav — NASA Daily Moon Guide lunar location dataset.
// Reference: https://science.nasa.gov/moon/daily-moon-guide/ (rendered site,
// "View All" site list, retrieved live from science.nasa.gov).
// Coordinates: IAU Gazetteer of Planetary Nomenclature (planetocentric,
// east-positive), cross-checked against Gazetteer feature pages.
//
// confidence:
//   iau        — IAU Gazetteer center coordinates
//   verified   — well-established published value, cross-checked this session
//   reference  — commonly used regional/approximate center (non-IAU informal name)

export type SiteType =
  | 'crater' | 'mare' | 'mountain' | 'rille' | 'basin'
  | 'highlands' | 'valley' | 'landing' | 'dome' | 'scarp';
export type Confidence = 'iau' | 'verified' | 'reference';

export interface MoonSite {
  id: string;
  name: string;
  nameAr: string;
  type: SiteType;
  lat: number;
  lon: number;
  diameterKm: number;
  minEquipment: 'eye' | 'binoculars' | 'telescope';
  description: string;
  descriptionAr: string;
  significance: string;
  significanceAr: string;
  sourceNote: string;
  confidence: Confidence;
  iauId?: number;
}

const GZ = 'IAU Gazetteer of Planetary Nomenclature';
const S = (
  id: string, name: string, nameAr: string, type: SiteType, lat: number, lon: number,
  diameterKm: number, minEquipment: MoonSite['minEquipment'], confidence: Confidence,
  description: string, descriptionAr: string, significance: string, significanceAr: string,
  iauId?: number,
): MoonSite => ({ id, name, nameAr, type, lat, lon, diameterKm, minEquipment, confidence, description, descriptionAr, significance, significanceAr, sourceNote: GZ, iauId });

export const NASA_DAILY_MOON_SITES: MoonSite[] = [
  // ---------- Southern highlands ----------
  S('moretus', 'Moretus Crater', 'فوهة موريتوس', 'crater', -70.6, -5.8, 78, 'telescope', 'verified',
    'A large, well-defined crater near the lunar south pole with a prominent central peak and strongly terraced walls.',
    'فوهة كبيرة محددة بوضوح قرب القطب الجنوبي للقمر بقمة مركزية بارزة وجدران مدرّجة بقوة.',
    'Its southern position makes central-peak visibility very sensitive to libration.',
    'موقعها الجنوبي يجعل رؤية قمتها المركزية حساسة جدًا للتأرجح القمري.', 4021),
  S('schiller', 'Schiller Crater', 'فوهة شيلر', 'crater', -51.9, -39.0, 179, 'telescope', 'verified',
    'An extremely elongated, elliptical crater in the southwest highlands, likely formed by a very low-angle impact.',
    'فوهة شديدة الاستطالة وبيضاوية في المرتفعات الجنوبية الغربية، يُرجح أنها نشأت عن صدمة بزاوية منخفضة جدًا.',
    'One of the classic examples of an oblique-impact landform on the Moon.',
    'من الأمثلة الكلاسيكية لأشكال الصدمات المائلة على القمر.', 5094),
  S('mare-humorum', 'Mare Humorum', 'بحر الرطوبة', 'mare', -24.48, -38.57, 419, 'binoculars', 'iau',
    'A small, dark, circular lava plain whose basalt fill sits in an ancient impact basin.',
    'سهل حممي داكن دائري صغير يملأ بازلته حوض صدمة قديمًا.',
    'The mascon beneath it has visibly deformed Gassendi on its northern rim.',
    'الكتلة الثقيلة تحته شوهت بشكل ملحوظ فوهة غاسندي على حافته الشمالية.', 3677),
  S('gassendi', 'Gassendi Crater', 'فوهة غاسندي', 'crater', -17.55, -39.96, 111, 'telescope', 'iau',
    'A large, fractured-floor crater on the north rim of Mare Humorum, with a rille system cutting its raised floor.',
    'فوهة كبيرة بقاع مشقق على الحافة الشمالية لبحر الرطوبة، يشقّ قاعها المرتفع نظام أخاديد.',
    'A favourite target for rille observers; considered a possible site of transient lunar phenomena.',
    'هدف مفضل لراصدي الأخاديد؛ ويُعد موقعًا محتملًا لظواهر قمرية عابرة.', 2111),
  S('grimaldi', 'Grimaldi Basin', 'حوض غريمالدي', 'basin', -5.5, -68.3, 174, 'binoculars', 'verified',
    'A basin near the western limb whose very dark basalt floor contrasts sharply with its bright rim.',
    'حوض قرب الحافة الغربية يتميز قاعه البازلتي الداكن جدًا بتباين حاد مع حافته الساطعة.',
    'A well-known libration target — it appears best when the west limb tips toward Earth.',
    'هدف معروف للتأرجح — يظهر بأفضل حال عندما تميل الحافة الغربية نحو الأرض.', 2280),
  S('rupes-recta', 'Rupes Recta (Straight Wall)', 'حائط روبس ركتا المستقيم', 'scarp', -22.1, -7.8, 134, 'telescope', 'verified',
    'A 110 km normal fault in Mare Nubium that appears as a stark straight line near first and last quarter.',
    'صدع عادي بطول 110 كم في بحر السحاب يظهر كخط مستقيم صارخ قرب التربيعين الأول والأخير.',
    'Despite looking like a wall it is a shallow slope of only ~7°.',
    'رغم مظهره كجدار فإنه منحدر لطيف بزاوية نحو 7° فقط.', 5631),
  S('rupes-altai', 'Rupes Altai (Altai Scarp)', 'منحدر ألطاي', 'scarp', -24.3, 22.6, 427, 'telescope', 'verified',
    'A dramatic arcuate escarpment forming the outer rim of the Nectaris impact basin.',
    'منحدر قوسي مذهل يشكل الحافة الخارجية لحوض نكتاريس الصدمي.',
    'The most prominent lunar escarpment; best seen at low Sun angles.',
    'أبرز منحدر قمري؛ يُرى بأفضل حال عند زوايا شمس منخفضة.', 5630),
  S('alphonsus', 'Alphonsus Crater', 'فوهة ألفونسوس', 'crater', -13.39, -2.85, 111, 'binoculars', 'verified',
    'An ancient walled plain on the central meridian with a central peak and dark-halo volcanic pits on its floor.',
    'سهل قديم مسوّر على خط الطول الأوسط بقمة مركزية وحفر بركانية بهلال داكن على قاعه.',
    'Ranger 9 impacted here in 1965, returning the first live US lunar images.',
    'اصطدمت رينجر 9 هنا عام 1965 مقدمةً أول صور قمرية أمريكية مباشرة.', 254),
  S('fra-mauro', 'Fra Mauro Highlands', 'مرتفعات فرا ماورو', 'highlands', -3.6, -17.5, 135, 'binoculars', 'verified',
    'Hilly, hummocky terrain formed by Imbrium basin ejecta, on the Moon’s central meridian.',
    'تضاريس تلال ومتموجات نشأت من مقذوفات حوض بحر الأمطار، على خط الطول الأوسط للقمر.',
    'Apollo 14 landed here in 1971 and sampled Imbrium ejecta directly.',
    'هبطت أبولو 14 هنا عام 1971 وجمعت عينات من مقذوفات بحر الأمطار مباشرة.', 2009),
  S('apollo-12', 'Apollo 12', 'أبولو 12', 'landing', -3.012, -23.422, 0.5, 'telescope', 'verified',
    'Landing site in Oceanus Procellarum, touching down within walking distance of the Surveyor 3 probe.',
    'موقع هبوط في محيط العواصف، حطّت المركبة على مسافة مشي من مسبار سيرفيور 3.',
    'Surveyor 3 parts were returned to Earth — the only hardware ever recovered from another world.',
    'أُعيدت أجزاء من سيرفيور 3 إلى الأرض — العتاد الوحيد الذي استُعيد من عالم آخر.', undefined),
  S('apollo-14', 'Apollo 14', 'أبولو 14', 'landing', -3.645, -17.472, 0.5, 'telescope', 'verified',
    'Landing site in the Fra Mauro formation, targeting Imbrium basin ejecta.',
    'موقع هبوط في تكوين فرا ماورو، يستهدف مقذوفات حوض بحر الأمطار.',
    'Alan Shepard famously hit two golf balls here in February 1971.',
    'ضرب آلان شيبرد كرتَي غولف شهيرتين هنا في فبراير 1971.', undefined),
  S('apollo-16', 'Apollo 16', 'أبولو 16', 'landing', -8.973, 15.501, 0.5, 'telescope', 'verified',
    'The only mission to land in the central highlands, in the Descartes region.',
    'المهمة الوحيدة التي هبطت في المرتفعات الوسطى، في منطقة ديكارت.',
    'Its samples proved the bright highlands are ancient anorthosite, not volcanic.',
    'أثبتت عيناتها أن المرتفعات الساطعة أنورثوسيت قديم وليست بركانية.', undefined),
  S('apollo-17', 'Apollo 17', 'أبولو 17', 'landing', 20.191, 30.771, 0.5, 'telescope', 'verified',
    'The final Apollo landing, in the Taurus-Littrow valley in December 1972.',
    'آخر هبوط لأبولو، في وادي طاروس-ليترو في ديسمبر 1972.',
    'Still the most recent time humans walked on another world.',
    'ما يزال آخر مرة مشى فيها البشر على عالم آخر.', undefined),
  S('apollo-15', 'Apollo 15', 'أبولو 15', 'landing', 26.132, 3.634, 0.5, 'telescope', 'verified',
    'Landing at the foot of the Apennine front beside Hadley Rille — the first mission with a rover.',
    'هبوط عند سفح جبهة الأبينيني بجوار أخدود هادلي — أول مهمة بعربة قمرية.',
    'Its samples included the “Genesis Rock” of primordial lunar crust.',
    'ضمت عيناتها «صخرة التكوين» من القشرة القمرية البدائية.', undefined),
  S('apollo-11', 'Apollo 11', 'أبولو 11', 'landing', 0.674, 23.473, 0.5, 'telescope', 'verified',
    'Tranquility Base — the first human landing on the Moon, 20 July 1969.',
    'قاعدة الهدوء — أول هبوط بشري على القمر، 20 يوليو 1969.',
    'Armstrong and Aldrin spent 21.5 hours on the surface here.',
    'قضى أرمسترونغ وألدرين 21.5 ساعة على السطح هنا.', undefined),
  S('descartes-highlands', 'Descartes Highlands', 'مرتفعات ديكارت', 'highlands', -11.9, 15.7, 120, 'binoculars', 'reference',
    'Bright, heavily cratered highland terrain southeast of Mare Nectaris.',
    'تضاريس مرتفعة ساطعة بكثافة فوهية جنوب شرق بحر نكتاريس.',
    'The Apollo 16 region — once wrongly believed to be volcanic.',
    'منطقة أبولو 16 — كان يُظن خطأً أنها بركانية.', undefined),
  S('mare-fecunditatis', 'Mare Fecunditatis', 'بحر الخصب', 'mare', -7.8, 51.3, 909, 'eye', 'verified',
    'An irregular, elongated mare in the east filled with relatively thin basalt.',
    'بحر غير منتظم ومستطيل في الشرق مملوء ببازلت رقيق نسبيًا.',
    'Hosts Messier and the failed Luna 15 sample attempt.',
    'يحتضن فوهة مسييه ومحاولة لونا 15 الفاشلة للجمع.', 3674),
  S('messier', 'Messier Crater', 'فوهة مسييه', 'crater', -1.9, 47.6, 9, 'telescope', 'verified',
    'A small oval crater with two identical comet-like rays trailing westward.',
    'فوهة بيضاوية صغيرة بشعاعين متطابقين يشبهان ذيل مذنب ويمتدان غربًا.',
    'Formed by an extremely low-angle impact — the rays are downrange ejecta.',
    'نشأت عن صدمة بزاوية منخفضة جدًا — الأشعة هي مقذوفات على اتجاه الحركة.', 3825),
  S('cyrillus', 'Cyrillus Crater', 'فوهة سيريلوس', 'crater', -13.2, 24.0, 93, 'telescope', 'verified',
    'A large, degraded crater in the Altai Scarp region, cut by a fault that also crosses neighbouring Theophilus.',
    'فوهة كبيرة متآكلة في منطقة منحدر ألطاي، يشقها صدع يعبر أيضًا الفوهة المجاورة ثيوفيلوس.',
    'A textbook study in relative crater dating with Theophilus and Catharina.',
    'دراسة نموذجية في تأريخ الفوهات النسبي مع ثيوفيلوس وكاترينا.', 1554),
  S('mare-nectaris', 'Mare Nectaris', 'بحر الرحيق', 'mare', -15.2, 34.6, 333, 'eye', 'verified',
    'A small, near-circular mare filling the Nectaris impact basin.',
    'بحر صغير شبه دائري يملأ حوض نكتاريس الصدمي.',
    'The Nectaris basin defines the start of the lunar stratigraphic column.',
    'يحدد حوض نكتاريس بداية العمود الطبقي القمري.', 3687),
  // ---------- Central near side ----------
  S('mare-vaporum-2', 'Rima Hyginus', 'أخدود هيغينوس', 'rille', 7.4, 7.8, 220, 'telescope', 'verified',
    'A distinctive V-shaped rille system with the small crater Hyginus at its apex — one of the few rilles that is not sinuous.',
    'نظام أخاديد على شكل حرف V يقع فيه الفوهة الصغيرة هيغينوس عند رأسه — من الأخاديد القليلة غير المتعرجة.',
    'Its cinder-like pit suggests a volcanic origin rather than simple collapse.',
    'يشير حفرة شبيهة بالفجوة إلى أصل بركاني لا مجرد انهيار.', 5862),
  S('aristarchus-plateau', 'Aristarchus Plateau', 'هضبة أريستارخوس', 'highlands', 26.2, -50.0, 200, 'binoculars', 'reference',
    'An uplifted, cracked block of crust rising above Oceanus Procellarum, holding both Aristarchus and Schröter’s Valley.',
    'كتلة قشرية مرتفعة ومشققة ترتفع فوق محيط العواصف، تضم فوهة أريستارخوس ووادي شروتر.',
    'The most volcanically diverse region on the near side.',
    'أكثر مناطق الوجه القريب تنوعًا بركانيًا.', undefined),
  S('valley-schroteri', 'Schröter’s Valley', 'وادي شروتر', 'valley', 26.2, -50.8, 160, 'telescope', 'verified',
    'The Moon’s largest sinuous rille: a carved lava channel up to 10 km wide and about 1 km deep.',
    'أكبر أخدود متعرج على القمر: قناة حمم محفورة بعرض يصل إلى 10 كم وعمق نحو 1 كم.',
    'It has an inner channel within an outer channel — nested carving by flowing lava.',
    'يحوي قناة داخلية داخل قناة خارجية — نحت متداخل بجريان الحمم.', 5856),
  S('gruthuisen-domes', 'Gruithuisen Domes', 'قباب غرويثاوزن', 'dome', 36.3, -40.5, 20, 'telescope', 'verified',
    'Two steep-sided silicic volcanic domes on the Procellarum mare edge — unusual silica-rich volcanism.',
    'قبتان بركانيتان سيليسيتا حادتا الجوانب على حافة محيط العواصف — بركانية سيليكية غير معتادة.',
    'A target of NASA’s Lunar-VISE payload for its anomalous composition.',
    'هدف لحزمة لونار-فايز من ناسا لتكوينها الشاذ.', 3782),
  S('mons-rumker', 'Mons Rümker', 'جبل رومكر', 'dome', 40.8, -58.1, 70, 'telescope', 'verified',
    'A broad volcanic dome complex crowded with dozens of small summit craters in northern Procellarum.',
    'مركّب قباب بركانية واسع تزدحم بعشرات الحفر القممية الصغيرة في شمال محيط العواصف.',
    'Chang’e 5 returned samples from here in 2020 — the youngest dated lunar basalts.',
    'أعادت تشانغ آه 5 عينات من هنا عام 2020 — من أحدث البازلتات القمرية تأريخًا.', 3784),
  S('archimedes', 'Archimedes Crater', 'فوهة أرخميدس', 'crater', 29.72, -4.01, 83, 'binoculars', 'verified',
    'A flat-floored crater on the eastern edge of Mare Imbrium; its lava-flooded floor is smooth and rimmed.',
    'فوهة بقاع أملس على الحافة الشرقية لبحر الأمطار؛ قاعها المغمور بالحمم أملس ومسوّر.',
    'Being older than the mare fill but younger than the basin, it dates the flooding sequence.',
    'بكونها أقدم من ملء البحر وأحدث من الحوض، تؤرخ تسلسل الطفح.',
    493),
  S('linne', 'Linne Crater', 'فوهة ليني', 'crater', 27.73, 11.82, 2.4, 'telescope', 'verified',
    'A tiny, brilliant-rimmed crater on the Mare Serenitatis floor, surrounded by a bright ejecta halo.',
    'فوهة صغيرة ساطعة الحواف على قاع بحر الصفاء، يطوّقها هالة مقذوفات لامعة.',
    'Nineteenth-century observers wrongly claimed it had disappeared — an early lesson in illusion.',
    'زعم راصدو القرن التاسع عشر خطأً أنها اختفت — درس مبكر في الوهم.', 3183),
  S('valentine-dome', 'Valentine Dome', 'قبة فالنتاين', 'dome', 30.5, 10.5, 30, 'telescope', 'reference',
    'A large, low volcanic dome with a shallow summit depression on the Serenitatis/Imbrium border.',
    'قبة بركانية كبيرة منخفضة بانخفاض قممي ضحل على حدود بحري الصفاء والأمطار.',
    'An informal amateur name, not an IAU-approved designation.',
    'اسم غير رسمي من هواة الرصد وليس تسمية معتمدة من الاتحاد الفلكي.', undefined),
  S('montes-apenninus', 'Apennine Mountains', 'جبال الأبينيني', 'mountain', 18.9, -3.7, 401, 'binoculars', 'verified',
    'A spectacular 600 km mountain arc forming Imbrium’s southeastern rim, with peaks rising ~5 km.',
    'قوس جبلي مذهل بطول 600 كم يشكل حافة بحر الأمطار الجنوبية الشرقية، بقمم ترتفع نحو 5 كم.',
    'Contains Mons Huygens, among the tallest lunar mountains.',
    'يحتوي جبل هويجنز، من أطول الجبال القمرية.', 3856),
  S('montes-caucasus', 'Caucasus Mountains', 'جبال القوقاز', 'mountain', 38.4, 10.0, 445, 'binoculars', 'verified',
    'A rugged range between Mare Imbrium and Mare Serenitatis, breached by several lava-flooded gaps.',
    'سلسلة وعرة بين بحري الأمطار والصفاء، تشقها فجوات عدة غمرتها الحمم.',
    'Part of Imbrium’s outer basin ring.',
    'جزء من الحلقة الخارجية لحوض بحر الأمطار.', 3859),
  S('montes-alpes', 'Alps Mountains', 'جبال الألب', 'mountain', 46.4, 0.8, 334, 'binoculars', 'verified',
    'An arc of bright massifs cut cleanly through by the Alpine Valley, at Imbrium’s northeast.',
    'قوس من كتل جبلية ساطعة يشقّه وادي الألب بدقة، شمال شرق بحر الأمطار.',
    'Part of Imbrium’s inner basin ring — hence its tighter radius to the centre.',
    'جزء من الحلقة الداخلية لحوض بحر الأمطار — ومن هنا نصف قطره الأقرب للمركز.', 1935),
  S('vallis-alpes', 'Alpine Valley', 'وادي الألب', 'valley', 48.5, 3.2, 166, 'telescope', 'verified',
    'A dramatic flat-floored graben slicing the Alps range for 166 km, only a few km wide.',
    'أخدود انهزامي مذهل بقاع أملس يشق سلسلة الألب بطول 166 كم وبعرض كيلومترات قليلة.',
    'A fine rille runs along its floor — a superb small-telescope challenge.',
    'يشق قاعه أخدود دقيق — تحدٍّ ممتاز للتلسكوبات الصغيرة.', 5852),
  S('montes-haemus', 'Haemus Mountains', 'جبال هيموس', 'mountain', 18.9, 22.6, 560, 'binoculars', 'verified',
    'An irregular mountain arc along Mare Serenitatis’s southern shore.',
    'قوس جبلي غير منتظم على الشاطئ الجنوبي لبحر الصفاء.',
    'Marks the Serenitatis basin rim opposite the Caucasus range.',
    'يمثل حافة حوض الصفاء مقابل سلسلة القوقاز.', 3857),
  S('mare-frigoris', 'Mare Frigoris', 'بحر البرودة', 'mare', 56.0, 1.4, 1596, 'eye', 'verified',
    'A long, narrow basalt band stretching over 1,500 km across the lunar north.',
    'شريط بازلتي طويل وضيق يمتد أكثر من 1500 كم عبر شمال القمر.',
    'Unusual east–west elongation unlike the circular maria further south.',
    'استطالة غير معتادة من الشرق للغرب بخلاف البحار الدائرية جنوبًا.', 3675),
  S('endymion', 'Endymion Crater', 'فوهة إنديميون', 'crater', 53.9, 57.0, 122, 'telescope', 'verified',
    'A large floor-fractured crater near the northeast limb with a smooth lava-covered interior.',
    'فوهة كبيرة مشققة القاع قرب الحافة الشمالية الشرقية بقلب أملس مغطى بالحمم.',
    'A libration-zone target that benefits from favourable wobble.',
    'هدف في منطقة التأرجح يستفيد من التمايل الملائم.', 1799),
  S('posidonius', 'Posidonius Crater', 'فوهة بوسيدونيوس', 'crater', 31.88, 29.99, 95, 'telescope', 'iau',
    'A shallow, lava-flooded crater on Serenitatis’s east rim, laced with the Rimae Posidonius rille system.',
    'فوهة ضحلة مغمورة بالحمم على الحافة الشرقية لبحر الصفاء، تعترقها شبكة أخاديد بوسيدونيوس.',
    'A favourite high-resolution target for its spiral rille on the western floor.',
    'هدف مفضل للدقة العالية بسبب أخدوده الحلزونية في قاعه الغربي.', 4808),
  S('taurus-littrow', 'Taurus-Littrow Valley', 'وادي طاروس-ليترو', 'valley', 20.05, 31.15, 10, 'telescope', 'verified',
    'A deep valley between the Taurus and Littrow mountains, opening onto Mare Serenitatis.',
    'وادٍ عميق بين جبلي طاروس وليترو، ينفتح على بحر الصفاء.',
    'The Apollo 17 landing site — the valley walls rise about 2 km above the floor.',
    'موقع هبوط أبولو 17 — ترتفع جدران الوادي نحو 2 كم فوق قاعه.', undefined),
];

/** Sanity: every id must be unique, every coordinate must be valid. */
const ids = new Set<string>();
for (const s of NASA_DAILY_MOON_SITES) {
  if (ids.has(s.id)) throw new Error(`duplicate site id ${s.id}`);
  ids.add(s.id);
  if (Math.abs(s.lat) > 90 || Math.abs(s.lon) > 180) throw new Error(`bad coords ${s.id}`);
}