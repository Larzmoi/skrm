'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useTheme } from '@/lib/theme-context'
import { KATEGORIAT, getKatNimi, getAlaNimi } from '@/lib/kategoriat'
import { useLang } from '@/lib/lang-context'
import { api } from '@/lib/api'

interface Product {
  id: string; name: string; seller: { username: string }
  category?: string; condition?: string; startPrice: number
  imageUrl?: string; createdAt: string; saleType: string
}

export default function SelaaPage() {
  const { C } = useTheme()
  const { lang, t } = useLang()
  const [activeKat, setActiveKat] = useState(() => {
    if (typeof window === 'undefined') return 'kaikki'
    return new URLSearchParams(window.location.search).get('kategoria') ?? 'kaikki'
  })
  const [activeAla, setActiveAla] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [maxPrice, setMaxPrice] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

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
    async function loadProducts() {
      setLoading(true)
      try {
        const params: Record<string, string> = { sort }
        if (activeKat !== 'kaikki') params.category = activeKat
        if (activeAla) params.alakategoria = activeAla
        const data = await api.getProducts(params)
        setProducts(Array.isArray(data) ? data : [])
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [activeKat, activeAla, sort])

  const filtered = useMemo(() => {
    let p = products
    if (search.trim()) p = p.filter(x => x.name.toLowerCase().includes(search.toLowerCase()) || x.seller?.username?.toLowerCase().includes(search.toLowerCase()))
    if (maxPrice) p = p.filter(x => x.startPrice <= Number(maxPrice))
    return p
  }, [products, search, maxPrice])

  const allKats = [{ id: 'kaikki', nimi: { fi: t.selaa.allCategories, en: t.selaa.allCategories } }, ...KATEGORIAT]

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />

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
              <button key={kat.id} onClick={() => setActiveKat(kat.id)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${activeKat === kat.id ? C.accent : C.border}`, background: activeKat === kat.id ? C.accentLight : C.cardBg, color: activeKat === kat.id ? C.accent : C.textSub, fontSize: 13, fontWeight: activeKat === kat.id ? 700 : 400, cursor: 'pointer' }}>
                {getKatNimi(kat as any, lang as any)}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{t.selaa.sort}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {SORT_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setSort(o.id)} style={{ flex: 1, padding: '8px 6px', borderRadius: 6, border: `1px solid ${sort === o.id ? C.accent : C.border}`, background: sort === o.id ? C.accentLight : C.cardBg, color: sort === o.id ? C.accent : C.textSub, fontSize: 12, fontWeight: sort === o.id ? 700 : 400, cursor: 'pointer' }}>
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{t.selaa.maxPrice}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="500" style={{ flex: 1, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.text, outline: 'none' }} />
            <span style={{ color: C.muted }}>€</span>
            {maxPrice && <button onClick={() => setMaxPrice('')} style={{ fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>}
          </div>
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
                  <button onClick={() => { setActiveKat(kat.id); setActiveAla('') }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeKat === kat.id ? 700 : 400, color: activeKat === kat.id ? C.accent : C.textSub, background: activeKat === kat.id ? C.accentLight : 'transparent', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{getKatNimi(kat as any, lang as any)}</span>
                    {count > 0 && <span style={{ fontSize: 11, color: C.muted }}>{count}</span>}
                  </button>
                  {activeKat === kat.id && kat.id !== 'kaikki' && (KATEGORIAT.find(k => k.id === kat.id)?.alakategoriat ?? []).length > 0 && (
                    <div style={{ marginLeft: 8, marginBottom: 4 }}>
                      {(KATEGORIAT.find(k => k.id === kat.id)?.alakategoriat ?? []).map((ala: any) => (
                        <button key={ala.id} onClick={() => setActiveAla(activeAla === ala.id ? '' : ala.id)} style={{ width: '100%', textAlign: 'left', padding: '5px 10px 5px 16px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, color: activeAla === ala.id ? C.accent : C.muted, background: activeAla === ala.id ? C.accentLight : 'transparent', marginBottom: 1 }}>
                          {getAlaNimi(ala, lang as any)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10 }}>{t.selaa.maxPrice}</div>
              <div style={{ position: 'relative' }}>
                <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="500" style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 28px 8px 10px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' as const }} />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13 }}>€</span>
              </div>
            </div>
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

          <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
            {loading ? '...' : `${filtered.length} ${t.selaa.results}`}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Ladataan...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>{t.selaa.noResults}</div>
              <button onClick={() => { setActiveKat('kaikki'); setSearch(''); setMaxPrice('') }} style={{ background: C.accent, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                {t.selaa.clearFilters}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? 10 : 14 }}>
              {filtered.map(p => (
                <Link key={p.id} href={`/tuotteet/${p.id}`} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', display: 'block', textDecoration: 'none' }}>
                  <div style={{ aspectRatio: '1', overflow: 'hidden', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl.split('|||')[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                    }
                  </div>
                  <div style={{ padding: isMobile ? '8px' : '10px 12px' }}>
                    <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.text, marginBottom: 3, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{p.name}</div>
                    {p.condition && <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{p.condition}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: C.text }}>{p.startPrice.toLocaleString('fi-FI')}€</div>
                      <div style={{ fontSize: 11, color: C.muted }}>@{p.seller?.username}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
