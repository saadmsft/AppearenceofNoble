import { appearanceNarrations, characterNarrations } from './library.ts'
import { characterTopics } from './schema.ts'
import { characterHighlights } from './character-highlights.ts'
import type { Localized, Topic } from './schema.ts'
import { isEstablished } from './search.ts'

type Highlight = { text: Localized; sourceId: string }
type ChapterDefinition = { topic: Topic; highlights: Highlight[] }

const definitions: ChapterDefinition[] = [
  {
    topic: 'complexion',
    highlights: [
      { text: { en: 'Anas described a bright, radiant complexion.', ur: 'انس رضی اللہ عنہ نے رنگت روشن اور چمک دار بیان کی۔' }, sourceId: 'moderate-stature-radiant-complexion-anas' },
      { text: { en: 'His description distinguishes it from chalk-white paleness and dark brown.', ur: 'ان کے بیان میں رنگت نہ بالکل پھیکی سفید تھی، نہ گہری سانولی۔' }, sourceId: 'moderate-stature-radiant-complexion-anas' },
    ],
  },
  {
    topic: 'eyes',
    highlights: [
      { text: { en: 'Simak explained the eye description as a long eye opening.', ur: 'سماک نے آنکھ کے وصف کا مطلب آنکھ کا لمبا شگاف بتایا۔' }, sourceId: 'wide-mouth-and-long-eyed-jabir' },
      { text: { en: 'His eyes shed tears at the passing of his son Ibrahim.', ur: 'بیٹے ابراہیم کی وفات کے وقت آپ ﷺ کی آنکھوں سے آنسو بہے۔' }, sourceId: 'tears-at-his-infant-sons-passing' },
      { text: { en: 'Reddening is described during sermons—not as a permanent eye colour.', ur: 'خطبے کے موقع پر آنکھوں کی سرخی بیان ہوئی ہے، مستقل رنگ کے طور پر نہیں۔' }, sourceId: 'reddened-eyes-rising-voice-in-sermon' },
    ],
  },
  {
    topic: 'face',
    highlights: [
      { text: { en: "Al-Bara' remembered an exceptionally beautiful face.", ur: 'براء رضی اللہ عنہ نے آپ ﷺ کے چہرے کو نہایت خوبصورت بتایا۔' }, sourceId: 'most-handsome-face-best-form-bara' },
      { text: { en: 'Jabir ibn Samurah explicitly described its roundness.', ur: 'جابر بن سمرہ رضی اللہ عنہ نے چہرے کی گولائی صراحت سے بیان کی۔' }, sourceId: 'full-beard-and-rounded-face-jabir' },
      { text: { en: 'The moon comparison is a companion’s simile, not a measured outline.', ur: 'چاند کی مثال صحابی کی تشبیہ ہے، چہرے کا ناپا ہوا نقشہ نہیں۔' }, sourceId: 'face-like-the-moon-not-a-sword' },
    ],
  },
  {
    topic: 'hair',
    highlights: [
      { text: { en: 'Wavy hair: neither straight nor tightly curled.', ur: 'بال لہراتے تھے؛ نہ بالکل سیدھے، نہ سخت گھنگریالے۔' }, sourceId: 'wavy-hair-between-ears-and-shoulders' },
      { text: { en: 'Reports preserve lengths at the earlobes and towards the shoulders.', ur: 'روایتوں میں بال کانوں کی لو اور کندھوں تک بیان ہوئے ہیں۔' }, sourceId: 'wavy-hair-between-ears-and-shoulders' },
      { text: { en: 'Anas reported fewer than twenty white hairs on the head and beard.', ur: 'انس رضی اللہ عنہ نے سر اور داڑھی کے سفید بال بیس سے کم بتائے۔' }, sourceId: 'moderate-stature-radiant-complexion-anas' },
    ],
  },
  {
    topic: 'beard',
    highlights: [
      { text: { en: 'Jabir ibn Samurah described abundant beard hair.', ur: 'جابر بن سمرہ رضی اللہ عنہ نے داڑھی میں بالوں کی کثرت بیان کی۔' }, sourceId: 'full-beard-and-rounded-face-jabir' },
      { text: { en: 'White hairs were noted in the small tuft below the lower lip.', ur: 'نچلے ہونٹ کے نیچے کے بالوں میں سفیدی کا ذکر ملتا ہے۔' }, sourceId: 'grey-hair-location-chin-temples-scalp' },
      { text: { en: 'Its movement helped companions recognize recitation in prayer.', ur: 'نماز میں داڑھی کی حرکت سے صحابہ قراءت کو پہچانتے تھے۔' }, sourceId: 'beard-movement-during-recitation' },
    ],
  },
  {
    topic: 'mouth',
    highlights: [
      { text: { en: 'Simak explained the report’s mouth description as a large mouth.', ur: 'سماک نے روایت میں دہن کے وصف کی وضاحت کشادہ منہ سے کی۔' }, sourceId: 'wide-mouth-and-long-eyed-jabir' },
      { text: { en: 'Teeth became visible when he laughed on a recorded occasion.', ur: 'ایک منقول موقع پر آپ ﷺ ہنسے تو دانت ظاہر ہوئے۔' }, sourceId: 'teeth-visible-when-laughing' },
    ],
  },
  {
    topic: 'build',
    highlights: [
      { text: { en: 'Moderate stature: neither exceptionally tall nor short.', ur: 'قد میانہ تھا؛ نہ غیر معمولی طور پر لمبا، نہ چھوٹا۔' }, sourceId: 'most-handsome-face-best-form-bara' },
      { text: { en: "Al-Bara' described broad shoulders.", ur: 'براء رضی اللہ عنہ نے کندھوں کے درمیان کشادگی بیان کی۔' }, sourceId: 'build-broad-shoulders-bara' },
    ],
  },
  {
    topic: 'hands',
    highlights: [
      { text: { en: 'Anas compared the softness of his palm to silk and brocade.', ur: 'انس رضی اللہ عنہ نے ہتھیلی کی نرمی کا ریشم اور دیبا سے موازنہ کیا۔' }, sourceId: 'palm-softer-than-silk-scent' },
      { text: { en: 'The hands are described as large.', ur: 'ہاتھوں کو بڑا بیان کیا گیا ہے۔' }, sourceId: 'large-hands-and-feet-anas' },
      { text: { en: 'Jabir remembered coolness or fragrance when his cheek was touched.', ur: 'رخسار پر دستِ مبارک کے لمس سے جابر رضی اللہ عنہ کو ٹھنڈک یا خوشبو محسوس ہوئی۔' }, sourceId: 'cool-fragrant-hand-jabir-childhood' },
    ],
  },
  {
    topic: 'feet',
    highlights: [
      { text: { en: 'Anas described large feet.', ur: 'انس رضی اللہ عنہ نے پاؤں بڑے بیان کیے۔' }, sourceId: 'large-hands-and-feet-anas' },
      { text: { en: 'The heels are described as having little flesh.', ur: 'ایڑیوں پر کم گوشت ہونے کا وصف بیان ہوا ہے۔' }, sourceId: 'feet-lean-heels-jabir-samurah' },
      { text: { en: 'Abu Juhaifa remembered the brightness of his shins.', ur: 'ابو جحیفہ رضی اللہ عنہ کو پنڈلیوں کی چمک یاد رہی۔' }, sourceId: 'brightness-of-shins-abu-juhaifa' },
    ],
  },
  {
    topic: 'seal',
    highlights: [
      { text: { en: 'The Seal of Prophethood was seen between the shoulders.', ur: 'مہرِ نبوت کندھوں کے درمیان دیکھی گئی۔' }, sourceId: 'seal-tent-button-saib-yazid' },
      { text: { en: 'Ibn Sarjis placed it near the left shoulder blade.', ur: 'ابن سرجس رضی اللہ عنہ نے اسے بائیں کندھے کی ہڈی کے قریب بتایا۔' }, sourceId: 'seal-mole-spots-abdullah-sarjis' },
      { text: { en: 'Witnesses used everyday comparisons, not standardized measurements.', ur: 'مشاہدہ کرنے والوں نے روزمرہ مثالیں دیں، معیاری پیمائشیں نہیں۔' }, sourceId: 'seal-shoulder-pigeon-egg-jabir' },
    ],
  },
  {
    topic: 'movement',
    highlights: [
      { text: { en: 'Abu Huraira remembered a brisk, seemingly effortless pace.', ur: 'ابو ہریرہ رضی اللہ عنہ نے تیز اور بظاہر بے تکلف چال بیان کی۔' }, sourceId: 'movement-brisk-gait-abu-hurairah' },
      { text: { en: 'Ali compared his forward inclination to descending a slope.', ur: 'علی رضی اللہ عنہ نے آگے کی طرف میلان کو ڈھلان سے اترنے سے تشبیہ دی۔' }, sourceId: 'movement-descending-slope-ali' },
    ],
  },
  {
    topic: 'fragrance',
    highlights: [
      { text: { en: 'Anas remembered a fragrance more pleasant than any he had smelled.', ur: 'انس رضی اللہ عنہ نے آپ ﷺ کی خوشبو کو اپنی سونگھی ہوئی ہر خوشبو سے بہتر پایا۔' }, sourceId: 'palm-softer-than-silk-scent' },
      { text: { en: 'Umm Sulaim collected his perspiration to mix with perfume.', ur: 'ام سلیم رضی اللہ عنہا نے پسینہ جمع کر کے خوشبو میں ملایا۔' }, sourceId: 'sweat-gathered-as-fragrance' },
      { text: { en: 'Aisha also described applied perfume glistening on his head and beard.', ur: 'عائشہ رضی اللہ عنہا نے سر اور داڑھی میں لگائی ہوئی خوشبو کی چمک بھی بیان کی۔' }, sourceId: 'perfume-shine-on-head-and-beard' },
    ],
  },
  {
    topic: 'voice',
    highlights: [
      { text: { en: 'Aisha described clear, unhurried speech whose words could be counted.', ur: 'عائشہ رضی اللہ عنہا نے واضح، ٹھہراؤ والے کلام کا ذکر کیا جس کے الفاظ گنے جا سکتے تھے۔' }, sourceId: 'speech-clear-enough-to-count' },
      { text: { en: "Al-Bara' praised the beauty of his voice and recitation at Isha.", ur: 'براء رضی اللہ عنہ نے عشاء میں آپ ﷺ کی آواز اور قراءت کے حسن کی تعریف کی۔' }, sourceId: 'beautiful-recitation-voice-bara' },
    ],
  },
  {
    topic: 'smile',
    highlights: [
      { text: { en: 'Ibn al-Harith remembered him smiling more than anyone he had seen.', ur: 'ابن حارث رضی اللہ عنہ نے آپ ﷺ کو اپنے دیکھے ہوئے سب لوگوں سے زیادہ مسکراتا پایا۔' }, sourceId: 'no-one-smiled-more-than-him' },
      { text: { en: 'Jarir recalled being greeted with a smile whenever he was seen.', ur: 'جریر رضی اللہ عنہ کے مطابق جب بھی آپ ﷺ انہیں دیکھتے، مسکراتے تھے۔' }, sourceId: 'always-greeted-jarir-smiling' },
    ],
  },
  {
    topic: 'dress',
    highlights: [
      { text: { en: "Al-Bara' recalled a red hullah, a suit of clothing.", ur: 'براء رضی اللہ عنہ نے سرخ حُلّہ، یعنی ایک جوڑا لباس، پہنے دیکھا۔' }, sourceId: 'moderate-height-broad-shoulders-red-cloak' },
      { text: { en: 'Amr ibn Huraith saw a black turban during an address.', ur: 'عمرو بن حریث رضی اللہ عنہ نے خطاب کے وقت سیاہ عمامہ دیکھا۔' }, sourceId: 'black-turban-at-conquest-of-mecca' },
      { text: { en: 'Anas described a silver ring bearing an inscription.', ur: 'انس رضی اللہ عنہ نے نقش والی چاندی کی انگوٹھی بیان کی۔' }, sourceId: 'silver-ring-engraved-with-his-name' },
    ],
  },
  {
    topic: 'overview',
    highlights: [
      { text: { en: "Al-Bara' praised the beauty of both face and physical form.", ur: 'براء رضی اللہ عنہ نے چہرے اور جسمانی ساخت دونوں کے حسن کی تعریف کی۔' }, sourceId: 'most-handsome-face-best-form-bara' },
      { text: { en: 'Abu Tufail remembered a fair, handsome, moderately built appearance.', ur: 'ابو طفیل رضی اللہ عنہ نے گورا، خوبصورت اور میانہ جسمانی حلیہ بیان کیا۔' }, sourceId: 'abu-tufail-white-handsome-medium-built' },
    ],
  },
]

const byId = new Map(appearanceNarrations.map((row) => [row.id, row]))

export const chapters = definitions.map((chapter) => ({
  ...chapter,
  reports: appearanceNarrations.filter((row) => row.topics.includes(chapter.topic)),
  highlights: chapter.highlights.map((highlight) => {
    const source = byId.get(highlight.sourceId)
    if (!source || !isEstablished(source) || !source.topics.includes(chapter.topic)) {
      throw new Error(`Invalid established source for ${chapter.topic} highlight: ${highlight.sourceId}`)
    }
    return { ...highlight, source }
  }),
}))

export type Chapter = typeof chapters[number]

export const characterChapters: Chapter[] = characterTopics.map((topic) => {
  const reports = characterNarrations.filter((row) => row.topics.includes(topic))
  const highlights = reports.filter(isEstablished).slice(0, 3).map((source) => {
    const text = characterHighlights[source.id]
    if (!text) throw new Error(`Missing reviewed Character highlight: ${source.id}`)
    return { text, sourceId: source.id, source }
  })
  return { topic, reports, highlights }
})
