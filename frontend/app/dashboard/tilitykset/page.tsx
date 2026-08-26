'use client'
import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'

export default function TilityksetPage() {
  const { C } = useTheme()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Haetaan tilitykset backendistä kun order-järjestelmä on valmis
    setLoading(false)
  }, [])

  return (
    <div style={{ color: C.text }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Tilitykset</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Myyntisi ja tilitykset</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Ladataan...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Ei tilityksiä vielä</div>
          <div style={{ fontSize: 14, color: C.muted }}>Tilityksesi näkyvät täällä, kun ensimmäinen kauppa on tehty.</div>
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
                {orders.map((o: any, i: number) => (
                  <tr key={o.id} style={{ borderBottom: i < orders.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <td style={{ padding: '12px 16px', color: C.text, fontWeight: 500, whiteSpace: 'nowrap' }}>{o.product}</td>
                    <td style={{ padding: '12px 16px', color: C.muted, whiteSpace: 'nowrap' }}>{o.buyer}</td>
                    <td style={{ padding: '12px 16px', color: C.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{o.amount}€</td>
                    <td style={{ padding: '12px 16px', color: C.muted, whiteSpace: 'nowrap' }}>−{o.commission.toFixed(2)}€</td>
                    <td style={{ padding: '12px 16px', color: C.accent, fontWeight: 700, whiteSpace: 'nowrap' }}>{o.net.toFixed(2)}€</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ background: o.status === 'Maksettu' ? C.accentLight : C.surface2, color: o.status === 'Maksettu' ? C.accent : C.muted, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{o.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, whiteSpace: 'nowrap' }}>{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, padding: '12px 16px', background: C.surface, borderRadius: 8, fontSize: 12, color: C.muted }}>
        Välityspalkkio on 3,5%, enintään 35€ per kauppa + maksunkäsittelykulut (n. 1,5% + 0,25€).
      </div>
    </div>
  )
}
