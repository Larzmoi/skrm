'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { orderApi, postiApi, PickupPoint, sortPickupPointsByProximity } from '@/lib/api'
import { StarRatingInput } from '@/components/StarRating'
import { POSTI_TRACKING_STEPS, POSTI_STEP_LABELS, PostiTrackingStep } from '@/lib/postiTrackingSteps'
import ConfirmDialog from '@/components/ConfirmDialog'

interface OrderItem { id: string; productId: string; price: number; quantity: number; binding?: boolean; product: { id: string; name: string; imageUrl?: string; condition?: string; allowPickup?: boolean; allowShipping?: boolean } }
interface Order {
  id: string; status: string; productTotal: number; shippingPrice: number | null; shippingSize: string | null
  paymentDeadline: string | null; shippingWindowEnd: string | null; trackingCode: string | null; pickupCode: string | null
  pickupPointId: string | null; trackingNumber: string | null; sendingCode: string | null; labelUrl: string | null; postiStatus: PostiTrackingStep | null
  shippedAt: string | null; stalledNotifiedAt: string | null; reminderNotifiedAt: string | null; deliveryConfirmedAt: string | null; disputeReason: string | null
  items: OrderItem[]; seller: { name: string; username: string }; createdAt: string; updatedAt: string
  reviews: { reviewerId: string }[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function timeLeftLabel(ms: number) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function OstotPage() {
  const { C } = useTheme()
  const { t } = useLang()
  const { user } = useAuth()
  const { pakettikoot } = useCart()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({})
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<Record<string, string>>({})
  const [disputeOpenFor, setDisputeOpenFor] = useState<string | null>(null)
  const [disputeReasonInput, setDisputeReasonInput] = useState<Record<string, string>>({})
  const [reviewOpenFor, setReviewOpenFor] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState<Record<string, number>>({})
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({})
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([])
  const [pickupSearch, setPickupSearch] = useState('')
  // Ostajan oma vapaaehtoinen peruutus maksamattomalle tilaukselle, ks. CLAUDE.md "Ostoskori/
  // tilauksen peruutus" 2026-09-09 — ennen tätä ainoat vaihtoehdot olivat maksaa tai antaa 2h
  // umpeutua (mikä bannaa 30 päiväksi heti ensimmäisellä kerralla).
  const [cancelConfirmFor, setCancelConfirmFor] = useState<string | null>(null)
  // Noutopisteen vaihto kun alkuperäinen osoittautuu Postilla käytöstä poistetuksi (E41, ks.
  // CLAUDE.md "Posti-lähetyksen E41-virhe" / "PATCH /orders/:id/pickup-point" 2026-09-09) —
  // ennen tätä myyjä oli jumissa eikä ostajalla ollut mitään keinoa reagoida.
  const [pickupChangeOpenFor, setPickupChangeOpenFor] = useState<string | null>(null)
  const [newPickupPoint, setNewPickupPoint] = useState<Record<string, string>>({})

  useEffect(() => {
    postiApi.pickupPoints().then(setPickupPoints).catch(() => {})
  }, [])

  // Lähimmät ensin + hakusuodatus, ks. CLAUDE.md "Iso testauskierros" kohta 2 (koko maan
  // noutopistelista on ~3300 pistettä, ei enää pelkkä pääkaupunkiseutu).
  const sortedPickupPoints = useMemo(() => sortPickupPointsByProximity(pickupPoints, user?.postalCode), [pickupPoints, user?.postalCode])
  const filteredPickupPoints = useMemo(() => {
    const q = pickupSearch.trim().toLowerCase()
    if (!q) return sortedPickupPoints
    return sortedPickupPoints.filter(p => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.postalCode.includes(q))
  }, [sortedPickupPoints, pickupSearch])

  const load = useCallback(async () => {
    try {
      const data = await orderApi.mine()
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Stripe Checkout ohjaa selaimen tänne maksun jälkeen ?payment=success/cancel&orderId=... -
  // TÄMÄ redirect ei itsessään ole luotettava tiedonlähde (ei allekirjoitusta tarkisteta
  // täällä), vain webhookilla (backend/routes/webhooks.ts) päivitetty tilaus on totuus.
  // Stripen oma webhook-kutsu (checkout.session.completed) voi saapua hieman redirectin
  // jälkeen, joten haetaan tilaukset uudestaan hetken päästä varmistukseksi.
  const [paymentNotice, setPaymentNotice] = useState<'success' | 'cancel' | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    if (payment === 'success' || payment === 'cancel') {
      setPaymentNotice(payment)
      window.history.replaceState({}, '', '/ostot')
      const retry = setTimeout(() => load(), 2000)
      return () => clearTimeout(retry)
    }
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Tilauksen rivien sallitut toimitustavat — jos yksikin tuote on rajannut jommankumman pois
  // (allowPickup/allowShipping === false), sitä ei tarjota vaihtoehtona (ks. CLAUDE.md "Kaksi
  // UX-löydöstä 2026-09-02" kohta 2). Puuttuva kenttä (vanha tuote, ei koskaan asetettu)
  // tulkitaan sallituksi (`!== false`) — sama oletus kuin backendin create/update-reiteillä.
  function deliveryOptionsFor(order: Order) {
    const allowShipping = order.items.every(i => i.product.allowShipping !== false)
    const allowPickup = order.items.every(i => i.product.allowPickup !== false)
    return pakettikoot.filter(p => (p.id === 'postitus' ? allowShipping : p.id === 'nouto' ? allowPickup : true))
  }

  // Tuote ja toimitus maksetaan aina yhdessä, yhtenä Stripe Checkout Sessionina (ks. CLAUDE.md
  // "Paytrail -> Stripe" — omistajan korjaus 2026-08-12). Jos pakettikokoa ei ole vielä valittu
  // (esim. huutokaupan voitto, jolle ei ollut aiempaa kori-vaihetta), valitaan se tässä
  // ennen maksun aloitusta - muuten tilaus oli jo valittu (esim. korista tullessa).
  async function payOrder(order: Order) {
    if (order.shippingPrice == null) {
      const size = selectedSize[order.id]
      if (!size) { setError(t.purchases.errSelectSize); return }
      if (size === 'postitus' && !selectedPickupPoint[order.id]) { setError(t.purchases.errSelectPickup); return }
      setBusy(order.id); setError('')
      try {
        await orderApi.selectShipping(order.id, size, size === 'postitus' ? selectedPickupPoint[order.id] : undefined)
      } catch (e: any) { setError(e.message ?? t.purchases.errShippingSelectFailed); setBusy(null); return }
    } else {
      setBusy(order.id); setError('')
    }
    try {
      const { redirectUrl } = await orderApi.pay(order.id)
      if (redirectUrl) { window.location.href = redirectUrl; return }
      await load()
    } catch (e: any) { setError(e.message ?? t.purchases.errPaymentFailed) }
    setBusy(null)
  }

  async function cancelOrder(orderId: string) {
    setCancelConfirmFor(null)
    setBusy(orderId); setError('')
    try {
      await orderApi.cancel(orderId)
      await load()
    } catch (e: any) { setError(e.message ?? t.purchases.errCancelFailed) }
    setBusy(null)
  }

  async function changePickupPoint(orderId: string) {
    const pickupPointId = newPickupPoint[orderId]
    if (!pickupPointId) { setError(t.purchases.errSelectPickup); return }
    setBusy(orderId); setError('')
    try {
      await orderApi.updatePickupPoint(orderId, pickupPointId)
      setPickupChangeOpenFor(null)
      await load()
    } catch (e: any) { setError(e.message ?? t.purchases.errPickupChangeFailed) }
    setBusy(null)
  }

  async function confirmDelivery(orderId: string) {
    setBusy(orderId); setError('')
    try {
      await orderApi.confirmDelivery(orderId)
      await load()
    } catch (e: any) { setError(e.message ?? t.purchases.errConfirmFailed) }
    setBusy(null)
  }

  async function submitDispute(orderId: string) {
    const reason = disputeReasonInput[orderId]?.trim()
    if (!reason) { setError(t.purchases.errDescribeProblem); return }
    setBusy(orderId); setError('')
    try {
      await orderApi.dispute(orderId, reason)
      setDisputeOpenFor(null)
      await load()
    } catch (e: any) { setError(e.message ?? t.purchases.errDisputeFailed) }
    setBusy(null)
  }

  async function submitReview(orderId: string) {
    const rating = reviewRating[orderId] ?? 0
    if (rating < 1) { setError(t.purchases.errSelectRating); return }
    setBusy(orderId); setError('')
    try {
      await orderApi.review(orderId, rating, reviewComment[orderId]?.trim() || undefined)
      setReviewOpenFor(null)
      await load()
    } catch (e: any) { setError(e.message ?? t.purchases.errReviewFailed) }
    setBusy(null)
  }

  const orderTotal = (o: Order) => o.productTotal + (o.shippingPrice ?? 0)

  const sections = [
    { key: 'PENDING_PAYMENT', title: t.purchases.sectionPendingPayment, orders: orders.filter(o => o.status === 'PENDING_PAYMENT') },
    { key: 'PENDING_SHIPPING', title: t.purchases.sectionPendingShipping, orders: orders.filter(o => o.status === 'PENDING_SHIPPING') },
    { key: 'SHIPPED', title: t.purchases.shipped, orders: orders.filter(o => o.status === 'SHIPPED') },
    { key: 'DISPUTED', title: t.purchases.sectionDisputed, orders: orders.filter(o => o.status === 'DISPUTED') },
    { key: 'DELIVERED', title: t.purchases.delivered, orders: orders.filter(o => o.status === 'DELIVERED') },
  ]

  const hasAny = orders.some(o => o.status !== 'CANCELLED')

  return (
    <DashboardLayoutClient>
      <div style={{ color: C.text }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>{t.purchases.title}</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{t.purchases.subtitle}</p>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#EF4444', fontSize: 13 }}>{error}</div>}
        {paymentNotice === 'success' && <div style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.35)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: C.accentBright, fontSize: 13 }}>{t.purchases.paymentSuccessNotice}</div>}
        {paymentNotice === 'cancel' && <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#F59E0B', fontSize: 13 }}>{t.purchases.paymentCancelNotice}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>{t.purchases.loading}</div>
        ) : !hasAny ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>{t.purchases.emptyTitle}</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{t.purchases.emptyBody}</div>
            <Link href="/selaa" style={{ background: C.accentSolid, color: C.accentText, padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              {t.purchases.browseProducts}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {sections.filter(s => s.orders.length > 0).map(section => (
              <div key={section.key}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>{section.title} <span style={{ color: C.muted, fontWeight: 400 }}>({section.orders.length})</span></h2>
                {section.key === 'PENDING_PAYMENT' && (
                  <div style={{ background: C.warnLight, border: `1px solid ${C.warn}55`, borderRadius: 8, padding: '9px 14px', marginBottom: 12, fontSize: 12, color: C.warn }}>
                    {t.purchases.banWarning}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {section.orders.map(order => {
                    const paymentRemaining = order.paymentDeadline ? new Date(order.paymentDeadline).getTime() - now : null
                    const shippingRemaining = order.shippingWindowEnd ? new Date(order.shippingWindowEnd).getTime() - now : null
                    return (
                      <div key={order.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <Link href={`/u/${order.seller.username}`} style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>@{order.seller.username}</Link>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 12, color: C.muted }}>{new Date(order.createdAt).toLocaleDateString('fi-FI')}</span>
                            {/* Ei näytetä sitovalle (huudosta/hyväksytystä tarjouksesta syntyneelle)
                                tilaukselle - LUKITTU-sääntö "kaikki huudot sitovia, ei peruutuksia"
                                ei salli tätä, ja backend hylkäisi kutsun joka tapauksessa (ks.
                                CLAUDE.md "Ostoskori/tilauksen peruutus" 2026-09-09). */}
                            {section.key === 'PENDING_PAYMENT' && !order.items.some(i => i.binding) && (
                              <button onClick={() => setCancelConfirmFor(order.id)} disabled={busy === order.id} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#EF4444', fontWeight: 600, cursor: busy === order.id ? 'default' : 'pointer', textDecoration: 'underline' }}>
                                {t.purchases.cancelOrderButton}
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                          {order.items.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                              <span style={{ color: C.text }}>{item.product.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
                              <span style={{ color: C.muted }}>{(item.price * item.quantity).toLocaleString('fi-FI')}€</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
                            {order.shippingPrice != null ? orderTotal(order).toLocaleString('fi-FI') : order.productTotal.toLocaleString('fi-FI')}€
                            {order.shippingPrice == null && section.key === 'PENDING_PAYMENT' && <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}> {t.purchases.plusShipping}</span>}
                          </span>

                          {section.key === 'PENDING_PAYMENT' && paymentRemaining !== null && order.shippingPrice != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: paymentRemaining < 30 * 60 * 1000 ? '#EF4444' : C.muted }}>
                                {paymentRemaining > 0 ? `${timeLeftLabel(paymentRemaining)} ${t.purchases.remainingSuffix}` : t.purchases.timeExpired}
                              </span>
                              <button onClick={() => payOrder(order)} disabled={busy === order.id} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 18px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy === order.id ? 0.7 : 1 }}>
                                {busy === order.id ? t.purchases.processing : t.purchases.payNow}
                              </button>
                            </div>
                          )}

                          {section.key === 'SHIPPED' && (order.labelUrl ? (
                            <button onClick={() => orderApi.openLabelPdf(order.id).catch((e: any) => alert(e.message))} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: C.accent, fontWeight: 700, cursor: 'pointer' }}>
                              {t.purchases.shippingLabelPdf}
                            </button>
                          ) : (order.sendingCode || order.trackingCode) && (
                            <span style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>{t.purchases.trackingCode}: {order.sendingCode ?? order.trackingCode}</span>
                          ))}

                          {section.key === 'PENDING_SHIPPING' && order.shippingSize === 'nouto' && order.pickupCode && (
                            <span style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>{t.purchases.pickupCodeLabel}: {order.pickupCode}</span>
                          )}
                        </div>

                        {section.key === 'PENDING_SHIPPING' && order.shippingSize === 'nouto' && order.pickupCode && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                              <span style={{ fontSize: 20, fontWeight: 800, color: C.accent, letterSpacing: 2 }}>{order.pickupCode}</span>
                              <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{t.purchases.pickupCodeHint}</span>
                            </div>
                          </div>
                        )}

                        {/* Noutopisteen vaihto — näkyy vain postitus-tilauksille joille ei ole
                            vielä luotu Posti-lähetystä. Ei aina auki (harvinainen tarve, ei saa
                            haitata tavallista näkymää) — avautuu linkistä, tyypillisesti sen
                            jälkeen kun ostaja saa PICKUP_POINT_INACTIVE-ilmoituksen. */}
                        {section.key === 'PENDING_SHIPPING' && order.shippingSize === 'postitus' && !order.trackingNumber && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                            {pickupChangeOpenFor === order.id ? (
                              <div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <select value={newPickupPoint[order.id] ?? ''} onChange={e => setNewPickupPoint(s => ({ ...s, [order.id]: e.target.value }))} style={{ flex: 1, minWidth: 160, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.text, boxSizing: 'border-box' as const }}>
                                    <option value="">{t.purchases.selectPickupPointPlaceholder}</option>
                                    {filteredPickupPoints.map(p => <option key={p.id} value={p.id}>{p.name} — {p.city}</option>)}
                                  </select>
                                  <button onClick={() => changePickupPoint(order.id)} disabled={busy === order.id} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 18px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy === order.id ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                                    {busy === order.id ? '...' : t.purchases.savePickupPoint}
                                  </button>
                                  <button onClick={() => setPickupChangeOpenFor(null)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '8px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                                    {t.purchases.cancel}
                                  </button>
                                </div>
                                <input
                                  value={pickupSearch}
                                  onChange={e => setPickupSearch(e.target.value)}
                                  placeholder={t.purchases.searchPickupPlaceholder}
                                  style={{ width: '100%', boxSizing: 'border-box' as const, marginTop: 6, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, color: C.text }}
                                />
                              </div>
                            ) : (
                              <button onClick={() => setPickupChangeOpenFor(order.id)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: C.accent, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                                {t.purchases.changePickupPoint}
                              </button>
                            )}
                          </div>
                        )}

                        {section.key === 'PENDING_PAYMENT' && order.shippingPrice == null && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                            {/* Todellinen 2h maksuaika juoksee taustalla vaikka toimitustapaa ei ole
                                vielä valittu - ilman tätä ostaja näki vain 6h toimitusvalinta-
                                ikkunan eikä koskaan oikeaa maksudeadlinea ennen kuin valitsi
                                toimitustavan (ks. CLAUDE.md "Uudet löydökset 2026-08-13" kohta 13). */}
                            {paymentRemaining !== null && (
                              <div style={{ fontSize: 12, fontWeight: 700, color: paymentRemaining < 30 * 60 * 1000 ? '#EF4444' : C.text, marginBottom: 4 }}>
                                {t.purchases.paymentTimeLabel} {paymentRemaining > 0 ? timeLeftLabel(paymentRemaining) : t.purchases.paymentTimeExpiredFull}
                              </div>
                            )}
                            {shippingRemaining !== null && (
                              <div style={{ fontSize: 12, fontWeight: 700, color: shippingRemaining < 60 * 60 * 1000 ? '#EF4444' : C.muted, marginBottom: 8 }}>
                                {shippingRemaining > 0 ? `${t.purchases.shippingSelectTimeLabel} ${timeLeftLabel(shippingRemaining)}` : t.purchases.shippingSelectExpired}
                              </div>
                            )}
                            {(() => {
                              const options = deliveryOptionsFor(order)
                              if (options.length === 0) {
                                return <div style={{ fontSize: 12, color: '#EF4444' }}>{t.kori.deliveryConflict}</div>
                              }
                              return (
                                <div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <select value={selectedSize[order.id] ?? ''} onChange={e => setSelectedSize(s => ({ ...s, [order.id]: e.target.value }))} style={{ flex: 1, minWidth: 160, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.text }}>
                                    <option value="">{t.purchases.selectPackageSizePlaceholder}</option>
                                    {options.map(p => <option key={p.id} value={p.id}>{p.nimi} {p.hinta > 0 ? `— ${p.hinta.toLocaleString('fi-FI')}€` : t.purchases.free}</option>)}
                                  </select>
                                  {selectedSize[order.id] === 'postitus' && (
                                    <select value={selectedPickupPoint[order.id] ?? ''} onChange={e => setSelectedPickupPoint(s => ({ ...s, [order.id]: e.target.value }))} style={{ flex: 1, minWidth: 0, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, color: C.text, boxSizing: 'border-box' as const }}>
                                      <option value="">{t.purchases.selectPickupPointPlaceholder}</option>
                                      {filteredPickupPoints.map(p => <option key={p.id} value={p.id}>{p.name} — {p.city}</option>)}
                                    </select>
                                  )}
                                  <button onClick={() => payOrder(order)} disabled={busy === order.id} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 18px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy === order.id ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                                    {busy === order.id ? '...' : t.purchases.confirmAndPay}
                                  </button>
                                </div>
                                {selectedSize[order.id] === 'postitus' && (
                                  <input
                                    value={pickupSearch}
                                    onChange={e => setPickupSearch(e.target.value)}
                                    placeholder={t.purchases.searchPickupPlaceholder}
                                    style={{ width: '100%', boxSizing: 'border-box' as const, marginTop: 6, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, color: C.text }}
                                  />
                                )}
                                </div>
                              )
                            })()}
                          </div>
                        )}

                        {section.key === 'SHIPPED' && (() => {
                          const shippedAge = order.shippedAt ? now - new Date(order.shippedAt).getTime() : 0
                          const daysLeft = Math.max(0, Math.ceil((14 * DAY_MS - shippedAge) / DAY_MS))
                          const currentStepIdx = order.postiStatus ? POSTI_TRACKING_STEPS.indexOf(order.postiStatus) : -1
                          // Ostajan oma kuittaus vapauttaa maksun VÄLITTÖMÄSTI (ks. CLAUDE.md
                          // "Toimituksen aikataulu ja maksuturva", täsmennetty 2026-09-04) - tilaus
                          // siirtyy suoraan DELIVERED-osioon samassa pyynnössä, ei koskaan jää
                          // tähän SHIPPED-näkymään odottamaan omaa kuittaustaan. Tämä osio näyttää
                          // siis aina vain "ei vielä kuitattu" -tilan, ei enää mitään countdownia.
                          return (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                              {order.trackingNumber && (
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{t.purchases.trackingNumberLabel}: {order.trackingNumber}</div>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {POSTI_TRACKING_STEPS.map((step, i) => (
                                      <div key={step} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ height: 4, borderRadius: 2, background: i <= currentStepIdx ? C.accent : C.border, marginBottom: 4 }} />
                                        <div style={{ fontSize: 10, color: i <= currentStepIdx ? C.accent : C.muted, fontWeight: i === currentStepIdx ? 700 : 400 }}>{POSTI_STEP_LABELS[step]}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {order.stalledNotifiedAt && (
                                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7, padding: '8px 12px', marginBottom: 8, color: '#B45309', fontSize: 12 }}>
                                  {t.purchases.notConfirmedWarning}
                                </div>
                              )}
                              {order.reminderNotifiedAt && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '8px 12px', marginBottom: 8, color: '#EF4444', fontSize: 12 }}>
                                  {t.purchases.reminderWarning}
                                </div>
                              )}
                              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                                {t.purchases.autoCloseIn.replace('{days}', String(daysLeft))}
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button onClick={() => confirmDelivery(order.id)} disabled={busy === order.id} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 16px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy === order.id ? 0.7 : 1 }}>
                                  {busy === order.id ? '...' : t.purchases.confirmDelivery}
                                </button>
                                <button onClick={() => setDisputeOpenFor(o => o === order.id ? null : order.id)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '8px 16px', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                  {t.purchases.reportProblem}
                                </button>
                              </div>
                              {disputeOpenFor === order.id && (
                                <div style={{ marginTop: 10 }}>
                                  <textarea
                                    value={disputeReasonInput[order.id] ?? ''}
                                    onChange={e => setDisputeReasonInput(s => ({ ...s, [order.id]: e.target.value }))}
                                    placeholder={t.purchases.describeProblemPlaceholder}
                                    rows={3}
                                    style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const }}
                                  />
                                  <button onClick={() => submitDispute(order.id)} disabled={busy === order.id} style={{ marginTop: 8, background: '#EF4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy === order.id ? 0.7 : 1 }}>
                                    {busy === order.id ? '...' : t.purchases.sendDispute}
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {section.key === 'DELIVERED' && (() => {
                          const alreadyReviewed = order.reviews.some(r => r.reviewerId === user?.id)
                          // Reklamaatio-oikeuden erottelu (ks. CLAUDE.md "Toimituksen aikataulu ja
                          // maksuturva", "RISTIRIITA KORJATTU 2026-09-05"): jos ostaja itse aktiivisesti
                          // kuittasi (deliveryConfirmedAt asetettu), ei enää reklamaatio-oikeutta - se
                          // OLI juuri se hyväksyntä. Jos tilaus vapautui passiivisesti (14pv-automatiikka,
                          // deliveryConfirmedAt tyhjä), 3 vrk:n reklamaatio-oikeus (käyttöehdot 6.3) on
                          // yhä voimassa updatedAt:sta (= DELIVERED-siirtymän ajankohta) laskettuna.
                          const passiveDisputeMsLeft = !order.deliveryConfirmedAt
                            ? 3 * DAY_MS - (Date.now() - new Date(order.updatedAt).getTime())
                            : -1
                          const canStillDispute = passiveDisputeMsLeft > 0
                          return (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                              {canStillDispute && (
                                <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                                    {t.purchases.autoReleasedDisputeWindow.replace('{days}', String(Math.max(1, Math.ceil(passiveDisputeMsLeft / DAY_MS))))}
                                  </div>
                                  {disputeOpenFor === order.id ? (
                                    <div>
                                      <textarea
                                        value={disputeReasonInput[order.id] ?? ''}
                                        onChange={e => setDisputeReasonInput(s => ({ ...s, [order.id]: e.target.value }))}
                                        placeholder={t.purchases.describeProblemPlaceholder}
                                        rows={3}
                                        style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const }}
                                      />
                                      <button onClick={() => submitDispute(order.id)} disabled={busy === order.id} style={{ marginTop: 8, background: '#EF4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy === order.id ? 0.7 : 1 }}>
                                        {busy === order.id ? '...' : t.purchases.sendDispute}
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setDisputeOpenFor(order.id)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '8px 16px', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                      {t.purchases.reportProblem}
                                    </button>
                                  )}
                                </div>
                              )}
                              {alreadyReviewed ? (
                                <div style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>✓ {t.purchases.reviewThanks}</div>
                              ) : reviewOpenFor === order.id ? (
                                <div>
                                  <StarRatingInput value={reviewRating[order.id] ?? 0} onChange={v => setReviewRating(s => ({ ...s, [order.id]: v }))} />
                                  <textarea
                                    value={reviewComment[order.id] ?? ''}
                                    onChange={e => setReviewComment(s => ({ ...s, [order.id]: e.target.value }))}
                                    placeholder={t.purchases.commentPlaceholder}
                                    rows={2}
                                    style={{ width: '100%', marginTop: 8, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const }}
                                  />
                                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <button onClick={() => submitReview(order.id)} disabled={busy === order.id} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 16px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy === order.id ? 0.7 : 1 }}>
                                      {busy === order.id ? '...' : t.purchases.sendReview}
                                    </button>
                                    <button onClick={() => setReviewOpenFor(null)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '8px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                                      {t.purchases.cancel}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setReviewOpenFor(order.id)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '8px 16px', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                  {t.purchases.leaveReview}
                                </button>
                              )}
                            </div>
                          )
                        })()}

                        {section.key === 'DISPUTED' && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '10px 12px', color: '#EF4444', fontSize: 13 }}>
                              <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.purchases.disputeInProgress}</div>
                              {order.disputeReason && <div>{order.disputeReason}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cancelConfirmFor && (
        <ConfirmDialog
          title={t.purchases.cancelOrderConfirmTitle}
          message={t.purchases.cancelOrderConfirmMessage}
          confirmLabel={t.purchases.cancelOrderButton}
          cancelLabel={t.purchases.cancel}
          danger
          onConfirm={() => cancelOrder(cancelConfirmFor)}
          onCancel={() => setCancelConfirmFor(null)}
        />
      )}
    </DashboardLayoutClient>
  )
}
