'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { api } from '@/lib/api'

export default function OstotPage() {
  const { C } = useTheme()
  const { t } = useLang()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Haetaan ostot backendistä kun order-järjestelmä on valmis
    setLoading(false)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>{t.purchases.title}</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>{t.purchases.subtitle}</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Ladataan...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛍️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Ei ostoksia vielä</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Ostettuasi tuotteita ne näkyvät täällä seurantakoodeineen.</div>
            <Link href="/selaa" style={{ background: C.accent, color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Selaa tuotteita
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.map((order: any) => (
              <div key={order.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
                <div>{order.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
