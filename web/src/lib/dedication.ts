export const dedicationSessionKey = 'noble-project.dedication.session.v1'
export type DedicationStorage = () => Pick<Storage, 'getItem' | 'setItem'>
export type DedicationStorageIssue = 'unavailable' | 'invalid' | 'verify-failed' | null

export function loadDedication(storage: DedicationStorage): { dismissed: boolean; issue: DedicationStorageIssue } {
  try {
    const value = storage().getItem(dedicationSessionKey)
    return { dismissed: value === '1', issue: value === null || value === '1' ? null : 'invalid' }
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
    return { dismissed: false, issue: 'unavailable' }
  }
}

export function dismissDedication(storage: DedicationStorage): DedicationStorageIssue {
  try {
    const target = storage()
    target.setItem(dedicationSessionKey, '1')
    return target.getItem(dedicationSessionKey) === '1' ? null : 'verify-failed'
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
    return 'unavailable'
  }
}

export const dedicationLabels = {
  en: {
    title: 'Dedication & gratitude',
    dedication: 'For the pleasure of Allah, and in love and reverence for Prophet Muhammad (S.A.W.W.).',
    beforeMother: 'With heartfelt gratitude to my mother,',
    mother: 'Farkhanda Abid',
    beforeFather: 'and my father,',
    father: 'Abid Mahmood',
    gratitude: 'who continue to support me in this project.',
    enter: 'Enter the project',
    close: 'Close dedication',
    reopen: 'Dedication',
    storage: 'This browser could not remember the welcome notice. It may appear again after a reload; you can still close it and continue.',
  },
  ur: {
    title: 'انتساب اور اظہارِ تشکر',
    dedication: 'اللہ تعالیٰ کی رضا کے لیے، اور نبی کریم حضرت محمد صلی اللہ علیہ وآلہ وسلم سے محبت و عقیدت کے ساتھ۔',
    beforeMother: 'اپنی والدہ',
    mother: 'فرخندہ عابد',
    beforeFather: 'اور والد',
    father: 'عابد محمود',
    gratitude: 'کا تہِ دل سے شکر گزار ہوں، جو اس منصوبے میں آج بھی میرا ساتھ دے رہے ہیں۔',
    enter: 'منصوبے میں داخل ہوں',
    close: 'انتساب بند کریں',
    reopen: 'انتساب',
    storage: 'یہ براؤزر استقبالی اطلاع یاد نہیں رکھ سکا۔ دوبارہ لوڈ کرنے پر یہ پھر آ سکتی ہے؛ آپ اسے بند کر کے مطالعہ جاری رکھ سکتے ہیں۔',
  },
} as const
