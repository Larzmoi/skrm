// Muotoilee lähetyksen ajastetun ajankohdan — "Tänään klo 15.00", "Huomenna klo 15.00" tai "ma 10.8 klo 15.00".
// 24h-kello aina (LUKITTU-sääntö) riippumatta kielestä, ei koskaan ap./ip.
export function formatShowTime(iso: string | null | undefined, t: any, lang: 'fi' | 'en'): string {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const locale = lang === 'en' ? 'en-GB' : 'fi-FI'
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
  if (d.toDateString() === today.toDateString()) return `${t.time.today} ${t.time.at} ${time}`
  if (d.toDateString() === tomorrow.toDateString()) return `${t.time.tomorrow} ${t.time.at} ${time}`
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'numeric' }) + ` ${t.time.at} ${time}`
}
