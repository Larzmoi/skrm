'use client'
import { useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { adminApi } from '@/lib/api'

// Admin voi poistaa tuotteen/liven suoraan tuote-/huutokauppa-/live-sivulta ilman että
// joku on ensin ilmiantanut sen (ks. CLAUDE.md "Admin voi poistaa suoraan ilman ilmiantoa") -
// sama backend-reitti (DELETE /admin/products|shows/:id) jota Ilmiannot-välilehti jo käytti,
// tämä on vain toinen, nopeampi reitti sinne. Tyyli mukailee ReportModal.tsx:ää.
export default function AdminDeleteModal({ targetType, targetId, onClose, onDeleted }: {
  targetType: 'product' | 'show'
  targetId: string
  onClose: () => void
  onDeleted: () => void
}) {
  const { C } = useTheme()
  const { t } = useLang()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!reason.trim()) return
    setBusy(true)
    setError('')
    try {
      if (targetType === 'product') await adminApi.deleteProduct(targetId, reason.trim())
      else await adminApi.deleteShow(targetId, reason.trim())
      onDeleted()
    } catch (e: any) {
      setError(e.message ?? t.report.error)
      setBusy(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 20px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 16 }}>{t.admin.removeListing}</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.textSub, display: 'block', marginBottom: 6 }}>{t.admin.removeReasonLabel}</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={t.admin.removeReasonPlaceholder} rows={3} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: C.text, boxSizing: 'border-box', resize: 'vertical' as const }} />
        </div>
        {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.textSub, padding: '11px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{t.admin.cancel}</button>
          <button onClick={submit} disabled={busy || !reason.trim()} style={{ flex: 1, background: '#EF4444', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy || !reason.trim() ? 0.6 : 1 }}>{t.admin.confirmRemove}</button>
        </div>
      </div>
    </div>
  )
}
