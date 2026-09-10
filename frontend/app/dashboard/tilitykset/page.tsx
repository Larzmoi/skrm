'use client'
import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'
import { orderApi } from '@/lib/api'
import StripeConnectCard from '@/components/StripeConnectCard'

// Tilaukset joiden takana on todella tapahtunut Stripe-maksu — PENDING_PAYMENT ja CANCELLED
// jätetään pois, koska niistä ei ole vielä (tai ei koskaan) veloitettu mitään.
const PAID_STATUSES = ['PENDING_SHIPPING', 'SHIPPED', 'DELIVERED', 'DISPUTED']

const STATUS_LABELS: Record<string, string> = {
  PENDING_SHIPPING: 'Odottaa lähetystä',
  SHIPPED: 'Lähetetty',
  DELIVERED: 'Toimitettu',
  DISPUTED: 'Reklamoitu',
}

interface OrderRow {
  id: string
  status: string
  productTotal: number
  commissionCents: number | null
  createdAt: string
  buyer?: { name?: string; username?: string }
  items?: { product?: { name?: string } }[]
}

export default function TilityksetPage() {
  const { C } = useTheme()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    orderApi.selling()
      .then((data: OrderRow[]) => setOrders(data.filter(o => PAID_STATUSES.includes(o.status))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ color: C.text }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Tilitykset</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Myyntisi ja tilitykset</p>
      </div>

      <StripeConnectCard />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Ladataan...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Ei tilityksiä vielä</div>
          <div style={{ fontSize: 14, color: C.muted }}>Tilityksesi näkyvät täällä, kun ensimmäinen kauppa on maksettu.</div>
        </div>
      ) : (
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Tapahtumat</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                  {['Tuote', 'Ostaja', 'Myyntihinta', 'Palkkio', 'Netto', 'Tila', 'Päivä'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: C.muted, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const productLabel = (o.items ?? []).map(it => it.product?.name).filter(Boolean).join(', ') || '—'
                  const commission = o.commissionCents != null ? o.commissionCents / 100 : null
                  const netto = commission != null ? o.productTotal - commission : null
                  return (
                    <tr key={o.id} style={{ borderBottom: i < orders.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <td style={{ padding: '12px 16px', color: C.text, fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={productLabel}>{productLabel}</td>
                      <td style={{ padding: '12px 16px', color: C.muted, whiteSpace: 'nowrap' }}>{o.buyer?.username ?? o.buyer?.name ?? '—'}</td>
                      <td style={{ padding: '12px 16px', color: C.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{o.productTotal.toFixed(2)}€</td>
                      <td style={{ padding: '12px 16px', color: C.muted, whiteSpace: 'nowrap' }}>{commission != null ? `−${commission.toFixed(2)}€` : '—'}</td>
                      <td style={{ padding: '12px 16px', color: C.accent, fontWeight: 700, whiteSpace: 'nowrap' }}>{netto != null ? `${netto.toFixed(2)}€` : '—'}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ background: o.status === 'DELIVERED' ? C.accentLight : C.surface2, color: o.status === 'DELIVERED' ? C.accent : C.muted, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{STATUS_LABELS[o.status] ?? o.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: C.muted, whiteSpace: 'nowrap' }}>{new Date(o.createdAt).toLocaleDateString('fi-FI')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, padding: '12px 16px', background: C.surface, borderRadius: 8, fontSize: 12, color: C.muted }}>
        Välityspalkkio on 3,5%, enintään 35€ per kauppa + maksunkäsittelykulut. Rahat siirtyvät Stripen kautta suoraan myyntitilillesi maksuhetkellä — tarkka saldo ja tilitysten aikataulu näkyvät omassa Stripe-hallintapaneelissasi ("Jatka onboardingia"/"Avaa Stripe-hallintapaneeli" -linkki yllä).
      </div>
    </div>
  )
}
