'use client'
import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'
import Hls from 'hls.js'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/lang-context'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { BACKEND_URL } from '@/lib/backend'

interface ChatMsg { id: number; userId?: string; username: string; message: string; isBid?: boolean }
interface AuctionState {
  productId: string | null
  currentBid: number
  leaderName: string | null
  timer: number
  active: boolean
}

interface ShowProduct { id: string; name: string; condition?: string; startPrice: number; imageUrl?: string; status: string }
interface ShowData { id: string; title: string; status: string; viewerCount: number; seller: { username: string }; products: ShowProduct[]; hlsUrl?: string | null }

function VideoPlayer({ hlsUrl }: { hlsUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(hlsUrl)
      hls.attachMedia(video)
      return () => hls.destroy()
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl // Safari — natiivi HLS-tuki
    }
  }, [hlsUrl])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      controls
      playsInline
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

function WaitingForStream({ dark, t }: { dark?: boolean; t: any }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? 'rgba(255,255,255,0.5)' : '#666', fontSize: 13 }}>
      {t.live.waitingForStream}
    </div>
  )
}

interface BidPanelProps {
  C: any; t: any
  bidError: string
  currentProduct: ShowProduct
  currentLot: number
  auction: AuctionState
  isLeading: boolean
  timerColor: string
  bidAmount: number
  setBidAmount: React.Dispatch<React.SetStateAction<number>>
  slideTrackRef: React.RefObject<HTMLDivElement | null>
  bidSuccess: boolean
  sliding: boolean
  connected: boolean
  maxSlideX: number
  slideX: number
  onSlideStart: (clientX: number) => void
  onSlideMove: (clientX: number) => void
  onSlideEnd: () => void
}

