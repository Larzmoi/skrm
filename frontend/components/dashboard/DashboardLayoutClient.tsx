'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useAvatar } from '@/lib/avatar-context'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import Navbar from '@/components/layout/Navbar'

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const { C } = useTheme()
  const { avatar } = useAvatar()
  const { t } = useLang()
  const [isMobile, setIsMobile] = useState(true)

  const navItems = [
    { href: '/dashboard', label: t.nav.dashboard, icon: '▦', exact: true },
    { href: '/dashboard/tuotteet', label: t.nav.products, icon: '◫' },
    { href: '/dashboard/lahetys', label: t.nav.broadcast, icon: '◉' },
    { href: '/ostot', label: t.nav.purchases, icon: '◇' },
    { href: '/dashboard/tilaukset', label: t.nav.sales, icon: '▧' },
    { href: '/dashboard/tilitykset', label: t.nav.payouts, icon: '◈' },
    { href: '/dashboard/profiili', label: t.nav.profile, icon: '◎' },
  ]

  useEffect(() => {
    if (!loading && !user) router.push('/login?redirect=/dashboard')
  }, [user, loading, router])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted, fontSize: 14 }}>Ladataan...</div>
    </div>
  )

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <Navbar />

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        {isMobile ? (
          /* Mobiili: vaakasuunnassa vieritettävä pillinavigaatio, ei kiinteää sivupalkkia */
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', padding: '10px 12px', background: C.navBg, borderBottom: `1px solid ${C.border}` }}>
            <button onClick={() => { logout(); router.push('/') }} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '8px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, color: C.red, background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              {t.nav.logout}
            </button>
            {navItems.map(item => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 20, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.accent : C.textSub, background: active ? C.accentLight : C.surface, border: `1px solid ${active ? C.accent : C.border}`, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, opacity: 0.8 }}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ) : (
          /* Sidebar */
          <div style={{ width: 220, background: C.navBg, borderRight: `1px solid ${C.border}`, minHeight: 'calc(100vh - 58px)', padding: '20px 12px', flexShrink: 0, position: 'sticky', top: 58, height: 'calc(100vh - 58px)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

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

            <button onClick={() => { logout(); router.push('/') }} style={{ marginBottom: 16, width: '100%', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '10px 12px', borderRadius: 8, fontSize: 14, color: C.red, background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              <span style={{ fontSize: 16, opacity: 0.8 }}>↩</span>
              {t.nav.logout}
            </button>

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
              <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{t.nav.commission}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>3% <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>max 20€</span></div>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '28px 32px', minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
