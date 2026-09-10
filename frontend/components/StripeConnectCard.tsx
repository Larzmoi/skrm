'use client'
import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'
import { userApi } from '@/lib/api'

// Stripe Connect -tilin yhdistäminen (ks. CLAUDE.md "Paytrail -> Stripe" 2026-09-09) - myyjä
// tarvitsee tämän ennen kuin voi vastaanottaa maksuja (POST /orders/:id/pay estää maksun
// aloituksen jos seller.stripeAccountId puuttuu, ks. backend/src/routes/orders.ts). Sama
// hardkoodatun suomen konventio kuin dashboard/tilitykset- ja dashboard/profiili-sivut jo
// käyttävät (ei t.xxx näillä sivuilla). Jaettu komponentti — käytetään sekä /dashboard/tilitykset
// (alkuperäinen paikka) että /dashboard/profiili:ssa (lisätty 2026-09-09, ks. CLAUDE.md
// "Profiilin Stripe-vahvistuslinkki" — omistajan pyyntö saada tämä näkyviin profiilista, ei
// vain tilitykset-sivun kautta löydettäväksi).
export default function StripeConnectCard() {
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

  // Ainoa paikka josta myyjä näkee TODELLISEN, ajantasaisen Stripe-saldonsa ja tilityshistoriansa
  // - Habahubin oma Tilitykset-sivu näyttää vain omat tilausrivimme, ei Stripen puolen
  // tilitysaikataulua. Kertakäyttöinen linkki, haetaan vasta klikkauksesta (ei kerran mounttiin
  // asti kestävä, Stripe vanhentaa sen nopeasti) ja avataan uuteen välilehteen.
  async function openDashboard() {
    setBusy(true)
    setError('')
    try {
      const { url } = await userApi.getStripeDashboardLink()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      setError(e.message ?? 'Hallintapaneelin avaus epäonnistui')
    }
    setBusy(false)
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
        {status.transfersEnabled ? (
          <button onClick={openDashboard} disabled={busy} style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}`, padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {busy ? 'Avataan...' : 'Avaa Stripe-hallintapaneeli'}
          </button>
        ) : (
          <button onClick={connect} disabled={busy} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {busy ? 'Ohjataan...' : status.connected ? 'Jatka onboardingia' : 'Yhdistä Stripe-tili'}
          </button>
        )}
      </div>
      {error && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 10 }}>{error}</div>}
    </div>
  )
}
