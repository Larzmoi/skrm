'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { KATEGORIAT, getKatNimi, getAlaNimi, getTyyppiNimi, getNakyvatKategoriat } from '@/lib/kategoriat'
import { api } from '@/lib/api'
import { resizeImage } from '@/lib/imageUtils'
import { useLang } from '@/lib/lang-context'
import { PAKETTIKOOT } from '@/lib/pakettikoot'
import { useIsMobile } from '@/lib/useIsMobile'

const KUNTOLUOKAT = [
  { id: 'uusi', nimi: 'Uusi' },
  { id: 'erinomainen', nimi: 'Erinomainen' },
  { id: 'hyva', nimi: 'Hyvä' },
  { id: 'tyydyttava', nimi: 'Tyydyttävä' },
  { id: 'kaytetty', nimi: 'Käytetty' },
]

type SaleType = 'live' | 'buy_now' | 'both' | 'auction'

interface Product {
  id: string; name: string; saleType: SaleType
  startPrice: number; buyNowPrice?: number; reservePrice?: number; bidIncrement?: number
  auctionDuration?: number; quantity: number; condition?: string
  description?: string; imageUrl?: string; category?: string
  alakategoria?: string; tyyppi?: string; city?: string; pakettikoko?: string; status: string
  currentBid?: number
}

// Perinteinen huutokauppa jolla on jo huutoja — kategoriaa ei saa enää vaihtaa (bidaajat löysivät/huusivat sen kategorian perusteella)
function isCategoryLocked(p: Pick<Product, 'saleType' | 'currentBid'>) {
  return p.saleType === 'auction' && p.currentBid != null
}
// Perinteinen huutokauppa jonka varaushinta on jo ylittynyt (tai ei varaushintaa ja huuto on jo tullut) — huuto on sitova, ei voi poistaa
function isDeleteLocked(p: Pick<Product, 'saleType' | 'currentBid' | 'reservePrice'>) {
  return p.saleType === 'auction' && p.currentBid != null && (!p.reservePrice || p.currentBid >= p.reservePrice)
}

