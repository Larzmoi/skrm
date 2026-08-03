'use client'
import { useTheme } from '@/lib/theme-context'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{
        position: 'relative',
        width: 56,
        height: 28,
        borderRadius: 14,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        background: isDark ? '#1E3324' : '#E8EEE8',
        transition: 'background 0.3s ease',
        flexShrink: 0,
      }}
    >
      {/* Track */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 14,
        border: isDark ? '1px solid #2ECC7144' : '1px solid #D4DDD4',
        transition: 'border-color 0.3s',
      }} />

      {/* Thumb */}
      <div style={{
        position: 'absolute',
        top: 3,
        left: isDark ? 31 : 3,
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: isDark ? '#0D1A10' : '#ffffff',
        boxShadow: isDark
          ? '0 1px 6px rgba(0,0,0,0.6)'
          : '0 1px 6px rgba(0,0,0,0.15)',
        transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {isDark ? (
          // Moon
          <svg width="12" height="12" viewBox="0 0 24 24" fill={isDark ? '#9DBFA8' : '#555'}>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        ) : (
          // Sun
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round">
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
        )}
      </div>
    </button>
  )
}
