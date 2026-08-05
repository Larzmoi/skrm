'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CategorySidebar from '@/components/CategorySidebar'
import { useTheme } from '@/lib/theme-context'
import { BACKEND_URL } from '@/lib/backend'

type Tab = 'live' | 'scheduled'

export default function LiveKaikki() {
  const { C } = useTheme()
  const [tab, setTab] = useState<Tab>('live')
  const [shows, setShows] = useState<any[]>([])
  const [activeKat, setActiveKat] = useState('kaikki')
  const [activeAla, setActiveAla] = useState('')
  const [isMobile, setIsMobile] = useState(true)

  const red = '#EF4444'

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('status') === 'scheduled') setTab('scheduled')
  }, [])

  useEffect(() => {
    const status = tab === 'live' ? 'LIVE' : 'SCHEDULED'
    fetch(BACKEND_URL + `/shows?status=${status}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setShows(data) })
      .catch(() => {})
  }, [tab])

  function formatScheduled(iso?: string) {
    if (!iso) return ''
    const d = new Date(iso)
    const today = new Date(); const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)
    const time = d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === today.toDateString()) return `Tänään klo ${time}`
    if (d.toDateString() === tomorrow.toDateString()) return `Huomenna klo ${time}`
    return d.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric' }) + ` klo ${time}`
  }

  const displayShows = shows.map((s: any) => ({
    id: s.id, seller: s.seller?.username ?? 'myyjä',
    title: s.title, category: s.category ?? '', alakategoria: s.alakategoria ?? '', viewers: s.viewerCount ?? 0,
    thumbnail: s.thumbnailUrl ?? '',
    scheduledAt: s.scheduledAt,
  }))

  const filteredShows = useMemo(() => {
    let s = displayShows
    if (activeKat !== 'kaikki') s = s.filter(x => x.category === activeKat)
    if (activeAla) s = s.filter(x => x.alakategoria === activeAla)
    return s
  }, [activeKat, activeAla, displayShows])

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />

      <div style={{ display: 'flex', maxWidth: 1440, margin: '0 auto' }}>
        {!isMobile && (
          <CategorySidebar items={displayShows} activeKat={activeKat} setActiveKat={setActiveKat} activeAla={activeAla} setActiveAla={setActiveAla} isMobile={false} />
        )}

        <div style={{ flex: 1, padding: isMobile ? '16px 14px' : '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setTab('live')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderBottom: tab === 'live' ? `2px solid ${C.accent}` : '2px solid transparent', padding: '0 0 8px', cursor: 'pointer' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: red, display: 'inline-block' }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: tab === 'live' ? C.text : C.muted }}>Live nyt</span>
            </button>
            <button onClick={() => setTab('scheduled')} style={{ background: 'none', border: 'none', borderBottom: tab === 'scheduled' ? `2px solid ${C.accent}` : '2px solid transparent', padding: '0 0 8px', cursor: 'pointer' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: tab === 'scheduled' ? C.text : C.muted }}>Tulossa pian</span>
            </button>
            <span style={{ fontSize: 15, color: C.muted }}>{filteredShows.length} lähetystä</span>
          </div>

          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <CategorySidebar items={displayShows} activeKat={activeKat} setActiveKat={setActiveKat} activeAla={activeAla} setActiveAla={setActiveAla} isMobile={true} />
            </div>
          )}

          {filteredShows.length === 0
            ? <div style={{ color: C.muted, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>{tab === 'live' ? 'Ei live-lähetyksiä juuri nyt' : 'Ei tulevia lähetyksiä'}</div>
            : <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: isMobile ? 10 : 16 }}>
                {filteredShows.map(show => (
                  <Link key={show.id} href={`/live/${show.id}`} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', display: 'block', textDecoration: 'none' }}>
                    <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {show.thumbnail
                        ? <img src={show.thumbnail} alt={show.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                      }
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />
                      {tab === 'live'
                        ? <>
                            <div style={{ position: 'absolute', top: 8, left: 8, background: red, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 3 }}>LIVE</div>
                            <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, padding: '2px 7px', borderRadius: 3 }}>{show.viewers} katsojaa</div>
                          </>
                        : <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, padding: '2px 7px', borderRadius: 3 }}>{formatScheduled(show.scheduledAt)}</div>
                      }
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{show.seller[0]?.toUpperCase()}</div>
                        <span style={{ fontSize: 12, color: C.muted }}>@{show.seller}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{show.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
          }
        </div>
      </div>
      <Footer />
    </div>
  )
}
