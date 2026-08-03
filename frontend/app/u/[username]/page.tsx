'use client'
import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = use(params)
  const username = decodeURIComponent(rawUsername)
  const { C } = useTheme()
  const { t } = useLang()

  const [profile, setProfile] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000'

  useEffect(() => {
    // Haetaan käyttäjä ja hänen tuotteensa
    Promise.all([
      fetch(`${BACKEND}/users/${encodeURIComponent(username)}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BACKEND}/products?seller=${encodeURIComponent(username)}`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([user, prods]) => {
      setProfile(user)
      setProducts(Array.isArray(prods) ? prods : [])
    }).finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Ladataan...</div>
    </div>
  )

  const displayName = profile?.name ?? username
  const initial = displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Profiilikortti */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initial}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>{displayName}</h1>
              <div style={{ fontSize: 14, color: C.muted }}>@{username}</div>
            </div>
            <button
              onClick={() => setFollowing(f => !f)}
              style={{ background: following ? C.surface2 : C.accent, color: following ? C.textSub : '#fff', border: `1px solid ${following ? C.border : C.accent}`, padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              {following ? '✓ Seuraat' : t.profile.follow}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: t.profile.followers, value: '0' },
              { label: t.profile.trades, value: products.length.toString() },
              { label: t.profile.rating, value: '—' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tuotteet myynnissä */}
        {products.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 14 }}>Myynnissä</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {products.map((p: any) => (
                <Link key={p.id} href={`/tuotteet/${p.id}`} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', textDecoration: 'none', display: 'block' }}>
                  <div style={{ aspectRatio: '1', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl.split('|||')[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                    }
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{p.startPrice?.toLocaleString('fi-FI')}€</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {products.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted, fontSize: 14 }}>
            Ei tuotteita myynnissä
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
