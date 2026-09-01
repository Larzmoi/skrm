'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { BACKEND_URL as BACKEND } from '@/lib/backend'

export default function ForgotPasswordPage() {
  const { C } = useTheme()
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (!email) { setError(t.auth.fillAll); return }
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      setError(t.auth.fillAll)
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, color: C.text, boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: C.textSub, display: 'block', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Link href="/" style={{ fontWeight: 900, fontSize: 28, color: C.text, letterSpacing: '-1px', marginBottom: 36 }}>Habahub</Link>
      <div style={{ width: '100%', maxWidth: 400, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t.auth.forgotPasswordTitle}</h1>

        {sent ? (
          <>
            <p style={{ color: C.textSub, fontSize: 14, lineHeight: 1.5, marginTop: 12 }}>{t.auth.forgotPasswordSent}</p>
            <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: 20, color: C.accent, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{t.auth.backToLogin}</Link>
          </>
        ) : (
          <>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{t.auth.forgotPasswordSub}</p>
            {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#CC0000', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>{t.auth.email}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="sinä@esimerkki.fi" style={inp} /></div>
              <button onClick={submit} disabled={loading} style={{ background: C.accent, color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
                {loading ? t.auth.loading : t.auth.sendResetLink}
              </button>
              <Link href="/login" style={{ textAlign: 'center', fontSize: 13, color: C.muted, textDecoration: 'none' }}>{t.auth.backToLogin}</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
