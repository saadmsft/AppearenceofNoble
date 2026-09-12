import type { Collection, Grade, Localized, Shelf, Topic } from './schema.ts'
import type { MessageKey } from './i18n.ts'

export const shelfLabels: Record<Shelf, Localized> = {
  appearance: { en: 'The Noble Appearance', ur: 'حلیۂ مبارک' },
  character: { en: 'The Noble Character', ur: 'اخلاقِ نبوی ﷺ' },
  life: { en: 'The Noble Life', ur: 'سیرتِ نبوی ﷺ' },
}

type ShelfPresentation = {
  introduction: MessageKey
  storyTitle: MessageKey
  storyIntroduction: MessageKey
  storyAction: MessageKey
  journeyTitle: MessageKey
  heroFirst: MessageKey
  heroSecond: MessageKey
  heroDescription: MessageKey
  begin: MessageKey
  calligraphy: string
  shortCalligraphy: string
}

export const shelfPresentation: Record<Shelf, ShelfPresentation> = {
  appearance: {
    introduction: 'appearanceIntroduction', storyTitle: 'storyAppearanceTitle',
    storyIntroduction: 'storyIntroduction', storyAction: 'enterAppearanceStory',
    journeyTitle: 'journeyTitle', heroFirst: 'heroFirst', heroSecond: 'heroSecond',
    heroDescription: 'heroDescription', begin: 'beginJourney',
    calligraphy: 'الشَّمَائِلُ الْمُحَمَّدِيَّةُ', shortCalligraphy: 'الشَّمَائِل',
  },
  character: {
    introduction: 'characterIntroduction', storyTitle: 'storyCharacterTitle',
    storyIntroduction: 'storyIntroduction', storyAction: 'enterCharacterStory',
    journeyTitle: 'characterJourneyTitle', heroFirst: 'characterHeroFirst', heroSecond: 'characterHeroSecond',
    heroDescription: 'characterHeroDescription', begin: 'beginCharacter',
    calligraphy: 'أَخْلَاقُ النَّبِيِّ', shortCalligraphy: 'الأَخْلَاق',
  },
  life: {
    introduction: 'lifeIntroduction', storyTitle: 'storyLifeTitle',
    storyIntroduction: 'storyLifeIntroduction', storyAction: 'enterLifeStory',
    journeyTitle: 'lifeJourneyTitle', heroFirst: 'lifeHeroFirst', heroSecond: 'lifeHeroSecond',
    heroDescription: 'lifeIntroduction', begin: 'beginLife',
    calligraphy: 'السِّيرَةُ النَّبَوِيَّةُ', shortCalligraphy: 'السِّيرَة',
  },
}

export const topicLabels: Record<Topic, Localized> = {
  overview: { en: 'Overall appearance', ur: 'مجموعی حلیہ' },
  complexion: { en: 'Complexion', ur: 'رنگت' },
  face: { en: 'Face & radiance', ur: 'چہرہ اور رونق' },
  eyes: { en: 'Eyes', ur: 'آنکھیں' },
  hair: { en: 'Hair', ur: 'بال' },
  beard: { en: 'Beard', ur: 'داڑھی مبارک' },
  mouth: { en: 'Mouth & teeth', ur: 'دہن اور دانت' },
  build: { en: 'Stature & build', ur: 'قد اور جسمانی ساخت' },
  hands: { en: 'Hands & touch', ur: 'ہاتھ اور لمس' },
  feet: { en: 'Legs & feet', ur: 'پنڈلیاں اور پاؤں' },
  seal: { en: 'Seal of Prophethood', ur: 'مہرِ نبوت' },
  movement: { en: 'Walk & posture', ur: 'چال اور نشست' },
  fragrance: { en: 'Fragrance & perspiration', ur: 'خوشبو اور پسینہ' },
  voice: { en: 'Voice & speech', ur: 'آواز اور گفتگو' },
  smile: { en: 'Smile & laughter', ur: 'مسکراہٹ' },
  dress: { en: 'Dress & adornment', ur: 'لباس اور زیبائش' },
  mercy: { en: 'Mercy', ur: 'رحمت و شفقت' },
  patience: { en: 'Patience', ur: 'صبر' },
  humility: { en: 'Humility', ur: 'تواضع' },
  generosity: { en: 'Generosity', ur: 'سخاوت' },
  justice: { en: 'Justice', ur: 'عدل و انصاف' },
  forgiveness: { en: 'Forgiveness', ur: 'عفو و درگزر' },
  honesty: { en: 'Honesty', ur: 'صدق و امانت' },
  'family-community': { en: 'Family & community', ur: 'خاندان اور معاشرہ' },
  'life-early-years': { en: 'Early life & work', ur: 'ابتدائی زندگی اور کام' },
  'life-revelation': { en: 'The first revelation', ur: 'پہلی وحی' },
  'life-makkan-years': { en: 'The Makkan years', ur: 'مکی دور' },
  'life-taif': { en: "The journey to Ta'if", ur: 'سفرِ طائف' },
  'life-hijrah': { en: 'The Hijrah', ur: 'ہجرت' },
  'life-madinah': { en: 'The Madinan community', ur: 'مدنی معاشرہ' },
  'life-badr': { en: 'Badr', ur: 'بدر' },
  'life-uhud': { en: 'Uhud', ur: 'اُحد' },
  'life-hudaybiyyah': { en: 'Al-Hudaybiyyah', ur: 'حدیبیہ' },
  'life-makkah-return': { en: 'The return to Makkah', ur: 'مکہ واپسی' },
  'life-farewell': { en: 'The Farewell Pilgrimage', ur: 'حجۃ الوداع' },
  'life-final-days': { en: 'The final days', ur: 'آخری ایام' },
}

