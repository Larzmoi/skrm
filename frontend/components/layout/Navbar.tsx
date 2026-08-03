'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/lang-context'
import { useRouter, usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { useKategoria } from '@/lib/kategoria-context'
import { KATEGORIAT, getKatNimi } from '@/lib/kategoriat'
import { useAvatar } from '@/lib/avatar-context'

export default function Navbar() {
  const { C, theme } = useTheme()
  const { user, logout } = useAuth()
  const { avatar } = useAvatar()
  const { t, lang, setLang, languages } = useLang()
  const router = useRouter()
  const pathname = usePathname()
  const { activeKat, setActiveKat } = useKategoria()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const currentLang = languages.find(l => l.code === lang)

  if (isMobile) {
    return (
      <nav style={{ background: C.navBg, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ padding: '0 14px', height: 52, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ fontWeight: 900, fontSize: 20, color: C.text, letterSpacing: '-1px', flex: 1 }}>SKRM</Link>
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/dashboard" style={{ background: C.accent, color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>Dashboard</Link>
              <button onClick={() => { setShowUserMenu(s => !s) }} style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${C.border}`, cursor: 'pointer', padding: 0, flexShrink: 0, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {avatar
                  ? <img src={avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{user.name?.[0]?.toUpperCase()}</span>
                }
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: 13, color: C.textSub, fontWeight: 500 }}>{t.nav.login}</Link>
              <Link href="/register" style={{ background: C.accent, color: '#fff', padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>{t.nav.register}</Link>
            </>
          )}
        </div>

        {/* Mobile user dropdown */}
        {showUserMenu && user && (
          <div style={{ background: C.cardBg, borderTop: `1px solid ${C.border}`, padding: '8px' }}>
            <div style={{ padding: '8px 12px 10px', borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{user.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>@{user.username}</div>
            </div>
            {[
              { label: t.nav.purchases, href: '/ostot' },
              { label: t.nav.profile, href: '/dashboard/profiili' },
            ].map(item => (
              <Link key={item.href} href={item.href} onClick={() => setShowUserMenu(false)} style={{ display: 'block', padding: '9px 12px', fontSize: 13, color: C.textSub }}>
                {item.label}
              </Link>
            ))}
            <button onClick={() => { logout(); router.push('/'); setShowUserMenu(false) }} style={{ width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 13, color: C.red, background: 'none', border: 'none', cursor: 'pointer' }}>
              {t.nav.logout}
            </button>
          </div>
        )}
      </nav>
    )
  }

  // Desktop
  return (
    <nav style={{ background: C.navBg, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link href="/" style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-1px', flexShrink: 0, color: C.text, width: 110 }}>SKRM</Link>

        <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
          <Link href="/" style={{ padding: '6px 14px', fontSize: 14, color: C.textSub, fontWeight: 500 }}>{t.nav.home}</Link>
          <Link href="/selaa" style={{ padding: '6px 14px', fontSize: 14, color: C.textSub, fontWeight: 500 }}>{t.nav.browse}</Link>
        </div>

        <div style={{ flex: 1 }}>
          <input placeholder={t.nav.search} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 16px', fontSize: 14, color: C.text }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <ThemeToggle />

          {/* Kielenvalinta */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowLangMenu(s => !s); setShowUserMenu(false) }} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 13, color: C.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
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
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', color: C.muted, fontSize: 18, position: 'relative' }}>
                🔔<span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: C.red, border: `2px solid ${C.navBg}` }} />
              </button>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', color: C.muted, fontSize: 18 }}>💬</button>
              <Link href="/dashboard" style={{ padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: C.text, background: C.surface, border: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{t.nav.dashboard}</Link>
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setShowUserMenu(s => !s); setShowLangMenu(false) }} style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${C.border}`, cursor: 'pointer', padding: 0, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {avatar
                    ? <img src={avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{user.name?.[0]?.toUpperCase()}</span>
                  }
                </button>
                {showUserMenu && (
                  <div style={{ position: 'absolute', right: 0, top: 42, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 200 }}>
                    <div style={{ padding: '8px 12px 12px', borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{user.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>@{user.username}</div>
                    </div>
                    {[
                      { label: t.nav.profile, href: '/dashboard/profiili' },
                      { label: t.nav.purchases, href: '/ostot' },
                      { label: t.nav.dashboard, href: '/dashboard' },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setShowUserMenu(false)} style={{ display: 'block', padding: '8px 12px', borderRadius: 6, fontSize: 13, color: C.textSub }}>{item.label}</Link>
                    ))}
                    <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 6 }}>
                      <button onClick={() => { logout(); router.push('/'); setShowUserMenu(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 6, fontSize: 13, color: C.red, background: 'none', border: 'none', cursor: 'pointer' }}>{t.nav.logout}</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" style={{ padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, color: C.textSub }}>{t.nav.login}</Link>
              <Link href="/register" style={{ padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#fff', background: C.accent }}>{t.nav.register}</Link>
            </>
          )}
        </div>
      </div>

      {/* Kategoriapalkki vain mobiilissa — desktop käyttää sivupalkia */}
    </nav>
  )
}
