'use client'
import { useState, useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { useAuth } from '@/lib/auth-context'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { resizeImage } from '@/lib/imageUtils'
import { KATEGORIAT, getKatNimi, getAlaNimi } from '@/lib/kategoriat'
import { useIsMobile } from '@/lib/useIsMobile'

interface Product { id: string; name: string; startPrice: number; description?: string; imageUrl?: string; status: string; order: number; auctionDuration?: number }
interface VideoDevice { deviceId: string; label: string }
interface ShowInfo { id: string; title: string }
type ShowStatus = 'SCHEDULED' | 'LIVE' | null
interface AuctionState { productId: string | null; currentBid: number; leaderName: string | null; timer: number; active: boolean }
type FeedItem =
  | { kind: 'chat'; id: string; userId: string; username: string; message: string }
  | { kind: 'bid'; id: string; username: string; amount: number }
  | { kind: 'purchase'; id: string; username: string; productName: string; amount: number }
  | { kind: 'system'; id: string; text: string }

// Myyjän oma HLS-esikatselu — sama Hls.js-tekniikka kuin ostajan /live/[showId]-sivulla, mutta
// tiukemmalla liveSyncDurationCount-arvolla pienemmän puskuriviiveen tavoittelemiseksi.
function HlsPreview({ hlsUrl }: { hlsUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [waiting, setWaiting] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hlsUrl) return
    setWaiting(true)

    if (Hls.isSupported()) {
      const hls = new Hls({ liveSyncDurationCount: 2, maxLiveSyncPlaybackRate: 1.3 })
      hls.loadSource(hlsUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => setWaiting(false))
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) setWaiting(true) })
      return () => hls.destroy()
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl
      video.addEventListener('loadedmetadata', () => setWaiting(false))
    }
  }, [hlsUrl])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {waiting && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', padding: 16 }}>
          Odotetaan OBS-yhteyttä...
        </div>
      )}
    </div>
  )
}

