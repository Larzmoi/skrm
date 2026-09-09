'use client'
import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'
import { userApi } from '@/lib/api'

// Stripe Connect -tilin yhdistäminen (ks. CLAUDE.md "Paytrail -> Stripe" 2026-09-09) - myyjä
// tarvitsee tämän ennen kuin voi vastaanottaa maksuja (POST /orders/:id/pay estää maksun
// aloituksen jos seller.stripeAccountId puuttuu, ks. backend/src/routes/orders.ts). Sama
// hardkoodatun suomen konventio kuin tämän tiedoston muu sisältö jo käyttää (ei t.xxx tässä
// tiedostossa).
function StripeConnectCard() {
  const { C } = useTheme()
  const [status, setStatus] = useState<{ connected: boolean; transfersEnabled: boolean; payoutsEnabled: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    userApi.getStripeStatus().then(setStatus).catch(() => setStatus({ connected: false, transfersEnabled: false, payoutsEnabled: false }))
  }, [])

  async function connect() {
    setBusy(true)
    setError('')
    try {
      const { url } = await userApi.getStripeOnboardingLink()
      window.location.href = url
    } catch (e: any) {
      setError(e.message ?? 'Stripe-tilin yhdistäminen epäonnistui')
      setBusy(false)
    }
  }

  if (!status) return null

  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Maksujen vastaanotto (Stripe)</div>
          <div style={{ fontSize: 13, color: C.muted }}>
            {status.transfersEnabled
              ? 'Stripe-tilisi on yhdistetty ja valmis vastaanottamaan maksuja.'
              : status.connected
              ? 'Stripe-tili luotu, mutta onboarding on vielä kesken — täytä loput tiedot jatkaaksesi.'
              : 'Yhdistä Stripe-tilisi ennen kuin voit vastaanottaa maksuja ostajilta. Ei vaadi Y-tunnusta.'}
          </div>
        </div>
        {!status.transfersEnabled && (
          <button onClick={connect} disabled={busy} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {busy ? 'Ohjataan...' : status.connected ? 'Jatka onboardingia' : 'Yhdistä Stripe-tili'}
          </button>
        )}
      </div>
      {error && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 10 }}>{error}</div>}
    </div>
  )
}

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

      <StripeConnectCard />

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
        Välityspalkkio on 3,5%, enintään 35€ per kauppa + maksunkäsittelykulut.
      </div>
    </div>
  )
}
