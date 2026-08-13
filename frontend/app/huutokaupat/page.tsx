'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CategorySidebar from '@/components/CategorySidebar'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { auctionApi } from '@/lib/api'

interface Auction {
  id: string; name: string; startPrice: number; currentBid: number | null; auctionEndsAt: string
  imageUrl?: string; category?: string; alakategoria?: string; city?: string | null
  seller: { username: string; city?: string | null }; _count?: { bids: number }
}

function auctionCity(a: Auction) { return a.city ?? a.seller?.city ?? null }

function timeLeftLabel(ms: number) {
  if (ms <= 0) return 'Päättynyt'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return `${d}pv ${h}h`
  if (h > 0) return `${h}h ${m}min`
  return `${m}min ${s}s`
}

export default function HuutokaupatPage() {
  const { C } = useTheme()
  const { t } = useLang()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('ending_soon')
  const [activeKat, setActiveKat] = useState('kaikki')
  const [activeAla, setActiveAla] = useState('')
  const [activeTyyppi, setActiveTyyppi] = useState('')
  const [city, setCity] = useState('')
  const [isMobile, setIsMobile] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = { sort }
    if (activeKat !== 'kaikki') params.category = activeKat
    if (activeAla) params.alakategoria = activeAla
    if (activeTyyppi) params.tyyppi = activeTyyppi
    auctionApi.list(params)
      .then((data: Auction[]) => setAuctions(Array.isArray(data) ? data : []))
      .catch(() => setAuctions([]))
      .finally(() => setLoading(false))
  }, [sort, activeKat, activeAla, activeTyyppi])

  const cities = useMemo(() => {
    const set = new Set(auctions.map(auctionCity).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [auctions])

  const filtered = useMemo(() => {
    if (!city) return auctions
    return auctions.filter(a => auctionCity(a) === city)
  }, [auctions, city])

  const sortOptions = [
    { id: 'ending_soon', label: 'Päättyy pian' },
    { id: 'newest', label: t.selaa.newest },
    { id: 'price_asc', label: t.selaa.priceAsc },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <Navbar />

      <div style={{ display: 'flex', maxWidth: 1440, margin: '0 auto', flex: 1, width: '100%' }}>
        {!isMobile && (
          <>
            <CategorySidebar items={auctions} activeKat={activeKat} setActiveKat={setActiveKat} activeAla={activeAla} setActiveAla={setActiveAla} activeTyyppi={activeTyyppi} setActiveTyyppi={setActiveTyyppi} isMobile={false} />
          </>
        )}

        <div style={{ flex: 1, padding: isMobile ? '16px 14px' : '24px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>Huutokaupat</h1>
              <p style={{ color: C.muted, fontSize: 13 }}>{loading ? '...' : `${filtered.length} aktiivista huutokauppaa`}</p>
            </div>
            {!isMobile && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {cities.length > 0 && (
                  <select value={city} onChange={e => setCity(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none' }}>
                    <option value="">{t.selaa.allCities}</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none' }}>
                  {sortOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            )}
            {isMobile && (
              <button onClick={() => setShowFilters(s => !s)} style={{ background: showFilters ? C.accent : C.surface, border: `1px solid ${showFilters ? C.accent : C.border}`, color: showFilters ? '#fff' : C.textSub, padding: '9px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.selaa.filter}
              </button>
            )}
          </div>

          {isMobile && showFilters && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <CategorySidebar items={auctions} activeKat={activeKat} setActiveKat={setActiveKat} activeAla={activeAla} setActiveAla={setActiveAla} activeTyyppi={activeTyyppi} setActiveTyyppi={setActiveTyyppi} isMobile={true} />
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '14px 0 8px' }}>{t.selaa.sort}</div>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ width: '100%', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none', boxSizing: 'border-box' as const }}>
                {sortOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              {cities.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '14px 0 8px' }}>{t.selaa.city}</div>
                  <select value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none', boxSizing: 'border-box' as const }}>
                    <option value="">{t.selaa.allCities}</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </>
              )}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Ladataan...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>Ei aktiivisia huutokauppoja</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? 10 : 14 }}>
              {filtered.map(a => {
                const remaining = new Date(a.auctionEndsAt).getTime() - now
                const urgent = remaining < 60 * 60 * 1000
                const thumbnail = a.imageUrl ? a.imageUrl.split('|||')[0] : ''
                return (
                  <Link key={a.id} href={`/huutokauppa/${a.id}`} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', display: 'block', textDecoration: 'none' }}>
                    <div style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {thumbnail
                        ? <img src={thumbnail} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                      }
                      <div style={{ position: 'absolute', bottom: 6, left: 6, background: urgent ? '#EF4444' : C.accent, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                        {timeLeftLabel(remaining)}
                      </div>
                      <div style={{ position: 'absolute', top: 6, right: 6, background: C.accent, color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 4 }}>
                        {a._count?.bids ?? 0} huutoa
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{a.name}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{(a.currentBid ?? a.startPrice).toLocaleString('fi-FI')}€</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: C.muted }}>@{a.seller?.username}</div>
                        {auctionCity(a) && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{auctionCity(a)}</div>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
