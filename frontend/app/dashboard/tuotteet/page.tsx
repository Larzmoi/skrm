'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { KATEGORIAT, getKatNimi, getAlaNimi, getTyyppiNimi, getNakyvatKategoriat } from '@/lib/kategoriat'
import { CARDMARKET_KUNTOLUOKAT } from '@/lib/conditions'
import { api } from '@/lib/api'
import { resizeImage } from '@/lib/imageUtils'
import { useLang } from '@/lib/lang-context'
import { PAKETTIKOOT } from '@/lib/pakettikoot'
import { useIsMobile } from '@/lib/useIsMobile'

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

function TuotteetContent() {
  const { C } = useTheme()
  const { lang, t } = useLang()
  const tp = t.dashboardProducts
  const KUNTOLUOKAT = [
    { id: 'uusi', nimi: tp.conditionNew },
    { id: 'erinomainen', nimi: tp.conditionExcellent },
    { id: 'hyva', nimi: tp.conditionGood },
    { id: 'tyydyttava', nimi: tp.conditionFair },
    { id: 'kaytetty', nimi: tp.conditionUsed },
  ]
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()
  const router = useRouter()
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

  // Bulk upload state
  const [bulkTab, setBulkTab] = useState<'manual' | 'file' | 'preview' | 'success'>('manual')
  const [bulkText, setBulkText] = useState('')
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [parsedPreview, setParsedPreview] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  // Koko erälle yhteinen kategoria/peli/tyyppi (esim. "Pokémon Irtokortit") — sovelletaan kaikkiin
  // liitetyn tekstin riveihin. Pakollinen jotta Cardmarket-kuntoasteikko (ks. CLAUDE.md
  // "Kuntoluokitus Cardmarket-muotoon irtokorteille") ylipäätään aktivoituu bulkkituonnille -
  // ilman tätä bulkkituodut tuotteet eivät koskaan saisi tyyppi-kenttää asetetuksi.
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkAlakategoria, setBulkAlakategoria] = useState('')
  const [bulkTyyppi, setBulkTyyppi] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    try {
      setLoading(true)
      const data = await api.getMyProducts()
      setProducts(data)
    } catch { setError(tp.loadFailed) }
    finally { setLoading(false) }
  }

  function reset() {
    setSaleType('live'); setName(''); setCategory(''); setAlakategoria(''); setTyyppi('')
    setCity('')
    setCondition(''); setQuantity('1'); setDescription(''); setImages([])
    setPakettikokoState(''); setNoutoPolicyAccepted(false); setStartPrice(''); setBuyNowPrice(''); setReservePrice(''); setBidIncrement('')
    setAuctionDuration(''); setAuctionDurationDays(3); setAuctionDurationHours(0); setError(''); setEditId(null)
    // Clear bulk state
    setBulkTab('manual'); setBulkText(''); setBulkFile(null); setParsedPreview([]); setUploading(false)
    setBulkCategory(''); setBulkAlakategoria(''); setBulkTyyppi('')
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

  // Syväliitos /lahetys-konsolin jonopaneelista ("Muokkaa tuotetta" tuotteen suurennus-
  // modaalissa, ks. CLAUDE.md "Uudet löydökset 2026-08-13, osa 4" kohta 16) - avaa
  // muokkauslomakkeen automaattisesti kun tullaan ?edit=<id>-parametrilla, siivoaa
  // parametrin pois URL:ista ettei se avaudu uudestaan esim. sivun päivityksessä.
  useEffect(() => {
    const editParam = searchParams.get('edit')
    if (!editParam || products.length === 0) return
    const product = products.find(p => p.id === editParam)
    if (product) openEdit(product)
    router.replace('/dashboard/tuotteet')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, searchParams])

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (images.length + files.length > 6) { setError(tp.maxImages); return }
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

  // Jäsentää liitetyn/kirjoitetun tekstin tuotteiksi paikallisesti (ei tarvitse backendiä
  // esikatseluun) — Cardmarket-tyylinen 4-rivin lohko per tuote: nimi / kunto / hinta / määrä.
  // Kun erän tyyppi on 'irtokortit', kunto normalisoidaan (trim+isot kirjaimet) ja validoidaan
  // Cardmarket-lyhenteitä (CARDMARKET_KUNTOLUOKAT) vasten — sama koodaus kuin manuaalisen
  // lomakkeen pudotusvalikko tallentaa, jotta kahta eri koodausta samalle asialle ei pääse
  // syntymään (ks. CLAUDE.md "Kuntoluokitus Cardmarket-muotoon irtokorteille"). Tuntematon
  // lyhenne merkitään virheeksi esikatselussa sen sijaan että tallennettaisiin hiljaa väärin.
  function parseBulkText() {
    if (!bulkText.trim()) { setError('Syötä teksti'); return }
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    const validConditions = new Set(CARDMARKET_KUNTOLUOKAT.map(k => k.id))
    const items: any[] = []
    for (let i = 0; i < lines.length; i += 4) {
      const chunk = lines.slice(i, i + 4)
      if (chunk.length < 4) {
        items.push({ name: chunk[0] || '(tuntematon)', errors: 'Rivi puutteellinen — odotettiin 4 riviä (nimi, kunto, hinta, määrä)' })
        continue
      }
      const [rawName, rawCondition, rawPrice, rawQty] = chunk
      const price = parseFloat(rawPrice.replace(/[^\d,.-]/g, '').replace(',', '.'))
      const quantity = parseInt(rawQty.replace(/[^\d]/g, ''), 10)
      const condition = bulkTyyppi === 'irtokortit' ? rawCondition.trim().toUpperCase() : rawCondition
      if (!rawName || isNaN(price) || price <= 0) {
        items.push({ name: rawName || '(tuntematon)', condition, startPrice: isNaN(price) ? undefined : price, quantity: isNaN(quantity) ? 1 : quantity, errors: 'Virheellinen hinta' })
        continue
      }
      if (bulkTyyppi === 'irtokortit' && !validConditions.has(condition)) {
        items.push({ name: rawName, condition, startPrice: price, quantity: isNaN(quantity) || quantity < 1 ? 1 : quantity, errors: `Tuntematon kunto "${rawCondition}" — odotettiin yksi: M/NM/EX/GD/LP/PL/PO` })
        continue
      }
      items.push({ name: rawName, condition, startPrice: price, quantity: isNaN(quantity) || quantity < 1 ? 1 : quantity })
    }
    if (items.length === 0) { setError('Ei tunnistettuja tuotteita'); return }
    setError('')
    setParsedPreview(items)
    setBulkTab('preview')
  }

  async function save() {
    if (!name.trim()) { setError(tp.enterName); return }
    if (!startPrice || Number(startPrice) <= 0) { setError(tp.enterPrice); return }
    if (pakettikoko === 'nouto' && !noutoPolicyAccepted) { setError(tp.acceptPickupTerms); return }
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

  async function saveBulk() {
    const validItems = parsedPreview.filter(p => !p.errors)
    if (validItems.length === 0 || uploading) return

    try {
      setUploading(true)
      const response = await api.bulkCreateProducts(
        validItems.map(p => ({ name: p.name, startPrice: p.startPrice, quantity: p.quantity, condition: p.condition || undefined })),
        { category: bulkCategory || undefined, alakategoria: bulkAlakategoria || undefined, tyyppi: bulkTyyppi || undefined },
      )
      setParsedPreview(response.results || [])
      setBulkTab('success')
      await loadProducts()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
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
  const bulkCurrentKat = KATEGORIAT.find(k => k.id === bulkCategory)
  const bulkCurrentAla: any = bulkCurrentKat?.alakategoriat.find((a: any) => a.id === bulkAlakategoria)
  const paketti = PAKETTIKOOT.find(p => p.id === pakettikoko)
  const pending = products.filter(p => p.status === 'PENDING')
  const editingProduct = editId ? products.find(p => p.id === editId) : null
  const editCategoryLocked = editingProduct ? isCategoryLocked(editingProduct) : false

  const inp: React.CSSProperties = { width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4 }

  const saleTypeOptions = [
    { id: 'live' as SaleType, label: tp.saleTypeLive, desc: tp.saleTypeLiveDesc },
    { id: 'buy_now' as SaleType, label: tp.saleTypeBuyNow, desc: tp.saleTypeBuyNowDesc },
    { id: 'auction' as SaleType, label: tp.saleTypeAuction, desc: tp.saleTypeAuctionDesc },
    { id: 'both' as SaleType, label: tp.saleTypeBoth, desc: tp.saleTypeBothDesc },
  ]

  const saleLabel: Record<string, { label: string; color: string; bg: string }> = {
    live: { label: tp.badgeLive, color: C.accent, bg: C.accentLight },
    buy_now: { label: tp.badgeBuyNow, color: '#007AFF', bg: '#E8F0FF' },
    auction: { label: tp.badgeAuction, color: '#8B5CF6', bg: '#F3E8FF' },
    both: { label: tp.badgeBoth, color: '#F59E0B', bg: '#FFF8E8' },
  }

  return (
    <div style={{ color: C.text }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{tp.title}</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{pending.length} {tp.activeSuffix}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Monimuu-tuonti — tarkoituksella vähemmän hallitseva kuin päänappi (pelkkä
              tekstilinkki, ei omaa taustaväriä). Aiemmin kolme yhtä painavaa nappia rinnakkain
              (yksi niistä jopa täysin duplikaatti "Lisää tuote":n kanssa), sekoitti mikä on
              ensisijainen tapa lisätä tuote — vahvistettu epäselväksi mobiilitestauksessa
              2026-09-01 (kohta 12). */}
          <button onClick={() => { reset(); setShowForm(true); setBulkTab('file') }} style={{ background: 'none', border: 'none', color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Tuo CSV/TXT-tiedostosta
          </button>
          <button onClick={() => { reset(); setShowForm(true); setBulkTab('manual') }} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '10px 20px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {tp.addProduct}
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#CC0000', fontSize: 13 }}>{error}</div>}

      {/* Bulk upload section */}
      {(showForm || bulkTab !== 'manual') && (
        <div style={{ marginBottom: 20 }}>
          {/* File upload / paste area */}
          {bulkTab === 'file' && (
            <div style={{ background: C.surface, borderRadius: 9, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Monimuu lisäys</div>
                <button onClick={() => { reset(); setShowForm(false) }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>

              <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginBottom: 12 }}>
                Liitä tai kirjoita neljä riviä per tuote: <strong>nimi</strong>, <strong>kunto</strong>, <strong>hinta</strong>, <strong>määrä</strong> — samassa järjestyksessä joka tuotteelle peräkkäin. Kaikki tuotteet luodaan suoramyyntiin samalla kategorialla/tyypillä alla.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>{tp.categoryLabel}</label>
                  <select value={bulkCategory} onChange={e => { setBulkCategory(e.target.value); setBulkAlakategoria(''); setBulkTyyppi('') }} style={inp}>
                    <option value="">{tp.selectPlaceholder}</option>
                    {getNakyvatKategoriat().map(k => <option key={k.id} value={k.id}>{k.nimi[lang as 'fi' | 'en'] ?? k.nimi.fi}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>{tp.subcategoryLabel}</label>
                  <select value={bulkAlakategoria} onChange={e => { setBulkAlakategoria(e.target.value); setBulkTyyppi('') }} style={inp} disabled={!bulkCurrentKat || bulkCurrentKat.alakategoriat.length === 0}>
                    <option value="">{tp.selectPlaceholder}</option>
                    {bulkCurrentKat?.alakategoriat.map(a => <option key={a.id} value={a.id}>{a.nimi[lang as 'fi' | 'en'] ?? a.nimi.fi}</option>)}
                  </select>
                </div>
                {bulkCurrentAla?.tyypit?.length > 0 && (
                  <div>
                    <label style={lbl}>{tp.typeLabel}</label>
                    <select value={bulkTyyppi} onChange={e => setBulkTyyppi(e.target.value)} style={inp}>
                      <option value="">{tp.selectPlaceholder}</option>
                      {bulkCurrentAla.tyypit.map((ty: any) => <option key={ty.id} value={ty.id}>{getTyyppiNimi(ty, lang as any)}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {bulkTyyppi === 'irtokortit' && (
                <div style={{ background: C.accentLight, border: `1px solid ${C.accent}33`, borderRadius: 7, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: C.accent }}>
                  Kunto-rivi tulkitaan Cardmarket-lyhenteenä: M / NM / EX / GD / LP / PL / PO
                </div>
              )}

              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={"Silcoon (ASC 012)\nNM\n0,02 €\n1\n\nPikachu ex\nNM\n1,50 €\n2"}
                rows={8}
                style={{ ...inp, resize: 'vertical' as const }}
              />

              {bulkFile && (
                <div style={{ background: C.accentLight, border: `1px solid ${C.accent}33`, borderRadius: 7, padding: '8px 12px', marginTop: 10, fontSize: 12 }}>
                  Valittu tiedosto: {bulkFile.name}
                  <button onClick={() => setBulkFile(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontWeight: 700 }}>✕</button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <input
                  ref={fileRef as React.RefObject<HTMLInputElement>}
                  type="file"
                  accept=".txt,.csv,.json"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files || [])
                    if (files.length === 0) return
                    setBulkFile(files[0])
                    const reader = new FileReader()
                    reader.onload = () => setBulkText(String(reader.result || ''))
                    reader.readAsText(files[0])
                  }}
                  style={{ display: 'none' }}
                />
                <button onClick={() => { (fileRef.current as HTMLInputElement).click() }} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, padding: '8px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                  Valitse tiedosto
                </button>
                {bulkText.trim().length > 0 && (
                  <button onClick={parseBulkText} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Ennen tallennusta
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Preview before bulk save */}
          {bulkTab === 'preview' && parsedPreview.length > 0 && (
            <div style={{ background: C.cardBg, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 16, marginTop: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Ennen tallennusta ({parsedPreview.length} tuotetta)</h3>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {parsedPreview.map((p: any, idx: number) => (
                  <div key={idx} style={{ background: C.surface, borderRadius: 7, border: `1px solid ${C.border}`, padding: '12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {p.startPrice && <span>{p.startPrice}€</span>}
                      {p.quantity && <span>· {p.quantity} kpl</span>}
                      {p.condition && <span>· {p.condition}</span>}
                    </div>
                    {p.errors && (
                      <div style={{ fontSize: 10, color: '#CC0000', marginTop: 4, background: '#FFF0F0', padding: '4px 8px', borderRadius: 5 }}>
                        Virhe: {p.errors}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button onClick={() => setBulkTab('manual')} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, padding: '8px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                  Palaa muokkausvaiheeseen
                </button>
                <button onClick={saveBulk} disabled={uploading} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                  {uploading ? 'Tallennetaan...' : 'Tallenna kaikki'}
                </button>
              </div>
            </div>
          )}

          {bulkTab === 'success' && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: 14, marginTop: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>Tallennus onnistui!</h4>
              <div style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>Uusia: {parsedPreview.reduce((acc: any, p: any) => acc + (p.created ? 1 : 0), 0)}</span>
                <span>Ohitettuja: {parsedPreview.reduce((acc: any, p: any) => acc + (p.skipped ? 1 : 0), 0)}</span>
              </div>
            </div>
          )}

          {/* Regular product form */}
          {showForm && bulkTab === 'manual' && (
            <div style={{ background: C.cardBg, border: `1px solid ${C.accent}`, borderRadius: 12, padding: '20px', marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>{editId ? tp.editTitle : tp.newTitle}</h3>

              {/* Myyntitapa */}
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>{tp.saleTypeLabel}</label>
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
                  <label style={lbl}>{tp.imageLabel}</label>
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
                    <div style={{ fontSize: 10, color: C.dim, textAlign: 'center' }}>{tp.maxImagesHint}</div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImage} style={{ display: 'none' }} />
                </div>

                {/* Perustiedot */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div><label style={lbl}>{tp.nameLabel}</label><input value={name} onChange={e => setName(e.target.value)} placeholder={tp.namePlaceholder} style={inp} /></div>
                  {editCategoryLocked && (
                    <div style={{ fontSize: 11, color: '#B45309', background: '#FFF8E8', border: '1px solid #F59E0B', borderRadius: 6, padding: '6px 10px' }}>
                      {tp.categoryLockedNotice}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={lbl}>{tp.categoryLabel}</label>
                      <select value={category} onChange={e => { setCategory(e.target.value); setAlakategoria(''); setTyyppi('') }} style={inp} disabled={editCategoryLocked}>
                        <option value="">{tp.selectPlaceholder}</option>
                        {getNakyvatKategoriat().map(k => <option key={k.id} value={k.id}>{k.nimi[lang as 'fi' | 'en'] ?? k.nimi.fi}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>{tp.subcategoryLabel}</label>
                      <select value={alakategoria} onChange={e => { setAlakategoria(e.target.value); setTyyppi('') }} style={inp} disabled={editCategoryLocked || !currentKat || currentKat.alakategoriat.length === 0}>
                        <option value="">{tp.selectPlaceholder}</option>
                        {currentKat?.alakategoriat.map(a => <option key={a.id} value={a.id}>{a.nimi[lang as 'fi' | 'en'] ?? a.nimi.fi}</option>)}
                      </select>
                    </div>
                  </div>
                  {currentAla?.tyypit?.length > 0 && (
                    <div>
                      <label style={lbl}>{tp.typeLabel}</label>
                      <select value={tyyppi} onChange={e => { setTyyppi(e.target.value); setCondition('') }} style={inp} disabled={editCategoryLocked}>
                        <option value="">{tp.selectPlaceholder}</option>
                        {currentAla.tyypit.map((ty: any) => <option key={ty.id} value={ty.id}>{getTyyppiNimi(ty, lang as any)}</option>)}
                      </select>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: tyyppi === 'sealed' ? '1fr' : '1fr 1fr', gap: 8 }}>
                    {tyyppi !== 'sealed' && (
                      <div>
                        <label style={lbl}>{tp.conditionLabel}</label>
                        <select value={condition} onChange={e => setCondition(e.target.value)} style={inp}>
                          <option value="">{tp.selectPlaceholder}</option>
                          {(tyyppi === 'irtokortit' ? CARDMARKET_KUNTOLUOKAT : KUNTOLUOKAT).map(k => <option key={k.id} value={k.id}>{k.nimi}</option>)}
                        </select>
                      </div>
                    )}
                    <div><label style={lbl}>{tp.quantityLabel}</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min={1} style={inp} /></div>
                  </div>
                  <div><label style={lbl}>{t.selaa.city}</label><input value={city} onChange={e => setCity(e.target.value)} placeholder="esim. Helsinki" style={inp} /></div>
                </div>
              </div>

              {/* Hinnoittelu */}
              <div style={{ background: C.surface, borderRadius: 9, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{tp.pricingTitle}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={lbl}>{saleType === 'buy_now' ? tp.salePriceLabel : tp.startPriceLabel}</label>
                    <input type="number" value={startPrice} onChange={e => setStartPrice(e.target.value)} placeholder="0" style={inp} />
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{saleType === 'buy_now' ? tp.fixedPriceHint : tp.startingPriceHint}</div>
                  </div>
                  {(saleType === 'both' || saleType === 'auction') && (
                    <div>
                      <label style={lbl}>{tp.buyNowPriceLabel}</label>
                      <input type="number" value={buyNowPrice} onChange={e => setBuyNowPrice(e.target.value)} placeholder={tp.buyNowPricePlaceholder} style={inp} />
                    </div>
                  )}
                  {saleType !== 'buy_now' && (
                    <div>
                      <label style={lbl}>{tp.reservePriceLabel}</label>
                      <input type="number" value={reservePrice} onChange={e => setReservePrice(e.target.value)} placeholder={tp.reservePricePlaceholder} style={inp} />
                      <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{tp.reservePriceHint}</div>
                    </div>
                  )}
                  {saleType !== 'buy_now' && (
                    <div>
                      <label style={lbl}>{tp.bidIncrementLabel}</label>
                      <input type="number" step="0.01" min="0.01" value={bidIncrement} onChange={e => setBidIncrement(e.target.value)} placeholder="1.00" style={inp} />
                      <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{tp.bidIncrementHint}</div>
                    </div>
                  )}
                  {(saleType === 'live' || saleType === 'both') && (
                    <div>
                      <label style={lbl}>{tp.liveDurationLabel}</label>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                        {[60, 120, 300].map(s => (
                          <button key={s} type="button" onClick={() => setAuctionDuration(String(s))} style={{ background: auctionDuration === String(s) ? C.accentSolid : C.surface2, border: `1px solid ${auctionDuration === String(s) ? C.accentSolid : C.border}`, color: auctionDuration === String(s) ? C.accentText : C.muted, padding: '4px 8px', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>
                            {s / 60}min
                          </button>
                        ))}
                      </div>
                      <input type="number" value={auctionDuration} onChange={e => setAuctionDuration(e.target.value)} placeholder={tp.liveDurationPlaceholder} style={inp} />
                    </div>
                  )}
                  {saleType === 'auction' && (
                    <div>
                      <label style={lbl}>{tp.auctionDurationLabel}</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select value={auctionDurationDays} onChange={e => setAuctionDurationDays(Number(e.target.value))} style={inp}>
                          {Array.from({ length: 31 }, (_, d) => d).map(d => <option key={d} value={d}>{d} {tp.days}</option>)}
                        </select>
                        <select value={auctionDurationHours} onChange={e => setAuctionDurationHours(Number(e.target.value))} style={inp}>
                          {Array.from({ length: 24 }, (_, h) => h).map(h => <option key={h} value={h}>{h} {tp.hours}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Toimitus */}
              <div style={{ background: C.surface, borderRadius: 9, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{tp.deliveryTitle}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PAKETTIKOOT.map(p => (
                    // p.nimi sisältää jo hinnan (esim. "Postitus 6,9€", ks. lib/pakettikoot.ts —
                    // kiinteä postihinta) - erillinen p.hinta-rivi tässä näytti saman hinnan
                    // kahteen kertaan peräkkäin samassa napissa.
                    <button key={p.id} type="button" onClick={() => setPakettikoko(p.id)} style={{ background: pakettikoko === p.id ? C.accentSolid : C.surface2, border: `1px solid ${pakettikoko === p.id ? C.accentSolid : C.border}`, color: pakettikoko === p.id ? C.accentText : C.muted, padding: '7px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600 }}>{p.nimi}</div>
                    </button>
                  ))}
                </div>
                {paketti && paketti.hinta > 0 && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{tp.buyerPays} <span style={{ color: C.accent, fontWeight: 700 }}>{paketti.hinta.toFixed(2)}€</span></div>}

                {pakettikoko === 'nouto' && (
                  <div style={{ background: '#FFF8E8', border: '1px solid #F59E0B', borderRadius: 8, padding: '14px 16px', marginTop: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#B45309', marginBottom: 8 }}>
                      {tp.pickupTitle}
                    </div>
                    <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6, marginBottom: 12 }}>
                      {tp.pickupBody}
                    </p>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={noutoPolicyAccepted}
                        onChange={e => setNoutoPolicyAccepted(e.target.checked)}
                        style={{ marginTop: 2, flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, color: '#92400E', fontWeight: 600 }}>
                        {tp.pickupCheckbox}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>{tp.descriptionLabel}</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={tp.descriptionPlaceholder} rows={2} style={{ ...inp, resize: 'vertical' as const }} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={save} disabled={saving} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '10px 22px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? tp.saving : editId ? tp.saveChanges : tp.addProductBtn}
                </button>
                <button onClick={() => { setShowForm(false); reset() }} style={{ background: C.surface2, color: C.muted, border: `1px solid ${C.border}`, padding: '10px 18px', borderRadius: 7, fontSize: 14, cursor: 'pointer' }}>
                  {tp.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product list */}
      {/* Tuotelista */}
      {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>{tp.loading}</div>
          ) : pending.length > 0 ? (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{tp.activeSectionTitle} ({pending.length})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pending.map((p, i) => {
                  const kat = KATEGORIAT.find(k => k.id === p.category)
                  const ala: any = kat?.alakategoriat.find((a: any) => a.id === p.alakategoria)
                  const ty = ala?.tyypit?.find((t: any) => t.id === p.tyyppi)
                  const sl = saleLabel[p.saleType] ?? saleLabel.live
                  const priceLine = (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{p.startPrice}€</span>
                      {p.condition && <span>· {(p.tyyppi === 'irtokortit' ? CARDMARKET_KUNTOLUOKAT : KUNTOLUOKAT).find(k => k.id === p.condition)?.nimi ?? p.condition}</span>}
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
                  const deleteTitle = deleteLocked ? tp.deleteLockedTitle : undefined
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
                      {deleteLocked && <div style={{ fontSize: 11, color: '#B45309' }}>{tp.reserveExceededNotice}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        {badge}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEdit(p)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 12, padding: '5px 10px', borderRadius: 5, fontWeight: 600 }}>{tp.edit}</button>
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
                        {deleteLocked && <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>{tp.reserveExceededNotice}</div>}
                      </div>
                      {badge}
                      <button onClick={() => openEdit(p)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 12, padding: '5px 10px', borderRadius: 5, fontWeight: 600, flexShrink: 0 }}>{tp.edit}</button>
                      {deleteBtn(false)}
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 14, padding: '14px 18px', background: C.accentLight, border: `1px solid ${C.accent}33`, borderRadius: 9, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 13, color: C.text }}>{pending.filter(p => p.saleType === 'live' || p.saleType === 'both').length} {tp.inLiveQueue}</span>
                  <span style={{ fontSize: 13, color: C.text }}>{pending.filter(p => p.saleType === 'buy_now' || p.saleType === 'both').length} {tp.inDirectSale}</span>
                  <span style={{ fontSize: 13, color: C.text }}>{pending.filter(p => p.saleType === 'auction').length} {tp.inAuction}</span>
                </div>
                <Link href="/lahetys" style={{ background: C.accentSolid, color: C.accentText, textDecoration: 'none', padding: '8px 18px', borderRadius: 7, fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{tp.goLive}</Link>
              </div>
            </div>
          ) : !showForm && bulkTab !== 'preview' && bulkTab !== 'success' && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>{tp.noProductsYet}</div>
              <button onClick={() => { reset(); setShowForm(true); setBulkTab('manual') }} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '10px 24px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {tp.addFirstProduct}
              </button>
            </div>
          )}
    </div>
  )
}

export default function TuotteetPage() {
  return <Suspense><TuotteetContent /></Suspense>
}