'use client'
import { useState, useEffect, useRef, use } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Hls from 'hls.js'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/lang-context'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { BACKEND_URL } from '@/lib/backend'
import ReportModal from '@/components/ReportModal'
import ConfirmDialog from '@/components/ConfirmDialog'

interface ChatMsg { id: string; userId?: string; username: string; message: string; isBid?: boolean; hidden?: boolean }
interface ViewerEntry { userId: string; username: string; isSeller: boolean; isModerator: boolean }
interface AuctionState {
  productId: string | null
  currentBid: number
  leaderName: string | null
  timer: number
  active: boolean
}

interface ShowProduct { id: string; name: string; condition?: string; startPrice: number; buyNowPrice?: number; imageUrl?: string; status: string }
interface ShowData { id: string; title: string; status: string; viewerCount: number; seller: { id: string; username: string }; products: ShowProduct[]; hlsUrl?: string | null }

function VideoPlayer({ hlsUrl }: { hlsUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)

  // Natiivit videosäätimet (controls) poistettu — ne törmäsivät visuaalisesti omien
  // chat/shop-overlayjemme kanssa mobiilissa (peittyivät/piiloutuivat niiden taakse) eikä niitä
  // tarvita muuhun kuin äänen mykistyksen poistoon, joten korvattu tällä yhdellä omalla napilla.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      // lowLatencyMode: true - MediaMTX (2026-08-09 migraatio nginx-rtmp:stä, ks. CLAUDE.md
      // "KRIITTINEN TILANNEKATSAUS") tarjoilee LL-HLS:ää 200ms part-kestolla. Ilman
      // lowLatencyMode:a hls.js kohtelisi striimiä tavallisena HLS:nä eikä hyödyntäisi
      // osittaisia segmenttejä matalaan viiveeseen pääsemiseksi. liveSyncDurationCount pitää
      // toiston lähellä live-reunaa, maxLiveSyncPlaybackRate kiriyttää takaisin jos jäädään jälkeen.
      //
      // xhrSetup: withCredentials = true on PAKOLLINEN - MediaMTX vaatii session-cookien
      // jokaisella segmentti/part-haulla, ja app.skrm.fi + stream.skrm.fi ovat selaimen
      // näkökulmasta ERI origineja (eri subdomain). Ilman tätä selain ei lähetä cookieta
      // cross-origin-pyynnöissä ja JOKAINEN segmenttihaku palautuu 401:nä - juuri tämä
      // aiheutti "video ei toimi ollenkaan" -regression 2026-08-09 (ks. CLAUDE.md).
      const hls = new Hls({
        lowLatencyMode: true, liveSyncDurationCount: 2, maxLiveSyncPlaybackRate: 1.3,
        xhrSetup: (xhr) => { xhr.withCredentials = true },
      })
      let destroyed = false
      let retryTimer: ReturnType<typeof setTimeout> | null = null
      let lastFragAt = Date.now()

      hls.attachMedia(video)
      hls.loadSource(hlsUrl)
      hls.on(Hls.Events.FRAG_LOADED, () => { lastFragAt = Date.now() })
      // hls.js ei yritä automaattisesti uudestaan fataalin verkkovirheen (esim. manifesti ei
      // vielä saatavilla, tai hetkellinen katko OBS-yhteydessä) jälkeen — ilman uudelleenyritystä
      // toisto jäisi pysyvästi jumiin vaikka striimi palautuisi hetkeä myöhemmin.
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal || destroyed) return
        retryTimer = setTimeout(() => { if (!destroyed) hls.loadSource(hlsUrl) }, 3000)
      })
      // Vahtikoira: jos OBS katkeaa/käynnistyy uudelleen ilman että hls.js ehdi luokitella
      // mitään "fataaliksi" virheeksi, yllä oleva virhepohjainen uudelleenyritys ei koskaan
      // laukea. Itsenäinen turvaverkko: jos yhtään uutta segmenttiä ei ole ladattu 12s
      // aikana, pakota manifest uudelleen joka tapauksessa.
      const watchdog = setInterval(() => {
        if (destroyed) return
        if (Date.now() - lastFragAt > 12000) {
          lastFragAt = Date.now()
          hls.loadSource(hlsUrl)
        }
      }, 4000)
      return () => {
        destroyed = true
        if (retryTimer) clearTimeout(retryTimer)
        clearInterval(watchdog)
        hls.destroy()
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl // Safari — natiivi HLS-tuki
    }
  }, [hlsUrl])

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <button
        onClick={() => setMuted(m => !m)}
        title={muted ? 'Poista mykistys' : 'Mykistä'}
        style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', zIndex: 9, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, cursor: 'pointer', backdropFilter: 'blur(6px)' }}
      >{muted ? '🔇' : '🔊'}</button>
    </>
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
  ended: boolean
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

