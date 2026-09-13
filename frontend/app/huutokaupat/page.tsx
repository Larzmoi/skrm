'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CategorySidebar from '@/components/CategorySidebar'
import ProductCard from '@/components/ProductCard'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { auctionApi } from '@/lib/api'

interface Auction {
  id: string; name: string; startPrice: number; currentBid: number | null; auctionEndsAt: string
  imageUrl?: string; category?: string; alakategoria?: string; tyyppi?: string; condition?: string; city?: string | null
  gradingCompany?: string | null; grade?: string | null
  seller: { username: string; city?: string | null; businessId?: string | null; verified?: boolean | null }; _count?: { bids: number }
  vatIncluded?: boolean
}

function auctionCity(a: Auction) { return a.city ?? a.seller?.city ?? null }

function timeLeftLabel(ms: number, endedLabel: string) {
  if (ms <= 0) return endedLabel
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
  const [activeCondition, setActiveCondition] = useState<string[]>([])
  const [city, setCity] = useState('')
  const [isMobile, setIsMobile] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [now, setNow] = useState(Date.now())
  // Sama scroll-position-korjaus kuin /selaa:lla (ks. CLAUDE.md "Etusivu/haku..." 2026-09-13) -
  // sama juurisyy: jatkuva window-scroll-kuuntelija ei siivoutunut synkronisesti navigoinnin
  // yhteydessä, uuden sivun oma scroll-nollaus ehti ylikirjoittaa juuri tallennetun sijainnin
  // "0":lla. Tallennetaan siis vain klikkaushetkellä (onClickCapture), ei jatkuvasti.
  const scrollKey = `hb_scroll_huutokaupat:${activeKat}:${activeAla}:${activeTyyppi}:${sort}:${city}:${activeCondition.join(',')}`
  const restoredKeyRef = useRef<string | null>(null)
  function saveScrollBeforeNav() {
    sessionStorage.setItem(scrollKey, String(window.scrollY))
  }

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

  // Otetaan selaimen oma back-scroll-restaurointi pois käytöstä - sama korjaus kuin
  // /selaa:lla, ks. CLAUDE.md.
  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return
    const prev = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = prev }
  }, [])

  // Palautetaan tallennettu sijainti kun sisältö on ehtinyt latautua (kerran per avain).
  useEffect(() => {
    if (loading || restoredKeyRef.current === scrollKey) return
    restoredKeyRef.current = scrollKey
    const saved = sessionStorage.getItem(scrollKey)
    if (!saved) return
    const target = Number(saved)
    let attempts = 0
    const id = setInterval(() => {
      window.scrollTo(0, target)
      attempts++
      if (attempts >= 10 || Math.abs(window.scrollY - target) < 4) clearInterval(id)
    }, 50)
    return () => clearInterval(id)
  }, [loading, scrollKey])

  // LISÄTTY 2026-09-13, löytyi oikealla selaimella testaamalla: pelkkä `loading`-riippuvainen
  // efekti ei riittänyt tällä sivulla (toisin kuin /selaa:lla) - tällä sivulla ei ole
  // useSearchParams-riippuvuutta, joten Next.js saattaa palauttaa saman, jo mountatun
  // komponentti-instanssin takaisin-navigoinnissa uudelleenlataamatta mitään - `loading` ei
  // koskaan vaihdu jolloin efekti ei koskaan laukea uudestaan. `popstate`-kuuntelija toimii
  // riippumatta siitä mountaako React komponentin uudelleen vai ei, koska se on suoraan
  // selaimen oma tapahtuma.
  useEffect(() => {
    function onPopState() {
      const saved = sessionStorage.getItem(scrollKey)
      if (!saved) return
      const target = Number(saved)
      let attempts = 0
      const id = setInterval(() => {
        window.scrollTo(0, target)
        attempts++
        if (attempts >= 10 || Math.abs(window.scrollY - target) < 4) clearInterval(id)
      }, 50)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [scrollKey])

  const cities = useMemo(() => {
    const set = new Set(auctions.map(auctionCity).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [auctions])

  const filtered = useMemo(() => {
    let a = auctions
    if (city) a = a.filter(x => auctionCity(x) === city)
    if (activeCondition.length > 0) a = a.filter(x => activeCondition.includes(x.condition ?? ''))
    return a
  }, [auctions, city, activeCondition])

  const sortOptions = [
    { id: 'ending_soon', label: t.auction.endingSoon },
    { id: 'newest', label: t.selaa.newest },
    { id: 'price_asc', label: t.selaa.priceAsc },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <Navbar />

      <div style={{ display: 'flex', maxWidth: 1440, margin: '0 auto', flex: 1, width: '100%' }}>
        {!isMobile && (
          <>
            <CategorySidebar items={auctions} activeKat={activeKat} setActiveKat={setActiveKat} activeAla={activeAla} setActiveAla={setActiveAla} activeTyyppi={activeTyyppi} setActiveTyyppi={setActiveTyyppi} activeCondition={activeCondition} setActiveCondition={setActiveCondition} isMobile={false} />
          </>
        )}

        <div style={{ flex: 1, padding: isMobile ? '16px 14px' : '24px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>{t.nav.auctions}</h1>
              <p style={{ color: C.muted, fontSize: 13 }}>{loading ? '...' : t.auction.activeCount.replace('{count}', String(filtered.length))}</p>
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
              <button onClick={() => setShowFilters(s => !s)} style={{ background: showFilters ? C.accentSolid : C.surface, border: `1px solid ${showFilters ? C.accentSolid : C.border}`, color: showFilters ? C.accentText : C.textSub, padding: '9px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.selaa.filter}
              </button>
            )}
          </div>

          {isMobile && showFilters && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <CategorySidebar items={auctions} activeKat={activeKat} setActiveKat={setActiveKat} activeAla={activeAla} setActiveAla={setActiveAla} activeTyyppi={activeTyyppi} setActiveTyyppi={setActiveTyyppi} activeCondition={activeCondition} setActiveCondition={setActiveCondition} isMobile={true} />
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
            <div onClickCapture={saveScrollBeforeNav} style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? 10 : 14 }}>
              {filtered.map(a => {
                const remaining = new Date(a.auctionEndsAt).getTime() - now
                const urgent = remaining < 60 * 60 * 1000
                return (
                  <ProductCard
                    key={a.id} id={a.id} href={`/huutokauppa/${a.id}`} name={a.name} imageUrl={a.imageUrl}
                    price={a.currentBid ?? a.startPrice} condition={a.condition} gradingCompany={a.gradingCompany} grade={a.grade}
                    sellerUsername={a.seller?.username} sellerBusinessId={a.seller?.businessId} vatIncluded={!!a.vatIncluded} sellerVerified={!!a.seller?.verified}
                    city={auctionCity(a)} timeBadge={{ text: timeLeftLabel(remaining, t.auction.ended), urgent }} bidCount={a._count?.bids ?? 0}
                  />
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
