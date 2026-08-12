'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { orderApi } from '@/lib/api'
import { StarRatingInput } from '@/components/StarRating'

interface OrderItem { id: string; price: number; quantity: number; product: { id: string; name: string; imageUrl?: string } }
interface SellingOrder {
  id: string; status: string; productTotal: number; shippingPrice: number | null; shippingSize: string | null
  trackingCode: string | null; createdAt: string; items: OrderItem[]
  buyer: { name: string; username: string; address?: string; postalCode?: string; city?: string; phone?: string }
  reviews: { reviewerId: string }[]
}

function addressLine(b: SellingOrder['buyer']) {
  return [b.address, b.postalCode, b.city].filter(Boolean).join(', ') || 'Ei osoitetta vielä'
}

function OrderCard({ order, showTracking, C, trackingValue, onTrackingChange, onSubmitTracking, pickupValue, onPickupChange, onSubmitPickup, busy, review }: {
  order: SellingOrder; showTracking: boolean; C: Record<string, string>
  trackingValue: string; onTrackingChange: (v: string) => void; onSubmitTracking: () => void
  pickupValue: string; onPickupChange: (v: string) => void; onSubmitPickup: () => void; busy: boolean
  review?: {
    alreadyReviewed: boolean; open: boolean; rating: number; comment: string
    onOpen: () => void; onCancel: () => void; onRatingChange: (v: number) => void; onCommentChange: (v: string) => void
    onSubmit: () => void; busy: boolean
  }
}) {
  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{order.buyer.name}</div>
          <div style={{ fontSize: 12, color: C.muted }}>@{order.buyer.username}</div>
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>{new Date(order.createdAt).toLocaleDateString('fi-FI')}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {order.items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: C.text }}>{item.product.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
            <span style={{ color: C.muted }}>{(item.price * item.quantity).toLocaleString('fi-FI')}€</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
        {addressLine(order.buyer)}{order.buyer.phone ? ` · ${order.buyer.phone}` : ''}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{(order.productTotal + (order.shippingPrice ?? 0)).toLocaleString('fi-FI')}€</span>
        {showTracking && order.shippingSize === 'nouto' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 240px', justifyContent: 'flex-end' }}>
            <input
              value={pickupValue}
              onChange={e => onPickupChange(e.target.value)}
              placeholder="Noutokoodi"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, color: C.text, flex: '1 1 140px', minWidth: 0 }}
            />
            <button onClick={onSubmitPickup} disabled={busy} style={{ background: C.accent, color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {busy ? '...' : 'Vahvista nouto'}
            </button>
          </div>
        )}
        {showTracking && order.shippingSize !== 'nouto' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 240px', justifyContent: 'flex-end' }}>
            <input
              value={trackingValue}
              onChange={e => onTrackingChange(e.target.value)}
              placeholder="Seurantakoodi"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, color: C.text, flex: '1 1 140px', minWidth: 0 }}
            />
            <button onClick={onSubmitTracking} disabled={busy} style={{ background: C.accent, color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {busy ? '...' : 'Lisää seurantakoodi'}
            </button>
          </div>
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
                <button onClick={review.onSubmit} disabled={review.busy} style={{ background: C.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: review.busy ? 0.7 : 1 }}>
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

  const ready = orders.filter(o => o.status === 'PENDING_SHIPPING')
  const waitingShipping = orders.filter(o => o.status === 'PENDING_SHIPPING_SELECTION')
  const delivered = orders.filter(o => o.status === 'DELIVERED')

  return (
    <div style={{ color: C.text }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Tilaukset</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Myyntitilaustesi hallinta</p>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#EF4444', fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Ladataan...</div>
      ) : (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Uudet tilaukset <span style={{ color: C.muted, fontWeight: 400 }}>({ready.length})</span></h2>
          {ready.length === 0
            ? <div style={{ color: C.muted, fontSize: 13, padding: '12px 0', marginBottom: 24 }}>Ei lähetettäviä tilauksia</div>
            : <div style={{ marginBottom: 24 }}>{ready.map(o => (
                <OrderCard
                  key={o.id} order={o} showTracking C={C}
                  trackingValue={trackingInput[o.id] ?? ''}
                  onTrackingChange={v => setTrackingInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitTracking={() => submitTracking(o.id)}
                  pickupValue={pickupInput[o.id] ?? ''}
                  onPickupChange={v => setPickupInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitPickup={() => submitPickup(o.id)}
                  busy={busy === o.id}
                />
              ))}</div>
          }

          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Odottaa toimitusvalintaa <span style={{ color: C.muted, fontWeight: 400 }}>({waitingShipping.length})</span></h2>
          {waitingShipping.length === 0
            ? <div style={{ color: C.muted, fontSize: 13, padding: '12px 0' }}>Ei tilauksia</div>
            : <div>{waitingShipping.map(o => (
                <OrderCard
                  key={o.id} order={o} showTracking={false} C={C}
                  trackingValue={trackingInput[o.id] ?? ''}
                  onTrackingChange={v => setTrackingInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitTracking={() => submitTracking(o.id)}
                  pickupValue={pickupInput[o.id] ?? ''}
                  onPickupChange={v => setPickupInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitPickup={() => submitPickup(o.id)}
                  busy={busy === o.id}
                />
              ))}</div>
          }

          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Toimitetut <span style={{ color: C.muted, fontWeight: 400 }}>({delivered.length})</span></h2>
          {delivered.length === 0
            ? <div style={{ color: C.muted, fontSize: 13, padding: '12px 0' }}>Ei toimitettuja tilauksia</div>
            : <div>{delivered.map(o => (
                <OrderCard
                  key={o.id} order={o} showTracking={false} C={C}
                  trackingValue={trackingInput[o.id] ?? ''}
                  onTrackingChange={v => setTrackingInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitTracking={() => submitTracking(o.id)}
                  pickupValue={pickupInput[o.id] ?? ''}
                  onPickupChange={v => setPickupInput(s => ({ ...s, [o.id]: v }))}
                  onSubmitPickup={() => submitPickup(o.id)}
                  busy={busy === o.id}
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
              ))}</div>
          }
        </>
      )}
    </div>
  )
}
