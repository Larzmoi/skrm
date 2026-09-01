'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { useAuth } from '@/lib/auth-context'
import { useNotifications } from '@/lib/notification-context'
import { messageApi, userApi } from '@/lib/api'
import { getSocket } from '@/lib/socket'

interface ThreadMessage {
  id: string; senderId: string; receiverId: string; body: string; read: boolean; createdAt: string
  product?: { id: string; name: string; imageUrl?: string } | null
}
interface ActiveUser { id: string; name: string; username: string; avatarUrl?: string | null }

export default function MessagesLayout({ activeUsername }: { activeUsername?: string }) {
  const { C } = useTheme()
  const { t } = useLang()
  const { user } = useAuth()
  const { conversations, refresh } = useNotifications()
  const [isMobile, setIsMobile] = useState(true)
  const [activeUser, setActiveUser] = useState<ActiveUser | null>(null)
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!activeUsername) { setActiveUser(null); setThread([]); return }
    let cancelled = false
    setLoadingThread(true)
    userApi.getPublic(activeUsername).then(async (u: ActiveUser) => {
      if (cancelled) return
      setActiveUser(u)
      const messages = await messageApi.thread(u.id)
      if (!cancelled) setThread(Array.isArray(messages) ? messages : [])
      refresh()
    }).catch(() => { if (!cancelled) { setActiveUser(null); setThread([]) } })
      .finally(() => { if (!cancelled) setLoadingThread(false) })
    return () => { cancelled = true }
  }, [activeUsername, refresh])

  useEffect(() => {
    const socket = getSocket()
    const onMessage = (msg: ThreadMessage) => {
      if (activeUser && msg.senderId === activeUser.id) {
        setThread(prev => [...prev, msg])
        messageApi.thread(activeUser.id).catch(() => {})
      }
    }
    socket.on('message', onMessage)
    return () => { socket.off('message', onMessage) }
  }, [activeUser])

  const send = useCallback(async () => {
    const body = draft.trim()
    if (!body || !activeUser || sending) return
    setDraft('')
    setSending(true)
    try {
      const msg = await messageApi.send(activeUser.id, body)
      setThread(prev => [...prev, msg])
      await refresh()
    } catch {}
    setSending(false)
  }, [draft, activeUser, sending, refresh])

  const showList = !isMobile || !activeUsername
  const showThread = !isMobile || !!activeUsername

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 58px - 200px)', minHeight: 480, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', background: C.cardBg }}>
      {showList && (
        <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0, borderRight: isMobile ? 'none' : `1px solid ${C.border}`, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: C.muted, fontSize: 13 }}>{t.messagesPage.empty}</div>
          ) : conversations.map(c => (
            <Link
              key={c.user.id}
              href={`/viestit/${encodeURIComponent(c.user.username)}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                textDecoration: 'none', borderBottom: `1px solid ${C.border}`,
                background: activeUsername === c.user.username ? C.accentLight : 'transparent',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.accentSolid, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: C.accentText, flexShrink: 0 }}>
                {c.user.avatarUrl
                  ? <img src={c.user.avatarUrl} alt={c.user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : c.user.name?.[0]?.toUpperCase()
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.user.name}</div>
                <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage.body}</div>
              </div>
              {c.unreadCount > 0 && (
                <span style={{ background: C.red, color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 10, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>{c.unreadCount}</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {showThread && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!activeUsername || !activeUser ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 14 }}>
              {loadingThread ? '...' : t.messagesPage.noConversation}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                {isMobile && (
                  <Link href="/viestit" style={{ color: C.muted, fontSize: 13, textDecoration: 'none', marginRight: 4 }}>{t.messagesPage.back}</Link>
                )}
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accentSolid, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.accentText, flexShrink: 0 }}>
                  {activeUser.avatarUrl
                    ? <img src={activeUser.avatarUrl} alt={activeUser.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : activeUser.name?.[0]?.toUpperCase()
                  }
                </div>
                <Link href={`/u/${activeUser.username}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{activeUser.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>@{activeUser.username}</div>
                </Link>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {thread.map(m => {
                  const own = m.senderId === user?.id
                  return (
                    <div key={m.id} style={{ alignSelf: own ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                      <div style={{
                        background: own ? C.accentSolid : C.surface, color: own ? C.accentText : C.text,
                        padding: '9px 13px', borderRadius: 12, fontSize: 13, wordBreak: 'break-word',
                      }}>
                        {m.body}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') send() }}
                  placeholder={t.messagesPage.writeMessage}
                  style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.text }}
                />
                <button onClick={send} disabled={sending || !draft.trim()} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: sending ? 'default' : 'pointer', opacity: sending || !draft.trim() ? 0.6 : 1 }}>
                  {t.messagesPage.send}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
