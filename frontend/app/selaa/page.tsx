'use client'
import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CategorySidebar from '@/components/CategorySidebar'
import ProductCard from '@/components/ProductCard'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { api, userApi } from '@/lib/api'

interface Product {
  id: string; name: string; seller: { username: string; city?: string | null; businessId?: string | null; verified?: boolean | null }
  category?: string; alakategoria?: string; tyyppi?: string; condition?: string; gradingCompany?: string | null; grade?: string | null; startPrice: number; city?: string | null
  imageUrl?: string; createdAt: string; vatIncluded?: boolean; saleType?: string
}

function productCity(p: Product) { return p.city ?? p.seller?.city ?? null }

function SelaaContent() {
  const { C } = useTheme()
  const { t } = useLang()
  const searchParams = useSearchParams()
  const urlKat = searchParams.get('kategoria') ?? 'kaikki'
  const urlHaku = searchParams.get('haku') ?? ''
  const [activeKat, setActiveKat] = useState(urlKat)
  const [activeAla, setActiveAla] = useState('')
  const [activeTyyppi, setActiveTyyppi] = useState('')
  const [activeCondition, setActiveCondition] = useState<string[]>([])
  const [search, setSearch] = useState(urlHaku)
  const [sort, setSort] = useState('newest')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [city, setCity] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [userMatch, setUserMatch] = useState<any>(null)
  // Scroll-position tallennus/palautus (ks. CLAUDE.md "Iso palautekierros" kohta 11) - selaimen
  // oma back-scroll-restaurointi ei toimi luotettavasti tällä sivulla, koska sisältö (products)
  // haetaan asynkronisesti mountin JÄLKEEN: kun palataan takaisin, sivu on hetken "Ladataan..."
  // -tilassa (lyhyt dokumentti), jolloin selaimen restaurointi ei löydä mitään palautettavaa ja
  // jää ylös kun sisältö sitten kasvaa. Tallennetaan/palautetaan siis itse sessionStoragessa,
  // avaimena nykyinen hakukyselymerkkijono (sama filtterit = sama tallennettu sijainti).
  const scrollKey = `hb_scroll_selaa:${searchParams.toString()}`
  const restoredKeyRef = useRef<string | null>(null)

  const SORT_OPTIONS = [
    { id: 'newest', label: t.selaa.newest },
    { id: 'price_asc', label: t.selaa.priceAsc },
    { id: 'price_desc', label: t.selaa.priceDesc },
  ]

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    setActiveKat(urlKat)
    setSearch(urlHaku)
  }, [urlKat, urlHaku])

  useEffect(() => {
    // Haku (search) lähetetään nyt myös palvelimelle (aiemmin pelkkä client-puolen suodatin
    // jo ladatun 50 tuotteen listalta - ks. CLAUDE.md "Iso palautekierros" kohta 8/11) jotta
    // (a) huutokauppakohteet voivat ylipäätään päätyä listaan (backend laajentaa saleType-
    // suodattimen hakusanalla) ja (b) haku kattaa koko katalogin eikä vain viimeisimpiä 50:tä.
    // Kevyt debounce ettei jokainen näppäinpainallus laukaise omaa pyyntöä.
    const timeout = setTimeout(() => {
      async function loadProducts() {
        setLoading(true)
        try {
          const params: Record<string, string> = { sort }
          if (activeKat !== 'kaikki') params.category = activeKat
          if (activeAla) params.alakategoria = activeAla
          if (activeTyyppi) params.tyyppi = activeTyyppi
          if (search.trim()) params.search = search.trim()
          const data = await api.getProducts(params)
          setProducts(Array.isArray(data) ? data : [])
        } catch {
          setProducts([])
        } finally {
          setLoading(false)
        }
      }
      loadProducts()
    }, search.trim() ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [activeKat, activeAla, activeTyyppi, sort, search])

  const filtered = useMemo(() => {
    let p = products
    if (search.trim()) p = p.filter(x => x.name.toLowerCase().includes(search.toLowerCase()) || x.seller?.username?.toLowerCase().includes(search.toLowerCase()))
    if (minPrice) p = p.filter(x => x.startPrice >= Number(minPrice))
    if (maxPrice) p = p.filter(x => x.startPrice <= Number(maxPrice))
    if (city) p = p.filter(x => productCity(x) === city)
    if (activeCondition.length > 0) p = p.filter(x => activeCondition.includes(x.condition ?? ''))
    return p
  }, [products, search, minPrice, maxPrice, city, activeCondition])

  const filtersActive = activeKat !== 'kaikki' || !!activeAla || !!activeTyyppi || activeCondition.length > 0 || !!search.trim() || !!minPrice || !!maxPrice || !!city

  function clearFilters() {
    setActiveKat('kaikki'); setActiveAla(''); setActiveTyyppi(''); setActiveCondition([]); setSearch(''); setMinPrice(''); setMaxPrice(''); setCity('')
  }

  // Suora käyttäjähaku — löytää myyjän tililtä vaikka hänellä ei olisi juuri nyt tuotteita myynnissä
  useEffect(() => {
    const q = search.trim()
    if (!q || q.includes(' ')) { setUserMatch(null); return }
    let cancelled = false
    const timer = setTimeout(() => {
      userApi.getPublic(q).then(u => { if (!cancelled) setUserMatch(u) }).catch(() => { if (!cancelled) setUserMatch(null) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [search])

  // Tallennetaan scroll-positio jatkuvasti (kevyt throttle rAF:lla) kesken selauksen.
  useEffect(() => {
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        sessionStorage.setItem(scrollKey, String(window.scrollY))
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [scrollKey])

  // Estetään selaimen OMA automaattinen back-scroll-restaurointi kokonaan - se laukeaa
  // popstate-tapahtumassa VÄLITTÖMÄSTI, ennen kuin React on ehtinyt renderöidä tuotegridin,
  // jolloin se yrittää palauttaa liian lyhyeksi jääneelle "Ladataan..."-dokumentille eikä
  // koskaan yritä uudestaan kun sisältö sitten kasvaa. 'manual' antaa täyden hallinnan
  // alla olevalle omalle palautuslogiikalle sen sijaan että ne kilpailisivat keskenään.
  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return
    const prev = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = prev }
  }, [])

  // Palautetaan tallennettu sijainti kun sisältö on ehtinyt latautua (kerran per avain).
  // Yksi rAF ei riittänyt luotettavasti (kilpailee Next.js:n omien, ajoitukseltaan
  // vaihtelevien scroll-yritysten kanssa) - pakotetaan sijainti uudestaan lyhyen ajan
  // (n. 500ms) kunnes se pysyy, sen sijaan että luotettaisiin yhteen kertaan riittävän.
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

  const cities = useMemo(() => {
    const set = new Set(products.map(productCity).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [products])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <Navbar />

      <div style={{ display: 'flex', maxWidth: 1440, margin: '0 auto', flex: 1, width: '100%' }}>
        {!isMobile && (
          <CategorySidebar items={products} activeKat={activeKat} setActiveKat={setActiveKat} activeAla={activeAla} setActiveAla={setActiveAla} activeTyyppi={activeTyyppi} setActiveTyyppi={setActiveTyyppi} activeCondition={activeCondition} setActiveCondition={setActiveCondition} isMobile={false} />
        )}

        <div style={{ flex: 1, padding: isMobile ? '16px 14px' : '24px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.selaa.search} style={{ flex: '1 1 200px', maxWidth: 360, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 14px', fontSize: 14, color: C.text, boxSizing: 'border-box' as const }} />
            {!isMobile && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder={t.selaa.minPrice} style={{ width: 90, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 10px', fontSize: 13, color: C.text, outline: 'none' }} />
                <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder={t.selaa.maxPrice} style={{ width: 90, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 10px', fontSize: 13, color: C.text, outline: 'none' }} />
                {cities.length > 0 && (
                  <select value={city} onChange={e => setCity(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none' }}>
                    <option value="">{t.selaa.allCities}</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none' }}>
                  {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
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
              <CategorySidebar items={products} activeKat={activeKat} setActiveKat={setActiveKat} activeAla={activeAla} setActiveAla={setActiveAla} activeTyyppi={activeTyyppi} setActiveTyyppi={setActiveTyyppi} activeCondition={activeCondition} setActiveCondition={setActiveCondition} isMobile={true} />
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '14px 0 8px' }}>{t.selaa.sort}</div>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ width: '100%', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none', boxSizing: 'border-box' as const }}>
                {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '14px 0 8px' }}>{t.selaa.price}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder={t.selaa.minPrice} style={{ flex: 1, minWidth: 0, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' as const }} />
                <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder={t.selaa.maxPrice} style={{ flex: 1, minWidth: 0, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
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

          {userMatch && (
            <Link href={`/u/${encodeURIComponent(userMatch.username)}`} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.accentSolid, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: C.accentText, flexShrink: 0 }}>
                {userMatch.avatarUrl
                  ? <img src={userMatch.avatarUrl} alt={userMatch.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (userMatch.name?.[0]?.toUpperCase() ?? '?')
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userMatch.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>@{userMatch.username} · {t.selaa.viewProfile}</div>
              </div>
            </Link>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: C.muted }}>
              {loading ? '...' : `${filtered.length} ${t.selaa.results}`}
            </div>
            {filtersActive && (
              <button onClick={clearFilters} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textSub, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.selaa.clearFilters}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Ladataan...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>{t.selaa.noResults}</div>
              <button onClick={clearFilters} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                {t.selaa.clearFilters}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? 10 : 14 }}>
              {filtered.map(p => (
                <ProductCard
                  key={p.id} id={p.id} href={p.saleType === 'auction' ? `/huutokauppa/${p.id}` : `/tuotteet/${p.id}`} name={p.name} imageUrl={p.imageUrl}
                  price={p.startPrice} condition={p.condition} gradingCompany={p.gradingCompany} grade={p.grade} sellerUsername={p.seller?.username}
                  sellerBusinessId={p.seller?.businessId} vatIncluded={!!p.vatIncluded} sellerVerified={!!p.seller?.verified} city={productCity(p)} isMobile={isMobile}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default function SelaaPage() {
  return <Suspense><SelaaContent /></Suspense>
}
