'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { orderApi } from '@/lib/api'
import { StarRatingInput } from '@/components/StarRating'
import ConfirmDialog from '@/components/ConfirmDialog'

interface OrderItem { id: string; price: number; quantity: number; product: { id: string; name: string; imageUrl?: string } }
interface SellingOrder {
  id: string; status: string; productTotal: number; shippingPrice: number | null; shippingSize: string | null
  trackingCode: string | null; trackingNumber: string | null; sendingCode: string | null; labelUrl: string | null
  postiShipmentId: string | null; pakettikoko: 'PIENI' | 'ISO' | null; createdAt: string; items: OrderItem[]
  buyer: { name: string; username: string; address?: string; postalCode?: string; city?: string; phone?: string }
  reviews: { reviewerId: string }[]
  paymentDeadline: string | null
}

function addressLine(b: SellingOrder['buyer']) {
  return [b.address, b.postalCode, b.city].filter(Boolean).join(', ') || 'Ei osoitetta vielä'
}

function timeLeftLabel(ms: number) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// Myyjän puolelta puuttui aiemmin kokonaan näkymä voitettuun/ostettuun tuotteeseen joka
// odottaa ostajan maksua (ks. CLAUDE.md "Uudet löydökset 2026-08-13" kohta 13) - myyjä ei
// nähnyt edes että kauppa on tulossa ennen kuin ostaja oli jo maksanut. Kevyt, vain-luku-
// tyylinen kortti riittää, koska myyjä ei voi tehdä mitään paitsi odottaa.
function PendingPaymentCard({ order, C, now }: { order: SellingOrder; C: Record<string, string>; now: number }) {
  const remaining = order.paymentDeadline ? new Date(order.paymentDeadline).getTime() - now : null
  return (
    <div className="hb-card" style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.warn}`, borderRadius: 12, padding: '14px 18px', marginBottom: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 13.5, fontWeight: 700, color: C.text }}>{order.buyer.name}</div>
          <div style={{ fontSize: 11.5, color: C.muted }}>@{order.buyer.username}</div>
        </div>
        <span style={{ fontSize: 11, color: C.muted }}>{new Date(order.createdAt).toLocaleDateString('fi-FI')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 9 }}>
        {order.items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: C.textSub }}>{item.product.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
            <span style={{ color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{(item.price * item.quantity).toLocaleString('fi-FI')}€</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 9 }}>
        <span style={{ fontFamily: 'var(--font-display), sans-serif', fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 800, color: C.text }}>{order.productTotal.toLocaleString('fi-FI')}€</span>
        <span style={{
          fontFamily: 'var(--font-display), sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' as const,
          padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' as const,
          background: remaining !== null && remaining < 30 * 60 * 1000 ? 'rgba(239,68,68,0.14)' : C.warnLight,
          color: remaining !== null && remaining < 30 * 60 * 1000 ? '#EF4444' : C.warn,
        }}>
          {remaining !== null ? (remaining > 0 ? timeLeftLabel(remaining) : 'Umpeutunut') : 'Odottaa'}
        </span>
      </div>
    </div>
  )
}

function OrderCard({ order, showTracking, C, stripe, badge, trackingValue, onTrackingChange, onSubmitTracking, pickupValue, onPickupChange, onSubmitPickup, pakettikokoValue, onPakettikokoChange, onCreateShipment, shipmentBusy, busy, review, onRefund, refundBusy }: {
  order: SellingOrder; showTracking: boolean; C: Record<string, string>
  stripe: string; badge: { text: string; bg: string; color: string }
  trackingValue: string; onTrackingChange: (v: string) => void; onSubmitTracking: () => void
  pickupValue: string; onPickupChange: (v: string) => void; onSubmitPickup: () => void; busy: boolean
  pakettikokoValue: 'PIENI' | 'ISO'; onPakettikokoChange: (v: 'PIENI' | 'ISO') => void
  onCreateShipment: () => void; shipmentBusy: boolean
  review?: {
    alreadyReviewed: boolean; open: boolean; rating: number; comment: string
    onOpen: () => void; onCancel: () => void; onRatingChange: (v: number) => void; onCommentChange: (v: string) => void
    onSubmit: () => void; busy: boolean
  }
  onRefund: () => void; refundBusy: boolean
}) {
  return (
    <div className="hb-card" style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderLeft: `4px solid ${stripe}`, borderRadius: 12, padding: '14px 18px', marginBottom: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 13.5, fontWeight: 700, color: C.text }}>{order.buyer.name}</div>
          <div style={{ fontSize: 11.5, color: C.muted }}>@{order.buyer.username}</div>
        </div>
        <span style={{ fontSize: 11, color: C.muted }}>{new Date(order.createdAt).toLocaleDateString('fi-FI')}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 9 }}>
        {order.items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: C.textSub }}>{item.product.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
            <span style={{ color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{(item.price * item.quantity).toLocaleString('fi-FI')}€</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 9 }}>
        {addressLine(order.buyer)}{order.buyer.phone ? ` · ${order.buyer.phone}` : ''}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 9, borderTop: `1px solid ${C.border}`, paddingTop: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontFamily: 'var(--font-display), sans-serif', fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 800, color: C.text }}>{(order.productTotal + (order.shippingPrice ?? 0)).toLocaleString('fi-FI')}€</span>
          <span style={{
            fontFamily: 'var(--font-display), sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' as const,
            padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' as const, background: badge.bg, color: badge.color,
          }}>
            {badge.text}
          </span>
          <button className="hb-btn" onClick={onRefund} disabled={refundBusy} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', opacity: refundBusy ? 0.6 : 1 }}>
            {refundBusy ? '...' : 'Hyvitä'}
          </button>
        </div>
        {showTracking && order.shippingSize === 'nouto' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 240px', justifyContent: 'flex-end' }}>
            <input
              value={pickupValue}
              onChange={e => onPickupChange(e.target.value)}
              placeholder="Noutokoodi"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, color: C.text, flex: '1 1 140px', minWidth: 0 }}
            />
            <button className="hb-btn" onClick={onSubmitPickup} disabled={busy} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '7px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {busy ? '...' : 'Vahvista nouto'}
            </button>
          </div>
        )}
        {showTracking && order.shippingSize === 'postitus' && !order.trackingNumber && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 380px', justifyContent: 'flex-end' }}>
            <input
              value={trackingValue}
              onChange={e => onTrackingChange(e.target.value)}
              placeholder="Seurantakoodi (manuaalinen)"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, color: C.text, flex: '1 1 140px', minWidth: 0 }}
            />
            <button className="hb-btn" onClick={onSubmitTracking} disabled={busy} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '7px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {busy ? '...' : 'Lisää seurantakoodi'}
            </button>
            {/* Pakettikoko valitaan vasta tässä, lähetysvaiheessa - ei vaikuta ostajalta jo
                veloitettuun kiinteään 6,90€:oon, puhtaasti tekninen tieto Postin API:lle
                (ks. CLAUDE.md "Postihinnat" 2026-08-26). */}
            <select value={pakettikokoValue} onChange={e => onPakettikokoChange(e.target.value as 'PIENI' | 'ISO')} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, color: C.text, flexShrink: 0 }}>
              <option value="PIENI">Pieni</option>
              <option value="ISO">Iso</option>
            </select>
            <button className="hb-btn" onClick={onCreateShipment} disabled={shipmentBusy} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.text, padding: '7px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: shipmentBusy ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {shipmentBusy ? '...' : 'Luo lähetys (Posti)'}
            </button>
          </div>
        )}
        {order.shippingSize === 'postitus' && (order.labelUrl || order.sendingCode || order.trackingCode) && (
          order.labelUrl ? (
            <button onClick={() => orderApi.openLabelPdf(order.id).catch((e: any) => alert(e.message))} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: C.accent, fontWeight: 700, cursor: 'pointer' }}>
              Avaa osoitetarra (PDF) →
            </button>
          ) : (
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>
              {order.sendingCode ? `Lähetyskoodi: ${order.sendingCode}` : `Seurantakoodi: ${order.trackingCode}`}
            </span>
          )
        )}
      </div>

      {review && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {review.alreadyReviewed ? (
            <div style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>✓ Kiitos arvostelusta</div>
          ) : review.open ? (
            <div>
              <StarRatingInput value={review.rating} onChange={review.onRatingChange} />
              <textarea
                value={review.comment}
                onChange={e => review.onCommentChange(e.target.value)}
                placeholder="Kommentti (valinnainen)"
                rows={2}
                style={{ width: '100%', marginTop: 8, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={review.onSubmit} disabled={review.busy} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '8px 16px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: review.busy ? 0.7 : 1 }}>
                  {review.busy ? '...' : 'Lähetä arvostelu'}
                </button>
                <button onClick={review.onCancel} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '8px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                  Peruuta
                </button>
              </div>
            </div>
          ) : (
            <button onClick={review.onOpen} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '8px 16px', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Jätä arvostelu ostajalle
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Kanban-sarakkeen otsikko - väristripe + nimi + kappalemäärä-badge + rahasumma. Sama
// tieto joka aiemmin luki pelkässä <h2>-otsikossa, nyt näkyy silmäyksellä ilman lukemista.
function ColumnHeader({ name, count, sum, stripe, C }: { name: string; count: number; sum: number; stripe: string; C: Record<string, string> }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: stripe, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
        </div>
        <span style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 11, fontWeight: 700, color: C.muted, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '1px 8px', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {count}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{sum.toLocaleString('fi-FI')}€</div>
    </div>
  )
}

function EmptyColumn({ text, C }: { text: string; C: Record<string, string> }) {
  return <div style={{ color: C.muted, fontSize: 13, padding: '10px 0' }}>{text}</div>
}

export default function TilauksetPage() {
  const { C } = useTheme()
  const { user } = useAuth()
  const [orders, setOrders] = useState<SellingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({})
  const [pickupInput, setPickupInput] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [reviewOpenFor, setReviewOpenFor] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState<Record<string, number>>({})
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({})
  const [reviewBusy, setReviewBusy] = useState<string | null>(null)
  const [refundBusy, setRefundBusy] = useState<string | null>(null)
  const [refundConfirmFor, setRefundConfirmFor] = useState<string | null>(null)
  const [shipmentBusy, setShipmentBusy] = useState<string | null>(null)
  const [pakettikokoInput, setPakettikokoInput] = useState<Record<string, 'PIENI' | 'ISO'>>({})
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    try {
      const data = await orderApi.selling()
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  async function submitTracking(orderId: string) {
    const code = trackingInput[orderId]?.trim()
    if (!code) { setError('Syötä seurantakoodi'); return }
    setBusy(orderId); setError('')
    try {
      await orderApi.addTracking(orderId, code)
      await load()
    } catch (e: any) { setError(e.message ?? 'Seurantakoodin lisäys epäonnistui') }
    setBusy(null)
  }

  async function submitPickup(orderId: string) {
    const code = pickupInput[orderId]?.trim()
    if (!code) { setError('Syötä noutokoodi'); return }
    setBusy(orderId); setError('')
    try {
      await orderApi.confirmPickup(orderId, code)
      await load()
    } catch (e: any) { setError(e.message ?? 'Noudon vahvistus epäonnistui') }
    setBusy(null)
  }

  async function createShipment(orderId: string) {
    setShipmentBusy(orderId); setError('')
    try {
      await orderApi.createShipment(orderId, pakettikokoInput[orderId] ?? 'PIENI')
      await load()
    } catch (e: any) { setError(e.message ?? 'Lähetyksen luonti epäonnistui') }
    setShipmentBusy(null)
  }

  async function doRefund(orderId: string) {
    setRefundConfirmFor(null)
    setRefundBusy(orderId); setError('')
    try {
      await orderApi.refund(orderId)
      await load()
    } catch (e: any) { setError(e.message ?? 'Hyvitys epäonnistui') }
    setRefundBusy(null)
  }

  async function submitReview(orderId: string) {
    const rating = reviewRating[orderId] ?? 0
    if (rating < 1) { setError('Valitse tähtiarvosana'); return }
    setReviewBusy(orderId); setError('')
    try {
      await orderApi.review(orderId, rating, reviewComment[orderId]?.trim() || undefined)
      setReviewOpenFor(null)
      await load()
    } catch (e: any) { setError(e.message ?? 'Arvostelun lähetys epäonnistui') }
    setReviewBusy(null)
  }

  const pendingPayment = orders.filter(o => o.status === 'PENDING_PAYMENT')
  const ready = orders.filter(o => o.status === 'PENDING_SHIPPING')
  const shipped = orders.filter(o => o.status === 'SHIPPED')
  const delivered = orders.filter(o => o.status === 'DELIVERED')

  const orderTotal = (o: SellingOrder) => o.productTotal + (o.shippingPrice ?? 0)
  const sumOf = (list: SellingOrder[]) => list.reduce((s, o) => s + orderTotal(o), 0)

  const shippedBadge = (o: SellingOrder) => ({
    text: o.labelUrl ? 'Tarra' : (o.sendingCode ?? o.trackingCode ?? 'Matkalla'),
    bg: C.surface2, color: C.textSub,
  })
  const doneBadge = { text: '✓ Valmis', bg: C.accentLight, color: C.accent }

  return (
    <div style={{ color: C.text }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>Tilaukset</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Myyntitilaustesi hallinta</p>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#EF4444', fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Ladataan...</div>
      ) : (
        // auto-fit + minmax rivittää sarakkeet konttiin sopiviksi sen sijaan että ne
        // vierisivät sivusuunnassa - 4 rinnakkain leveällä näytöllä, tippuu 2:een tai
        // 1:een kapeammalla, ei koskaan overflow-x:ää millään näytön leveydellä.
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 18, alignItems: 'start' }}>
          {pendingPayment.length > 0 && (
            <div style={{ minWidth: 0 }}>
              <ColumnHeader name="Odottaa maksua" count={pendingPayment.length} sum={pendingPayment.reduce((s, o) => s + o.productTotal, 0)} stripe={C.warn} C={C} />
              {pendingPayment.map(o => <PendingPaymentCard key={o.id} order={o} C={C} now={now} />)}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <ColumnHeader name="Uudet tilaukset" count={ready.length} sum={sumOf(ready)} stripe={C.accent} C={C} />
            {ready.length === 0
              ? <EmptyColumn text="Ei lähetettäviä tilauksia" C={C} />
              : ready.map(o => (
                <OrderCard
                  key={o.id} order={o} showTracking C={C} stripe={C.accent} badge={doneBadge}
                  trackingValue={trackingInput[o.id] ?? ''}
                  onTrackingChange={v => setTrackingInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitTracking={() => submitTracking(o.id)}
                  pickupValue={pickupInput[o.id] ?? ''}
                  onPickupChange={v => setPickupInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitPickup={() => submitPickup(o.id)}
                  pakettikokoValue={pakettikokoInput[o.id] ?? 'PIENI'}
                  onPakettikokoChange={v => setPakettikokoInput(s => ({ ...s, [o.id]: v }))}
                  onCreateShipment={() => createShipment(o.id)}
                  shipmentBusy={shipmentBusy === o.id}
                  busy={busy === o.id}
                  onRefund={() => setRefundConfirmFor(o.id)}
                  refundBusy={refundBusy === o.id}
                />
              ))
            }
          </div>

          <div style={{ minWidth: 0 }}>
            <ColumnHeader name="Lähetetty" count={shipped.length} sum={sumOf(shipped)} stripe={C.muted} C={C} />
            {shipped.length === 0
              ? <EmptyColumn text="Ei matkalla olevia tilauksia" C={C} />
              : shipped.map(o => (
                <OrderCard
                  key={o.id} order={o} showTracking={false} C={C} stripe={C.muted} badge={shippedBadge(o)}
                  trackingValue={trackingInput[o.id] ?? ''}
                  onTrackingChange={v => setTrackingInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitTracking={() => submitTracking(o.id)}
                  pickupValue={pickupInput[o.id] ?? ''}
                  onPickupChange={v => setPickupInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitPickup={() => submitPickup(o.id)}
                  pakettikokoValue={pakettikokoInput[o.id] ?? 'PIENI'}
                  onPakettikokoChange={v => setPakettikokoInput(s => ({ ...s, [o.id]: v }))}
                  onCreateShipment={() => createShipment(o.id)}
                  shipmentBusy={shipmentBusy === o.id}
                  busy={busy === o.id}
                  onRefund={() => setRefundConfirmFor(o.id)}
                  refundBusy={refundBusy === o.id}
                />
              ))
            }
          </div>

          <div style={{ minWidth: 0 }}>
            <ColumnHeader name="Toimitetut" count={delivered.length} sum={sumOf(delivered)} stripe={C.accent} C={C} />
            {delivered.length === 0
              ? <EmptyColumn text="Ei toimitettuja tilauksia" C={C} />
              : delivered.map(o => (
                <OrderCard
                  key={o.id} order={o} showTracking={false} C={C} stripe={C.accent} badge={doneBadge}
                  trackingValue={trackingInput[o.id] ?? ''}
                  onTrackingChange={v => setTrackingInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitTracking={() => submitTracking(o.id)}
                  pickupValue={pickupInput[o.id] ?? ''}
                  onPickupChange={v => setPickupInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitPickup={() => submitPickup(o.id)}
                  pakettikokoValue={pakettikokoInput[o.id] ?? 'PIENI'}
                  onPakettikokoChange={v => setPakettikokoInput(s => ({ ...s, [o.id]: v }))}
                  onCreateShipment={() => createShipment(o.id)}
                  shipmentBusy={shipmentBusy === o.id}
                  busy={busy === o.id}
                  onRefund={() => setRefundConfirmFor(o.id)}
                  refundBusy={refundBusy === o.id}
                  review={{
                    alreadyReviewed: o.reviews.some(r => r.reviewerId === user?.id),
                    open: reviewOpenFor === o.id,
                    rating: reviewRating[o.id] ?? 0,
                    comment: reviewComment[o.id] ?? '',
                    onOpen: () => setReviewOpenFor(o.id),
                    onCancel: () => setReviewOpenFor(null),
                    onRatingChange: v => setReviewRating(s => ({ ...s, [o.id]: v })),
                    onCommentChange: v => setReviewComment(s => ({ ...s, [o.id]: v })),
                    onSubmit: () => submitReview(o.id),
                    busy: reviewBusy === o.id,
                  }}
                />
              ))
            }
          </div>
        </div>
      )}

      {refundConfirmFor && (
        <ConfirmDialog
          message="Hyvitetäänkö tämä tilaus kokonaan ostajalle? Rahat palautuvat suoraan hänen maksutavalleen."
          danger
          onConfirm={() => doRefund(refundConfirmFor)}
          onCancel={() => setRefundConfirmFor(null)}
        />
      )}
    </div>
  )
}