export default function LahetysPage() {
  const { C } = useTheme()
  const { lang, t } = useLang()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [products, setProducts] = useState<Product[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [alakategoria, setAlakategoria] = useState('')
  const [city, setCity] = useState('')
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [show, setShow] = useState<ShowInfo | null>(null)
  const [showStatus, setShowStatus] = useState<ShowStatus>(null)
  const [goingPublic, setGoingPublic] = useState(false)
  const [streamKey, setStreamKey] = useState('')
  const [streamUrl, setStreamUrl] = useState('')
  const [hlsUrl, setHlsUrl] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [connected, setConnected] = useState(false)
  const [showObsInfo, setShowObsInfo] = useState(false)
  const [showModTools, setShowModTools] = useState(false)
  const [mutedWordsInput, setMutedWordsInput] = useState('')
  const [mutedWordsSaved, setMutedWordsSaved] = useState(false)

  const [currentProductId, setCurrentProductId] = useState<string | null>(null)
  const [auction, setAuction] = useState<AuctionState>({ productId: null, currentBid: 0, leaderName: null, timer: 0, active: false })
  const [auctionDuration, setAuctionDuration] = useState(120)
  const [soldItems, setSoldItems] = useState<string[]>([])
  const [soldAmounts, setSoldAmounts] = useState<Record<string, number>>({})
  const [showSettings, setShowSettings] = useState(false)
  const [camError, setCamError] = useState('')
  const [camReady, setCamReady] = useState(false)
  const [devices, setDevices] = useState<VideoDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [copied, setCopied] = useState('')

  // Yläpalkin tilastot
  const [viewers, setViewers] = useState(0)
  const [liveSince, setLiveSince] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  // Jonon raahaus
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [qaName, setQaName] = useState('')
  const [qaPrice, setQaPrice] = useState('')
  const [qaImage, setQaImage] = useState<string | null>(null)
  const [qaSaving, setQaSaving] = useState(false)
  const [qaError, setQaError] = useState('')
  const qaImageRef = useRef<HTMLInputElement>(null)

  // Chat + pikatoimintojen "tulossa pian" -ilmoitus
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [chatInput, setChatInput] = useState('')
  const [stubMsg, setStubMsg] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const thumbnailRef = useRef<HTMLInputElement>(null)

  async function handleThumbnail(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    await new Promise<void>(res => {
      r.onload = async () => {
        const resized = await resizeImage(r.result as string, 1200)
        setThumbnail(resized)
        res()
      }
      r.readAsDataURL(f)
    })
  }

  async function handleQaImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    await new Promise<void>(res => {
      r.onload = async () => {
        const resized = await resizeImage(r.result as string)
        setQaImage(resized)
        res()
      }
      r.readAsDataURL(f)
    })
  }

  useEffect(() => {
    import('@/lib/api').then(({ api, userApi }) => {
      api.getMyProducts().then((p: Product[]) => {
        setProducts(p.filter(x => x.status === 'PENDING'))
      }).catch(() => {})
      // OBS-asetukset (RTMP-palvelin + pysyvä stream key) haetaan heti sivulle tultaessa —
      // ei vasta kun lähetys on jo luotu tai livenä. Ks. CLAUDE.md "esikatselu ennen julkista näkyvyyttä".
      userApi.getStreamInfo().then((info: { rtmpUrl: string; streamKey: string; hlsUrl: string }) => {
        setStreamUrl(info.rtmpUrl); setStreamKey(info.streamKey); setHlsUrl(info.hlsUrl)
      }).catch(() => {})
    })
    loadDevices()
    return () => { stopCamera() }
  }, [])

  useEffect(() => {
    if (user?.city) setCity(c => c || user.city!)
  }, [user])

  useEffect(() => {
    if (!currentProductId && products.length > 0) setCurrentProductId(products[0].id)
  }, [products, currentProductId])

  useEffect(() => {
    if (streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(() => {})
      }
    }
  })

  useEffect(() => {
    if (!isLive) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isLive])

  // Kesto-kello yläpalkkiin
  useEffect(() => {
    if (!liveSince) return
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [liveSince])

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [feed])

  function addFeed(item: FeedItem) {
    setFeed(f => [...f.slice(-199), item])
  }

  // Socket-kytkentä lähetyksen ajaksi — sama auction-tila kuin ostajan /live/[showId]-sivulla
  useEffect(() => {
    if (!show) return
    const socket = connectSocket()

    const token = localStorage.getItem('skrm_token') || undefined
    socket.on('connect', () => { setConnected(true); socket.emit('join_show', { showId: show.id, token }) })
    socket.on('disconnect', () => setConnected(false))

    socket.on('auction_started', (data: any) => {
      setAuction({ productId: data.productId, currentBid: data.startPrice, leaderName: null, timer: data.duration, active: true })
      const p = products.find(x => x.id === data.productId)
      addFeed({ kind: 'system', id: `start-${Date.now()}`, text: `Huutokauppa alkoi: ${p?.name ?? ''} — lähtöhinta ${data.startPrice}€` })
    })

    socket.on('new_bid', (data: any) => {
      setAuction(a => ({ ...a, currentBid: data.amount, leaderName: data.username, timer: data.timer }))
      addFeed({ kind: 'bid', id: `bid-${data.userId}-${data.amount}-${Date.now()}`, username: data.username, amount: data.amount })
    })

    socket.on('timer_tick', (data: any) => {
      setAuction(a => ({ ...a, timer: data.timer }))
    })

    socket.on('auction_ended', (data: any) => {
      setAuction(a => ({ ...a, active: false, timer: 0 }))
      if (data.winnerId && data.productId) {
        setSoldItems(s => [...s, data.productId])
        setSoldAmounts(s => ({ ...s, [data.productId]: data.finalPrice ?? 0 }))
        addFeed({ kind: 'purchase', id: `sold-${data.productId}-${Date.now()}`, username: data.winnerName ?? '?', productName: products.find(p => p.id === data.productId)?.name ?? '', amount: data.finalPrice ?? 0 })
      }
    })

    socket.on('viewer_count', (data: { count: number }) => setViewers(data.count))

    socket.on('chat_message', (data: any) => {
      addFeed({ kind: 'chat', id: data.id ?? `chat-${Date.now()}`, userId: data.userId, username: data.username, message: data.message })
    })

    socket.on('chat_message_deleted', (data: { messageId: string }) => {
      setFeed(f => f.filter(item => item.id !== data.messageId))
    })

    socket.on('muted_words_saved', () => {
      setMutedWordsSaved(true)
      setTimeout(() => setMutedWordsSaved(false), 2000)
    })

    if (socket.connected) { setConnected(true); socket.emit('join_show', { showId: show.id, token }) }

    return () => {
      socket.emit('leave_show', show.id)
      socket.off('connect'); socket.off('disconnect')
      socket.off('auction_started'); socket.off('new_bid'); socket.off('timer_tick'); socket.off('auction_ended')
      socket.off('viewer_count'); socket.off('chat_message'); socket.off('chat_message_deleted'); socket.off('muted_words_saved')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  async function loadDevices() {
    try {
      const t = await navigator.mediaDevices.getUserMedia({ video: true })
      t.getTracks().forEach(x => x.stop())
      const all = await navigator.mediaDevices.enumerateDevices()
      const cams = all.filter(d => d.kind === 'videoinput').map(d => ({ deviceId: d.deviceId, label: d.label || `Kamera ${d.deviceId.slice(0, 6)}` }))
      setDevices(cams)
      if (cams.length > 0) setSelectedDevice(cams[0].deviceId)
    } catch {}
  }

  async function startCamera(deviceId?: string) {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: true })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCamError(''); setCamReady(true); return true
    } catch { setCamError('Kameraan ei saada yhteyttä. Tarkista selaimen luvat.'); setCamReady(false); return false }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamReady(false)
  }

  // Luo lähetyksen (status SCHEDULED) ja avaa yksityisen esikatselukonsolin — EI vielä julkinen.
  // Myyjä testaa OBS-yhteyden täällä rauhassa, katsojat eivät näe mitään ennen "Aloita julkinen lähetys".
  async function createShow() {
    if (!title.trim()) { setStartError('Anna lähetykselle nimi'); return }
    setStarting(true); setStartError('')
    try {
      const { showApi } = await import('@/lib/api')
      const created = await showApi.create({ title: title.trim(), category: category || undefined, alakategoria: alakategoria || undefined, city: city.trim() || undefined, thumbnailUrl: thumbnail ?? undefined })
      setShow({ id: created.id, title: created.title })
      setShowStatus('SCHEDULED')
      setIsLive(true)
      setViewers(0)
      setFeed([])
      setSoldAmounts({})
    } catch (e: any) {
      setStartError(e.message ?? 'Lähetyksen luonti epäonnistui')
    }
    setStarting(false)
  }

  // Ainoa toiminto joka tekee lähetyksestä julkisesti näkyvän — erillinen, tietoinen painallus
  async function goPublic() {
    if (!show) return
    setGoingPublic(true)
    try {
      const { showApi } = await import('@/lib/api')
      await showApi.setStatus(show.id, 'LIVE')
      setShowStatus('LIVE')
      setLiveSince(Date.now())
    } catch (e: any) {
      setStartError(e.message ?? 'Julkaisu epäonnistui')
    }
    setGoingPublic(false)
  }

  async function endShow() {
    if (!confirm('Haluatko varmasti lopettaa lähetyksen?')) return
    const token = localStorage.getItem('skrm_token')
    if (show && auction.active) {
      connectSocket().emit('stop_auction', { showId: show.id, token })
    }
    if (show) {
      try {
        const { showApi } = await import('@/lib/api')
        await showApi.setStatus(show.id, 'ENDED')
      } catch {}
    }
    disconnectSocket()
    stopCamera()
    setIsLive(false); setShow(null); setShowStatus(null); setThumbnail(null); setTitle(''); setCategory(''); setAlakategoria(''); setCity(user?.city ?? '')
    setCurrentProductId(null); setSoldItems([]); setSoldAmounts({}); setFeed([]); setLiveSince(null); setViewers(0); setShowObsInfo(false)
    setAuction({ productId: null, currentBid: 0, leaderName: null, timer: 0, active: false })
  }

  const currentIndex = products.findIndex(p => p.id === currentProductId)
  const currentProduct = currentIndex >= 0 ? products[currentIndex] : products[0]

  function startAuction() {
    if (!currentProduct || !show) return
    const token = localStorage.getItem('skrm_token')
    const dur = currentProduct.auctionDuration ?? auctionDuration
    connectSocket().emit('start_auction', { showId: show.id, productId: currentProduct.id, startPrice: currentProduct.startPrice, duration: dur, token })
  }

  function endAuction() {
    if (!show) return
    const token = localStorage.getItem('skrm_token')
    connectSocket().emit('stop_auction', { showId: show.id, token })
  }

  function extendTimer() {
    if (!show || !auction.active) return
    const token = localStorage.getItem('skrm_token')
    connectSocket().emit('extend_timer', { showId: show.id, seconds: 10, token })
  }

  function nextProduct() {
    const next = products[currentIndex + 1]
    if (next) setCurrentProductId(next.id)
    setAuction(a => ({ ...a, active: false }))
  }

  function stub(label: string) {
    setStubMsg(`${label} — tulossa pian`)
    setTimeout(() => setStubMsg(''), 2000)
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  async function regenerateKey() {
    if (!confirm('Vanha stream key lakkaa toimimasta heti — OBS:n Stream-asetuksiin pitää syöttää uusi avain. Jatketaanko?')) return
    try {
      const { userApi } = await import('@/lib/api')
      const info = await userApi.regenerateStreamKey()
      setStreamKey(info.streamKey); setHlsUrl(info.hlsUrl)
    } catch {}
  }

  function saveMutedWords() {
    if (!show) return
    const token = localStorage.getItem('skrm_token')
    const words = mutedWordsInput.split('\n').map(w => w.trim()).filter(Boolean)
    connectSocket().emit('set_muted_words', { showId: show.id, words, token })
  }

  function sendChat() {
    if (!chatInput.trim() || !show) return
    const token = localStorage.getItem('skrm_token')
    connectSocket().emit('chat_message', { showId: show.id, message: chatInput.trim(), token })
    setChatInput('')
  }

  function deleteMessage(id: string) {
    if (!show) return
    const token = localStorage.getItem('skrm_token')
    connectSocket().emit('delete_chat_message', { showId: show.id, messageId: id, token })
  }

  function muteUser(userId: string) {
    if (!show) return
    if (!confirm('Mykistetäänkö tämä käyttäjä tässä lähetyksessä?')) return
    const token = localStorage.getItem('skrm_token')
    connectSocket().emit('mute_user', { showId: show.id, userId, token })
  }

  async function quickAddProduct() {
    if (!qaName.trim() || !qaPrice) return
    const price = Number(qaPrice.replace(',', '.'))
    if (!price || price <= 0) { setQaError('Anna kelvollinen hinta'); return }
    setQaSaving(true); setQaError('')
    try {
      const { api } = await import('@/lib/api')
      const created = await api.createProduct({ name: qaName.trim(), saleType: 'live', startPrice: price, imageUrl: qaImage ?? undefined })
      setProducts(p => [...p, created])
      setQaName(''); setQaPrice(''); setQaImage(null); setShowQuickAdd(false)
    } catch (e: any) {
      setQaError(e.message ?? 'Lisäys epäonnistui')
    }
    setQaSaving(false)
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return }
    setProducts(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(dragIndex, 1)
      arr.splice(targetIndex, 0, moved)
      return arr
    })
    setDragIndex(null)
  }

  function fmtDuration(sec: number) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`
  const timerColor = auction.timer > 60 ? C.accent : auction.timer > 20 ? '#F59E0B' : '#EF4444'
  const isLast = currentIndex >= products.length - 1
  const isSold = currentProduct && soldItems.includes(currentProduct.id)
  // Huutokauppa käyty läpi nykyiselle tuotteelle — joko myyty tai päättyi ilman tarjouksia.
  // "Seuraava tuote" pitää päästä painamaan kummassakin tapauksessa, ei vain kun myytiin.
  const auctionDoneForCurrent = !!currentProduct && !auction.active && auction.productId === currentProduct.id
  const elapsedSeconds = liveSince ? Math.floor((now - liveSince) / 1000) : 0
  const todaySales = Object.values(soldAmounts).reduce((sum, v) => sum + v, 0)

  const quickBtn: React.CSSProperties = { flex: '1 1 auto', minWidth: 74, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '10px 6px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }
  const quickBtnDisabled: React.CSSProperties = { ...quickBtn, opacity: 0.4, cursor: 'not-allowed', color: C.muted }

  const quickActionsRow = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button onClick={extendTimer} disabled={!auction.active} style={auction.active ? quickBtn : quickBtnDisabled}>+10s</button>
      <button onClick={() => stub('Kiinnitä')} style={quickBtn}>Kiinnitä</button>
      <button onClick={endAuction} disabled={!auction.active} style={auction.active ? quickBtn : quickBtnDisabled}>Myyty</button>
      <button onClick={nextProduct} disabled={!auctionDoneForCurrent || isLast} style={(auctionDoneForCurrent && !isLast) ? quickBtn : quickBtnDisabled}>Seuraava</button>
      <button onClick={() => stub('Giveaway')} style={quickBtn}>Giveaway</button>
      <button onClick={endShow} style={{ ...quickBtn, borderColor: '#EF4444', color: '#EF4444' }}>Lopeta</button>
    </div>
  )

  const obsCardContent = (
    <>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>OBS-asetukset</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, color: C.textSub, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{streamUrl || 'Ladataan...'}</div>
          <button onClick={() => copy(streamUrl, 'server')} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, padding: '7px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied === 'server' ? '✓' : 'Kopioi'}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, color: C.textSub, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{streamKey || 'Ladataan...'}</div>
          <button onClick={() => copy(streamKey, 'key')} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, padding: '7px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied === 'key' ? '✓' : 'Kopioi'}</button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Aseta nämä OBS:n Asetukset → Stream -kohtaan (Service: Custom). Tämä avain on pysyvä ja sama kaikissa tulevissa lähetyksissäsi — OBS:ää ei tarvitse säätää uudestaan ensi kerralla. Katso tarkat ohjeet <a href="/faq#myyja" style={{ color: C.accent }}>FAQ:sta</a>.</div>
      <button onClick={regenerateKey} style={{ marginTop: 10, background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Generoi uusi avain</button>
    </>
  )
  const obsCard = (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 12, flexShrink: 0 }}>
      {obsCardContent}
    </div>
  )
  const obsPanel = showObsInfo && obsCard

  const modToolsPanel = showModTools && (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 12, flexShrink: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>Kielletyt sanat</div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Viestit joissa esiintyy jokin näistä sanoista piilotetaan katsojilta — sinä ja moderaattorit näette ne yhä. Yksi sana per rivi.</div>
      <textarea value={mutedWordsInput} onChange={e => setMutedWordsInput(e.target.value)} rows={3} placeholder={'esim.\nhuijaus\nkielletty sana'} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 12, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' }} />
      <button onClick={saveMutedWords} style={{ marginTop: 8, background: C.accent, border: 'none', color: '#fff', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{mutedWordsSaved ? 'Tallennettu' : 'Tallenna'}</button>
    </div>
  )

  const queuePanel = (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, flexShrink: 0 }}>Jono ({products.length})</div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {products.map((p, i) => {
          const sold = soldItems.includes(p.id); const active = p.id === currentProductId
          return (
            <div
              key={p.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onClick={() => !isSold && setCurrentProductId(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, background: active ? C.accentLight : 'transparent', opacity: sold ? 0.4 : 1, cursor: 'grab', border: `1px solid ${active ? C.accent : 'transparent'}`, flexShrink: 0 }}
            >
              <span style={{ fontSize: 10, color: C.dim, flexShrink: 0 }}>⠿</span>
              {p.imageUrl ? <img src={p.imageUrl.split('|||')[0]} alt={p.name} style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} /> : <div style={{ width: 26, height: 26, borderRadius: 4, background: C.surface2, flexShrink: 0 }} />}
              <span style={{ fontSize: 12, color: active ? C.accent : C.text, fontWeight: active ? 700 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              {sold && <span style={{ fontSize: 10, color: C.accent, fontWeight: 700, flexShrink: 0 }}>✓</span>}
            </div>
          )
        })}
      </div>

      <div style={{ flexShrink: 0 }}>
        {showQuickAdd ? (
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            <input value={qaName} onChange={e => setQaName(e.target.value)} placeholder="Tuotteen nimi" style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 9px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
            <input type="text" inputMode="decimal" value={qaPrice} onChange={e => setQaPrice(e.target.value)} placeholder="Lähtöhinta €" style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 9px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
            <div onClick={() => qaImageRef.current?.click()} style={{ width: '100%', aspectRatio: '1', maxHeight: 60, borderRadius: 6, border: `1px dashed ${C.border}`, background: C.surface2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden' }}>
              {qaImage ? <img src={qaImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, color: C.muted }}>+ Kuva</span>}
            </div>
            <input ref={qaImageRef} type="file" accept="image/*" onChange={handleQaImage} style={{ display: 'none' }} />
            {qaError && <div style={{ fontSize: 11, color: '#EF4444', marginBottom: 6 }}>{qaError}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setShowQuickAdd(false); setQaError('') }} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, padding: '7px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Peruuta</button>
              <button onClick={quickAddProduct} disabled={qaSaving || !qaName.trim() || !qaPrice} style={{ flex: 1, background: C.accent, border: 'none', color: '#fff', padding: '7px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: qaSaving || !qaName.trim() || !qaPrice ? 0.6 : 1 }}>Lisää</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowQuickAdd(true)} style={{ width: '100%', marginTop: 10, background: C.surface2, border: `1px dashed ${C.border}`, color: C.muted, padding: '8px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Lisää tuote</button>
        )}
      </div>
    </>
  )

  const topStats = [
    { label: 'Kesto', value: fmtDuration(elapsedSeconds) },
    { label: 'Katsojia', value: String(viewers) },
    { label: 'Myynti tänään', value: `${todaySales.toLocaleString('fi-FI')}€` },
    { label: 'Myyty', value: `${soldItems.length} kpl` },
  ]

  return (
    <div style={{ color: C.text }}>
      {!isLive && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Lähetys</h1>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{products.length} tuotetta jonossa</p>
          </div>
          <button onClick={() => setShowSettings(s => !s)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, padding: '8px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Asetukset</button>
        </div>
      )}

      {!isLive && (
        <div style={{ maxWidth: 560, margin: '0 auto 20px' }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
            {obsCardContent}
          </div>
        </div>
      )}

      {showSettings && !isLive && (
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Oletuskesto per tuote</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {[60, 120, 180, 300, 600].map(s => (
              <button key={s} onClick={() => setAuctionDuration(s)} style={{ background: auctionDuration === s ? C.accent : C.surface2, border: `1px solid ${auctionDuration === s ? C.accent : C.border}`, color: auctionDuration === s ? '#fff' : C.muted, padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: auctionDuration === s ? 700 : 400 }}>
                {s >= 60 ? `${s / 60} min` : `${s}s`}
              </button>
            ))}
          </div>
          <input type="number" value={auctionDuration} onChange={e => setAuctionDuration(Number(e.target.value))} placeholder="tai syötä oma (sekunteina)" style={{ width: 200, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none' }} />
        </div>
      )}

      {products.length === 0 && !isLive && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>Ei tuotteita — lisää tuotteita ensin</div>
          <a href="/dashboard/tuotteet" style={{ background: C.accent, color: '#fff', textDecoration: 'none', padding: '10px 24px', borderRadius: 7, fontWeight: 700, fontSize: 14 }}>→ Lisää tuotteita</a>
        </div>
      )}

      {products.length > 0 && !isLive && (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', background: '#080C16', aspectRatio: '16/9', position: 'relative', marginBottom: 16 }}>
            <video ref={videoRef} muted playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {!camReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>●</div>
                <div style={{ fontSize: 14 }}>Kamera ei ole päällä</div>
              </div>
            )}
            {camReady && <div style={{ position: 'absolute', top: 10, left: 10, background: C.accent, color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4 }}>ESIKATSELU</div>}
          </div>

          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Lähetyksen nimi *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="esim. Pokémon-kortteja livenä" style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Kategoria</label>
            <select value={category} onChange={e => { setCategory(e.target.value); setAlakategoria('') }} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', marginBottom: 12 }}>
              <option value="">Valitse...</option>
              {KATEGORIAT.map(k => <option key={k.id} value={k.id}>{getKatNimi(k, lang as any)}</option>)}
            </select>

            {(KATEGORIAT.find(k => k.id === category)?.alakategoriat ?? []).length > 0 && (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Alakategoria</label>
                <select value={alakategoria} onChange={e => setAlakategoria(e.target.value)} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', marginBottom: 12 }}>
                  <option value="">Valitse...</option>
                  {KATEGORIAT.find(k => k.id === category)?.alakategoriat.map(a => <option key={a.id} value={a.id}>{getAlaNimi(a, lang as any)}</option>)}
                </select>
              </>
            )}

            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>{t.selaa.city}</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="esim. Helsinki" style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Markkinointikuva (valinnainen)</label>
            <div
              onClick={() => thumbnailRef.current?.click()}
              style={{
                width: '100%', aspectRatio: '16/9', borderRadius: 10,
                border: `2px dashed ${thumbnail ? C.accent : C.border}`, background: C.surface2,
                cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center',
                justifyContent: 'center', position: 'relative', marginBottom: 12,
              }}
            >
              {thumbnail ? (
                <>
                  <img src={thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={e => { e.stopPropagation(); setThumbnail(null) }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}
                  >✕</button>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: C.muted }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>+</div>
                  <div style={{ fontSize: 13 }}>Lisää markkinointikuva</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Suositus: 1280×720px · Max 5MB</div>
                </div>
              )}
            </div>
            <input ref={thumbnailRef} type="file" accept="image/*" onChange={handleThumbnail} style={{ display: 'none' }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Kameralähde (esikatselu)</label>
            {devices.length === 0
              ? <div style={{ fontSize: 13, color: C.muted }}>Paina "Testaa kamera" salliaksesi käytön</div>
              : <select value={selectedDevice} onChange={e => { setSelectedDevice(e.target.value); if (camReady) startCamera(e.target.value) }} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', marginBottom: 8 }}>
                  {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                </select>
            }
            <div style={{ fontSize: 11, color: C.muted }}>Tämä on vain esikatselu sinulle — itse lähetys striimataan OBS:lla (ohjeet näkyvät kun aloitat lähetyksen)</div>
            {camError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '8px 12px', marginTop: 10, color: '#EF4444', fontSize: 13 }}>{camError}</div>}
          </div>

          {startError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '10px 14px', marginBottom: 16, color: '#EF4444', fontSize: 13 }}>{startError}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {!camReady
              ? <button onClick={() => startCamera(selectedDevice || undefined)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Testaa kamera</button>
              : <button onClick={stopCamera} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Sammuta esikatselu</button>
            }
            <button onClick={createShow} disabled={starting} style={{ background: C.accent, color: '#fff', border: 'none', padding: '10px 30px', borderRadius: 8, fontWeight: 800, fontSize: 15, cursor: starting ? 'default' : 'pointer', opacity: starting ? 0.7 : 1 }}>
              {starting ? 'Luodaan...' : 'Luo lähetys ja testaa yhteys'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8 }}>Tämä ei vielä näy katsojille — vasta erillinen "Aloita julkinen lähetys" -painallus tekee lähetyksestä julkisen.</div>
        </div>
      )}

      {/* ===== STREAM-KONSOLI ===== */}
      {isLive && show && currentProduct && !isMobile && (
        <div style={{ height: 'calc(100vh - 114px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Yläpalkki */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: C.cardBg, border: `1px solid ${showStatus === 'LIVE' ? '#EF4444' : C.accent}`, borderRadius: 12, padding: '12px 18px', marginBottom: 12, flexWrap: 'wrap', flexShrink: 0 }}>
            {showStatus === 'LIVE' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#EF4444' }}>LIVE{!connected ? ' — yhdistetään...' : ''}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>YKSITYINEN ESIKATSELU</span>
              </div>
            )}
            {topStats.map(s => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowModTools(s => !s)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Moderointi {showModTools ? '▴' : '▾'}</button>
            <button onClick={() => setShowObsInfo(s => !s)} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>OBS-asetukset {showObsInfo ? '▴' : '▾'}</button>
            {showStatus === 'SCHEDULED' && (
              <button onClick={goPublic} disabled={goingPublic} style={{ background: C.accent, border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 800, cursor: goingPublic ? 'default' : 'pointer', opacity: goingPublic ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                {goingPublic ? 'Julkaistaan...' : 'Aloita julkinen lähetys'}
              </button>
            )}
            <button onClick={endShow} style={{ background: 'none', border: '1px solid #EF4444', color: '#EF4444', padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Lopeta lähetys</button>
          </div>

          {obsPanel}
          {modToolsPanel}

          {/* Kolme paneelia — koko jäljellä oleva korkeus, sisäinen scroll kussakin */}
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '220px minmax(0,1fr) 300px', gap: 16 }}>

            {/* Vasen paneeli — jono */}
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 12px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {queuePanel}
            </div>

            {/* Keskipaneeli — nykyinen tuote */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', background: '#080C16', aspectRatio: '16/9', position: 'relative', flexShrink: 0 }}>
                {hlsUrl && <HlsPreview hlsUrl={hlsUrl} />}
                <div style={{ position: 'absolute', top: 10, left: 10, background: showStatus === 'LIVE' ? '#EF4444' : C.accent, color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4 }}>{showStatus === 'LIVE' ? 'LIVE' : 'ESIKATSELU'}</div>
                {auction.active && (
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.85)', border: `1px solid ${timerColor}`, borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: timerColor }}>{fmt(auction.timer)}</div>
                  </div>
                )}
              </div>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  {currentProduct.imageUrl && <img src={currentProduct.imageUrl.split('|||')[0]} alt={currentProduct.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 9, flexShrink: 0, border: `2px solid ${C.accent}` }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentProduct.name}</div>
                    {currentProduct.description && <div style={{ fontSize: 13, color: C.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentProduct.description}</div>}
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>{auction.active ? 'Nykyinen huuto' : 'Lähtöhinta'}</div>
                  <div style={{ fontSize: 44, fontWeight: 900, color: auction.active && auction.leaderName ? C.accent : C.text, lineHeight: 1 }}>{auction.active ? auction.currentBid : currentProduct.startPrice}€</div>
                  {auction.leaderName && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Johdossa: {auction.leaderName}</div>}
                </div>

                {!auction.active && !isSold && <button onClick={startAuction} style={{ width: '100%', background: C.accent, color: '#fff', border: 'none', padding: '13px', borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginBottom: 12 }}>Aloita huutokauppa</button>}
                {auctionDoneForCurrent && !isLast && <button onClick={nextProduct} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '13px', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>Seuraava tuote →</button>}
                {auctionDoneForCurrent && isLast && (
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <div style={{ color: C.accent, fontWeight: 700, marginBottom: 10 }}>Kaikki tuotteet käyty läpi!</div>
                  </div>
                )}
                {!auction.active && !isSold && auction.productId === currentProduct.id && (
                  <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 12 }}>Huutokauppa päättyi ilman tarjouksia</div>
                )}

                {quickActionsRow}
                {stubMsg && <div style={{ marginTop: 8, fontSize: 12, color: C.muted, textAlign: 'center' }}>{stubMsg}</div>}
              </div>
            </div>

            {/* Oikea paneeli — chat */}
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>Chat</div>
              <div ref={feedRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {feed.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Ei viestejä vielä</div>}
                {feed.map(item => {
                  if (item.kind === 'system') return <div key={item.id} style={{ fontSize: 11, color: C.muted, textAlign: 'center', padding: '4px 0' }}>{item.text}</div>
                  if (item.kind === 'bid') return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 9px', background: C.accentLight, borderRadius: 7, fontSize: 12 }}>
                      <span style={{ color: C.accent, fontWeight: 700 }}>{item.username}</span>
                      <span style={{ color: C.accent, fontWeight: 800 }}>{item.amount}€</span>
                    </div>
                  )
                  if (item.kind === 'purchase') return (
                    <div key={item.id} style={{ padding: '7px 9px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 7, fontSize: 12 }}>
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>{item.username}</span>
                      <span style={{ color: C.text }}> osti </span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{item.productName}</span>
                      <span style={{ color: '#22c55e', fontWeight: 800 }}> {item.amount}€</span>
                    </div>
                  )
                  return (
                    <div key={item.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, color: C.text }}>{item.username}: </span>
                        <span style={{ color: C.textSub, overflowWrap: 'break-word' }}>{item.message}</span>
                      </div>
                      <button onClick={() => deleteMessage(item.id)} title="Poista" style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 11, padding: 0, flexShrink: 0 }}>✕</button>
                      <button onClick={() => muteUser(item.userId)} title="Mykistä" style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: 0, flexShrink: 0 }}>MYKISTÄ</button>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '8px 10px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 6, flexShrink: 0 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Kirjoita viesti..." style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 18, padding: '7px 12px', color: C.text, fontSize: 12, outline: 'none', minWidth: 0 }} />
                <button onClick={sendChat} style={{ background: C.accent, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#fff', fontSize: 13 }}>➤</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STREAM-KONSOLI — MOBIILI: video + chat-overlay, Whatnot/TikTok-tyyliin ===== */}
      {isLive && show && currentProduct && isMobile && (
        <div style={{ height: 'calc(100dvh - 120px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '-16px' }}>
          {/* Video + kaikki overlayt sen päällä */}
          <div style={{ position: 'relative', flexShrink: 0, height: '48vh', minHeight: 220, background: '#080C16', overflow: 'hidden' }}>
            {hlsUrl && <HlsPreview hlsUrl={hlsUrl} />}

            {/* Yläreuna: live-tila + kesto/katsojat + toiminnot */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '10px 10px 0', display: 'flex', alignItems: 'center', gap: 6, zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: '5px 10px', backdropFilter: 'blur(8px)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: showStatus === 'LIVE' ? '#EF4444' : C.accent }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{showStatus === 'LIVE' ? fmtDuration(elapsedSeconds) : 'ESIKATSELU'}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>· {viewers} katsojaa</span>
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowModTools(s => !s)} style={{ background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 16, padding: '0 10px', height: 30, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>MOD</button>
              <button onClick={() => setShowObsInfo(s => !s)} style={{ background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 16, padding: '0 10px', height: 30, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>OBS</button>
              {showStatus === 'SCHEDULED' && (
                <button onClick={goPublic} disabled={goingPublic} style={{ background: C.accent, border: 'none', borderRadius: 16, padding: '0 10px', height: 30, color: '#fff', fontSize: 11, fontWeight: 800, cursor: goingPublic ? 'default' : 'pointer', opacity: goingPublic ? 0.7 : 1 }}>
                  {goingPublic ? '...' : 'Julkaise'}
                </button>
              )}
              <button onClick={endShow} style={{ background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#fff', fontSize: 13, cursor: 'pointer' }}>✕</button>
            </div>

            {auction.active && (
              <div style={{ position: 'absolute', top: 52, right: 10, background: 'rgba(0,0,0,0.75)', border: `1px solid ${timerColor}`, borderRadius: 8, padding: '5px 10px', textAlign: 'center', zIndex: 2 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: timerColor }}>{fmt(auction.timer)}</div>
              </div>
            )}

            {/* Alareuna: chat overlay */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 10px 8px', zIndex: 2 }}>
              <div style={{ maxHeight: 130, overflowY: 'auto', marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {feed.slice(-6).map(item => {
                  if (item.kind === 'system') return <div key={item.id} style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{item.text}</div>
                  if (item.kind === 'purchase') return (
                    <div key={item.id} style={{ background: 'rgba(34,197,94,0.35)', borderRadius: 10, padding: '4px 9px', backdropFilter: 'blur(8px)' }}>
                      <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{item.username} osti {item.productName} · {item.amount}€</span>
                    </div>
                  )
                  const username = item.kind === 'bid' ? item.username : item.username
                  const text = item.kind === 'bid' ? `Huusi ${item.amount}€` : item.message
                  return (
                    <div key={item.id} style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: '4px 9px', backdropFilter: 'blur(8px)', alignSelf: 'flex-start', maxWidth: '85%' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: item.kind === 'bid' ? C.accentBright : C.accent }}>{username} </span>
                      <span style={{ fontSize: 11, color: '#fff' }}>{text}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Kirjoita viesti..." style={{ flex: 1, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '7px 12px', color: '#fff', fontSize: 12, outline: 'none', minWidth: 0 }} />
                <button onClick={sendChat} style={{ background: C.accent, border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#fff', fontSize: 12 }}>➤</button>
              </div>
            </div>
          </div>

          {/* Video alla: nykyinen tuote + pikatoiminnot + jono, vieritettävä */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {obsPanel}
            {modToolsPanel}

            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              {topStats.slice(2).map(s => (
                <div key={s.label} style={{ flex: 1, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                {currentProduct.imageUrl && <img src={currentProduct.imageUrl.split('|||')[0]} alt={currentProduct.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: `2px solid ${C.accent}` }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentProduct.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{auction.active ? 'Nykyinen huuto' : 'Lähtöhinta'}</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: auction.active && auction.leaderName ? C.accent : C.text, flexShrink: 0 }}>{auction.active ? auction.currentBid : currentProduct.startPrice}€</div>
              </div>
              {auction.leaderName && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Johdossa: {auction.leaderName}</div>}

              {!auction.active && !isSold && <button onClick={startAuction} style={{ width: '100%', background: C.accent, color: '#fff', border: 'none', padding: '12px', borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>Aloita huutokauppa</button>}
              {auctionDoneForCurrent && !isLast && <button onClick={nextProduct} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '12px', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>Seuraava tuote →</button>}
              {auctionDoneForCurrent && isLast && <div style={{ textAlign: 'center', color: C.accent, fontWeight: 700, marginBottom: 10 }}>Kaikki tuotteet käyty läpi!</div>}

              {quickActionsRow}
              {stubMsg && <div style={{ marginTop: 8, fontSize: 12, color: C.muted, textAlign: 'center' }}>{stubMsg}</div>}
            </div>

            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', maxHeight: 320 }}>
              {queuePanel}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
