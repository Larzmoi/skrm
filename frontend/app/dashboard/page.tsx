'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/lang-context'
import { useTheme } from '@/lib/theme-context'

interface ScheduledShow { id: string; title: string; category: string; scheduledAt: string }

export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useLang()
  const { C } = useTheme()
  const [shows, setShows] = useState<ScheduledShow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [productCount, setProductCount] = useState(0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const s = localStorage.getItem('skrm_shows')
    if (s) setShows(JSON.parse(s))
    // Haetaan tuotteet backendistä
    import('@/lib/api').then(({ api }) => {
      api.getMyProducts().then((p: any[]) => {
        setProductCount(p.filter((x: any) => x.status === 'PENDING').length)
      }).catch(() => {})
    })
  }, [])

  function saveShow() {
    if (!title || !date || !time) return
    const s = { id: String(Date.now()), title, category, scheduledAt: `${date}T${time}` }
    const updated = [...shows, s]
    localStorage.setItem('skrm_shows', JSON.stringify(updated))
    setShows(updated)
    setTitle(''); setCategory(''); setDate(''); setTime('')
    setShowForm(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function removeShow(id: string) {
    const u = shows.filter(s => s.id !== id)
    localStorage.setItem('skrm_shows', JSON.stringify(u))
    setShows(u)
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const today = new Date(); const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)
    const t = d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === today.toDateString()) return `Tänään klo ${t}`
    if (d.toDateString() === tomorrow.toDateString()) return `Huomenna klo ${t}`
    return d.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric' }) + ` klo ${t}`
  }

  const futureShows = shows.filter(s => new Date(s.scheduledAt) > new Date())

  const inp: React.CSSProperties = { width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4 }

  const stats = [
    { label: t.dashboard.productsQueued, value: String(productCount), color: C.accent },
    { label: t.dashboard.upcomingShows, value: String(futureShows.length), color: C.accentBright },
    { label: t.dashboard.totalSales, value: '0€', color: C.muted },
    { label: t.dashboard.followers, value: '0', color: C.muted },
  ]

  return (
    <div style={{ color: C.text }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>{t.dashboard.hello}, {user?.name}</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>{t.dashboard.subtitle}</p>
      </div>

      {saved && <div style={{ background: C.accentLight, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: C.accent, fontSize: 13 }}>Lähetys ajastettu!</div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: C.textSub }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Lähetykset */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{t.dashboard.upcomingShowsTitle}</h2>
            <button onClick={() => setShowForm(s => !s)} style={{ background: C.accent, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              + Ajasta
            </button>
          </div>

          {showForm && (
            <div style={{ background: C.surface, borderRadius: 10, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><label style={lbl}>{t.dashboard.showTitle}</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="esim. Pokémon Base Set" style={inp} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={lbl}>{t.dashboard.showDate}</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
                  <div><label style={lbl}>{t.dashboard.showTime}</label><input type="time" value={time} onChange={e => setTime(e.target.value)} style={inp} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveShow} style={{ background: C.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t.dashboard.save}</button>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '8px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>{t.dashboard.cancel}</button>
                </div>
              </div>
            </div>
          )}

          {futureShows.length === 0 && !showForm
            ? <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted, fontSize: 13 }}>{t.dashboard.noShows}</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {futureShows.map(show => (
                  <div key={show.id} style={{ background: C.surface, borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{show.title}</div>
                      <div style={{ fontSize: 12, color: C.accent }}>{formatDate(show.scheduledAt)}</div>
                    </div>
                    <button onClick={() => removeShow(show.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
          }

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <Link href="/dashboard/lahetys" style={{ flex: 1, background: C.accent, color: '#fff', textDecoration: 'none', padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
              Mene liveen
            </Link>
            <Link href="/dashboard/tuotteet" style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.text, textDecoration: 'none', padding: '10px', borderRadius: 8, fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
              + Lisää tuote
            </Link>
          </div>
        </div>

        {/* Ohjeet */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>{t.dashboard.howToStart}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { step: '1', title: t.dashboard.addProducts, desc: t.dashboard.addProductsDesc, href: '/dashboard/tuotteet', done: productCount > 0 },
              { step: '2', title: t.dashboard.scheduleShow, desc: t.dashboard.scheduleShowDesc, href: '#', done: futureShows.length > 0 },
              { step: '3', title: t.dashboard.goLive, desc: t.dashboard.startLiveDesc, href: '/dashboard/lahetys', done: false },
            ].map(item => (
              <Link key={item.step} href={item.href} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', padding: '12px', borderRadius: 8, background: C.surface, border: `1px solid ${item.done ? C.accent + '44' : C.border}` }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: item.done ? C.accent : C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: item.done ? '#fff' : C.muted, flexShrink: 0 }}>
                  {item.done ? '✓' : item.step}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