function BidPanel({ C, t, bidError, currentProduct, currentLot, auction, isLeading, ended, timerColor, bidAmount, setBidAmount, slideTrackRef, bidSuccess, sliding, connected, maxSlideX, slideX, onSlideStart, onSlideMove, onSlideEnd }: BidPanelProps) {
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
            {ended
              ? (isLeading ? t.live.youWon : `${auction.leaderName} voitti`)
              : (isLeading ? t.live.leading : `${auction.leaderName} johtaa`)}
          </span>
        </div>
      )}

      {!ended && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <button onClick={() => setBidAmount(b => Math.max(auction.currentBid + 1, b - 1))} style={{ width: 40, height: 40, borderRadius: 7, border: '1px solid #2A2A2A', background: '#1A1A1A', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
          <input type="number" value={bidAmount} onChange={e => setBidAmount(Math.max(auction.currentBid + 1, Number(e.target.value)))} style={{ flex: 1, background: '#1A1A1A', border: `1px solid ${C.accent}44`, borderRadius: 7, padding: '10px 14px', color: '#fff', fontSize: 17, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' as const }} />
          <span style={{ color: '#555', fontSize: 13 }}>€</span>
          <button onClick={() => setBidAmount(b => b + 1)} style={{ width: 40, height: 40, borderRadius: 7, border: '1px solid #2A2A2A', background: '#1A1A1A', color: C.accentBright, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
        </div>
      )}

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
            {bidSuccess ? t.live.bidPlaced
              : auction.active ? `${t.live.bid} ${bidAmount}€`
              : ended ? (auction.leaderName ? t.live.sold : t.live.auctionEndedNoWinner)
              : t.live.waitAuction}
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

interface ModMenuProps { C: any; targetIsModerator: boolean; onAssign: () => void; onRemoveMod: () => void; onRemoveFromShow: () => void; onClose: () => void }
function ModMenu({ C, targetIsModerator, onAssign, onRemoveMod, onRemoveFromShow, onClose }: ModMenuProps) {
  return (
    <div style={{ position: 'absolute', zIndex: 30, background: '#161616', border: '1px solid #2A2A2A', borderRadius: 8, padding: 6, minWidth: 170, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
      {targetIsModerator ? (
        <button onClick={onRemoveMod} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#fff', fontSize: 12, padding: '7px 10px', cursor: 'pointer', borderRadius: 5 }}>Poista moderaattorin oikeudet</button>
      ) : (
        <button onClick={onAssign} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#fff', fontSize: 12, padding: '7px 10px', cursor: 'pointer', borderRadius: 5 }}>Tee moderaattoriksi</button>
      )}
      <button onClick={onRemoveFromShow} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#EF4444', fontSize: 12, padding: '7px 10px', cursor: 'pointer', borderRadius: 5 }}>Poista tästä livestä</button>
      <button onClick={onClose} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#666', fontSize: 12, padding: '7px 10px', cursor: 'pointer', borderRadius: 5 }}>Sulje</button>
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
  canModerate: boolean
  chatTab: 'chat' | 'watching'
  setChatTab: (v: 'chat' | 'watching') => void
  viewerList: ViewerEntry[]
  modMenuUser: { userId: string; username: string } | null
  setModMenuUser: (v: { userId: string; username: string } | null) => void
  onAssignMod: (userId: string) => void
  onRemoveMod: (userId: string) => void
  onRemoveFromShow: (userId: string) => void
}

function ChatArea({ dark, isMobile, t, C, chatRef, chat, chatInput, setChatInput, sendChat, user, canModerate, chatTab, setChatTab, viewerList, modMenuUser, setModMenuUser, onAssignMod, onRemoveMod, onRemoveFromShow }: ChatAreaProps) {
  const visibleChat = chat.filter(m => !m.hidden || canModerate)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: dark ? '#0A0A0A' : C.surface }}>
      {!isMobile && (
        <div style={{ display: 'flex', borderBottom: `1px solid ${dark ? '#1A1A1A' : C.border}`, flexShrink: 0 }}>
          <button onClick={() => setChatTab('chat')} style={{ flex: 1, background: 'none', border: 'none', padding: '11px 0', fontSize: 12, fontWeight: 700, color: chatTab === 'chat' ? (dark ? '#fff' : C.text) : (dark ? '#666' : C.muted), borderBottom: chatTab === 'chat' ? `2px solid ${C.accent}` : '2px solid transparent', cursor: 'pointer' }}>{t.live.chat}</button>
          <button onClick={() => setChatTab('watching')} style={{ flex: 1, background: 'none', border: 'none', padding: '11px 0', fontSize: 12, fontWeight: 700, color: chatTab === 'watching' ? (dark ? '#fff' : C.text) : (dark ? '#666' : C.muted), borderBottom: chatTab === 'watching' ? `2px solid ${C.accent}` : '2px solid transparent', cursor: 'pointer' }}>Watching ({viewerList.length})</button>
        </div>
      )}
      {chatTab === 'watching' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {viewerList.length === 0 && <div style={{ fontSize: 12, color: dark ? '#666' : C.muted, textAlign: 'center', padding: '20px 0' }}>Ei kirjautuneita katsojia juuri nyt</div>}
          {viewerList.map(v => (
            <div key={v.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: v.isSeller ? C.accent : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{v.username[0].toUpperCase()}</div>
              <span style={{ fontSize: 12, color: dark ? '#ccc' : C.text, flex: 1 }}>{v.username}</span>
              {v.isSeller && <span style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>HOST</span>}
              {!v.isSeller && v.isModerator && <span style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6' }}>MOD</span>}
            </div>
          ))}
        </div>
      ) : (
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visibleChat.map(msg => (
            <div key={msg.id} style={{ position: 'relative', display: 'flex', gap: 7, alignItems: 'flex-start', opacity: msg.hidden ? 0.5 : 1 }}>
              <div
                onClick={() => canModerate && msg.userId && setModMenuUser(modMenuUser?.userId === msg.userId ? null : { userId: msg.userId, username: msg.username })}
                style={{ width: 22, height: 22, borderRadius: '50%', background: msg.isBid ? C.accent : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 1, cursor: canModerate && msg.userId ? 'pointer' : 'default' }}
              >
                {msg.username[0].toUpperCase()}
              </div>
              <div>
                <span
                  onClick={() => canModerate && msg.userId && setModMenuUser(modMenuUser?.userId === msg.userId ? null : { userId: msg.userId, username: msg.username })}
                  style={{ fontSize: 12, fontWeight: 700, color: msg.isBid ? C.accentBright : C.accent, cursor: canModerate && msg.userId ? 'pointer' : 'default' }}
                >{msg.username} </span>
                <span style={{ fontSize: 12, color: dark ? '#ccc' : C.text }}>{msg.message}</span>
                {msg.hidden && <span style={{ fontSize: 10, color: '#EF4444', marginLeft: 6 }}>(piilotettu — kielletty sana)</span>}
              </div>
              {modMenuUser?.userId === msg.userId && (
                <ModMenu
                  C={C}
                  targetIsModerator={viewerList.find(v => v.userId === msg.userId)?.isModerator ?? false}
                  onAssign={() => onAssignMod(msg.userId!)}
                  onRemoveMod={() => onRemoveMod(msg.userId!)}
                  onRemoveFromShow={() => onRemoveFromShow(msg.userId!)}
                  onClose={() => setModMenuUser(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
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

interface ShopPanelProps {
  C: any
  products: ShowProduct[]
  activeProductId: string | null
  search: string; setSearch: (v: string) => void
  filter: 'all' | 'buynow'; setFilter: (v: 'all' | 'buynow') => void
  sort: 'default' | 'price_asc' | 'price_desc'; setSort: (v: 'default' | 'price_asc' | 'price_desc') => void
  onBuyNow: (productId: string) => void
  onPreBid: () => void
}

function ShopPanel({ C, products, activeProductId, search, setSearch, filter, setFilter, sort, setSort, onBuyNow, onPreBid }: ShopPanelProps) {
  let list = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
  if (filter === 'buynow') list = list.filter(p => !!p.buyNowPrice)
  if (sort === 'price_asc') list = [...list].sort((a, b) => a.startPrice - b.startPrice)
  if (sort === 'price_desc') list = [...list].sort((a, b) => b.startPrice - a.startPrice)

  return (
    <>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hae tuotteita..." style={{ width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 7, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {([['all', 'Kaikki'], ['buynow', 'Osta heti']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{ flex: 1, background: filter === id ? C.accent : '#1A1A1A', border: 'none', color: filter === id ? '#fff' : '#888', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{label}</button>
          ))}
          <select value={sort} onChange={e => setSort(e.target.value as any)} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, color: '#ccc', fontSize: 11, padding: '0 6px' }}>
            <option value="default">Järjestys</option>
            <option value="price_asc">Hinta ↑</option>
            <option value="price_desc">Hinta ↓</option>
          </select>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {list.length === 0 && <div style={{ padding: '12px 4px', fontSize: 12, color: '#555' }}>Ei tuotteita</div>}
        {list.map((p, i) => {
          const isActive = p.id === activeProductId
          const isSold = p.status === 'SOLD'
          return (
            <div key={p.id} style={{ background: isActive ? '#0D2818' : '#111', border: `1px solid ${isActive ? C.accent + '55' : '#1A1A1A'}`, borderRadius: 8, padding: '9px 11px', opacity: isSold ? 0.4 : 1 }}>
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 8 }}>
                {p.imageUrl
                  ? <img src={p.imageUrl.split('|||')[0]} alt={p.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 36, borderRadius: 5, background: '#1A1A1A', flexShrink: 0 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 1 }}>#{i + 1}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#fff' : '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{p.startPrice}€</div>
                  {isActive && <div style={{ fontSize: 9, color: C.accent, fontWeight: 700 }}>NOW</div>}
                </div>
              </div>
              {!isSold && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={onPreBid} style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#ccc', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Pre-bid</button>
                  {p.buyNowPrice && <button onClick={() => onBuyNow(p.id)} style={{ flex: 1, background: C.accent, border: 'none', color: '#fff', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Osta heti {p.buyNowPrice}€</button>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

export default function LivePage({ params }: { params: Promise<{ showId: string }> }) {
  const { showId } = use(params)
  const { C } = useTheme()
  const { user } = useAuth()
  const { t } = useLang()
  const router = useRouter()

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
  // Erottaa "huutokauppa ei ole vielä alkanut" ja "huutokauppa juuri päättyi" -tilat
  // toisistaan - molemmissa auction.active on false, mutta UI:n pitää näyttää eri asian
  // (odota vs. myyty/päättynyt). Nollataan kun UUSI huutokauppa alkaa.
  const [endedProductId, setEndedProductId] = useState<string | null>(null)
  const [bidAmount, setBidAmount] = useState(1)
  const [slideX, setSlideX] = useState(0)
  const [sliding, setSliding] = useState(false)
  const [bidSuccess, setBidSuccess] = useState(false)
  const [bidError, setBidError] = useState('')
  const [connected, setConnected] = useState(false)
  // TILAPÄINEN DIAGNOSTIIKKA (2026-08-09, toinen kierros) - edellinen kierros vahvisti chatin
  // toimivan mutta ei tallennettu lukemaa ennen badgen poistoa, ja sen jälkeen chat "hajosi
  // taas" - tällä kertaa myös shopOpen näkyvissä, koska Shop-paneelin display:'contents'-korjaus
  // on uusi epäilty syy (jos shopOpen jäisi jumiin trueksi, täysruudun Shop peittäisi chatin
  // näkyvistä vaikka viestit tulisivat perille - täsmälleen "ei näy mitään viestejä" -oire).
  const [debugEventCount, setDebugEventCount] = useState(0)
  const [debugLastEvent, setDebugLastEvent] = useState('')
  const [viewers, setViewers] = useState(0)
  const [isMobile, setIsMobile] = useState(true)
  const [showReport, setShowReport] = useState(false)

  // Chat & moderointi -laajennus
  const [isSeller, setIsSeller] = useState(false)
  const [isModerator, setIsModerator] = useState(false)
  const [viewerList, setViewerList] = useState<ViewerEntry[]>([])
  const [chatTab, setChatTab] = useState<'chat' | 'watching'>('chat')
  const [modMenuUser, setModMenuUser] = useState<{ userId: string; username: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; danger?: boolean; onConfirm: () => void } | null>(null)
  const [removedBlocked, setRemovedBlocked] = useState(false)

  // Shop-paneeli (mobiili: täysruudun overlay + video pienenee PiP:ksi)
  const [shopOpen, setShopOpen] = useState(false)
  // Video-elementin "kotipesät" mobiilin pääkuvalle ja Shopin PiP-ikkunalle. Video
  // portaloidaan (React Portal) sille kumpi on aktiivinen, EI koskaan renderöidä kahdessa
  // erillisessä ehdollisessa JSX-haarassa kuten aiemmin - se pakotti Reactin unmounttaamaan
  // ja remounttaamaan koko VideoPlayerin (siis hls.js:n) joka kerta kun Shop avattiin/
  // suljettiin, mikä näkyi mustana/tyhjänä PiP-videona koska striimi piti puskuroida
  // kokonaan uudelleen tyhjästä. Molemmat kotipesät ovat AINA DOM:ssa, joten refit
  // asettuvat kerran eivätkä koskaan palaa nulliksi.
  const [mainVideoSlot, setMainVideoSlot] = useState<HTMLDivElement | null>(null)
  const [pipVideoSlot, setPipVideoSlot] = useState<HTMLDivElement | null>(null)
  const [shopSearch, setShopSearch] = useState('')
  const [shopFilter, setShopFilter] = useState<'all' | 'buynow'>('all')
  const [shopSort, setShopSort] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [toast, setToast] = useState('')

  const slideTrackRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const canModerate = isSeller || isModerator

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
      const token = localStorage.getItem('skrm_token') || undefined
      socket.emit('join_show', { showId, token })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('chat_message', (data: any) => {
      setChat(c => [...c, { id: data.id ?? String(Date.now()), userId: data.userId, username: data.username, message: data.message, hidden: data.hidden }])
      setDebugEventCount(n => n + 1)
      setDebugLastEvent(`${new Date().toLocaleTimeString()} ${data.username}: ${data.message}`)
    })

    socket.on('chat_message_deleted', (data: { messageId: string }) => {
      setChat(c => c.filter(m => m.id !== data.messageId))
    })

    socket.on('your_status', (data: { isSeller: boolean; isModerator: boolean }) => {
      setIsSeller(data.isSeller); setIsModerator(data.isModerator)
    })

    socket.on('viewer_list', (data: { viewers: ViewerEntry[] }) => setViewerList(data.viewers))

    socket.on('moderator_status', (data: { userId: string; isModerator: boolean }) => {
      if (data.userId === user?.id) setIsModerator(data.isModerator)
    })

    socket.on('user_removed_from_show', (data: { userId: string }) => {
      if (data.userId === user?.id) setRemovedBlocked(true)
    })

    socket.on('join_rejected', (data: { reason: string }) => {
      if (data.reason === 'removed') setRemovedBlocked(true)
    })

    socket.on('auction_started', (data: any) => {
      setAuction({ productId: data.productId, currentBid: data.startPrice, leaderName: null, timer: data.duration, active: true })
      setBidAmount(data.startPrice + 1)
      setEndedProductId(null)
    })

    socket.on('new_bid', (data: any) => {
      setAuction(a => ({ ...a, currentBid: data.amount, leaderName: data.username, timer: data.timer }))
      setChat(c => [...c, { id: `bid-${data.userId}-${data.amount}-${Date.now()}`, username: data.username, message: `Huusi ${data.amount}€`, isBid: true }])
      setBidAmount(data.amount + 1)
    })

    socket.on('timer_tick', (data: any) => {
      setAuction(a => ({ ...a, timer: data.timer }))
    })

    socket.on('auction_ended', (data: any) => {
      setAuction(a => ({ ...a, active: false, timer: 0 }))
      setEndedProductId(data.productId ?? null)
      if (data.winnerName) {
        setChat(c => [...c, { id: `sold-${data.productId}-${Date.now()}`, username: 'SKRM', message: `${data.winnerName} voitti hinnalla ${data.finalPrice}€!`, isBid: true }])
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
      socket.off('chat_message_deleted')
      socket.off('your_status')
      socket.off('viewer_list')
      socket.off('moderator_status')
      socket.off('user_removed_from_show')
      socket.off('join_rejected')
      socket.off('auction_started')
      socket.off('new_bid')
      socket.off('timer_tick')
      socket.off('auction_ended')
      socket.off('bid_accepted')
      socket.off('bid_error')
      socket.off('auction_state')
      socket.off('show_status')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId])

  function sendChat() {
    if (!chatInput.trim() || !user) return
    const token = localStorage.getItem('skrm_token')
    const socket = connectSocket()
    socket.emit('chat_message', { showId, message: chatInput.trim(), token })
    setChatInput('')
  }

  function assignModerator(userId: string) {
    const token = localStorage.getItem('skrm_token')
    connectSocket().emit('assign_moderator', { showId, userId, token })
    setModMenuUser(null)
  }
  function removeModerator(userId: string) {
    const token = localStorage.getItem('skrm_token')
    connectSocket().emit('remove_moderator', { showId, userId, token })
    setModMenuUser(null)
  }
  function removeFromShow(userId: string) {
    setModMenuUser(null)
    setConfirmDialog({
      message: 'Poistetaanko tämä käyttäjä tästä livestä? Hän ei voi enää chatata tai huutaa tässä livessä.',
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null)
        const token = localStorage.getItem('skrm_token')
        connectSocket().emit('remove_from_show', { showId, userId, token })
      },
    })
  }

  async function buyNow(productId: string) {
    if (!user) { router.push(`/login?redirect=/live/${showId}`); return }
    try {
      const { cartApi } = await import('@/lib/api')
      await cartApi.add(productId, 'live', 1)
      router.push('/kori')
    } catch (e: any) {
      setToast(e.message ?? 'Ostoskoriin lisäys epäonnistui')
      setTimeout(() => setToast(''), 2500)
    }
  }
  function preBidStub() {
    setToast('Ennakkotarjoukset — tulossa pian')
    setTimeout(() => setToast(''), 2000)
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

  function openReport() {
    if (!user) { router.push(`/login?redirect=/live/${showId}`); return }
    setShowReport(true)
  }

  const products = show?.products ?? []
  const currentProduct = products.find(p => p.id === auction.productId) ?? products[0] ?? { id: '', name: t.live.noProducts, condition: '', startPrice: 0, imageUrl: undefined, status: 'PENDING' }
  const currentLot = products.findIndex(p => p.id === currentProduct.id) + 1
  const timerColor = auction.timer > 30 ? C.accent : auction.timer > 10 ? '#F59E0B' : '#EF4444'
  const maxSlideX = (slideTrackRef.current?.offsetWidth ?? 300) - 46 - 8
  const isLeading = auction.leaderName === user?.username
  const auctionEnded = !auction.active && endedProductId === currentProduct.id

  if (removedBlocked) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', textAlign: 'center', padding: 24 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Sinut on poistettu tästä lähetyksestä</div>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>Voit yhä käyttää muuten sivustoa ja katsoa muita lähetyksiä normaalisti.</div>
          <Link href="/" style={{ color: C.accentBright, fontSize: 13 }}>Etusivulle</Link>
        </div>
      </div>
    )
  }

  const videoContent = show?.status === 'LIVE' && show?.hlsUrl
    ? <VideoPlayer hlsUrl={show.hlsUrl} />
    : <WaitingForStream dark t={t} />

  if (isMobile) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#000', maxWidth: 480, margin: '0 auto', overflow: 'hidden', position: 'relative' }}>
        {toast && <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#222', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 12, zIndex: 100 }}>{toast}</div>}

        {/* TILAPÄINEN DIAGNOSTIIKKA - poistettava kun mobiilichat-syy on selvitetty, ks. CLAUDE.md */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999, background: '#F59E0B', color: '#000', fontSize: 9, fontFamily: 'monospace', padding: '3px 6px', textAlign: 'center', lineHeight: 1.4 }}>
          DEBUG socket:{connected ? 'OK' : 'EI'} shopOpen:{String(shopOpen)} chat.length:{chat.length} saapunut:{debugEventCount}
          {debugLastEvent ? ` viim:${debugLastEvent}` : ''}
        </div>

        {/* Video-portaalin kohde: molemmat kotipesät ovat aina DOM:ssa (kummankin
            ympärillä oleva lohko ei enää unmounttaudu shopOpenin mukaan, ks. alla) - vain
            display vaihtuu. Refit asettuvat kerran eivätkä koskaan palaa nulliksi kesken
            Shopin avaus/sulku-vaihdon, joten videoContent (ja sen hls.js-instanssi)
            portaloidaan turvallisesti aina samaan, koskaan katkeamattomaan React-instanssiin. */}
        {mainVideoSlot && pipVideoSlot && createPortal(videoContent, shopOpen ? pipVideoSlot : mainVideoSlot)}

        {/* PiP: video pienenee kelluvaksi ikkunaksi kun Shop avataan — ei katoa. Lohko on
            AINA mountattuna (vain display vaihtuu) jottei VideoPlayer/hls.js jouduta
            unmounttaamaan+remounttaamaan Shopin avaus/sulku-vaihdon yhteydessä - se
            aiheutti mustan/tyhjän PiP-videon koska striimi piti puskuroida kokonaan
            uudelleen tyhjästä joka kerta. */}
        <div style={{ display: shopOpen ? 'contents' : 'none' }}>
          <div onClick={() => setShopOpen(false)} style={{ position: 'fixed', bottom: 16, right: 16, width: 100, height: 178, borderRadius: 12, overflow: 'hidden', zIndex: 60, boxShadow: '0 6px 24px rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.25)', cursor: 'pointer' }}>
            <div ref={setPipVideoSlot} style={{ position: 'absolute', inset: 0 }} />
            <div style={{ position: 'absolute', top: 4, left: 4, background: '#EF4444', color: '#fff', fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3 }}>LIVE</div>
          </div>
          <div style={{ position: 'fixed', inset: 0, background: '#0A0A0A', zIndex: 55, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 50, display: 'flex', alignItems: 'center', padding: '0 14px', borderBottom: '1px solid #1A1A1A', flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', flex: 1 }}>Shop</span>
              <button onClick={() => setShopOpen(false)} style={{ background: '#1A1A1A', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#fff', fontSize: 14, cursor: 'pointer' }}>✕</button>
            </div>
            <ShopPanel C={C} products={products} activeProductId={auction.productId} search={shopSearch} setSearch={setShopSearch} filter={shopFilter} setFilter={setShopFilter} sort={shopSort} setSort={setShopSort} onBuyNow={buyNow} onPreBid={preBidStub} />
          </div>
        </div>

        <div style={{ display: !shopOpen ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(160deg, #1a1a1a 0%, #0a0a0a 100%)', minHeight: 0 }}>
              <div ref={setMainVideoSlot} style={{ position: 'absolute', inset: 0 }} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 24, padding: '5px 12px 5px 6px', backdropFilter: 'blur(8px)', flex: 1, minWidth: 0 }}>
                  {show?.seller?.username ? (
                    <Link href={`/u/${show.seller.username}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', minWidth: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{show.seller.username[0].toUpperCase()}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{show.seller.username}</span>
                    </Link>
                  ) : (
                    <>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>?</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>...</span>
                    </>
                  )}
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                </div>
                <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: '5px 10px', fontSize: 12, color: '#fff', backdropFilter: 'blur(8px)' }}>{viewers}</div>
                <button onClick={openReport} style={{ background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, backdropFilter: 'blur(8px)', cursor: 'pointer' }} title={t.report.button}>⚑</button>
                <Link href="/" style={{ background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, backdropFilter: 'blur(8px)' }}>✕</Link>
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 12px 10px', zIndex: 10 }}>
                <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 8 }}>
                  {chat.filter(m => !m.hidden || canModerate).slice(-5).map(msg => (
                    <div key={msg.id} style={{ display: 'flex', gap: 7, marginBottom: 4 }}>
                      <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: '4px 9px', backdropFilter: 'blur(8px)', maxWidth: '80%' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: msg.isBid ? C.accentBright : C.accent }}>{msg.username} </span>
                        <span style={{ fontSize: 11, color: '#fff' }}>{msg.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShopOpen(true)} style={{ background: C.accent, border: 'none', borderRadius: 20, padding: '0 16px', height: 38, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>Shop</button>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder={user ? 'Kirjoita viesti...' : 'Kirjaudu kirjoittaaksesi...'}
                    disabled={!user}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '8px 12px', color: '#fff', fontSize: 13, minWidth: 0, opacity: user ? 1 : 0.6 }}
                  />
                  <button onClick={sendChat} disabled={!user} style={{ background: user ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: user ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </div>
            </div>
            <BidPanel
              C={C} t={t} bidError={bidError} currentProduct={currentProduct} currentLot={currentLot}
              auction={auction} isLeading={isLeading} ended={auctionEnded} timerColor={timerColor} bidAmount={bidAmount}
              setBidAmount={setBidAmount} slideTrackRef={slideTrackRef} bidSuccess={bidSuccess} sliding={sliding}
              connected={connected} maxSlideX={maxSlideX} slideX={slideX}
              onSlideStart={onSlideStart} onSlideMove={onSlideMove} onSlideEnd={onSlideEnd}
            />
        </div>
        {showReport && <ReportModal targetType="show" targetId={showId} onClose={() => setShowReport(false)} />}
        {confirmDialog && <ConfirmDialog message={confirmDialog.message} danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />}
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#080808' }}>
      {toast && <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#222', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 12, zIndex: 100 }}>{toast}</div>}
      <div style={{ background: '#0A0A0A', borderBottom: '1px solid #1A1A1A', height: 50, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0 }}>
        <Link href="/" style={{ fontWeight: 900, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>SKRM</Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1A1A1A', borderRadius: 20, padding: '5px 12px 5px 8px' }}>
          {show?.seller?.username ? (
            <Link href={`/u/${show.seller.username}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{show.seller.username[0].toUpperCase()}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{show.seller.username}</span>
            </Link>
          ) : (
            <>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>?</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>...</span>
            </>
          )}
          <span style={{ fontSize: 12, color: '#555' }}>· {viewers} {t.live.viewers}</span>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite', marginLeft: 4 }} />
        </div>
        <button onClick={openReport} style={{ background: 'none', border: 'none', color: '#666', fontSize: 13, cursor: 'pointer' }}>⚑ {t.report.button}</button>
        <Link href="/" style={{ color: '#666', fontSize: 13 }}>{t.live.leaveShow}</Link>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr 300px', minHeight: 0 }}>
        {/* Shop-paneeli (desktop: kiinteä sivupaneeli, ei koskaan piilossa) */}
        <div style={{ background: '#0A0A0A', borderRight: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 0', fontSize: 13, fontWeight: 700, color: '#fff' }}>Shop</div>
          <ShopPanel C={C} products={products} activeProductId={auction.productId} search={shopSearch} setSearch={setShopSearch} filter={shopFilter} setFilter={setShopFilter} sort={shopSort} setSort={setShopSort} onBuyNow={buyNow} onPreBid={preBidStub} />
        </div>

        {/* Video + bid */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#080808' }}>
          <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(160deg, #1a1a1a 0%, #0a0a0a 100%)', minHeight: 0 }}>
            {videoContent}
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
              {auction.leaderName && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                  {auctionEnded
                    ? (isLeading ? t.live.youWon : `${auction.leaderName} voitti`)
                    : (isLeading ? t.live.leading : `${auction.leaderName} johtaa`)}
                </div>
              )}
            </div>
          </div>
          <BidPanel
            C={C} t={t} bidError={bidError} currentProduct={currentProduct} currentLot={currentLot}
            auction={auction} isLeading={isLeading} ended={auctionEnded} timerColor={timerColor} bidAmount={bidAmount}
            setBidAmount={setBidAmount} slideTrackRef={slideTrackRef} bidSuccess={bidSuccess} sliding={sliding}
            connected={connected} maxSlideX={maxSlideX} slideX={slideX}
            onSlideStart={onSlideStart} onSlideMove={onSlideMove} onSlideEnd={onSlideEnd}
          />
        </div>

        {/* Chat */}
        <div style={{ borderLeft: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatArea
            dark={true} isMobile={isMobile} t={t} C={C} chatRef={chatRef} chat={chat} chatInput={chatInput} setChatInput={setChatInput} sendChat={sendChat} user={user}
            canModerate={canModerate} chatTab={chatTab} setChatTab={setChatTab} viewerList={viewerList}
            modMenuUser={modMenuUser} setModMenuUser={setModMenuUser}
            onAssignMod={assignModerator} onRemoveMod={removeModerator} onRemoveFromShow={removeFromShow}
          />
        </div>
      </div>
      {showReport && <ReportModal targetType="show" targetId={showId} onClose={() => setShowReport(false)} />}
      {confirmDialog && <ConfirmDialog message={confirmDialog.message} danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />}
    </div>
  )
}
