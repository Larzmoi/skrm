'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'

function LoginForm() {
  const { C } = useTheme()
  const { t } = useLang()
  const { user, loading: authLoading, login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) router.push(redirect)
  }, [user, authLoading, router, redirect])

  async function submit() {
    setError(''); setLoading(true)
    try { await login(email, password); router.push(redirect) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const inp: React.CSSProperties = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, color: C.text, boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: C.textSub, display: 'block', marginBottom: 6 }

  if (authLoading || user) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Link href="/" style={{ fontWeight: 900, fontSize: 28, color: C.text, letterSpacing: '-1px', marginBottom: 36 }}>SKRM</Link>
      <div style={{ width: '100%', maxWidth: 400, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t.auth.loginTitle}</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{t.auth.loginSub}</p>
        {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#CC0000', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={lbl}>{t.auth.email}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sinä@esimerkki.fi" style={inp} /></div>
          <div><label style={lbl}>{t.auth.password}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" style={inp} /></div>
          <button onClick={submit} disabled={loading} style={{ background: C.accent, color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading ? t.auth.loading : t.auth.loginBtn}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: C.muted }}>
          {t.auth.noAccount} <Link href="/register" style={{ color: C.accent, fontWeight: 600 }}>{t.auth.createAccount}</Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() { return <Suspense><LoginForm /></Suspense> }
