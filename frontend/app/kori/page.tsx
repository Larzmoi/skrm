'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { useCart } from '@/lib/cart-context'
import { cartApi, orderApi } from '@/lib/api'

function timeLeftLabel(ms: number) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function KoriPage() {
  const { C } = useTheme()
  const { t } = useLang()
  const router = useRouter()
  const { groups, pakettikoot, loading, refresh } = useCart()
  const [now, setNow] = useState(Date.now())
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({})
  const [paying, setPaying] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Jos jokin live-tuote vanhenee, päivitetään kori (backend siivoaa lennossa)
  useEffect(() => {
    const anyExpired = groups.some(g => g.items.some(i => i.expiresAt && new Date(i.expiresAt).getTime() <= now))
    if (anyExpired) {
      setNotice(t.kori.liveExpiredNotice)
      refresh()
      setTimeout(() => setNotice(''), 5000)
    }
  }, [now, groups, refresh])

  function sizeFor(sellerId: string, suggested: string | null) {
    return selectedSize[sellerId] ?? suggested ?? pakettikoot[0]?.id ?? ''
  }

  function shippingPriceFor(sellerId: string, suggested: string | null) {
    const id = sizeFor(sellerId, suggested)
    return pakettikoot.find(p => p.id === id)?.hinta ?? 0
  }

  async function payGroup(sellerId: string) {
    setPaying(sellerId)
    try {
      const { order } = await cartApi.checkout(sellerId)
      const { redirectUrl } = await orderApi.pay(order.id)
      if (redirectUrl) {
        // Ulkoinen Paytrail-osoite - koko sivun navigointi, ei Next.js-routeria
        window.location.href = redirectUrl
        return
      }
      await refresh()
      router.push('/ostot')
    } catch (e: any) {
      setNotice(e.message ?? t.kori.payFailed)
      setTimeout(() => setNotice(''), 5000)
    }
    setPaying(null)
  }

  async function removeItem(itemId: string) {
    try {
      await cartApi.remove(itemId)
      await refresh()
    } catch {}
  }

  const grandTotal = groups.reduce((sum, g) => sum + g.total + shippingPriceFor(g.sellerId, g.suggestedPakettikoko), 0)
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 24 }}>{t.kori.title}</h1>

        {notice && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#EF4444', fontSize: 13 }}>{notice}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>{t.auth.loading}</div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>{t.kori.empty}</div>
            <Link href="/selaa" style={{ background: C.accent, color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              {t.kori.browseProducts}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {groups.map(group => {
              const size = sizeFor(group.sellerId, group.suggestedPakettikoko)
              const shippingPrice = shippingPriceFor(group.sellerId, group.suggestedPakettikoko)
              return (
                <div key={group.sellerId} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {group.seller.name?.[0]?.toUpperCase()}
                    </div>
                    <Link href={`/u/${group.seller.username}`} style={{ fontSize: 14, fontWeight: 700, color: C.text, textDecoration: 'none' }}>{group.seller.name}</Link>
                    <span style={{ fontSize: 12, color: C.muted }}>@{group.seller.username}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {group.items.map(item => {
                      const remaining = item.expiresAt ? new Date(item.expiresAt).getTime() - now : null
                      const isUrgent = remaining !== null && remaining < 30 * 60 * 1000
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: C.dim }}>+</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}
                            </div>
                            {remaining !== null && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: isUrgent ? '#EF4444' : C.muted }}>
                                {remaining > 0 ? `${t.kori.liveTimeLeft} ${timeLeftLabel(remaining)}` : t.kori.timeUp}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, flexShrink: 0 }}>{(item.price * item.quantity).toLocaleString('fi-FI')}€</div>
                          <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{t.product.delivery}</label>
                    <select value={size} onChange={e => setSelectedSize(s => ({ ...s, [group.sellerId]: e.target.value }))} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, color: C.text }}>
                      {pakettikoot.map(p => <option key={p.id} value={p.id}>{p.nimi} {p.hinta > 0 ? `— ${p.hinta.toLocaleString('fi-FI')}€` : t.kori.free}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <div style={{ fontSize: 13, color: C.muted }}>
                      {t.kori.products} {group.total.toLocaleString('fi-FI')}€ + {t.kori.shipping} {shippingPrice.toLocaleString('fi-FI')}€
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{(group.total + shippingPrice).toLocaleString('fi-FI')}€</div>
                    </div>
                    <button onClick={() => payGroup(group.sellerId)} disabled={paying === group.sellerId} style={{ background: C.accent, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: paying === group.sellerId ? 'default' : 'pointer', opacity: paying === group.sellerId ? 0.7 : 1 }}>
                      {paying === group.sellerId ? t.kori.processing : t.kori.pay}
                    </button>
                  </div>
                </div>
              )
            })}

            <div style={{ background: C.surface, borderRadius: 10, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.muted }}>{t.kori.total} ({totalItems} {t.kori.items}, {t.kori.allSellers})</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: C.text }}>{grandTotal.toLocaleString('fi-FI')}€</span>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
