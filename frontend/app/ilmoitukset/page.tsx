'use client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { useNotifications } from '@/lib/notification-context'
import { notificationApi } from '@/lib/api'

function timeAgo(iso: string, t: any) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return t.time.justNow
  if (min < 60) return `${min} ${t.time.minutesAgo}`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ${t.time.hoursAgo}`
  const d = Math.floor(h / 24)
  return `${d} ${t.time.daysAgo}`
}

export default function IlmoituksetPage() {
  const { C } = useTheme()
  const { t } = useLang()
  const router = useRouter()
  const { notifications, unreadNotifCount, refresh, markAllRead } = useNotifications()

  async function openNotification(id: string, link: string | null) {
    await notificationApi.markRead(id)
    await refresh()
    if (link) router.push(link)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>{t.notificationsPage.title}</h1>
            <p style={{ color: C.muted, fontSize: 14 }}>{t.notificationsPage.subtitle}</p>
          </div>
          {unreadNotifCount > 0 && (
            <button onClick={markAllRead} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textSub, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.notificationsPage.markAllRead}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 15, color: C.muted }}>{t.notificationsPage.empty}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => openNotification(n.id, n.link)}
                style={{
                  textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start',
                  background: n.read ? C.cardBg : C.accentLight,
                  border: `1px solid ${n.read ? C.border : C.accent}33`,
                  borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'transparent' : C.accent, marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2, overflowWrap: 'break-word' }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, overflowWrap: 'break-word' }}>{n.body}</div>
                </div>
                <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(n.createdAt, t)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
