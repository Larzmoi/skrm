'use client'
import { use } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import MessagesLayout from '@/components/messages/MessagesLayout'

export default function ViestitKayttajaPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const { C } = useTheme()
  const { t } = useLang()

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>{t.messagesPage.title}</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{t.messagesPage.subtitle}</p>
        <MessagesLayout activeUsername={decodeURIComponent(username)} />
      </div>
      <Footer />
    </div>
  )
}
