'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { useAuth } from '@/lib/auth-context'
import { adminApi } from '@/lib/api'

type StatusFilter = '' | 'PENDING' | 'REVIEWED'

function ReportRow({ report, t, C, onChanged }: { report: any; t: any; C: any; onChanged: () => void }) {
  const [acting, setActing] = useState(false)
  const [reason, setReason] = useState('')
  const [days, setDays] = useState(30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isUser = report.targetType === 'user'
  const targetHref = report.target
    ? (report.targetType === 'product' ? `/tuotteet/${report.targetId}` : isUser ? `/u/${report.target.username}` : `/live/${report.targetId}`)
    : null
  const targetLabel = report.target
    ? (report.targetType === 'product' ? report.target.name : isUser ? `@${report.target.username}` : report.target.title)
    : t.admin.targetMissing
  const targetTypeLabel = report.targetType === 'product' ? t.admin.targetProduct : isUser ? t.admin.targetUser : t.admin.targetShow

  async function markReviewed() {
    setBusy(true)
    try { await adminApi.markReviewed(report.id); onChanged() } catch {}
    setBusy(false)
  }

  async function confirmAction() {
    if (!reason.trim()) return
    setBusy(true); setError('')
    try {
      if (isUser) await adminApi.banUser(report.targetId, reason.trim(), days)
      else if (report.targetType === 'product') await adminApi.deleteProduct(report.targetId, reason.trim())
      else await adminApi.deleteShow(report.targetId, reason.trim())
      await adminApi.markReviewed(report.id)
      onChanged()
    } catch (e: any) {
      setError(e.message ?? t.report.error)
    }
    setBusy(false)
  }

  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: C.textSub }}>
          <span style={{ fontWeight: 700, color: C.text }}>{t.admin.reason}:</span> {t.report['reason' + report.reason.charAt(0).toUpperCase() + report.reason.slice(1)] ?? report.reason}
          {' · '}<span style={{ color: C.muted }}>{targetTypeLabel}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: report.status === 'PENDING' ? '#FFF8E8' : C.surface, color: report.status === 'PENDING' ? '#92400E' : C.muted }}>
          {report.status === 'PENDING' ? t.admin.filterPending : t.admin.filterReviewed}
        </span>
      </div>
      <div style={{ fontSize: 13, color: C.textSub, marginBottom: 6 }}>
        <span style={{ fontWeight: 700, color: C.text }}>{t.admin.target}:</span>{' '}
        {targetHref ? <Link href={targetHref} target="_blank" style={{ color: C.accent }}>{targetLabel} {t.admin.viewTarget}</Link> : targetLabel}
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
        <span style={{ fontWeight: 700, color: C.text }}>{t.admin.reportedBy}:</span> @{report.reporter?.username}
        {report.description && <div style={{ marginTop: 4 }}>{report.description}</div>}
      </div>

      {acting ? (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder={isUser ? t.admin.banReasonPlaceholder : t.admin.removeReasonPlaceholder} style={{ flex: 1, minWidth: 160, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: C.text, boxSizing: 'border-box' }} />
            {isUser && (
              <input type="number" min={1} value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: 70, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: C.text }} />
            )}
          </div>
          {error && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setActing(false)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textSub, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t.admin.cancel}</button>
            <button onClick={confirmAction} disabled={busy || !reason.trim()} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: busy || !reason.trim() ? 0.6 : 1 }}>{isUser ? t.admin.banConfirm : t.admin.confirmRemove}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          {report.status === 'PENDING' && (
            <button onClick={markReviewed} disabled={busy} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textSub, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t.admin.markReviewed}</button>
          )}
          {report.target && (
            <button onClick={() => setActing(true)} style={{ background: 'none', border: `1px solid #EF4444`, color: '#EF4444', padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{isUser ? t.admin.ban : t.admin.removeListing}</button>
          )}
        </div>
      )}
    </div>
  )
}

function UsersTab({ t, C }: { t: any; C: any }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [banTarget, setBanTarget] = useState<any>(null)
  const [banReason, setBanReason] = useState('')
  const [banDays, setBanDays] = useState(30)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) { setResults([]); return }
    const timeout = setTimeout(() => {
      adminApi.searchUsers(q).then(setResults).catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  async function confirmBan() {
    if (!banTarget || !banReason.trim()) return
    setBusy(true)
    try {
      await adminApi.banUser(banTarget.id, banReason.trim(), banDays)
      setSuccess(true)
      setTimeout(() => { setBanTarget(null); setBanReason(''); setSuccess(false) }, 1500)
    } catch {}
    setBusy(false)
  }

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.admin.userSearchPlaceholder} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px 14px', fontSize: 14, color: C.text, boxSizing: 'border-box', marginBottom: 16 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {results.map(u => (
          <div key={u.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{u.name} <span style={{ color: C.muted, fontWeight: 400 }}>@{u.username}</span></div>
              <div style={{ fontSize: 12, color: C.muted }}>{u.email} {u.role === 'ADMIN' && `· ${u.role}`}</div>
            </div>
            {banTarget?.id === u.id ? (
              success ? <div style={{ color: C.accent, fontSize: 13, fontWeight: 600 }}>{t.admin.banSuccess}</div> : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder={t.admin.banReasonPlaceholder} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 12, color: C.text, width: 200 }} />
                  <input type="number" min={1} value={banDays} onChange={e => setBanDays(Number(e.target.value))} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', fontSize: 12, color: C.text, width: 70 }} />
                  <button onClick={() => setBanTarget(null)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textSub, padding: '7px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>{t.admin.cancel}</button>
                  <button onClick={confirmBan} disabled={busy || !banReason.trim()} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: busy || !banReason.trim() ? 0.6 : 1 }}>{t.admin.banConfirm}</button>
                </div>
              )
            ) : (
              <button onClick={() => setBanTarget(u)} style={{ background: 'none', border: `1px solid #EF4444`, color: '#EF4444', padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t.admin.ban}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { C } = useTheme()
  const { t } = useLang()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<'reports' | 'users'>('reports')
  const [filter, setFilter] = useState<StatusFilter>('PENDING')
  const [reports, setReports] = useState<any[]>([])

  const loadReports = useCallback(() => {
    adminApi.reports(filter || undefined).then(setReports).catch(() => setReports([]))
  }, [filter])

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (user?.role === 'ADMIN' && tab === 'reports') loadReports()
  }, [user, tab, loadReports])

  if (loading || !user || user.role !== 'ADMIN') return null

  const tabs = [
    { id: 'reports' as const, label: t.admin.tabReports },
    { id: 'users' as const, label: t.admin.tabUsers },
  ]
  const filters: { id: StatusFilter; label: string }[] = [
    { id: 'PENDING', label: t.admin.filterPending },
    { id: 'REVIEWED', label: t.admin.filterReviewed },
    { id: '', label: t.admin.filterAll },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 20 }}>{t.admin.title}</h1>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {tabs.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${tab === tb.id ? C.accent : C.border}`, background: tab === tb.id ? C.accentLight : C.surface, color: tab === tb.id ? C.accent : C.textSub, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'reports' ? (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {filters.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${filter === f.id ? C.accent : C.border}`, background: filter === f.id ? C.accentLight : 'transparent', color: filter === f.id ? C.accent : C.muted, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  {f.label}
                </button>
              ))}
            </div>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 14 }}>{t.admin.noReports}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reports.map(r => <ReportRow key={r.id} report={r} t={t} C={C} onChanged={loadReports} />)}
              </div>
            )}
          </>
        ) : (
          <UsersTab t={t} C={C} />
        )}
      </div>
      <Footer />
    </div>
  )
}
