'use client'
import { useTheme } from '@/lib/theme-context'

export function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { C } = useTheme()
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: n <= value ? C.accent : C.border, padding: 0, lineHeight: 1 }}>
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

export function StarRatingDisplay({ rating, size = 13 }: { rating: number; size?: number }) {
  const { C } = useTheme()
  return (
    <span style={{ fontSize: size, color: C.accent, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map(n => (n <= Math.round(rating) ? '★' : '☆')).join('')}
    </span>
  )
}
