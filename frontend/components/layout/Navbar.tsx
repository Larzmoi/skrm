'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/lang-context'
import { useRouter } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { useCart } from '@/lib/cart-context'
import { useNotifications } from '@/lib/notification-context'

export default function Navbar() {
  const { C } = useTheme()
  const { user } = useAuth()
  const { itemCount } = useCart()
  const { unreadNotifCount, unreadMessageCount } = useNotifications()
  const { t, lang, setLang, languages } = useLang()
  const router = useRouter()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const currentLang = languages.find(l => l.code === lang)

  if (isMobile) {
    return (
      <nav style={{ background: C.navBg, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 100, overflow: 'hidden' }}>
        <div style={{ padding: '0 10px', height: 48, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/" style={{ fontWeight: 900, fontSize: 18, color: C.text, letterSpacing: '-1px', flex: 1 }}>SKRM</Link>
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/ilmoitukset" style={{ position: 'relative', color: C.textSub, padding: '3px', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unreadNotifCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: C.red, color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unreadNotifCount}</span>}
              </Link>
              <Link href="/viestit" style={{ position: 'relative', color: C.textSub, padding: '3px', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                {unreadMessageCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: C.red, color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unreadMessageCount}</span>}
              </Link>
              <Link href="/kori" style={{ position: 'relative', color: C.textSub, padding: '3px', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                {itemCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: C.red, color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{itemCount}</span>}
              </Link>
              <Link href="/dashboard" style={{ background: C.accent, color: '#fff', padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{t.nav.dashboard}</Link>
            </>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: 12, color: C.textSub, fontWeight: 500, whiteSpace: 'nowrap' }}>{t.nav.login}</Link>
              <Link href="/register" style={{ background: C.accent, color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{t.nav.register}</Link>
            </>
          )}
        </div>

        {/* Selaa / Huutokaupat / Live + haku — omalla rivillä ettei ylin rivi ahdas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 8px' }}>
          <input
            placeholder={t.nav.search}
            style={{ flex: '0 1 76px', minWidth: 50, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px', fontSize: 12, color: C.text }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim()
                if (val) router.push(`/selaa?haku=${encodeURIComponent(val)}`)
              }
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/selaa" style={{ flexShrink: 0, fontSize: 12, color: C.textSub, fontWeight: 500, whiteSpace: 'nowrap' }}>{t.nav.browse}</Link>
            <Link href="/huutokaupat" style={{ flexShrink: 0, fontSize: 12, color: C.textSub, fontWeight: 500, whiteSpace: 'nowrap' }}>{t.nav.auctions}</Link>
            <Link href="/live-kaikki" style={{ flexShrink: 0, fontSize: 12, color: C.textSub, fontWeight: 500, whiteSpace: 'nowrap' }}>{t.nav.liveAuctions}</Link>
          </div>
        </div>
      </nav>
    )
  }

  // Desktop
  return (
    <nav style={{ background: C.navBg, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link href="/" style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-1px', flexShrink: 0, color: C.text, width: 110 }}>SKRM</Link>

        <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
          <Link href="/selaa" style={{ padding: '6px 14px', fontSize: 14, color: C.textSub, fontWeight: 500 }}>{t.nav.browse}</Link>
          <Link href="/huutokaupat" style={{ padding: '6px 14px', fontSize: 14, color: C.textSub, fontWeight: 500 }}>{t.nav.auctions}</Link>
          <Link href="/live-kaikki" style={{ padding: '6px 14px', fontSize: 14, color: C.textSub, fontWeight: 500 }}>{t.nav.liveAuctions}</Link>
        </div>

        <div style={{ flex: 1 }}>
          <input
            placeholder={t.nav.search}
            style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 16px', fontSize: 14, color: C.text }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim()
                if (val) router.push(`/selaa?haku=${encodeURIComponent(val)}`)
              }
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <ThemeToggle />

          {/* Kielenvalinta */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLangMenu(s => !s)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 13, color: C.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {currentLang?.code.toUpperCase()}
            </button>
            {showLangMenu && (
              <div style={{ position: 'absolute', right: 0, top: 40, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px', minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 200 }}>
                {languages.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setShowLangMenu(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, background: lang === l.code ? C.accentLight : 'transparent', color: lang === l.code ? C.accent : C.textSub, fontWeight: lang === l.code ? 700 : 400 }}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <>
              <Link href="/ilmoitukset" style={{ background: 'none', padding: '6px 8px', color: C.muted, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unreadNotifCount > 0 && <span style={{ position: 'absolute', top: 2, right: 2, background: C.red, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unreadNotifCount}</span>}
              </Link>
              <Link href="/viestit" style={{ background: 'none', padding: '6px 8px', color: C.muted, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                {unreadMessageCount > 0 && <span style={{ position: 'absolute', top: 2, right: 2, background: C.red, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unreadMessageCount}</span>}
              </Link>
              <Link href="/kori" style={{ position: 'relative', background: 'none', padding: '6px 8px', color: C.muted, display: 'flex', alignItems: 'center' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                {itemCount > 0 && <span style={{ position: 'absolute', top: 2, right: 2, background: C.red, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{itemCount}</span>}
              </Link>
              <Link href="/dashboard" style={{ padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: C.text, background: C.surface, border: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{t.nav.dashboard}</Link>
            </>
          ) : (
            <>
              <Link href="/login" style={{ padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, color: C.textSub }}>{t.nav.login}</Link>
              <Link href="/register" style={{ padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#fff', background: C.accent }}>{t.nav.register}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
