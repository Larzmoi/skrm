'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { useAuth } from '@/lib/auth-context'
import { setAuthCookie } from '@/lib/authCookie'
import { BACKEND_URL as BACKEND } from '@/lib/backend'

export default function RegisterPage() {
  const { C } = useTheme()
  const { t } = useLang()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user) router.push('/')
  }, [user, authLoading, router])
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = termsAccepted && privacyAccepted && policyAccepted

  async function submit() {
    setError('')
    if (!name || !username || !email || !password) { setError(t.auth.fillAll); return }
    if (password.length < 8) { setError(t.auth.minPassword); return }
    if (!canSubmit) { setError(t.auth.acceptRequired); return }
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, username, email, password, termsAccepted, privacyAccepted, policyAccepted }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.setItem('skrm_token', data.token)
      localStorage.setItem('skrm_user', JSON.stringify(data.user))
      setAuthCookie(data.token)
      router.push('/')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const inp: React.CSSProperties = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, color: C.text, boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: C.textSub, display: 'block', marginBottom: 6 }

  if (authLoading || user) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Link href="/" style={{ fontWeight: 900, fontSize: 28, color: C.text, letterSpacing: '-1px', marginBottom: 36 }}>SKRM</Link>
      <div style={{ width: '100%', maxWidth: 420, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t.auth.registerTitle}</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{t.auth.registerSub}</p>
        {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#CC0000', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={lbl}>{t.auth.name}</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Matti Meikäläinen" style={inp} /></div>
          <div>
            <label style={lbl}>{t.auth.username}</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 14 }}>@</span>
              <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="käyttäjänimi" style={{ ...inp, paddingLeft: 28 }} />
            </div>
          </div>
          <div><label style={lbl}>{t.auth.email}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sinä@esimerkki.fi" style={inp} /></div>
          <div><label style={lbl}>{t.auth.password}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" style={inp} /></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4, padding: '12px 14px', background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.textSub, cursor: 'pointer' }}>
              <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{t.auth.acceptTerms} <Link href="/kayttoehdot" style={{ color: C.accent, fontWeight: 600 }}>{t.auth.termsLink}</Link> *</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.textSub, cursor: 'pointer' }}>
              <input type="checkbox" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{t.auth.acceptPrivacy} <Link href="/tietosuoja" style={{ color: C.accent, fontWeight: 600 }}>{t.auth.privacyLink}</Link> *</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.textSub, cursor: 'pointer' }}>
              <input type="checkbox" checked={policyAccepted} onChange={e => setPolicyAccepted(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{t.auth.acceptPolicy} *</span>
            </label>
            <ul style={{ margin: '-4px 0 0 30px', padding: 0, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              <li>{t.auth.policyPoint1}</li>
              <li>{t.auth.policyPoint2}</li>
              <li>{t.auth.policyPoint3}</li>
              <li>{t.auth.policyPoint4}</li>
            </ul>
          </div>

          <button onClick={submit} disabled={loading || !canSubmit} style={{ background: C.accent, color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: (loading || !canSubmit) ? 'not-allowed' : 'pointer', opacity: (loading || !canSubmit) ? 0.5 : 1, marginTop: 4 }}>
            {loading ? t.auth.loading : t.auth.registerBtn}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: C.muted }}>
          {t.auth.hasAccount} <Link href="/login" style={{ color: C.accent, fontWeight: 600 }}>{t.auth.signIn}</Link>
        </div>
      </div>
    </div>
  )
}
