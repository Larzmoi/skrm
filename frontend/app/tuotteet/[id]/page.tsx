'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { KATEGORIAT, getKatNimi } from '@/lib/kategoriat'
import { api, cartApi, messageApi } from '@/lib/api'
import { useIsMobile } from '@/lib/useIsMobile'
import ReportModal from '@/components/ReportModal'

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { C } = useTheme()
  const { t, lang } = useLang()
  const { user } = useAuth()
  const { refresh: refreshCart } = useCart()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [added, setAdded] = useState(false)
  const [buyError, setBuyError] = useState('')
  const [buying, setBuying] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qty, setQty] = useState(1)
  const [zoomed, setZoomed] = useState(false)
  const [message, setMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [preBidAmount, setPreBidAmount] = useState('')
  const [preBidding, setPreBidding] = useState(false)
  const [preBidError, setPreBidError] = useState('')
  const [preBidSuccess, setPreBidSuccess] = useState(false)

  useEffect(() => {
    console.log('Haetaan tuote id:', id)
    api.getProduct(id)
      .then(data => { console.log('Tuote saatu:', data?.name); setProduct(data) })
      .catch(e => { console.error('Virhe:', e); setProduct(null) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Ladataan...</div>
    </div>
  )

  if (!product) return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ color: C.muted, marginBottom: 16 }}>{t.product.notFound}</div>
        <Link href="/selaa" style={{ color: C.accent }}>← Takaisin</Link>
      </div>
    </div>
  )

  const kat = KATEGORIAT.find(k => k.id === product.category)
  const images: string[] = product.imageUrl
    ? product.imageUrl.split('|||').filter((s: string) => s.length > 0)
    : []

  // Ennakkotarjoukset (ks. CLAUDE.md "Live-ominaisuudet Whatnot-tasolle" kohta 1) - sallittu
  // live-tyyppisille tuotteille (live/both) sekä ennen lähetyksen alkua (SCHEDULED) että
  // LIVE-lähetyksen aikana jonossa oleville, vielä myymättömille tuotteille (omistajan
  // päätös 2026-08-28). Backend on lopullinen totuus juuri sillä hetkellä huudettavana
  // olevasta lotista (ei tiedossa tällä sivulla ilman socket-yhteyttä) - jos tätä yritetään,
  // POST /prebid palauttaa selkeän virheen jonka placePreBid näyttää.
  const isPreBiddable = (product.saleType === 'live' || product.saleType === 'both')
    && product.status === 'PENDING'
    && (product.show?.status === 'SCHEDULED' || product.show?.status === 'LIVE')
  const currentBidValue = product.currentBid ?? product.startPrice
  const minPreBid = Math.round((currentBidValue + (product.bidIncrement ?? 1)) * 100) / 100
  const isLeadingBidder = user && product.currentBidderId === user.id

  async function placePreBid() {
    if (!user) { router.push(`/login?redirect=/tuotteet/${id}`); return }
    const amount = Number(preBidAmount.replace(',', '.'))
    if (!amount || amount < minPreBid) { setPreBidError(`${t.product.minBid}: ${minPreBid}€`); return }
    setPreBidError(''); setPreBidding(true)
    try {
      const updated = await api.prebid(product.id, amount)
      setProduct(updated)
      setPreBidAmount('')
      setPreBidSuccess(true)
      setTimeout(() => setPreBidSuccess(false), 3000)
    } catch (e: any) {
      setPreBidError(e.message ?? 'Tarjous epäonnistui')
    }
    setPreBidding(false)
  }

  async function buyNow() {
    if (!user) { router.push(`/login?redirect=/tuotteet/${id}`); return }
    setBuyError('')
    setBuying(true)
    try {
      await cartApi.add(product.id, 'direct', qty)
      await refreshCart()
      setAdded(true)
      setTimeout(() => setAdded(false), 3000)
    } catch (e: any) {
      setBuyError(e.message ?? 'Lisäys koriin epäonnistui')
    }
    setBuying(false)
  }

  async function sendSellerMessage() {
    if (!user) { router.push(`/login?redirect=/tuotteet/${id}`); return }
    if (!message.trim() || !product.seller) return
    setSendingMessage(true)
    try {
      await messageApi.send(product.seller.id, message.trim(), product.id)
      setMessage('')
      setMessageSent(true)
      setTimeout(() => setMessageSent(false), 3000)
    } catch {}
    setSendingMessage(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '24px', flex: 1, width: '100%', boxSizing: 'border-box' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13, color: C.muted, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: C.muted }}>{t.product.breadcrumbHome}</Link>
          <span>›</span>
          <Link href="/selaa" style={{ color: C.muted }}>{t.product.breadcrumbBrowse}</Link>
          {kat && <><span>›</span><Link href={`/selaa?kategoria=${product.category}`} style={{ color: C.muted }}>{getKatNimi(kat, lang as any)}</Link></>}
          <span>›</span>
          <span style={{ color: C.text, fontWeight: 500 }}>{product.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 380px', gap: isMobile ? 24 : 40, alignItems: 'start' }}>

          {/* Kuvat */}
          <div>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: C.surface, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, maxHeight: 520, cursor: images.length > 0 ? 'zoom-in' : 'default' }}
              onClick={() => images.length > 0 && setZoomed(true)}>
              {images.length > 0
                ? <img src={images[activeImg]} alt={product.name} style={{ width: '100%', maxHeight: 520, objectFit: 'contain', display: 'block' }} />
                : <div style={{ color: C.muted, fontSize: 14, padding: 40 }}>{t.product.noImage}</div>
              }
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {images.map((img: string, i: number) => (
                  <div key={i} onClick={() => setActiveImg(i)} style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${activeImg === i ? C.accent : C.border}` }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tiedot */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {kat && <span style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, padding: '3px 10px', borderRadius: 6 }}>{getKatNimi(kat, lang as any)}</span>}
              {product.condition && <span style={{ background: C.accentLight, border: `1px solid ${C.accent}33`, color: C.accent, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6 }}>{product.condition}</span>}
              {product.saleType === 'live' && <span style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', color: '#CC0000', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6 }}>Live-huutokauppa</span>}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 16, lineHeight: 1.3 }}>{product.name}</h1>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: C.text, marginBottom: 4 }}>
                {(product.buyNowPrice ?? product.startPrice).toLocaleString('fi-FI')}€
              </div>
              {/* ALV-läpinäkyvyysmerkintä yritysmyyjille (User.businessId asetettu) - puhdas
                  tekstilisäys, ei vaikuta hintaan. Ks. CLAUDE.md "ALV yritysmyyjille". */}
              {product.seller?.businessId && (
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{t.product.vatIncluded}</div>
              )}
              {/* Toimitustapa-hinta/nouto-vihje — ks. CLAUDE.md "Kaksi UX-löydöstä 2026-09-02"
                  kohta 2. allowPickup/allowShipping puuttuvat kentästä tulkitaan sallituksi
                  (`!== false`), sama oletus kuin koko toimitustapa-logiikassa muuallakin. */}
              {product.allowShipping !== false && product.allowPickup !== false && (
                <div style={{ fontSize: 13, color: C.muted }}>{t.product.deliveryBothOptions}</div>
              )}
              {product.allowShipping !== false && product.allowPickup === false && (
                <div style={{ fontSize: 13, color: C.muted }}>+ {t.product.delivery}</div>
              )}
              {product.allowPickup !== false && product.allowShipping === false && (
                <div style={{ fontSize: 13, color: C.muted }}>{t.product.pickupFromSeller}</div>
              )}
            </div>

            {product.allowPickup !== false && product.allowShipping === false && (
              <div style={{ background: '#FFF8E8', border: '1px solid #F59E0B', borderRadius: 8, padding: '12px 14px', marginBottom: 12, fontSize: 13, color: '#92400E' }}>
                {t.product.pickupInfoBox}
              </div>
            )}

            {product.saleType !== 'live' ? (
              <>
                {product.quantity > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Määrä:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text, minWidth: 24, textAlign: 'center' }}>{qty}</span>
                      <button onClick={() => setQty(q => Math.min(product.quantity, q + 1))} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                    <span style={{ fontSize: 12, color: C.muted }}>(max {product.quantity})</span>
                  </div>
                )}
                {buyError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 10, color: '#EF4444', fontSize: 13 }}>{buyError}</div>}
                {added ? (
                  <Link href="/kori" style={{ display: 'block', background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 10, padding: '14px', textAlign: 'center', marginBottom: 12, textDecoration: 'none' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.accent, marginBottom: 4 }}>{t.product.addedToCart}</div>
                    <div style={{ fontSize: 13, color: C.muted }}>{t.product.goToCart}</div>
                  </Link>
                ) : (
                  <button onClick={buyNow} disabled={buying} style={{ width: '100%', background: C.accentSolid, color: C.accentText, border: 'none', padding: '14px', borderRadius: 10, fontWeight: 800, fontSize: 16, cursor: buying ? 'default' : 'pointer', opacity: buying ? 0.7 : 1, marginBottom: 10 }}>
                    {buying ? t.auth.loading : t.product.addToCart}
                  </button>
                )}
              </>
            ) : !isPreBiddable ? (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px', textAlign: 'center', marginBottom: 10, color: C.muted, fontSize: 14 }}>
                {t.product.soldLive}
              </div>
            ) : null}

            {isPreBiddable && (
              <div style={{ background: C.accentLight, border: `1px solid ${C.accent}44`, borderRadius: 10, padding: '16px', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 6 }}>{t.product.preBidTitle}</div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>{t.product.preBidDesc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.text, marginBottom: 4 }}>
                  <span>{product.currentBid != null ? t.product.currentBid : t.product.startingBid}</span>
                  <span style={{ fontWeight: 800 }}>{currentBidValue}€</span>
                </div>
                {product._count?.bids > 0 && (
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{product._count.bids} {t.product.bidsCount}</div>
                )}
                {isLeadingBidder && (
                  <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, marginBottom: 10 }}>✓ {t.product.youAreLeading}</div>
                )}
                {preBidError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 10, color: '#EF4444', fontSize: 13 }}>{preBidError}</div>}
                {preBidSuccess ? (
                  <div style={{ background: C.cardBg, border: `1px solid ${C.accent}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center', color: C.accent, fontWeight: 700, fontSize: 14 }}>
                    ✓ {t.product.bidPlaced}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text" inputMode="decimal" value={preBidAmount} onChange={e => setPreBidAmount(e.target.value)}
                      placeholder={`${t.product.minBid} ${minPreBid}€`}
                      style={{ flex: 1, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0, boxSizing: 'border-box' }}
                    />
                    <button onClick={placePreBid} disabled={preBidding} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: preBidding ? 'default' : 'pointer', opacity: preBidding ? 0.7 : 1, flexShrink: 0 }}>
                      {preBidding ? t.product.placingBid : t.product.placeBid}
                    </button>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setShowContact(s => !s)} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, color: C.textSub, padding: '12px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
              {t.product.askSeller}
            </button>

            <button onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, color: copied ? C.accent : C.textSub, padding: '12px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
              {copied ? '✓ Linkki kopioitu!' : 'Jaa tuote'}
            </button>

            <button onClick={() => { if (!user) { router.push(`/login?redirect=/tuotteet/${id}`); return } setShowReport(true) }} style={{ width: '100%', background: 'transparent', border: 'none', color: C.muted, padding: '4px', fontSize: 12, cursor: 'pointer', marginBottom: 20, textDecoration: 'underline' }}>
              {t.report.button}
            </button>

            {showContact && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px', marginBottom: 20 }}>
                {messageSent ? (
                  <div style={{ color: C.accent, fontSize: 13, fontWeight: 600 }}>{t.product.messageSent}</div>
                ) : (
                  <>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Kirjoita viestisi myyjälle..." rows={3} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
                    <button onClick={sendSellerMessage} disabled={sendingMessage || !message.trim()} style={{ marginTop: 8, background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 18px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: sendingMessage ? 'default' : 'pointer', opacity: sendingMessage || !message.trim() ? 0.6 : 1 }}>{t.product.sendMessage}</button>
                  </>
                )}
              </div>
            )}

            {/* Myyjä */}
            {product.seller && (
              <Link href={`/u/${product.seller.username}`} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', textDecoration: 'none', marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.accentSolid, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: C.accentText, flexShrink: 0 }}>
                  {product.seller.avatarUrl
                    ? <img src={product.seller.avatarUrl} alt={product.seller.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : product.seller.username?.[0]?.toUpperCase()
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>@{product.seller.username}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{product.seller.name}</div>
                </div>
                <span style={{ fontSize: 13, color: C.accent }}>{t.product.sellerProfile}</span>
              </Link>
            )}

            {/* Toimitus */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>{t.product.shippingInfo}</div>
              {[t.product.shipIn24, t.product.binding, t.product.trackingCode].map(line => (
                <div key={line} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6, fontSize: 13, color: C.textSub }}>
                  <span style={{ color: C.accent, flexShrink: 0 }}>✓</span>{line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kuvaus */}
        {product.description && (
          <div style={{ marginTop: 40, maxWidth: 600 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 12 }}>{t.product.description}</h2>
            <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7 }}>{product.description}</p>
          </div>
        )}
      </div>
      <Footer />

      {showReport && <ReportModal targetType="product" targetId={product.id} onClose={() => setShowReport(false)} />}

      {/* Suurennusnäkymä */}
      {zoomed && (
        <div onClick={() => setZoomed(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 20 }}>
          <img src={images[activeImg]} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setZoomed(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>✕</button>
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: 20, display: 'flex', gap: 8 }}>
              {images.map((img, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setActiveImg(i) }} style={{ width: 50, height: 50, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${activeImg === i ? '#fff' : 'rgba(255,255,255,0.3)'}` }}>
                  <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
