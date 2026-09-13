import { useEffect, useState } from 'react'
import { monthlyEpisodes, newMonthlyEpisodeId } from '../lib/monthly-series.ts'
import type { Language } from '../lib/schema.ts'

export function MonthlyNewBadge({ language, episodeId }: { language: Language; episodeId?: string }) {
  const [latest, setLatest] = useState(() => newMonthlyEpisodeId(monthlyEpisodes))
  useEffect(() => {
    const refresh = () => setLatest(newMonthlyEpisodeId(monthlyEpisodes))
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  if (!latest || (episodeId && episodeId !== latest)) return null
  return <span className="monthly-new">{language === 'ur' ? 'نیا' : 'NEW'}</span>
}
