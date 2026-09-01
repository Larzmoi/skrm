'use client'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/lang-context'
import { useTheme } from '@/lib/theme-context'
import { useIsMobile } from '@/lib/useIsMobile'
import { showApi } from '@/lib/api'
import { resizeImage } from '@/lib/imageUtils'
import { formatShowTime } from '@/lib/formatShowTime'

interface ScheduledShow { id: string; title: string; category: string | null; status: string; scheduledAt: string | null; thumbnailUrl: string | null }

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export default function DashboardPage() {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const { C } = useTheme()
  const isMobile = useIsMobile()
  const [shows, setShows] = useState<ScheduledShow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [hour, setHour] = useState('18')
  const [minute, setMinute] = useState('00')
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [productCount, setProductCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const thumbnailRef = useRef<HTMLInputElement>(null)

  async function handleThumbnail(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    await new Promise<void>(res => {
      r.onload = async () => {
        const resized = await resizeImage(r.result as string, 1200)
        setThumbnail(resized)
        res()
      }
      r.readAsDataURL(f)
    })
  }

  const loadShows = useCallback(() => {
    showApi.mine().then((s: ScheduledShow[]) => setShows(Array.isArray(s) ? s : [])).catch(() => setShows([]))
  }, [])

  useEffect(() => {
    loadShows()
    // Haetaan tuotteet backendistä
    import('@/lib/api').then(({ api }) => {
      api.getMyProducts().then((p: any[]) => {
        setProductCount(p.filter((x: any) => x.status === 'PENDING').length)
      }).catch(() => {})
    })
  }, [loadShows])

  async function saveShow() {
    if (!title || !date) return
    setScheduling(true)
    try {
      await showApi.create({ title, category: category || undefined, scheduledAt: `${date}T${hour}:${minute}`, thumbnailUrl: thumbnail ?? undefined })
      await loadShows()
      setTitle(''); setCategory(''); setDate(''); setHour('18'); setMinute('00'); setThumbnail(null)
      if (thumbnailRef.current) thumbnailRef.current.value = ''
      setShowForm(false); setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setScheduling(false)
  }

  async function removeShow(id: string) {
    try {
      await showApi.remove(id)
      setShows(s => s.filter(x => x.id !== id))
    } catch {}
  }


  const futureShows = shows.filter(s => s.status === 'SCHEDULED' && s.scheduledAt && new Date(s.scheduledAt).getTime() > Date.now())

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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: C.textSub }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pikatoiminnot — selkeästi erillään: live-lähetys vs. tuotteiden hallinta */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Link href="/lahetys" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: C.accentSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: C.accentText, flexShrink: 0 }}>◉</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{t.dashboard.quickLiveTitle}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{t.dashboard.quickLiveDesc}</div>
          </div>
          <span style={{ color: C.accent, fontSize: 18, flexShrink: 0 }}>→</span>
        </Link>
        <Link href="/dashboard/tuotteet" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: C.text, flexShrink: 0 }}>◫</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{t.dashboard.quickProductsTitle}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{t.dashboard.quickProductsDesc}</div>
          </div>
          <span style={{ color: C.muted, fontSize: 18, flexShrink: 0 }}>→</span>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>

        {/* Lähetykset */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{t.dashboard.upcomingShowsTitle}</h2>
            <button onClick={() => setShowForm(s => !s)} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              + Ajasta
            </button>
          </div>

          {showForm && (
            <div style={{ background: C.surface, borderRadius: 10, padding: '14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><label style={lbl}>{t.dashboard.showTitle}</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="esim. Pokémon Base Set" style={inp} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={lbl}>{t.dashboard.showDate}</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
                  <div>
                    <label style={lbl}>{t.dashboard.showTime}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <select value={hour} onChange={e => setHour(e.target.value)} style={inp}>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span style={{ color: C.muted }}>:</span>
                      <select value={minute} onChange={e => setMinute(e.target.value)} style={inp}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Markkinointikuva (valinnainen)</label>
                  <div
                    onClick={() => thumbnailRef.current?.click()}
                    style={{
                      width: '100%', aspectRatio: '16/9', borderRadius: 8,
                      border: `2px dashed ${thumbnail ? C.accent : C.border}`, background: C.surface2,
                      cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', position: 'relative',
                    }}
                  >
                    {thumbnail ? (
                      <>
                        <img src={thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={e => { e.stopPropagation(); setThumbnail(null); if (thumbnailRef.current) thumbnailRef.current.value = '' }}
                          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}
                        >✕</button>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: C.muted }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>+</div>
                        <div style={{ fontSize: 12 }}>Lisää kuva</div>
                      </div>
                    )}
                  </div>
                  <input ref={thumbnailRef} type="file" accept="image/*" onChange={handleThumbnail} style={{ display: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveShow} disabled={scheduling} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: scheduling ? 'default' : 'pointer', opacity: scheduling ? 0.7 : 1 }}>{scheduling ? t.auth.loading : t.dashboard.save}</button>
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
                    <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {show.thumbnailUrl ? <img src={show.thumbnailUrl} alt={show.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16, color: C.dim }}>+</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{show.title}</div>
                      <div style={{ fontSize: 12, color: C.accent }}>{formatShowTime(show.scheduledAt, t, lang as 'fi' | 'en')}</div>
                    </div>
                    <button onClick={() => removeShow(show.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Ohjeet */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>{t.dashboard.howToStart}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { step: '1', title: t.dashboard.addProducts, desc: t.dashboard.addProductsDesc, href: '/dashboard/tuotteet', done: productCount > 0 },
              { step: '2', title: t.dashboard.scheduleShow, desc: t.dashboard.scheduleShowDesc, href: '#', done: futureShows.length > 0 },
              { step: '3', title: t.dashboard.goLive, desc: t.dashboard.startLiveDesc, href: '/lahetys', done: false },
            ].map(item => (
              <Link key={item.step} href={item.href} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', padding: '12px', borderRadius: 8, background: C.surface, border: `1px solid ${item.done ? C.accent + '44' : C.border}` }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: item.done ? C.accentSolid : C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: item.done ? C.accentText : C.muted, flexShrink: 0 }}>
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
