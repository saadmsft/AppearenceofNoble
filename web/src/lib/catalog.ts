import type { Collection, Grade, Localized, Shelf, Topic } from './schema.ts'

export const shelfLabels: Record<Shelf, Localized> = {
  appearance: { en: 'The Noble Appearance', ur: 'حلیۂ مبارک' },
  character: { en: 'The Noble Character', ur: 'اخلاقِ نبوی ﷺ' },
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
}
