'use client'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useTheme } from '@/lib/theme-context'
import { useState, useMemo, useEffect } from 'react'
import { useKategoria } from '@/lib/kategoria-context'
import { KATEGORIAT, getKatNimi, getAlaNimi } from '@/lib/kategoriat'
import { useLang } from '@/lib/lang-context'
import Footer from '@/components/layout/Footer'
import { api } from '@/lib/api'

export default function Home() {
  const { C } = useTheme()
  const { activeKat, setActiveKat } = useKategoria()
  const { lang, t } = useLang()
  const [isMobile, setIsMobile] = useState(true)
  const [shows, setShows] = useState<any[]>([])
  const [products, setProductsState] = useState<any[]>([])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000') + '/shows')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setShows(data) })
      .catch(() => {})

    import('@/lib/api').then(({ api }) => {
      api.getProducts({ limit: '6' })
        .then((data: any[]) => { if (Array.isArray(data) && data.length > 0) setProductsState(data) })
        .catch(() => {})
    })
  }, [])

  const mapShow = (s: any) => ({
    id: s.id, seller: s.seller?.username ?? 'myyjä',
    title: s.title, category: s.category ?? 'muu',
    viewers: s.viewerCount ?? 0,
    thumbnail: s.thumbnailUrl ?? '',
    scheduledAt: s.scheduledAt,
  })

  const displayShows = shows.filter((s: any) => s.status === 'LIVE').map(mapShow)
  const displayUpcoming = shows
    .filter((s: any) => s.status === 'SCHEDULED')
    .map(mapShow)
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))

  const displayProducts = products.map((p: any) => {
    const thumbnail = p.imageUrl ? p.imageUrl.split('|||')[0] : ''
    return {
      id: p.id, name: p.name, price: p.startPrice,
      condition: p.condition ?? '', seller: p.seller?.username ?? '',
      category: p.category ?? 'muu', alakategoria: p.alakategoria ?? '', thumbnail,
    }
  })

  const filteredShows = useMemo(() => {
    if (activeKat === 'kaikki') return displayShows
    return displayShows.filter(s => s.category === activeKat)
  }, [activeKat, displayShows])

  const [activeAla, setActiveAla] = useState('')

  const filteredProducts = useMemo(() => {
    let p = displayProducts
    if (activeKat !== 'kaikki') p = p.filter(x => x.category === activeKat)
    if (activeAla) p = p.filter(x => (x as any).alakategoria === activeAla)
    return p
  }, [activeKat, activeAla, displayProducts])

  const allKats = [{ id: 'kaikki', nimi: { fi: 'Kaikki', en: 'All' } }, ...KATEGORIAT]

  function formatUpcomingTime(iso?: string) {
    if (!iso) return ''
    const d = new Date(iso)
    const today = new Date(); const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)
    const time = d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === today.toDateString()) return `Tänään klo ${time}`
    if (d.toDateString() === tomorrow.toDateString()) return `Huomenna klo ${time}`
    return d.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric' }) + ` klo ${time}`
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />

      {/* Mobiili: scrollattava kategoriapalkki */}
      {isMobile && (
        <div style={{ overflowX: 'auto', borderBottom: `1px solid ${C.border}`, background: C.navBg }}>
          <div style={{ display: 'flex', padding: '0 12px' }}>
            {allKats.map(kat => (
              <button key={kat.id} onClick={() => setActiveKat(kat.id)} style={{ padding: '10px 14px', fontSize: 13, fontWeight: activeKat === kat.id ? 700 : 400, color: activeKat === kat.id ? C.accent : C.textSub, background: 'transparent', border: 'none', borderBottom: activeKat === kat.id ? `2px solid ${C.accent}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {getKatNimi(kat as any, lang as any)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', maxWidth: 1440, margin: '0 auto' }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={{ width: 200, flexShrink: 0, padding: '16px 10px', borderRight: `1px solid ${C.border}`, position: 'sticky', top: 94, height: 'calc(100vh - 94px)', overflowY: 'auto' }}>
            <button onClick={() => { setActiveKat('kaikki'); setActiveAla('') }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeKat === 'kaikki' ? 700 : 400, color: activeKat === 'kaikki' ? C.accent : C.textSub, background: activeKat === 'kaikki' ? C.accentLight : 'transparent', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
              <span>Kaikki</span>
              <span style={{ fontSize: 11, color: C.muted }}>{displayProducts.length}</span>
            </button>
            {KATEGORIAT.map(kat => {
              const count = displayProducts.filter(p => p.category === kat.id).length
              return (
                <div key={kat.id}>
                  <button onClick={() => { setActiveKat(kat.id); setActiveAla('') }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeKat === kat.id ? 700 : 400, color: activeKat === kat.id ? C.accent : C.textSub, background: activeKat === kat.id ? C.accentLight : 'transparent', marginBottom: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{getKatNimi(kat, lang as any)}</span>
                    {count > 0 && <span style={{ fontSize: 11, color: C.muted }}>{count}</span>}
                  </button>
                  {activeKat === kat.id && kat.alakategoriat.length > 0 && (
                    <div style={{ marginLeft: 8, marginBottom: 4 }}>
                      {kat.alakategoriat.map(ala => {
                        const alaCount = displayProducts.filter(p => (p as any).alakategoria === ala.id).length
                        return (
                          <button key={ala.id} onClick={() => setActiveAla(activeAla === ala.id ? '' : ala.id)} style={{ width: '100%', textAlign: 'left', padding: '5px 10px 5px 14px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, color: activeAla === ala.id ? C.accent : C.muted, background: activeAla === ala.id ? C.accentLight : 'transparent', marginBottom: 1, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{getAlaNimi(ala, lang as any)}</span>
                            {alaCount > 0 && <span style={{ fontSize: 11 }}>{alaCount}</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pääsisältö */}
        <div style={{ flex: 1, padding: isMobile ? '16px 14px' : '24px 24px', minWidth: 0 }}>

          {/* Live nyt */}
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red, display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{t.home.liveNow}</h2>
                <span style={{ fontSize: 13, color: C.muted }}>{filteredShows.length}</span>
              </div>
              <Link href="/live-kaikki" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
            </div>

            {filteredShows.length === 0
              ? <div style={{ color: C.muted, fontSize: 14, padding: '12px 0' }}>Ei live-lähetyksiä tässä kategoriassa</div>
              : <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile ? 10 : 14 }}>
                  {filteredShows.map(show => (
                    <Link key={show.id} href={`/live/${show.id}`} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', display: 'block', textDecoration: 'none' }}>
                      <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {show.thumbnail
                          ? <img src={show.thumbnail} alt={show.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                        }
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)' }} />
                        <div style={{ position: 'absolute', top: 6, left: 6, background: C.red, color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 3 }}>LIVE</div>
                        <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 3 }}>{show.viewers}</div>
                      </div>
                      <div style={{ padding: isMobile ? '8px' : '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{show.seller[0]?.toUpperCase()}</div>
                          <span style={{ fontSize: 11, color: C.muted }}>@{show.seller}</span>
                        </div>
                        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{show.title}</div>
                      </div>
                    </Link>
                  ))}
                </div>
            }
          </section>

          {/* Tulossa pian — vain kaikki-näkymässä */}
          {activeKat === 'kaikki' && (
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{t.home.upcoming}</h2>
                  <span style={{ fontSize: 13, color: C.muted }}>{displayUpcoming.length}</span>
                </div>
                <Link href="/live-kaikki?status=scheduled" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
              </div>
              {displayUpcoming.length === 0
                ? <div style={{ color: C.muted, fontSize: 14, padding: '12px 0' }}>Ei tulevia lähetyksiä</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {displayUpcoming.map(show => (
                      <div key={show.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 44, height: 32, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {show.thumbnail
                            ? <img src={show.thumbnail} alt={show.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 14, color: C.dim }}>+</span>
                          }
                        </div>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{show.seller[0]?.toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{show.title}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>@{show.seller}</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, whiteSpace: 'nowrap', flexShrink: 0 }}>{formatUpcomingTime(show.scheduledAt)}</div>
                      </div>
                    ))}
                  </div>
              }
            </section>
          )}

          {/* Ostettavissa nyt */}
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{t.home.buyNow}</h2>
                <span style={{ fontSize: 13, color: C.muted }}>{filteredProducts.length}</span>
              </div>
              <Link href="/selaa" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
            </div>
            {filteredProducts.length === 0
              ? <div style={{ color: C.muted, fontSize: 14 }}>Ei tuotteita tässä kategoriassa</div>
              : <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: isMobile ? 10 : 12 }}>
                  {filteredProducts.map(p => (
                    <Link key={p.id} href={`/tuotteet/${p.id}`} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', display: 'block', textDecoration: 'none' }}>
                      <div style={{ aspectRatio: '1', overflow: 'hidden', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.thumbnail
                          ? <img src={p.thumbnail} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                        }
                      </div>
                      <div style={{ padding: isMobile ? '8px' : '9px 11px' }}>
                        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.text, marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{p.condition}</div>
                        <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: C.text }}>{p.price.toLocaleString('fi-FI')}€</div>
                      </div>
                    </Link>
                  ))}
                </div>
            }
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
