'use client'
import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { KATEGORIAT, getKatNimi, getAlaNimi, getTyyppiNimi, getNakyvatKategoriat } from '@/lib/kategoriat'
import { useLang } from '@/lib/lang-context'
import { api, auctionApi, userApi } from '@/lib/api'

interface Product {
  id: string; name: string; seller: { username: string; city?: string | null }
  category?: string; condition?: string; startPrice: number; city?: string | null
  imageUrl?: string; createdAt: string; saleType: string
  currentBid?: number | null; auctionEndsAt?: string | null
}

function productCity(p: Product) { return p.city ?? p.seller?.city ?? null }

type SaleTab = 'kaikki' | 'suora' | 'huuto'

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

function SelaaContent() {
  const { C } = useTheme()
  const { lang, t } = useLang()
  const searchParams = useSearchParams()
  const urlKat = searchParams.get('kategoria') ?? 'kaikki'
  const urlHaku = searchParams.get('haku') ?? ''
  const [activeKat, setActiveKat] = useState(urlKat)
  const [activeAla, setActiveAla] = useState('')
  const [activeTyyppi, setActiveTyyppi] = useState('')
  const [search, setSearch] = useState(urlHaku)
  const [sort, setSort] = useState('newest')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [city, setCity] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saleTab, setSaleTab] = useState<SaleTab>('kaikki')
  const [now, setNow] = useState(Date.now())
  const [userMatch, setUserMatch] = useState<any>(null)

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

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
    async function loadProducts() {
      setLoading(true)
      try {
        const params: Record<string, string> = { sort }
        if (activeKat !== 'kaikki') params.category = activeKat
        if (activeAla) params.alakategoria = activeAla
        if (activeTyyppi) params.tyyppi = activeTyyppi
        const auctionParams: Record<string, string> = { sort: sort === 'price_desc' ? 'newest' : sort }
        if (activeKat !== 'kaikki') auctionParams.category = activeKat
        if (activeAla) auctionParams.alakategoria = activeAla
        if (activeTyyppi) auctionParams.tyyppi = activeTyyppi

        let combined: Product[] = []
        if (saleTab === 'suora') {
          const data = await api.getProducts(params)
          combined = Array.isArray(data) ? data : []
        } else if (saleTab === 'huuto') {
          const data = await auctionApi.list(auctionParams)
          combined = Array.isArray(data) ? data : []
        } else {
          const [prodData, auctionData] = await Promise.all([api.getProducts(params), auctionApi.list(auctionParams)])
          combined = [...(Array.isArray(prodData) ? prodData : []), ...(Array.isArray(auctionData) ? auctionData : [])]
        }
        setProducts(combined)
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [activeKat, activeAla, activeTyyppi, sort, saleTab])

  const filtered = useMemo(() => {
    let p = products
    if (search.trim()) p = p.filter(x => x.name.toLowerCase().includes(search.toLowerCase()) || x.seller?.username?.toLowerCase().includes(search.toLowerCase()))
    if (minPrice) p = p.filter(x => x.startPrice >= Number(minPrice))
    if (maxPrice) p = p.filter(x => x.startPrice <= Number(maxPrice))
    if (city) p = p.filter(x => productCity(x) === city)
    return p
  }, [products, search, minPrice, maxPrice, city])

  const filtersActive = activeKat !== 'kaikki' || !!activeAla || !!activeTyyppi || !!search.trim() || !!minPrice || !!maxPrice || !!city

  function clearFilters() {
    setActiveKat('kaikki'); setActiveAla(''); setActiveTyyppi(''); setSearch(''); setMinPrice(''); setMaxPrice(''); setCity('')
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

  const cities = useMemo(() => {
    const set = new Set(products.map(productCity).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [products])

  const allKats = [{ id: 'kaikki', nimi: { fi: t.selaa.allCategories, en: t.selaa.allCategories } }, ...getNakyvatKategoriat()]

  const saleTabs: { id: SaleTab; label: string }[] = [
    { id: 'kaikki', label: t.selaa.allCategories },
    { id: 'suora', label: t.selaa.direct },
    { id: 'huuto', label: t.nav.auctions },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
      <Navbar />

      <div style={{ display: 'flex', gap: 8, padding: '14px 24px 0', maxWidth: 1440, margin: '0 auto', boxSizing: 'border-box' as const, flex: 1, width: '100%' }}>
        {saleTabs.map(tab => (
          <button key={tab.id} onClick={() => setSaleTab(tab.id)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${saleTab === tab.id ? C.accent : C.border}`, background: saleTab === tab.id ? C.accentLight : C.cardBg, color: saleTab === tab.id ? C.accent : C.textSub, fontSize: 13, fontWeight: saleTab === tab.id ? 700 : 400, cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {isMobile && (
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.navBg, display: 'flex', gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.selaa.search} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', fontSize: 14, color: C.text, minWidth: 0 }} />
          <button onClick={() => setShowFilters(s => !s)} style={{ background: showFilters ? C.accent : C.surface, border: `1px solid ${showFilters ? C.accent : C.border}`, color: showFilters ? '#fff' : C.textSub, padding: '9px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.selaa.filter}
          </button>
        </div>
      )}

      {isMobile && showFilters && (
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{t.selaa.category}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {allKats.map(kat => (
              <button key={kat.id} onClick={() => { setActiveKat(kat.id); setActiveAla(''); setActiveTyyppi('') }} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${activeKat === kat.id ? C.accent : C.border}`, background: activeKat === kat.id ? C.accentLight : C.cardBg, color: activeKat === kat.id ? C.accent : C.textSub, fontSize: 13, fontWeight: activeKat === kat.id ? 700 : 400, cursor: 'pointer' }}>
                {getKatNimi(kat as any, lang as any)}
              </button>
            ))}
          </div>
          {activeKat !== 'kaikki' && (KATEGORIAT.find(k => k.id === activeKat)?.alakategoriat ?? []).length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{t.selaa.subcategory}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, background: C.surface, borderRadius: 10, padding: 8 }}>
                {(KATEGORIAT.find(k => k.id === activeKat)?.alakategoriat ?? []).map((ala: any) => (
                  <button key={ala.id} onClick={() => { setActiveAla(activeAla === ala.id ? '' : ala.id); setActiveTyyppi('') }} style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${activeAla === ala.id ? C.accent : C.border}`, background: activeAla === ala.id ? C.accentLight : C.surface2, color: activeAla === ala.id ? C.accent : C.textSub, fontSize: 12, fontWeight: activeAla === ala.id ? 700 : 400, cursor: 'pointer' }}>
                    {getAlaNimi(ala, lang as any)}
                  </button>
                ))}
              </div>
              {activeAla && (() => {
                const tyypit = ((KATEGORIAT.find(k => k.id === activeKat)?.alakategoriat ?? []) as any[]).find(a => a.id === activeAla)?.tyypit ?? []
                return tyypit.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, background: C.surface2, borderRadius: 10, padding: 8 }}>
                    {tyypit.map((ty: any) => (
                      <button key={ty.id} onClick={() => setActiveTyyppi(activeTyyppi === ty.id ? '' : ty.id)} style={{ padding: '4px 9px', borderRadius: 20, border: `1px solid ${activeTyyppi === ty.id ? C.accent : C.border}`, background: activeTyyppi === ty.id ? C.accentLight : C.cardBg, color: activeTyyppi === ty.id ? C.accent : C.muted, fontSize: 11, fontWeight: activeTyyppi === ty.id ? 700 : 400, cursor: 'pointer' }}>
                        {getTyyppiNimi(ty, lang as any)}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}
            </>
          )}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{t.selaa.sort}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {SORT_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setSort(o.id)} style={{ flex: 1, padding: '8px 6px', borderRadius: 6, border: `1px solid ${sort === o.id ? C.accent : C.border}`, background: sort === o.id ? C.accentLight : C.cardBg, color: sort === o.id ? C.accent : C.textSub, fontSize: 12, fontWeight: sort === o.id ? 700 : 400, cursor: 'pointer' }}>
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{t.selaa.price}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder={t.selaa.minPrice} style={{ flex: 1, minWidth: 0, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.text, outline: 'none' }} />
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder={t.selaa.maxPrice} style={{ flex: 1, minWidth: 0, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.text, outline: 'none' }} />
            {(minPrice || maxPrice) && <button onClick={() => { setMinPrice(''); setMaxPrice('') }} style={{ fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>}
          </div>
          {cities.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{t.selaa.city}</div>
              <select value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.text, outline: 'none' }}>
                <option value="">{t.selaa.allCities}</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', maxWidth: 1440, margin: '0 auto' }}>
        {!isMobile && (
          <div style={{ width: 200, flexShrink: 0, padding: '20px 12px', borderRight: `1px solid ${C.border}`, position: 'sticky', top: 58, height: 'calc(100vh - 58px)', overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10 }}>{t.selaa.category}</div>
            {allKats.map(kat => {
              const count = kat.id === 'kaikki' ? products.length : products.filter(p => p.category === kat.id).length
              return (
                <div key={kat.id}>
                  <button onClick={() => { setActiveKat(kat.id); setActiveAla(''); setActiveTyyppi('') }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeKat === kat.id ? 700 : 400, color: activeKat === kat.id ? C.accent : C.textSub, background: activeKat === kat.id ? C.accentLight : 'transparent', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{getKatNimi(kat as any, lang as any)}</span>
                    {count > 0 && <span style={{ fontSize: 11, color: C.muted }}>{count}</span>}
                  </button>
                  {activeKat === kat.id && kat.id !== 'kaikki' && (KATEGORIAT.find(k => k.id === kat.id)?.alakategoriat ?? []).length > 0 && (
                    <div style={{ marginLeft: 8, marginBottom: 4, background: C.surface, borderRadius: 8, padding: '4px', borderLeft: `2px solid ${C.border}` }}>
                      {(KATEGORIAT.find(k => k.id === kat.id)?.alakategoriat ?? []).map((ala: any) => (
                        <div key={ala.id}>
                          <button onClick={() => { setActiveAla(activeAla === ala.id ? '' : ala.id); setActiveTyyppi('') }} style={{ width: '100%', textAlign: 'left', padding: '5px 10px 5px 16px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, color: activeAla === ala.id ? C.accent : C.muted, background: activeAla === ala.id ? C.accentLight : 'transparent', marginBottom: 1 }}>
                            {getAlaNimi(ala, lang as any)}
                          </button>
                          {activeAla === ala.id && ala.tyypit?.length > 0 && (
                            <div style={{ marginLeft: 10, marginBottom: 2, background: C.surface, borderRadius: 6, padding: '2px 0' }}>
                              {ala.tyypit.map((ty: any) => (
                                <button key={ty.id} onClick={() => setActiveTyyppi(activeTyyppi === ty.id ? '' : ty.id)} style={{ width: '100%', textAlign: 'left', padding: '4px 10px 4px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: activeTyyppi === ty.id ? 700 : 400, color: activeTyyppi === ty.id ? C.accent : C.muted, background: activeTyyppi === ty.id ? C.accentLight : 'transparent' }}>
                                  {getTyyppiNimi(ty, lang as any)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10 }}>{t.selaa.price}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder={t.selaa.minPrice} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' as const }} />
                <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder={t.selaa.maxPrice} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>
            {cities.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10 }}>{t.selaa.city}</div>
                <select value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' as const }}>
                  <option value="">{t.selaa.allCities}</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, padding: isMobile ? '14px' : '24px', minWidth: 0 }}>
          {!isMobile && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.selaa.search} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 14px', fontSize: 14, color: C.text }} />
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px', fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none' }}>
                {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          )}

          {userMatch && (
            <Link href={`/u/${encodeURIComponent(userMatch.username)}`} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.accent, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
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
              <button onClick={clearFilters} style={{ background: C.accent, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                {t.selaa.clearFilters}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? 10 : 14 }}>
              {filtered.map(p => {
                const isAuction = p.saleType === 'auction'
                const remaining = isAuction && p.auctionEndsAt ? new Date(p.auctionEndsAt).getTime() - now : null
                return (
                  <Link key={p.id} href={isAuction ? `/huutokauppa/${p.id}` : `/tuotteet/${p.id}`} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', display: 'block', textDecoration: 'none' }}>
                    <div style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.imageUrl
                        ? <img src={p.imageUrl.split('|||')[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                      }
                      {remaining !== null && (
                        <div style={{ position: 'absolute', bottom: 6, left: 6, background: remaining < 60 * 60 * 1000 ? '#EF4444' : C.accent, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4 }}>
                          {auctionTimeLeft(remaining)}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: isMobile ? '8px' : '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.text, marginBottom: 3, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{p.name}</div>
                        <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: C.text }}>{(isAuction ? (p.currentBid ?? p.startPrice) : p.startPrice).toLocaleString('fi-FI')}€</div>
                        {p.condition && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{p.condition}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: C.muted }}>@{p.seller?.username}</div>
                        {productCity(p) && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{productCity(p)}</div>}
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

export default function SelaaPage() {
  return <Suspense><SelaaContent /></Suspense>
}