export const collectionLabels: Record<Collection, Localized> = {
  bukhari: { en: 'Sahih al-Bukhari', ur: 'صحیح بخاری' },
  muslim: { en: 'Sahih Muslim', ur: 'صحیح مسلم' },
  tirmidhi: { en: "Jami' at-Tirmidhi", ur: 'جامع ترمذی' },
  shamail: { en: "Ash-Shama'il al-Muhammadiyah", ur: 'شمائل محمدیہ' },
  abudawud: { en: 'Sunan Abi Dawud', ur: 'سنن ابی داؤد' },
  ibnmajah: { en: 'Sunan Ibn Majah', ur: 'سنن ابن ماجہ' },
  nasai: { en: "Sunan an-Nasa'i", ur: 'سنن نسائی' },
}

export const gradeLabels: Record<Grade, Localized> = {
  sahih: { en: 'Sahih', ur: 'صحیح' },
  hasan: { en: 'Hasan', ur: 'حسن' },
  weak: { en: 'Weak', ur: 'ضعیف' },
  disputed: { en: 'Disputed', ur: 'مختلف فیہ' },
  ungraded: { en: 'Ungraded', ur: 'درجہ غیر متعین' },
}

export const topicAliases: Record<Topic, string> = {
  overview: 'appearance description shamaail shamail shama il shamāʾil حلیہ شمائل سراپا',
  complexion: 'skin color colour fair white brown reddish rang rangat complexion رنگت جلد رنگ',
  face: 'face forehead cheeks nose luminous radiant moon chehra چہرہ ناک پیشانی رخسار',
  eyes: 'eye eyelids eyelashes aankhen آنکھ آنکھیں پلکیں ابرو',
  hair: 'hair hairstyle braids straight curly wavy grey gray white baal زلف بال سفید',
  beard: 'beard moustache chin dari darhi daadhi داڑھی ریش ٹھوڑی',
  mouth: 'mouth teeth tooth lips daant hont دہن دانت ہونٹ',
  build: 'height body stature physique shoulders chest abdomen back neck qad جسامت جسم قد کندھے گردن سینہ',
  hands: 'hand palm fingers touch hath haath ہاتھ ہتھیلی انگلی',
  feet: 'legs calf calves shin heel feet foot paon paun پاؤں قدم ٹانگ پنڈلی ایڑی',
  seal: 'seal prophethood birthmark khatam mohr خاتم مہر نبوت پشت',
  movement: 'walk gait posture sitting chaal chalna چال چلنا نشست رفتار',
  fragrance: 'scent smell musk sweat perspiration perfume khushbu khushboo پسینہ مہک خوشبو مشک',
  voice: 'voice speech recitation speaking awaz awaaz tilawat bolna آواز تلاوت گفتگو کلام',
  smile: 'smile laughter laugh joy muskurahat hansi tabassum مسکراہٹ تبسم ہنسی',
  dress: 'clothes turban garment cloak sandals ring لباس عمامہ قمیص چادر انگوٹھی نعلین',
  mercy: 'mercy compassion kindness rahmat shafqat رحم رحمت شفقت مہربانی',
  patience: 'patience endurance restraint sabr صبر تحمل برداشت',
  humility: 'humility modesty service tawazu تواضع انکساری خدمت',
  generosity: 'generosity giving charity sakhawat سخاوت انفاق عطا صدقہ',
  justice: 'justice fairness equality insaf adl انصاف عدل برابری',
  forgiveness: 'forgiveness pardon reconciliation maafi معافی عفو درگزر',
  honesty: 'honesty truth trust integrity sach amanat سچ صدق امانت دیانت',
  'family-community': 'family children neighbours neighbors community household khandan خاندان گھر بچے پڑوسی معاشرہ',
  'life-early-years': 'life seerah sirah seerat early work shepherd makkah mecca مکہ سیرت ابتدائی زندگی چرواہا',
  'life-revelation': 'life seerah revelation hira wahi wahy پہلی وحی حرا',
  'life-makkan-years': 'life seerah makkah mecca makkan years makkai dawat مکی دور مکہ دعوت',
  'life-taif': 'life seerah taif ta if journey safar طائف سفر',
  'life-hijrah': 'life seerah hijrah hijra hijrat migration cave ہجرت غار',
  'life-madinah': 'life seerah madinah medina community mosque madani معاشرہ مدینہ مسجد',
  'life-badr': 'life seerah badr بدر',
  'life-uhud': 'life seerah uhud ohud احد اُحد',
  'life-hudaybiyyah': 'life seerah hudaybiyyah hudaybiyah hudaibiya treaty sulah صلح حدیبیہ',
  'life-makkah-return': 'life seerah makkah mecca return conquest fath fatah فتح مکہ واپسی',
  'life-farewell': 'life seerah farewell pilgrimage hajj wada wida mina حج الوداع منیٰ',
  'life-final-days': 'life seerah final days death passing akhri ayyam wafat آخری ایام وفات',
}
