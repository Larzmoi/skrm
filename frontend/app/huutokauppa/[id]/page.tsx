'use client'
import { useState, useEffect, use, useCallback } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/lang-context'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auctionApi } from '@/lib/api'
import { useIsMobile } from '@/lib/useIsMobile'
import ReportModal from '@/components/ReportModal'

// Pyöristää senteille — estää JS:n liukulukutarkkuuden aiheuttamat virheet (esim. 5.1 + 0.1 = 5.199999999999999)
function roundCents(amount: number) {
  return Math.round(amount * 100) / 100
}

export default function HuutokauppaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { C } = useTheme()
  const { user } = useAuth()
  const { t } = useLang()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [product, setProduct] = useState<any>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [maxBid, setMaxBid] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const loadAuction = useCallback(async () => {
    try {
      const data = await auctionApi.get(id)
      setProduct(data)
      setBidAmount(String(roundCents((data.currentBid ?? data.startPrice) + (data.bidIncrement ?? 1))))
    } catch {}
    finally { setLoading(false) }
  }, [id])

  useEffect(() => {
    loadAuction()
    const interval = setInterval(loadAuction, 15000) // päivitä 15s välein
    return () => clearInterval(interval)
  }, [loadAuction])

  useEffect(() => {
    if (!product?.auctionEndsAt) return
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(product.auctionEndsAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [product])

  function getTimeLeft(endsAt: string) {
    const diff = new Date(endsAt).getTime() - Date.now()
    if (diff <= 0) return 'Päättynyt'
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    if (d > 0) return `${d}pv ${h}h`
    if (h > 0) return `${h}h ${m}min`
    return `${m}min ${s}s`
  }

  async function placeBid() {
    setError(''); setSuccess(''); setBusy(true)
    try {
      await auctionApi.bid(id, Number(bidAmount))
      setSuccess(`Huuto ${bidAmount}€ tehty!`)
      await loadAuction()
    } catch (e: any) { setError(e.message ?? 'Huuto epäonnistui') }
    setBusy(false)
  }

  async function setAutoBid() {
    setError(''); setSuccess(''); setBusy(true)
    try {
      await auctionApi.autobid(id, Number(maxBid))
      setSuccess(`Automaattihuuto asetettu max ${maxBid}€`)
      await loadAuction()
    } catch (e: any) { setError(e.message ?? 'Automaattihuudon asetus epäonnistui') }
    setBusy(false)
  }

  async function buyNow() {
    setError(''); setSuccess(''); setBusy(true)
    try {
      await auctionApi.buyNow(id)
      setSuccess('Ostettu!')
      await loadAuction()
    } catch (e: any) { setError(e.message ?? 'Ostaminen epäonnistui') }
    setBusy(false)
  }

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
        <div style={{ color: C.muted, marginBottom: 16 }}>Huutokauppaa ei löydy</div>
        <Link href="/huutokaupat" style={{ color: C.accent }}>← Takaisin</Link>
      </div>
    </div>
  )

  const ended = !product.auctionEndsAt || new Date(product.auctionEndsAt) <= new Date()
  const isWinning = product.currentBidderId === user?.id
  const minBid = roundCents((product.currentBid ?? product.startPrice) + (product.bidIncrement ?? 1))
  const images: string[] = product.imageUrl ? product.imageUrl.split('|||').filter(Boolean) : []

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>

        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
          <Link href="/" style={{ color: C.muted }}>{t.nav.home}</Link> ›{' '}
          <Link href="/huutokaupat" style={{ color: C.muted }}>{t.nav.auctions}</Link> ›{' '}
          <span style={{ color: C.text }}>{product.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: isMobile ? 24 : 40 }}>

          <div>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: C.surface, aspectRatio: '1' }}>
              {images[0]
                ? <img src={images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.dim, fontSize: 32 }}>+</div>
              }
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {images.map((img: string, i: number) => (
                  <img key={i} src={img} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                ))}
              </div>
            )}

            {product.bids?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                  Huutohistoria ({product._count?.bids} huutoa)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 8, padding: 6 }}>
                  {product.bids.map((bid: any, i: number) => (
                    <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i === 0 ? C.accentLight : C.surface, borderRadius: 6, fontSize: 13, flexShrink: 0 }}>
                      <span style={{ color: i === 0 ? C.accent : C.textSub, fontWeight: i === 0 ? 700 : 400 }}>
                        @{bid.user.username} {bid.type === 'auto' && '(auto)'}
                      </span>
                      <span style={{ color: i === 0 ? C.accent : C.text, fontWeight: 700 }}>{bid.amount}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>{product.name}</h1>

            <div style={{ background: ended ? C.surface : C.accentLight, border: `1px solid ${ended ? C.border : C.accent}`, borderRadius: 10, padding: '16px', marginBottom: 16, textAlign: 'center' }}>
              {ended ? (
                <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>Huutokauppa päättynyt</div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{t.auction.endsIn}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{timeLeft}</div>
                </>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>
                {product.currentBid ? t.auction.highestBid : t.auction.startPrice}
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: isWinning ? C.accent : C.text }}>
                {(product.currentBid ?? product.startPrice).toLocaleString('fi-FI')}€
              </div>
              {/* ALV-läpinäkyvyysmerkintä yritysmyyjille - ks. CLAUDE.md "ALV yritysmyyjille" */}
              {product.seller?.businessId && (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{t.product.vatIncluded}</div>
              )}
              {isWinning && <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginTop: 4 }}>Sinä johdossa</div>}
              {!isWinning && product.currentBidderId && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Joku muu johdossa</div>}
            </div>

            {product.reservePrice && (product.currentBid ?? 0) < product.reservePrice && (
              <div style={{ background: '#FFF8E8', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#92400E' }}>
                {t.auction.reserveNotMet}
              </div>
            )}

            {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#CC0000', fontSize: 13 }}>{error}</div>}
            {success && <div style={{ background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: C.accent, fontSize: 13, fontWeight: 600 }}>{success}</div>}

            {!ended && user && user.id !== product.sellerId && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6 }}>
                    Huuda (min {minBid}€)
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    min={minBid}
                    style={{ width: '100%', boxSizing: 'border-box' as const, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px', color: C.text, fontSize: 15, fontWeight: 700 }}
                  />
                  <button onClick={placeBid} disabled={busy} style={{ width: '100%', background: C.accentSolid, color: C.accentText, border: 'none', padding: '13px', borderRadius: 10, fontWeight: 800, fontSize: 16, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, marginTop: 8 }}>
                    Huuda {bidAmount}€
                  </button>
                </div>

                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Automaattihuuto</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                    Järjestelmä huutaa puolestasi aina minimillä kunnes maksimisi täyttyy
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      value={maxBid}
                      onChange={e => setMaxBid(e.target.value)}
                      placeholder={`Max summa (min ${minBid}€)`}
                      style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13 }}
                    />
                    <button onClick={setAutoBid} disabled={busy} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '9px 16px', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>
                      Aseta
                    </button>
                  </div>
                </div>

                {product.buyNowPrice && (
                  <button onClick={buyNow} disabled={busy} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: busy ? 'default' : 'pointer', marginBottom: 12 }}>
                    Osta heti {product.buyNowPrice.toLocaleString('fi-FI')}€
                  </button>
                )}
              </>
            )}

            {product.description && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>Kuvaus</h3>
                <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7 }}>{product.description}</p>
              </div>
            )}

            {!user && !ended && (
              <Link href="/login" style={{ display: 'block', width: '100%', background: C.accentSolid, color: C.accentText, padding: '13px', borderRadius: 10, fontWeight: 800, fontSize: 16, textAlign: 'center', textDecoration: 'none', marginBottom: 12 }}>
                Kirjaudu huutaaksesi
              </Link>
            )}

            {product.seller && (
              <Link href={`/u/${product.seller.username}`} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', textDecoration: 'none', marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.accentSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: C.accentText }}>
                  {product.seller.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>@{product.seller.username}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{product.seller.name}</div>
                </div>
                <span style={{ fontSize: 13, color: C.accent }}>Profiili →</span>
              </Link>
            )}

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>{t.product.shippingInfo}</div>
              {[t.product.shipIn24, t.footer.binding, t.product.trackingCode].map(line => (
                <div key={line} style={{ display: 'flex', gap: 8, fontSize: 13, color: C.textSub, marginBottom: 6 }}>
                  <span style={{ color: C.accent }}>✓</span>{line}
                </div>
              ))}
            </div>

            <button onClick={() => { if (!user) { router.push(`/login?redirect=/huutokauppa/${id}`); return } setShowReport(true) }} style={{ width: '100%', background: 'transparent', border: 'none', color: C.muted, padding: '4px', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              {t.report.button}
            </button>
          </div>
        </div>
      </div>
      <Footer />
      {showReport && <ReportModal targetType="product" targetId={product.id} onClose={() => setShowReport(false)} />}
    </div>
  )
}
