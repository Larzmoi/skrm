'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { notificationApi, messageApi } from './api'
import { useAuth } from './auth-context'
import { connectSocket, disconnectSocket } from './socket'

export interface NotificationItem {
  id: string; type: string; title: string; body: string; read: boolean; link: string | null; createdAt: string
}
export interface ConversationItem {
  user: { id: string; name: string; username: string; avatarUrl?: string }
  lastMessage: { id: string; body: string; senderId: string; receiverId: string; read: boolean; createdAt: string }
  unreadCount: number
}

interface NotificationCtx {
  notifications: NotificationItem[]
  conversations: ConversationItem[]
  unreadNotifCount: number
  unreadMessageCount: number
  refresh: () => Promise<void>
  markAllRead: () => Promise<void>
  remove: (id: string) => Promise<void>
}

const NotificationContext = createContext<NotificationCtx>({
  notifications: [], conversations: [], unreadNotifCount: 0, unreadMessageCount: 0,
  refresh: async () => {}, markAllRead: async () => {}, remove: async () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])

  const refresh = useCallback(async () => {
    if (!user) { setNotifications([]); setConversations([]); return }
    try {
      const [n, c] = await Promise.all([notificationApi.list(), messageApi.conversations()])
      setNotifications(Array.isArray(n) ? n : [])
      setConversations(Array.isArray(c) ? c : [])
    } catch {
      setNotifications([]); setConversations([])
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!user) { disconnectSocket(); return }
    const socket = connectSocket()
    socket.emit('join_user', user.id)
    const onNotification = () => refresh()
    const onMessage = () => refresh()
    socket.on('notification', onNotification)
    socket.on('message', onMessage)
    return () => {
      socket.off('notification', onNotification)
      socket.off('message', onMessage)
    }
  }, [user, refresh])

  async function markAllRead() {
    await notificationApi.markRead()
    await refresh()
  }

  async function remove(id: string) {
    setNotifications(n => n.filter(x => x.id !== id))
    try { await notificationApi.remove(id) } catch { await refresh() }
  }

  const unreadNotifCount = notifications.filter(n => !n.read).length
  const unreadMessageCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <NotificationContext.Provider value={{ notifications, conversations, unreadNotifCount, unreadMessageCount, refresh, markAllRead, remove }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() { return useContext(NotificationContext) }
