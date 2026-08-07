'use client'
import { useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { reportApi } from '@/lib/api'

export default function ReportModal({ targetType, targetId, onClose }: { targetType: 'product' | 'show' | 'user'; targetId: string; onClose: () => void }) {
  const { C } = useTheme()
  const { t } = useLang()
  const [reason, setReason] = useState(targetType === 'user' ? 'harassment' : 'prohibited')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setSending(true)
    setError('')
    try {
      await reportApi.create(targetType, targetId, reason, description.trim() || undefined)
      setSent(true)
      setTimeout(onClose, 1800)
    } catch {
      setError(t.report.error)
    }
    setSending(false)
  }

  const reasons = targetType === 'user'
    ? [
        { id: 'harassment', label: t.report.reasonHarassment },
        { id: 'scam', label: t.report.reasonScam },
        { id: 'other', label: t.report.reasonOther },
      ]
    : [
        { id: 'prohibited', label: t.report.reasonProhibited },
        { id: 'counterfeit', label: t.report.reasonCounterfeit },
        { id: 'misleading', label: t.report.reasonMisleading },
        { id: 'other', label: t.report.reasonOther },
      ]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 20px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 16 }}>{targetType === 'user' ? t.report.titleUser : t.report.title}</h2>

        {sent ? (
          <div style={{ color: C.accent, fontSize: 14, fontWeight: 600, padding: '12px 0' }}>{t.report.sent}</div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textSub, display: 'block', marginBottom: 6 }}>{t.report.reasonLabel}</label>
              <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: C.text, boxSizing: 'border-box' }}>
                {reasons.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textSub, display: 'block', marginBottom: 6 }}>{t.report.descriptionLabel}</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t.report.descriptionPlaceholder} rows={3} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: C.text, boxSizing: 'border-box', resize: 'vertical' as const }} />
            </div>
            {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.textSub, padding: '11px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{t.report.cancel}</button>
              <button onClick={submit} disabled={sending} style={{ flex: 1, background: '#EF4444', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.7 : 1 }}>{t.report.submit}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
