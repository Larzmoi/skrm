'use client'
import { useTheme } from '@/lib/theme-context'

// Visuaalinen tyylipäivitys 2026-09-01 (ks. CLAUDE.md) - vaihdettu track/thumb-kytkimestä
// kompaktiksi pyöreäksi ikonipainikkeeksi (sama toiminta: yksi klikkaus vaihtaa teeman),
// koska track/thumb-tyyli ei istunut uuteen kapeaan lasipaneeli-navbariin yhtä siististi
// kuin mockin oma pyöreä ikonipainike.
export default function ThemeToggle() {
  const { theme, toggle, C } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label="Vaihda teemaa"
      title="Vaihda teemaa"
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: `1px solid ${C.border}`,
        background: C.surface2,
        color: C.textSub,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'border-color 0.2s ease, color 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub }}
    >
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2" x2="12" y2="4"/>
          <line x1="12" y1="20" x2="12" y2="22"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="2" y1="12" x2="4" y2="12"/>
          <line x1="20" y1="12" x2="22" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}
