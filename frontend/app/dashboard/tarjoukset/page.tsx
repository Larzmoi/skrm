'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { offerApi, Offer } from '@/lib/api'

// "Tarjoa hintaa" -toiminnon hallintasivu (ks. CLAUDE.md "Tarjoa hintaa — suoramyyntiin").
// Kaksi välilehteä samalla sivulla, koska sama käyttäjä on tällä alustalla sekä ostaja että
// myyjä yhdellä tilillä - ei erillisiä rooleja jotka vaatisivat omat sivunsa.
export default function TarjouksetPage() {
  const { C } = useTheme()
  const { t } = useLang()
  const tp = t.offersPage
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const [received, setReceived] = useState<Offer[]>([])
  const [sent, setSent] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [counterOpenFor, setCounterOpenFor] = useState<string | null>(null)
  const [counterAmount, setCounterAmount] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [r, s] = await Promise.all([offerApi.received(), offerApi.mine()])
      setReceived(r)
      setSent(s)
    } catch { setError(tp.actionFailed) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function accept(id: string) {
    setBusy(id); setError('')
    try { await offerApi.accept(id); await load() } catch (e: any) { setError(e.message ?? tp.actionFailed) }
    setBusy(null)
  }

  async function decline(id: string) {
    setBusy(id); setError('')
    try { await offerApi.decline(id); await load() } catch (e: any) { setError(e.message ?? tp.actionFailed) }
    setBusy(null)
  }

  async function submitCounter(id: string) {
    const amount = Number(counterAmount)
    if (!isFinite(amount) || amount <= 0) return
    setBusy(id); setError('')
    try {
      await offerApi.counter(id, amount)
      setCounterOpenFor(null); setCounterAmount('')
      await load()
    } catch (e: any) { setError(e.message ?? tp.actionFailed) }
    setBusy(null)
  }

  function statusLabel(status: Offer['status']) {
    return { pending: tp.statusPending, accepted: tp.statusAccepted, declined: tp.statusDeclined, countered: tp.statusCountered, expired: tp.statusExpired }[status]
  }

  function statusColor(status: Offer['status']) {
    if (status === 'accepted') return C.accent
    if (status === 'declined' || status === 'expired') return C.muted
    return '#F59E0B'
  }

  const list = tab === 'received' ? received : sent

  return (
    <div style={{ color: C.text }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>{tp.title}</h1>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>{tp.subtitle}</p>

        {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#CC0000', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {(['received', 'sent'] as const).map(k => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${tab === k ? C.accent : C.border}`, background: tab === k ? C.accentLight : C.surface, color: tab === k ? C.accent : C.textSub, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {k === 'received' ? tp.tabReceived : tp.tabSent}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>{tp.loading}</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 14 }}>{tp.empty}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(o => (
              <div key={o.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {o.product.imageUrl ? <img src={o.product.imageUrl.split('|||')[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: C.dim }}>+</span>}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Link href={`/tuotteet/${o.product.id}`} style={{ fontSize: 14, fontWeight: 700, color: C.text, textDecoration: 'none' }}>{o.product.name}</Link>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {tab === 'received' ? `${tp.from}: @${o.buyer?.username}` : `${tp.for}: @${o.product.seller?.username}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
                    {o.status === 'countered' && o.counterAmount != null ? `${o.counterAmount}€` : `${o.amount}€`}
                  </div>
                  <div style={{ fontSize: 11, color: statusColor(o.status), fontWeight: 700, marginTop: 2 }}>{statusLabel(o.status)}</div>
                  {o.status === 'countered' && (
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>
                      {tab === 'received' ? tp.yourOffer : tp.counterOfferFrom}: {o.status === 'countered' ? (tab === 'received' ? `${o.amount}€` : `${o.counterAmount}€`) : ''}
                    </div>
                  )}
                </div>

                {/* Myyjä: pending-tarjoukseen hyväksy/hylkää/vastatarjoa */}
                {tab === 'received' && o.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => accept(o.id)} disabled={busy === o.id} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{tp.accept}</button>
                    <button onClick={() => setCounterOpenFor(counterOpenFor === o.id ? null : o.id)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textSub, padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{tp.counter}</button>
                    <button onClick={() => decline(o.id)} disabled={busy === o.id} style={{ background: 'none', border: '1px solid #EF4444', color: '#EF4444', padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{tp.decline}</button>
                  </div>
                )}

                {/* Ostaja: countered-tarjoukseen hyväksy/hylkää myyjän vastatarjous */}
                {tab === 'sent' && o.status === 'countered' && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => accept(o.id)} disabled={busy === o.id} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{tp.accept}</button>
                    <button onClick={() => decline(o.id)} disabled={busy === o.id} style={{ background: 'none', border: '1px solid #EF4444', color: '#EF4444', padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{tp.decline}</button>
                  </div>
                )}

                {counterOpenFor === o.id && (
                  <div style={{ width: '100%', display: 'flex', gap: 8, marginTop: 4 }}>
                    <input type="number" min="0" step="0.01" value={counterAmount} onChange={e => setCounterAmount(e.target.value)} placeholder={tp.counterPlaceholder} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, color: C.text }} />
                    <button onClick={() => submitCounter(o.id)} disabled={busy === o.id} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{tp.counterSubmit}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
  )
}
