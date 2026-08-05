'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { useTheme } from '@/lib/theme-context'
import { useState, useMemo, useEffect } from 'react'
import { useKategoria } from '@/lib/kategoria-context'
import { KATEGORIAT, getKatNimi, getAlaNimi } from '@/lib/kategoriat'
import { useLang } from '@/lib/lang-context'
import Footer from '@/components/layout/Footer'
import { useAuth } from '@/lib/auth-context'
import { auctionApi } from '@/lib/api'
import { BACKEND_URL } from '@/lib/backend'

function auctionTimeLeft(ms: number) {
  if (ms <= 0) return 'Päättynyt'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (d > 0) return `${d}pv ${h}h`
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export default function Home() {
  const { C } = useTheme()
  const { activeKat, setActiveKat } = useKategoria()
  const { lang, t } = useLang()
  const { user } = useAuth()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(true)
  const [shows, setShows] = useState<any[]>([])
  const [products, setProductsState] = useState<any[]>([])
  const [auctions, setAuctions] = useState<any[]>([])
  const [heroHidden, setHeroHidden] = useState(false)
  const [activeAla, setActiveAla] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    // Piilota hero kirjautuneille jos he ovat piilottaneet sen
    if (user) {
      const hidden = localStorage.getItem('skrm_hero_hidden')
      if (hidden === '1') setHeroHidden(true)
    }
  }, [user])

  useEffect(() => {
    fetch(BACKEND_URL + '/shows')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setShows(data) })
      .catch(() => {})

    import('@/lib/api').then(({ api }) => {
      api.getProducts({ limit: '12' })
        .then((data: any[]) => { if (Array.isArray(data) && data.length > 0) setProductsState(data) })
        .catch(() => {})
    })

    auctionApi.list({ limit: '4', sort: 'ending_soon' })
      .then((data: any[]) => { if (Array.isArray(data) && data.length > 0) setAuctions(data) })
      .catch(() => {})
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
  }, [activeKat, JSON.stringify(displayShows)])

  const filteredProducts = useMemo(() => {
    let p = displayProducts
    if (activeKat !== 'kaikki') p = p.filter(x => x.category === activeKat)
    if (activeAla) p = p.filter(x => x.alakategoria === activeAla)
    return p
  }, [activeKat, activeAla, JSON.stringify(displayProducts)])

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

  function hideHero() {
    setHeroHidden(true)
    localStorage.setItem('skrm_hero_hidden', '1')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />

      {/* Hero */}
      {!heroHidden && (
        <div style={{ background: C.navBg, borderBottom: `1px solid ${C.border}`, position: 'relative' }}>
          {/* Pulssi-efekti taustalla */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${C.accent}15 0%, transparent 70%)` }} />
          </div>

          <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '40px 24px 32px' : '60px 24px 48px', textAlign: 'center', position: 'relative' }}>
            <h1 style={{ fontSize: isMobile ? 28 : 42, fontWeight: 900, color: C.text, marginBottom: 12, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
              {t.home.heroTitleLine1}<br />{t.home.heroTitleLine2}
            </h1>
            <p style={{ fontSize: isMobile ? 14 : 16, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>
              {t.home.heroSubtitle}
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
              <Link href="/selaa" style={{ background: C.accent, color: '#fff', padding: isMobile ? '11px 24px' : '13px 32px', borderRadius: 8, fontWeight: 700, fontSize: isMobile ? 14 : 15, textDecoration: 'none' }}>
                {t.home.heroBrowse}
              </Link>
              <Link href="/register" style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, padding: isMobile ? '11px 24px' : '13px 32px', borderRadius: 8, fontWeight: 700, fontSize: isMobile ? 14 : 15, textDecoration: 'none' }}>
                {t.home.heroBecomeSeller}
              </Link>
            </div>

            {/* Luottamuspalkki */}
            <div style={{ display: 'flex', gap: isMobile ? 16 : 32, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: t.home.heroTrustSecure },
                { label: t.home.heroTrustFinnish },
                { label: t.home.heroTrustCommission },
                { label: t.home.heroTrustFreeSignup },
              ].map(item => (
                <span key={item.label} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.accent, display: 'inline-block', flexShrink: 0 }} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Piilota-nappi kirjautuneille */}
          {user && (
            <button onClick={hideHero} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 12, padding: '4px 8px' }}>
              {t.home.heroHide}
            </button>
          )}
        </div>
      )}

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
          <div style={{ width: 200, flexShrink: 0, padding: '16px 10px', borderRight: `1px solid ${C.border}`, position: 'sticky', top: 58, height: 'calc(100vh - 58px)', overflowY: 'auto' }}>
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
                        const alaCount = displayProducts.filter(p => p.alakategoria === ala.id).length
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

          {/* Myynnissä — ensin */}
          {filteredProducts.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{t.home.buyNow}</h2>
                  <span style={{ fontSize: 13, color: C.muted }}>{filteredProducts.length}</span>
                </div>
                <Link href="/selaa" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: isMobile ? 10 : 12 }}>
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
            </section>
          )}

          {/* Huutokaupat */}
          {auctions.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{t.nav.auctions}</h2>
                  <span style={{ fontSize: 13, color: C.muted }}>{auctions.length}</span>
                </div>
                <Link href="/huutokaupat" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: isMobile ? 10 : 12 }}>
                {auctions.map((a: any) => {
                  const thumbnail = a.imageUrl ? a.imageUrl.split('|||')[0] : ''
                  const remaining = new Date(a.auctionEndsAt).getTime() - now
                  return (
                    <Link key={a.id} href={`/huutokauppa/${a.id}`} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', display: 'block', textDecoration: 'none' }}>
                      <div style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {thumbnail
                          ? <img src={thumbnail} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                        }
                        <div style={{ position: 'absolute', bottom: 6, left: 6, background: remaining < 60 * 60 * 1000 ? '#EF4444' : 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4 }}>
                          {auctionTimeLeft(remaining)}
                        </div>
                      </div>
                      <div style={{ padding: isMobile ? '8px' : '9px 11px' }}>
                        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.text, marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{a.name}</div>
                        <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: C.text }}>{(a.currentBid ?? a.startPrice).toLocaleString('fi-FI')}€</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Live nyt — vain jos lähetyksiä */}
          {filteredShows.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red, display: 'inline-block' }} />
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{t.home.liveNow}</h2>
                  <span style={{ fontSize: 13, color: C.muted }}>{filteredShows.length}</span>
                </div>
                <Link href="/live-kaikki" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile ? 10 : 14 }}>
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
            </section>
          )}

          {/* Tulossa pian — vain jos lähetyksiä ja kaikki-näkymässä */}
          {activeKat === 'kaikki' && displayUpcoming.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{t.home.upcoming}</h2>
                  <span style={{ fontSize: 13, color: C.muted }}>{displayUpcoming.length}</span>
                </div>
                <Link href="/live-kaikki?status=scheduled" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            </section>
          )}

          {/* Tyhjä tila */}
          {filteredProducts.length === 0 && filteredShows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>Ei tuotteita tai lähetyksiä tässä kategoriassa</div>
              <button onClick={() => { setActiveKat('kaikki'); setActiveAla('') }} style={{ background: C.accent, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Näytä kaikki
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
