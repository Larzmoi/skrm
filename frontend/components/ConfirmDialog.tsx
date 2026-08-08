'use client'

interface ConfirmDialogProps {
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Tyylitelty korvaaja natiiville confirm()-dialogille — käytetään lähetys-konsolissa ja
// live-sivulla, jotka ovat aina tummia riippumatta sivuston valitusta teemasta, joten tyyli on
// kiinteä (ei C.xxx-tokeneita) yhdenmukaisuuden vuoksi näiden "video console" -näkymien kanssa.
export default function ConfirmDialog({ message, title, confirmLabel = 'Vahvista', cancelLabel = 'Peruuta', danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(20,20,20,0.97)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: '22px 24px', maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
      >
        {title && <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{title}</div>}
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: 20 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: '#ccc', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{ background: danger ? '#EF4444' : '#2ECC71', border: 'none', color: danger ? '#fff' : '#06210F', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
