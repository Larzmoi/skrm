'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useAvatar } from '@/lib/avatar-context'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import ThemeToggle from '@/components/layout/ThemeToggle'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦', exact: true },
  { href: '/dashboard/tuotteet', label: 'Tuotteet', icon: '◫' },
  { href: '/dashboard/lahetys', label: 'Lähetys', icon: '◉' },
  { href: '/dashboard/tilitykset', label: 'Tilitykset', icon: '◈' },
  { href: '/dashboard/profiili', label: 'Profiili', icon: '◎' },
]

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const { C, theme } = useTheme()
  const { avatar } = useAvatar()
  const { lang, setLang, languages } = useLang()

  useEffect(() => {
    if (!loading && !user) router.push('/login?redirect=/dashboard')
  }, [user, loading, router])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted, fontSize: 14 }}>Ladataan...</div>
    </div>
  )

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>

      {/* Top bar */}
      <div style={{ background: C.navBg, borderBottom: `1px solid ${C.border}`, height: 54, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontWeight: 900, fontSize: 20, color: C.text, letterSpacing: '-1px' }}>SKRM</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ fontSize: 13, color: C.muted }}>← Etusivu</Link>
          <ThemeToggle />
          {/* Kielenvalinta */}
          <div style={{ display: 'flex', gap: 2 }}>
            {languages.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)} style={{ background: lang === l.code ? C.accentLight : 'none', border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 12, color: lang === l.code ? C.accent : C.muted, cursor: 'pointer', fontWeight: lang === l.code ? 700 : 400 }}>
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => { logout(); router.push('/') }} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            Kirjaudu ulos
          </button>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: C.navBg, borderRight: `1px solid ${C.border}`, minHeight: 'calc(100vh - 54px)', padding: '20px 12px', flexShrink: 0, position: 'sticky', top: 54, height: 'calc(100vh - 54px)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 16, background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {avatar
                ? <img src={avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{user.name?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>@{user.username}</div>
            </div>
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            {navItems.map(item => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, fontSize: 14, fontWeight: active ? 600 : 400, color: active ? C.accent : C.textSub, background: active ? C.accentLight : 'transparent', textDecoration: 'none' }}>
                  <span style={{ fontSize: 16, opacity: 0.7 }}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Provisio */}
          <div style={{ marginTop: 20, padding: '12px 14px', background: C.accentLight, borderRadius: 10, border: `1px solid ${C.accent}33` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Välityspalkkio</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>3% <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>max 20€</span></div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '28px 32px', minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