function BidPanel({ C, t, bidError, currentProduct, currentLot, auction, isLeading, timerColor, bidAmount, setBidAmount, slideTrackRef, bidSuccess, sliding, connected, maxSlideX, slideX, onSlideStart, onSlideMove, onSlideEnd }: BidPanelProps) {
  return (
    <div style={{ background: '#0A0A0A', borderTop: '1px solid #1A1A1A', padding: '12px 14px 14px' }}>
      {bidError && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '8px 12px', marginBottom: 10, color: '#EF4444', fontSize: 13 }}>{bidError}</div>}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: '#1A1A1A' }}>
          {currentProduct.imageUrl && <img src={currentProduct.imageUrl.split('|||')[0]} alt={currentProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 1 }}>{t.live.lotNumber} #{currentLot}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentProduct.name}</div>
          <div style={{ fontSize: 11, color: '#666' }}>{currentProduct.condition}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 1 }}>{t.live.currentBid}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: isLeading ? C.accentBright : '#fff', lineHeight: 1 }}>{auction.currentBid}€</div>
          {auction.active && <div style={{ fontSize: 11, color: timerColor, fontWeight: 600, marginTop: 2 }}>{auction.timer}s</div>}
        </div>
      </div>

      {auction.leaderName && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ background: isLeading ? C.accent : '#222', borderRadius: 10, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: isLeading ? '#fff' : '#888' }}>
            {isLeading ? t.live.leading : `${auction.leaderName} johtaa`}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button onClick={() => setBidAmount(b => Math.max(auction.currentBid + 1, b - 1))} style={{ width: 40, height: 40, borderRadius: 7, border: '1px solid #2A2A2A', background: '#1A1A1A', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
        <input type="number" value={bidAmount} onChange={e => setBidAmount(Math.max(auction.currentBid + 1, Number(e.target.value)))} style={{ flex: 1, background: '#1A1A1A', border: `1px solid ${C.accent}44`, borderRadius: 7, padding: '10px 14px', color: '#fff', fontSize: 17, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' as const }} />
        <span style={{ color: '#555', fontSize: 13 }}>€</span>
        <button onClick={() => setBidAmount(b => b + 1)} style={{ width: 40, height: 40, borderRadius: 7, border: '1px solid #2A2A2A', background: '#1A1A1A', color: C.accentBright, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
      </div>

      <div
        ref={slideTrackRef}
        style={{ position: 'relative', height: 52, background: bidSuccess ? C.accent : '#0D2818', borderRadius: 26, overflow: 'hidden', userSelect: 'none', border: `1px solid ${auction.active ? C.accent + '55' : '#333'}`, cursor: auction.active ? 'pointer' : 'not-allowed', opacity: auction.active ? 1 : 0.5 }}
        onMouseDown={e => auction.active && onSlideStart(e.clientX)}
        onMouseMove={e => auction.active && sliding && onSlideMove(e.clientX)}
        onMouseUp={onSlideEnd}
        onMouseLeave={onSlideEnd}
        onTouchStart={e => auction.active && onSlideStart(e.touches[0].clientX)}
        onTouchMove={e => { if (auction.active) { e.preventDefault(); onSlideMove(e.touches[0].clientX) } }}
        onTouchEnd={onSlideEnd}
      >
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${C.accent}44 0%, ${C.accent}22 100%)`, width: `${maxSlideX > 0 ? (slideX / maxSlideX) * 100 : 0}%`, transition: sliding ? 'none' : 'width 0.3s', borderRadius: 26 }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: bidSuccess ? '#fff' : C.accentBright }}>
            {bidSuccess ? t.live.bidPlaced : auction.active ? `${t.live.bid} ${bidAmount}€` : t.live.waitAuction}
          </span>
        </div>
        <div style={{ position: 'absolute', top: 3, left: 4 + slideX, width: 46, height: 46, borderRadius: 23, background: auction.active ? C.accent : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: sliding ? 'none' : 'left 0.3s', boxShadow: `0 2px 12px ${C.accent}88` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/><polyline points="15 18 21 12 15 6"/></svg>
        </div>
      </div>

      {!connected && <div style={{ marginTop: 8, fontSize: 11, color: '#EF4444', textAlign: 'center' }}>{t.live.connecting}</div>}
    </div>
  )
}

interface ChatAreaProps {
  dark: boolean
  isMobile: boolean
  t: any; C: any
  chatRef: React.RefObject<HTMLDivElement | null>
  chat: ChatMsg[]
  chatInput: string
  setChatInput: (v: string) => void
  sendChat: () => void
  user: any
}

function ChatArea({ dark, isMobile, t, C, chatRef, chat, chatInput, setChatInput, sendChat, user }: ChatAreaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: dark ? '#0A0A0A' : C.surface }}>
      {!isMobile && <div style={{ padding: '12px 14px', borderBottom: `1px solid ${dark ? '#1A1A1A' : C.border}`, fontSize: 13, fontWeight: 700, color: dark ? '#fff' : C.text }}>{t.live.chat}</div>}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {chat.map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: msg.isBid ? C.accent : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 1 }}>
              {msg.username[0].toUpperCase()}
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: msg.isBid ? C.accentBright : C.accent }}>{msg.username} </span>
              <span style={{ fontSize: 12, color: dark ? '#ccc' : C.text }}>{msg.message}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${dark ? '#1A1A1A' : C.border}`, display: 'flex', gap: 8 }}>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChat()}
          placeholder={user ? t.live.writeMessage : 'Kirjaudu kirjoittaaksesi...'}
          disabled={!user}
          style={{ flex: 1, background: dark ? '#1A1A1A' : C.surface2, border: `1px solid ${dark ? '#2A2A2A' : C.border}`, borderRadius: 18, padding: '7px 12px', color: dark ? '#fff' : C.text, fontSize: 13, outline: 'none' }}
        />
        <button onClick={sendChat} disabled={!user} style={{ background: user ? C.accent : '#333', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: user ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  )
}

export default function LivePage({ params }: { params: Promise<{ showId: string }> }) {
  const { showId } = use(params)
  const { C } = useTheme()
  const { user } = useAuth()
  const { t } = useLang()

  const [show, setShow] = useState<ShowData | null>(null)
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [auction, setAuction] = useState<AuctionState>({
    productId: null,
    currentBid: 0,
    leaderName: null,
    timer: 120,
    active: false,
  })
  const [bidAmount, setBidAmount] = useState(1)
  const [slideX, setSlideX] = useState(0)
  const [sliding, setSliding] = useState(false)
  const [bidSuccess, setBidSuccess] = useState(false)
  const [bidError, setBidError] = useState('')
  const [connected, setConnected] = useState(false)
  const [viewers, setViewers] = useState(0)
  const [isMobile, setIsMobile] = useState(true)

  const slideTrackRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chat])

  useEffect(() => {
    fetch(BACKEND_URL + `/shows/${showId}`)
      .then(r => r.json())
      .then((data: ShowData) => {
        if (!data || (data as any).error) return
        setShow(data)
        setViewers(data.viewerCount ?? 0)
        setAuction(a => ({ ...a, productId: a.productId ?? data.products?.[0]?.id ?? null }))
      })
      .catch(() => {})
  }, [showId])

  useEffect(() => {
    const socket = connectSocket()

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_show', showId)
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('chat_message', (data: any) => {
      setChat(c => [...c, { id: Date.now(), username: data.username, message: data.message }])
    })

    socket.on('auction_started', (data: any) => {
      setAuction({ productId: data.productId, currentBid: data.startPrice, leaderName: null, timer: data.duration, active: true })
      setBidAmount(data.startPrice + 1)
    })

    socket.on('new_bid', (data: any) => {
      setAuction(a => ({ ...a, currentBid: data.amount, leaderName: data.username, timer: data.timer }))
      setChat(c => [...c, { id: Date.now(), username: data.username, message: `Huusi ${data.amount}€`, isBid: true }])
      setBidAmount(data.amount + 1)
    })

    socket.on('timer_tick', (data: any) => {
      setAuction(a => ({ ...a, timer: data.timer }))
    })

    socket.on('auction_ended', (data: any) => {
      setAuction(a => ({ ...a, active: false, timer: 0 }))
      if (data.winnerName) {
        setChat(c => [...c, { id: Date.now(), username: 'SKRM', message: `${data.winnerName} voitti hinnalla ${data.finalPrice}€!`, isBid: true }])
      }
    })

    socket.on('bid_accepted', () => {
      setBidSuccess(true)
      setTimeout(() => setBidSuccess(false), 2000)
    })

    socket.on('bid_error', (data: any) => {
      setBidError(data.message)
      setTimeout(() => setBidError(''), 3000)
    })

    socket.on('auction_state', (data: any) => {
      setAuction({ productId: data.productId, currentBid: data.currentBid, leaderName: data.leaderName, timer: data.timer, active: data.active })
      setBidAmount(data.currentBid + 1)
    })

    socket.on('show_status', (data: { status: string }) => {
      setShow(s => s ? { ...s, status: data.status } : s)
    })

    return () => {
      socket.emit('leave_show', showId)
      socket.off('connect')
      socket.off('disconnect')
      socket.off('chat_message')
      socket.off('auction_started')
      socket.off('new_bid')
      socket.off('timer_tick')
      socket.off('auction_ended')
      socket.off('bid_accepted')
      socket.off('bid_error')
      socket.off('auction_state')
      socket.off('show_status')
    }
  }, [showId])

  function sendChat() {
    if (!chatInput.trim() || !user) return
    const token = localStorage.getItem('skrm_token')
    const socket = connectSocket()
    socket.emit('chat_message', { showId, message: chatInput.trim(), token })
    setChatInput('')
  }

  function placeBid() {
    if (!user) { setBidError('Kirjaudu sisään / Sign in to bid'); setTimeout(() => setBidError(''), 3000); return }
    if (!auction.active) { setBidError(t.live.waitAuction); setTimeout(() => setBidError(''), 3000); return }
    if (bidAmount <= auction.currentBid) { setBidError(`Huudon täytyy olla yli ${auction.currentBid}€`); setTimeout(() => setBidError(''), 3000); return }
    const token = localStorage.getItem('skrm_token')
    const socket = connectSocket()
    socket.emit('place_bid', { showId, productId: auction.productId, amount: bidAmount, token })
    setSlideX(0); setSliding(false)
  }

  function onSlideStart(clientX: number) { setSliding(true) }
  function onSlideMove(clientX: number) {
    if (!sliding || !slideTrackRef.current) return
    const trackW = slideTrackRef.current.offsetWidth
    const thumbW = 46
    const maxX = trackW - thumbW - 8
    const rect = slideTrackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left - thumbW / 2, maxX))
    setSlideX(x)
    if (x >= maxX - 4) { placeBid(); setSliding(false); setTimeout(() => setSlideX(0), 300) }
  }
  function onSlideEnd() { setSliding(false); setSlideX(0) }

  const products = show?.products ?? []
  const currentProduct = products.find(p => p.id === auction.productId) ?? products[0] ?? { id: '', name: t.live.noProducts, condition: '', startPrice: 0, imageUrl: undefined, status: 'PENDING' }
  const currentLot = products.findIndex(p => p.id === currentProduct.id) + 1
  const timerColor = auction.timer > 30 ? C.accent : auction.timer > 10 ? '#F59E0B' : '#EF4444'
  const maxSlideX = (slideTrackRef.current?.offsetWidth ?? 300) - 46 - 8
  const isLeading = auction.leaderName === user?.username

  if (isMobile) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#000', maxWidth: 480, margin: '0 auto', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(160deg, #1a1a1a 0%, #0a0a0a 100%)', minHeight: 0 }}>
          {show?.status === 'LIVE' && show?.hlsUrl
            ? <VideoPlayer hlsUrl={show.hlsUrl} />
            : <WaitingForStream dark t={t} />
          }
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 24, padding: '5px 12px 5px 6px', backdropFilter: 'blur(8px)', flex: 1 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{show?.seller?.username?.[0]?.toUpperCase() ?? '?'}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{show?.seller?.username ?? '...'}</span>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
            </div>
            <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: '5px 10px', fontSize: 12, color: '#fff', backdropFilter: 'blur(8px)' }}>{viewers}</div>
            <Link href="/" style={{ background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, backdropFilter: 'blur(8px)' }}>✕</Link>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 12px 10px', zIndex: 10 }}>
            <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 8 }}>
              {chat.slice(-5).map(msg => (
                <div key={msg.id} style={{ display: 'flex', gap: 7, marginBottom: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: msg.isBid ? C.accent : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{msg.username[0].toUpperCase()}</div>
                  <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: '4px 9px', backdropFilter: 'blur(8px)', maxWidth: '80%' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: msg.isBid ? C.accentBright : C.accent }}>{msg.username} </span>
                    <span style={{ fontSize: 11, color: '#fff' }}>{msg.message}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Kirjoita viesti..." style={{ flex: 1, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '8px 12px', color: '#fff', fontSize: 13 }} />
              <button onClick={sendChat} style={{ background: C.accent, border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
        <BidPanel
          C={C} t={t} bidError={bidError} currentProduct={currentProduct} currentLot={currentLot}
          auction={auction} isLeading={isLeading} timerColor={timerColor} bidAmount={bidAmount}
          setBidAmount={setBidAmount} slideTrackRef={slideTrackRef} bidSuccess={bidSuccess} sliding={sliding}
          connected={connected} maxSlideX={maxSlideX} slideX={slideX}
          onSlideStart={onSlideStart} onSlideMove={onSlideMove} onSlideEnd={onSlideEnd}
        />
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#080808' }}>
      <div style={{ background: '#0A0A0A', borderBottom: '1px solid #1A1A1A', height: 50, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0 }}>
        <Link href="/" style={{ fontWeight: 900, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>SKRM</Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1A1A1A', borderRadius: 20, padding: '5px 12px 5px 8px' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{show?.seller?.username?.[0]?.toUpperCase() ?? '?'}</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{show?.seller?.username ?? '...'}</span>
          <span style={{ fontSize: 12, color: '#555' }}>· {viewers} {t.live.viewers}</span>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite', marginLeft: 4 }} />
        </div>
        <Link href="/" style={{ color: '#666', fontSize: 13 }}>{t.live.leaveShow}</Link>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 300px', minHeight: 0 }}>
        {/* Tuotelista */}
        <div style={{ background: '#0A0A0A', borderRight: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1A1A1A', fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.live.products}</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {products.length === 0 && <div style={{ padding: '12px 4px', fontSize: 12, color: '#555' }}>{t.live.noProducts}</div>}
            {products.map((p, i) => {
              const isActive = p.id === auction.productId
              const isSold = p.status === 'SOLD'
              return (
                <div key={p.id} style={{ background: isActive ? '#0D2818' : '#111', border: `1px solid ${isActive ? C.accent + '55' : '#1A1A1A'}`, borderRadius: 8, padding: '9px 11px', display: 'flex', gap: 9, alignItems: 'center', opacity: isSold ? 0.4 : 1 }}>
                  {p.imageUrl
                    ? <img src={p.imageUrl.split('|||')[0]} alt={p.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 36, borderRadius: 5, background: '#1A1A1A', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: '#555', marginBottom: 1 }}>#{i + 1}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#fff' : '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#555' }}>{p.condition}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isActive && auction.active && <div style={{ fontSize: 13, fontWeight: 800, color: C.accentBright }}>{auction.currentBid}€</div>}
                    {!isActive && <div style={{ fontSize: 11, color: '#555' }}>{p.startPrice}€</div>}
                    {isActive && <div style={{ fontSize: 10, color: C.accent, fontWeight: 700 }}>NOW</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Video + bid */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#080808' }}>
          <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(160deg, #1a1a1a 0%, #0a0a0a 100%)', minHeight: 0 }}>
            {show?.status === 'LIVE' && show?.hlsUrl
              ? <VideoPlayer hlsUrl={show.hlsUrl} />
              : <WaitingForStream dark t={t} />
            }
            <div style={{ position: 'absolute', top: 14, left: 14, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 4 }}>LIVE</div>
            {auction.active && (
              <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: timerColor }}>{auction.timer}s</div>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>{t.live.lotNumber} #{currentLot}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{currentProduct.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{currentProduct.condition}</div>
            </div>
            <div style={{ position: 'absolute', bottom: 16, right: 16, textAlign: 'right' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: isLeading ? C.accentBright : '#fff' }}>{auction.currentBid}€</div>
              {auction.leaderName && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{isLeading ? t.live.leading : `${auction.leaderName} johtaa`}</div>}
            </div>
          </div>
          <BidPanel
            C={C} t={t} bidError={bidError} currentProduct={currentProduct} currentLot={currentLot}
            auction={auction} isLeading={isLeading} timerColor={timerColor} bidAmount={bidAmount}
            setBidAmount={setBidAmount} slideTrackRef={slideTrackRef} bidSuccess={bidSuccess} sliding={sliding}
            connected={connected} maxSlideX={maxSlideX} slideX={slideX}
            onSlideStart={onSlideStart} onSlideMove={onSlideMove} onSlideEnd={onSlideEnd}
          />
        </div>

        {/* Chat */}
        <div style={{ borderLeft: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatArea dark={true} isMobile={isMobile} t={t} C={C} chatRef={chatRef} chat={chat} chatInput={chatInput} setChatInput={setChatInput} sendChat={sendChat} user={user} />
        </div>
      </div>
    </div>
  )
}
