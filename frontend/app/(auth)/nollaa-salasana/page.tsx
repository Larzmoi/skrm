'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { BACKEND_URL as BACKEND } from '@/lib/backend'

function ResetPasswordForm() {
  const { C } = useTheme()
  const { t } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const inp: React.CSSProperties = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, color: C.text, boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: C.textSub, display: 'block', marginBottom: 6 }

  if (!token) {
    return (
      <div style={{ width: '100%', maxWidth: 400, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t.auth.resetPasswordTitle}</h1>
        <p style={{ color: '#CC0000', fontSize: 14, marginTop: 12 }}>{t.auth.invalidResetLink}</p>
        <Link href="/unohtuiko-salasana" style={{ display: 'block', textAlign: 'center', marginTop: 20, color: C.accent, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{t.auth.forgotPassword}</Link>
      </div>
    )
  }

  async function submit() {
    setError('')
    if (!password || !confirm) { setError(t.auth.fillAll); return }
    if (password.length < 8) { setError(t.auth.minPassword); return }
    if (password !== confirm) { setError(t.auth.passwordsDontMatch); return }
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t.auth.resetPasswordInvalid)
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 400, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t.auth.resetPasswordTitle}</h1>

      {done ? (
        <p style={{ color: C.text, fontSize: 14, lineHeight: 1.5, marginTop: 12 }}>{t.auth.resetPasswordSuccess}</p>
      ) : (
        <>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{t.auth.resetPasswordSub}</p>
          {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#CC0000', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={lbl}>{t.auth.newPassword}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inp} /></div>
            <div><label style={lbl}>{t.auth.confirmPassword}</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" style={inp} /></div>
            <button onClick={submit} disabled={loading} style={{ background: C.accent, color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? t.auth.loading : t.auth.resetPasswordBtn}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  const { C } = useTheme()
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Link href="/" style={{ fontWeight: 900, fontSize: 28, color: C.text, letterSpacing: '-1px', marginBottom: 36 }}>Habahub</Link>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