export default function TuotteetPage() {
  const { C } = useTheme()
  const { lang, t } = useLang()
  const isMobile = useIsMobile()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [saleType, setSaleType] = useState<SaleType>('live')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [alakategoria, setAlakategoria] = useState('')
  const [tyyppi, setTyyppi] = useState('')
  const [city, setCity] = useState('')
  const [condition, setCondition] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [pakettikoko, setPakettikokoState] = useState('')
  const [noutoPolicyAccepted, setNoutoPolicyAccepted] = useState(false)
  function setPakettikoko(id: string) {
    setPakettikokoState(id)
    if (id !== 'nouto') setNoutoPolicyAccepted(false)
  }
  const [startPrice, setStartPrice] = useState('')
  const [buyNowPrice, setBuyNowPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [bidIncrement, setBidIncrement] = useState('')
  const [auctionDuration, setAuctionDuration] = useState('')
  const [auctionDurationDays, setAuctionDurationDays] = useState(3)
  const [auctionDurationHours, setAuctionDurationHours] = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    try {
      setLoading(true)
      const data = await api.getMyProducts()
      setProducts(data)
    } catch { setError('Tuotteiden lataus epäonnistui') }
    finally { setLoading(false) }
  }

  function reset() {
    setSaleType('live'); setName(''); setCategory(''); setAlakategoria(''); setTyyppi('')
    setCity('')
    setCondition(''); setQuantity('1'); setDescription(''); setImages([])
    setPakettikokoState(''); setNoutoPolicyAccepted(false); setStartPrice(''); setBuyNowPrice(''); setReservePrice(''); setBidIncrement('')
    setAuctionDuration(''); setAuctionDurationDays(3); setAuctionDurationHours(0); setError(''); setEditId(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function openEdit(p: Product) {
    setEditId(p.id); setSaleType(p.saleType); setName(p.name)
    setCategory(p.category ?? ''); setAlakategoria(p.alakategoria ?? ''); setTyyppi(p.tyyppi ?? '')
    setCity(p.city ?? '')
    setCondition(p.condition ?? ''); setQuantity(String(p.quantity ?? 1))
    setDescription(p.description ?? ''); setImages(p.imageUrl ? p.imageUrl.split('|||').filter((s: string) => s.length > 0) : [])
    setPakettikokoState(p.pakettikoko ?? ''); setNoutoPolicyAccepted(p.pakettikoko === 'nouto')
    setStartPrice(String(p.startPrice))
    setBuyNowPrice(p.buyNowPrice ? String(p.buyNowPrice) : '')
    setReservePrice(p.reservePrice ? String(p.reservePrice) : '')
    setBidIncrement(p.bidIncrement ? String(p.bidIncrement) : '')
    setAuctionDuration(p.auctionDuration ? String(p.auctionDuration) : '')
    setError(''); setShowForm(true)
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (images.length + files.length > 6) { setError('Max 6 kuvaa'); return }
    for (const f of files) {
      const r = new FileReader()
      await new Promise<void>(res => {
        r.onload = async () => {
          const resized = await resizeImage(r.result as string)
          setImages(prev => [...prev, resized])
          res()
        }
        r.readAsDataURL(f)
      })
    }
    if (fileRef.current) fileRef.current.value = ''
  }
  function removeImage(i: number) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    if (!name.trim()) { setError('Syötä tuotteen nimi'); return }
    if (!startPrice || Number(startPrice) <= 0) { setError('Syötä hinta'); return }
    if (pakettikoko === 'nouto' && !noutoPolicyAccepted) { setError('Hyväksy noutotuotteen ehdot ennen julkaisua'); return }
    setError(''); setSaving(true)

    const data = {
      name: name.trim(), saleType,
      startPrice: Number(startPrice),
      buyNowPrice: buyNowPrice ? Number(buyNowPrice) : undefined,
      reservePrice: reservePrice ? Number(reservePrice) : undefined,
      bidIncrement: bidIncrement ? Number(bidIncrement) : undefined,
      auctionDuration: auctionDuration ? Number(auctionDuration) : undefined,
      auctionDurationDays: saleType === 'auction' ? auctionDurationDays : undefined,
      auctionDurationHours: saleType === 'auction' ? auctionDurationHours : undefined,
      quantity: Number(quantity) || 1,
      condition: condition || undefined, category: category || undefined,
      alakategoria: alakategoria || undefined, tyyppi: tyyppi || undefined, city: city.trim() || undefined, pakettikoko: pakettikoko || undefined,
      description: description.trim() || undefined, imageUrl: images.length > 0 ? images.join('|||') : undefined,
    }

    try {
      if (editId) {
        await api.updateProduct(editId, data)
      } else {
        await api.createProduct(data)
      }
      await loadProducts()
      setShowForm(false); reset()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(id: string) {
    try {
      await api.deleteProduct(id)
      setProducts(p => p.filter(x => x.id !== id))
    } catch (e: any) { setError(e.message) }
  }

  const currentKat = KATEGORIAT.find(k => k.id === category)
  const currentAla: any = currentKat?.alakategoriat.find((a: any) => a.id === alakategoria)
  const paketti = PAKETTIKOOT.find(p => p.id === pakettikoko)
  const pending = products.filter(p => p.status === 'PENDING')
  const editingProduct = editId ? products.find(p => p.id === editId) : null
  const editCategoryLocked = editingProduct ? isCategoryLocked(editingProduct) : false

  const inp: React.CSSProperties = { width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4 }

  const saleTypeOptions = [
    { id: 'live' as SaleType, label: 'Live-huutokauppa', desc: 'Myydään lähetyksessä' },
    { id: 'buy_now' as SaleType, label: 'Suoramyynti', desc: 'Kiinteä hinta, ostaa koska vain' },
    { id: 'auction' as SaleType, label: 'Huutokauppa', desc: 'Ajastettu huutokauppa, itse valittava kesto' },
    { id: 'both' as SaleType, label: 'Molemmat', desc: 'Suoramyynti + live-huutokauppa' },
  ]

  const saleLabel: Record<string, { label: string; color: string; bg: string }> = {
    live: { label: 'Live', color: C.accent, bg: C.accentLight },
    buy_now: { label: 'Suoramyynti', color: '#007AFF', bg: '#E8F0FF' },
    auction: { label: 'Huutokauppa', color: '#8B5CF6', bg: '#F3E8FF' },
    both: { label: 'Live + Suora', color: '#F59E0B', bg: '#FFF8E8' },
  }

  return (
    <div style={{ color: C.text }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Tuotteet</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{pending.length} aktiivista tuotetta</p>
        </div>
        <button onClick={() => { reset(); setShowForm(true) }} style={{ background: C.accent, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          + Lisää tuote
        </button>
      </div>

      {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#CC0000', fontSize: 13 }}>{error}</div>}

      {/* Lomake */}
      {showForm && (
        <div style={{ background: C.cardBg, border: `1px solid ${C.accent}`, borderRadius: 12, padding: '20px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>{editId ? 'Muokkaa tuotetta' : 'Uusi tuote'}</h3>

          {/* Myyntitapa */}
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Myyntitapa *</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {saleTypeOptions.map(opt => (
                <button key={opt.id} type="button" onClick={() => setSaleType(opt.id)} style={{ flex: 1, minWidth: 150, padding: '12px 14px', borderRadius: 8, border: `2px solid ${saleType === opt.id ? C.accent : C.border}`, background: saleType === opt.id ? C.accentLight : C.surface, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: saleType === opt.id ? C.accent : C.text, marginBottom: 3 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '150px 1fr', gap: 16, marginBottom: 14 }}>
            {/* Kuva */}
            <div>
              <label style={lbl}>Kuva</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                  {images.map((img, i) => (
                    <div key={i} style={{ aspectRatio: '1', borderRadius: 7, overflow: 'hidden', position: 'relative' }}>
                      <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))}
                  {images.length < 6 && (
                    <div onClick={() => fileRef.current?.click()} style={{ aspectRatio: '1', borderRadius: 7, border: `2px dashed ${C.border}`, background: C.surface2, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: 20, color: C.muted }}>+</div>
                      <div style={{ fontSize: 9, color: C.dim }}>{images.length}/6</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: C.dim, textAlign: 'center' }}>Max 6 kuvaa · 2MB/kpl</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImage} style={{ display: 'none' }} />
            </div>

            {/* Perustiedot */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>Tuotteen nimi *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="esim. Charizard Holo PSA 9" style={inp} /></div>
              {editCategoryLocked && (
                <div style={{ fontSize: 11, color: '#B45309', background: '#FFF8E8', border: '1px solid #F59E0B', borderRadius: 6, padding: '6px 10px' }}>
                  Kategoriaa ei voi enää muuttaa — huutokauppa on jo käynnissä ja on saanut huutoja.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={lbl}>Kategoria</label>
                  <select value={category} onChange={e => { setCategory(e.target.value); setAlakategoria(''); setTyyppi('') }} style={inp} disabled={editCategoryLocked}>
                    <option value="">Valitse...</option>
                    {getNakyvatKategoriat().map(k => <option key={k.id} value={k.id}>{k.nimi.fi}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Alakategoria</label>
                  <select value={alakategoria} onChange={e => { setAlakategoria(e.target.value); setTyyppi('') }} style={inp} disabled={editCategoryLocked || !currentKat || currentKat.alakategoriat.length === 0}>
                    <option value="">Valitse...</option>
                    {currentKat?.alakategoriat.map(a => <option key={a.id} value={a.id}>{a.nimi[lang as 'fi' | 'en'] ?? a.nimi.fi}</option>)}
                  </select>
                </div>
              </div>
              {currentAla?.tyypit?.length > 0 && (
                <div>
                  <label style={lbl}>Tyyppi</label>
                  <select value={tyyppi} onChange={e => setTyyppi(e.target.value)} style={inp} disabled={editCategoryLocked}>
                    <option value="">Valitse...</option>
                    {currentAla.tyypit.map((ty: any) => <option key={ty.id} value={ty.id}>{getTyyppiNimi(ty, lang as any)}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={lbl}>Kunto</label>
                  <select value={condition} onChange={e => setCondition(e.target.value)} style={inp}>
                    <option value="">Valitse...</option>
                    {KUNTOLUOKAT.map(k => <option key={k.id} value={k.id}>{k.nimi}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Määrä</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min={1} style={inp} /></div>
              </div>
              <div><label style={lbl}>{t.selaa.city}</label><input value={city} onChange={e => setCity(e.target.value)} placeholder="esim. Helsinki" style={inp} /></div>
            </div>
          </div>

          {/* Hinnoittelu */}
          <div style={{ background: C.surface, borderRadius: 9, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Hinnoittelu</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label style={lbl}>{saleType === 'buy_now' ? 'Myyntihinta (€) *' : 'Lähtöhinta (€) *'}</label>
                <input type="number" value={startPrice} onChange={e => setStartPrice(e.target.value)} placeholder="0" style={inp} />
                <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{saleType === 'buy_now' ? 'Kiinteä myyntihinta' : 'Huutokaupan aloitushinta'}</div>
              </div>
              {(saleType === 'both' || saleType === 'auction') && (
                <div>
                  <label style={lbl}>Osta heti -hinta (€)</label>
                  <input type="number" value={buyNowPrice} onChange={e => setBuyNowPrice(e.target.value)} placeholder="Ohita huutokauppa" style={inp} />
                </div>
              )}
              {saleType !== 'buy_now' && (
                <div>
                  <label style={lbl}>Varaushinta (€)</label>
                  <input type="number" value={reservePrice} onChange={e => setReservePrice(e.target.value)} placeholder="Piilotettu minimi" style={inp} />
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>Ostajalle ei näytetä</div>
                </div>
              )}
              {saleType !== 'buy_now' && (
                <div>
                  <label style={lbl}>Minimikorotus (€)</label>
                  <input type="number" step="0.01" min="0.01" value={bidIncrement} onChange={e => setBidIncrement(e.target.value)} placeholder="1.00" style={inp} />
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>Oletus 1€ — halvemmille tuotteille esim. 0,10€</div>
                </div>
              )}
              {(saleType === 'live' || saleType === 'both') && (
                <div>
                  <label style={lbl}>Huutokaupan kesto (live-lähetyksessä)</label>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                    {[60, 120, 300].map(s => (
                      <button key={s} type="button" onClick={() => setAuctionDuration(String(s))} style={{ background: auctionDuration === String(s) ? C.accent : C.surface2, border: `1px solid ${auctionDuration === String(s) ? C.accent : C.border}`, color: auctionDuration === String(s) ? '#fff' : C.muted, padding: '4px 8px', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>
                        {s / 60}min
                      </button>
                    ))}
                  </div>
                  <input type="number" value={auctionDuration} onChange={e => setAuctionDuration(e.target.value)} placeholder="sekunteina" style={inp} />
                </div>
              )}
              {saleType === 'auction' && (
                <div>
                  <label style={lbl}>Huutokaupan kesto</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={auctionDurationDays} onChange={e => setAuctionDurationDays(Number(e.target.value))} style={inp}>
                      {Array.from({ length: 31 }, (_, d) => d).map(d => <option key={d} value={d}>{d} pv</option>)}
                    </select>
                    <select value={auctionDurationHours} onChange={e => setAuctionDurationHours(Number(e.target.value))} style={inp}>
                      {Array.from({ length: 24 }, (_, h) => h).map(h => <option key={h} value={h}>{h} h</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Toimitus */}
          <div style={{ background: C.surface, borderRadius: 9, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Toimitus</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PAKETTIKOOT.map(p => (
                <button key={p.id} type="button" onClick={() => setPakettikoko(p.id)} style={{ background: pakettikoko === p.id ? C.accent : C.surface2, border: `1px solid ${pakettikoko === p.id ? C.accent : C.border}`, color: pakettikoko === p.id ? '#fff' : C.muted, padding: '7px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>{p.nimi}</div>
                  {p.hinta > 0 && <div style={{ fontSize: 11, opacity: 0.85 }}>{p.hinta.toFixed(2)}€</div>}
                </button>
              ))}
            </div>
            {paketti && paketti.hinta > 0 && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Ostaja maksaa <span style={{ color: C.accent, fontWeight: 700 }}>{paketti.hinta.toFixed(2)}€</span></div>}

            {pakettikoko === 'nouto' && (
              <div style={{ background: '#FFF8E8', border: '1px solid #F59E0B', borderRadius: 8, padding: '14px 16px', marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#B45309', marginBottom: 8 }}>
                  Huomio: Noutotuote
                </div>
                <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6, marginBottom: 12 }}>
                  Noutotuotteiden kaupassa SKRM ei tarjoa maksuturvaa. Kauppa tapahtuu
                  suoraan ostajan ja myyjän välillä. SKRM ei vastaa noutokauppojen
                  toteutumisesta, aikataulusta tai mahdollisista erimielisyyksistä.
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={noutoPolicyAccepted}
                    onChange={e => setNoutoPolicyAccepted(e.target.checked)}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: '#92400E', fontWeight: 600 }}>
                    Ymmärrän että tämä on noutotuote eikä SKRM:n maksuturva koske tätä kauppaa
                  </span>
                </label>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Kuvaus</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="esim. Base Set 1st Edition, NM kunto" rows={2} style={{ ...inp, resize: 'vertical' as const }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={saving} style={{ background: C.accent, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Tallennetaan...' : editId ? 'Tallenna muutokset' : 'Lisää tuote'}
            </button>
            <button onClick={() => { setShowForm(false); reset() }} style={{ background: C.surface2, color: C.muted, border: `1px solid ${C.border}`, padding: '10px 18px', borderRadius: 7, fontSize: 14, cursor: 'pointer' }}>
              Peruuta
            </button>
          </div>
        </div>
      )}

      {/* Tuotelista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Ladataan...</div>
      ) : pending.length > 0 ? (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Aktiiviset ({pending.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map((p, i) => {
              const kat = KATEGORIAT.find(k => k.id === p.category)
              const ala: any = kat?.alakategoriat.find((a: any) => a.id === p.alakategoria)
              const ty = ala?.tyypit?.find((t: any) => t.id === p.tyyppi)
              const sl = saleLabel[p.saleType] ?? saleLabel.live
              const priceLine = (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>{p.startPrice}€</span>
                  {p.condition && <span>· {KUNTOLUOKAT.find(k => k.id === p.condition)?.nimi}</span>}
                  {kat && <span>· {kat.nimi[lang as 'fi' | 'en'] ?? kat.nimi.fi}{ala ? ` › ${ala.nimi[lang as 'fi' | 'en'] ?? ala.nimi.fi}` : ''}{ty ? ` › ${getTyyppiNimi(ty, lang as any)}` : ''}</span>}
                </div>
              )
              const badge = <span style={{ background: sl.bg, color: sl.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap' }}>{sl.label}</span>
              const image = (
                <div style={{ width: 48, height: 48, borderRadius: 7, background: C.surface2, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.imageUrl ? <img src={p.imageUrl.split('|||')[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18, color: C.muted }}>+</span>}
                </div>
              )
              const index = <div style={{ width: 20, height: 20, borderRadius: 4, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: C.muted, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              const deleteLocked = isDeleteLocked(p)
              const deleteTitle = deleteLocked ? 'Ei voi poistaa — varaushinta on ylittynyt, huuto on sitova' : undefined
              const deleteBtn = (mobile: boolean) => (
                <button
                  onClick={() => !deleteLocked && deleteProduct(p.id)}
                  disabled={deleteLocked}
                  title={deleteTitle}
                  style={{ background: 'none', border: 'none', color: deleteLocked ? C.dim : C.muted, cursor: deleteLocked ? 'not-allowed' : 'pointer', fontSize: mobile ? 16 : 16, padding: '4px 8px' }}
                >✕</button>
              )

              return isMobile ? (
                <div key={p.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {index}
                    {image}
                    <Link href={`/tuotteet/${p.id}`} style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: C.text, textDecoration: 'none' }}>{p.name}</Link>
                  </div>
                  {priceLine}
                  {deleteLocked && <div style={{ fontSize: 11, color: '#B45309' }}>Varaushinta ylittynyt — ei voi poistaa</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {badge}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(p)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 12, padding: '5px 10px', borderRadius: 5, fontWeight: 600 }}>Muokkaa</button>
                      {deleteBtn(true)}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={p.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {image}
                  {index}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/tuotteet/${p.id}`} style={{ fontSize: 14, fontWeight: 600, color: C.text, textDecoration: 'none' }}>{p.name}</Link>
                    {priceLine}
                    {deleteLocked && <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>Varaushinta ylittynyt — ei voi poistaa</div>}
                  </div>
                  {badge}
                  <button onClick={() => openEdit(p)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 12, padding: '5px 10px', borderRadius: 5, fontWeight: 600, flexShrink: 0 }}>Muokkaa</button>
                  {deleteBtn(false)}
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 14, padding: '14px 18px', background: C.accentLight, border: `1px solid ${C.accent}33`, borderRadius: 9, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 13, color: C.text }}>{pending.filter(p => p.saleType === 'live' || p.saleType === 'both').length} live-jonossa</span>
              <span style={{ fontSize: 13, color: C.text }}>{pending.filter(p => p.saleType === 'buy_now' || p.saleType === 'both').length} suoramyynnissä</span>
              <span style={{ fontSize: 13, color: C.text }}>{pending.filter(p => p.saleType === 'auction').length} huutokaupassa</span>
            </div>
            <Link href="/lahetys" style={{ background: C.accent, color: '#fff', textDecoration: 'none', padding: '8px 18px', borderRadius: 7, fontWeight: 700, fontSize: 13, textAlign: 'center' }}>Mene liveen</Link>
          </div>
        </div>
      ) : !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>Ei tuotteita vielä</div>
          <button onClick={() => { reset(); setShowForm(true) }} style={{ background: C.accent, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Lisää ensimmäinen tuote
          </button>
        </div>
      )}
    </div>
  )
}
