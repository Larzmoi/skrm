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

// Visuaalinen tyylipäivitys 2026-09-01 (ks. CLAUDE.md "Visuaalinen tyylipäivitys",
// landing.html-referenssi "FLUID ISLAND NAVBAR") - lasipaneeli-tyylinen pyöristetty
// navigaatio. Kaikki alkuperäinen toiminnallisuus säilytetty identtisenä (haku, kolme
// nav-linkkiä, teema-/kielivalinta, ilmoitus-/viesti-/ostoskori-ikonit lukemattomine
// -badgeineen, dashboard/kirjaudu-CTA) - vain visuaalinen toteutustapa muuttui.
function IconLink({ href, label, badge, C, size = 19 }: { href: string; label: string; badge: number; C: any; size?: number }) {
  return (
    <Link href={href} aria-label={label} title={label} style={{ position: 'relative', width: 34, height: 34, borderRadius: '50%', background: 'transparent', color: C.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s ease, color 0.15s ease' }}
      onMouseEnter={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.color = C.text }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSub }}
    >
      {href === '/ilmoitukset' && <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
      {href === '/viestit' && <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>}
      {href === '/kori' && <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>}
      {badge > 0 && <span style={{ position: 'absolute', top: 0, right: 0, background: C.red, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: `2px solid ${C.navBg}` }}>{badge}</span>}
    </Link>
  )
}

function LogoMark({ C, size = 32, fontSize = 20 }: { C: any; size?: number; fontSize?: number }) {
  return (
    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: `${C.accentSolid}26`, border: `1px solid ${C.accentSolid}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, flexShrink: 0 }}>H</div>
      <span style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontSize, letterSpacing: '-0.5px', color: C.text, whiteSpace: 'nowrap' }}>Habahub</span>
    </Link>
  )
}

export default function Navbar() {
  const { C, theme } = useTheme()
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
  const glassClass = theme === 'dark' ? 'glass-panel-dark' : 'glass-panel-light'
  const pillBtn: React.CSSProperties = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 999, color: C.textSub, cursor: 'pointer', fontFamily: 'var(--font-body), sans-serif' }

  if (isMobile) {
    return (
      <nav className={glassClass} style={{ position: 'sticky', top: 0, zIndex: 100, overflow: 'hidden', borderRadius: '0 0 20px 20px', borderTop: 'none' }}>
        <div style={{ padding: '0 12px', height: 52, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}><LogoMark C={C} size={28} fontSize={17} /></div>
          <ThemeToggle />

          {/* Kielenvalinta - puuttui aiemmin kokonaan mobiili-navbarista (ks. CLAUDE.md
              "Uudet löydökset 2026-08-13, osa 3" kohta 14), oli koodattu vain desktop-haaraan */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLangMenu(s => !s)} style={{ ...pillBtn, padding: '5px 9px', fontSize: 11, fontWeight: 700 }}>
              {currentLang?.code.toUpperCase()}
            </button>
            {showLangMenu && (
              <div className={glassClass} style={{ position: 'absolute', right: 0, top: 60, borderRadius: 12, padding: '6px', minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 9999 }}>
                {languages.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setShowLangMenu(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, background: lang === l.code ? C.accentLight : 'transparent', color: lang === l.code ? C.accent : C.textSub, fontWeight: lang === l.code ? 700 : 400 }}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {user ? (
            <>
              <IconLink href="/ilmoitukset" label={t.nav.notifications} badge={unreadNotifCount} C={C} size={17} />
              <IconLink href="/viestit" label={t.nav.messages} badge={unreadMessageCount} C={C} size={17} />
              <IconLink href="/kori" label="Kori" badge={itemCount} C={C} size={17} />
              <Link href="/dashboard" aria-label={t.nav.dashboard} title={t.nav.dashboard} style={{ background: C.accentSolid, color: C.accentText, width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              </Link>
            </>
          ) : (
            <Link href="/login" style={{ fontSize: 12, color: C.textSub, fontWeight: 600, whiteSpace: 'nowrap' }}>{t.nav.login}</Link>
          )}
        </div>

        {/* Selaa / Huutokaupat / Live + haku — omalla rivillä ettei ylin rivi ahdas */
          {/* Fix: z-index 9999 ensures dropdown is always visible above scrollable content */}}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 10px' }}>
          <input
            placeholder={t.nav.search}
            style={{ flex: '0 1 76px', minWidth: 50, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: '6px 12px', fontSize: 12, color: C.text, fontFamily: 'var(--font-body), sans-serif' }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim()
                if (val) router.push(`/selaa?haku=${encodeURIComponent(val)}`)
              }
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/selaa" style={{ flexShrink: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textSub, fontWeight: 700, whiteSpace: 'nowrap' }}>{t.nav.browse}</Link>
            <Link href="/huutokaupat" style={{ flexShrink: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textSub, fontWeight: 700, whiteSpace: 'nowrap' }}>{t.nav.auctions}</Link>
            <Link href="/live-kaikki" style={{ flexShrink: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textSub, fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }} />
              {t.nav.liveAuctions}
            </Link>
          </div>
        </div>
      </nav>
    )
  }

  // Desktop — kelluva "island" navbar (ks. mock-referenssi)
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'center', padding: '16px 20px 0' }}>
      <nav className={glassClass} style={{ borderRadius: 999, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 20, width: '100%', maxWidth: 1320, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <LogoMark C={C} />

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <Link href="/selaa" style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textSub, fontWeight: 700 }}>{t.nav.browse}</Link>
          <Link href="/huutokaupat" style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textSub, fontWeight: 700 }}>{t.nav.auctions}</Link>
          <Link href="/live-kaikki" style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textSub, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }} />
            {t.nav.liveAuctions}
          </Link>
        </div>

        <div style={{ flex: 1 }}>
          <input
            placeholder={t.nav.search}
            style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 999, padding: '9px 16px', fontSize: 13, color: C.text, fontFamily: 'var(--font-body), sans-serif' }}
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
            <button onClick={() => setShowLangMenu(s => !s)} style={{ ...pillBtn, padding: '7px 12px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              {currentLang?.code.toUpperCase()}
            </button>
            {showLangMenu && (
              <div className={glassClass} style={{ position: 'absolute', right: 0, top: 60, borderRadius: 14, padding: '6px', minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 9999 }}>
                {languages.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setShowLangMenu(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, background: lang === l.code ? C.accentLight : 'transparent', color: lang === l.code ? C.accent : C.textSub, fontWeight: lang === l.code ? 700 : 400 }}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <>
              <IconLink href="/ilmoitukset" label={t.nav.notifications} badge={unreadNotifCount} C={C} />
              <IconLink href="/viestit" label={t.nav.messages} badge={unreadMessageCount} C={C} />
              <IconLink href="/kori" label="Kori" badge={itemCount} C={C} />
              <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 5, height: 36, borderRadius: 999, fontSize: 12, fontWeight: 800, color: C.accentText, background: C.accentSolid, whiteSpace: 'nowrap', marginLeft: 4 }}>
                {t.nav.dashboard}
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" style={{ padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, color: C.textSub }}>{t.nav.login}</Link>
              {/* Rekisteröityminen väliaikaisesti pois käytöstä — poista kommentointi kun otetaan takaisin käyttöön */}
              {/* <Link href="/register" style={{ padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 800, color: C.accentText, background: C.accentSolid }}>{t.nav.register}</Link> */}
            </>
          )}
        </div>
      </nav>
    </div>
  )
}
