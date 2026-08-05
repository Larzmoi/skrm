'use client'
import { useState, useEffect, useRef } from 'react'
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
interface AuctionState { productId: string | null; currentBid: number; leaderName: string | null; timer: number; active: boolean }

export default function LahetysPage() {
  const { C } = useTheme()
  const { lang } = useLang()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [products, setProducts] = useState<Product[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [alakategoria, setAlakategoria] = useState('')
  const [city, setCity] = useState('')
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [show, setShow] = useState<ShowInfo | null>(null)
  const [streamKey, setStreamKey] = useState('')
  const [streamUrl, setStreamUrl] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [connected, setConnected] = useState(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [auction, setAuction] = useState<AuctionState>({ productId: null, currentBid: 0, leaderName: null, timer: 0, active: false })
  const [auctionDuration, setAuctionDuration] = useState(120)
  const [bids, setBids] = useState<{ user: string; amount: number }[]>([])
  const [soldItems, setSoldItems] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [camError, setCamError] = useState('')
  const [camReady, setCamReady] = useState(false)
  const [devices, setDevices] = useState<VideoDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [copied, setCopied] = useState('')

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

  useEffect(() => {
    import('@/lib/api').then(({ api }) => {
      api.getMyProducts().then((p: Product[]) => {
        setProducts(p.filter(x => x.status === 'PENDING'))
      }).catch(() => {})
    })
    loadDevices()
    return () => { stopCamera() }
  }, [])

  useEffect(() => {
    if (user?.city) setCity(c => c || user.city!)
  }, [user])

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

  // Socket-kytkentä lähetyksen ajaksi — sama auction-tila kuin ostajan /live/[showId]-sivulla
  useEffect(() => {
    if (!show) return
    const socket = connectSocket()

    socket.on('connect', () => { setConnected(true); socket.emit('join_show', show.id) })
    socket.on('disconnect', () => setConnected(false))

    socket.on('auction_started', (data: any) => {
      setAuction({ productId: data.productId, currentBid: data.startPrice, leaderName: null, timer: data.duration, active: true })
      setBids([])
    })

    socket.on('new_bid', (data: any) => {
      setAuction(a => ({ ...a, currentBid: data.amount, leaderName: data.username, timer: data.timer }))
      setBids(b => [...b, { user: data.username, amount: data.amount }])
    })

    socket.on('timer_tick', (data: any) => {
      setAuction(a => ({ ...a, timer: data.timer }))
    })

    socket.on('auction_ended', (data: any) => {
      setAuction(a => ({ ...a, active: false, timer: 0 }))
      if (data.winnerId && data.productId) setSoldItems(s => [...s, data.productId])
    })

    if (socket.connected) { setConnected(true); socket.emit('join_show', show.id) }

    return () => {
      socket.emit('leave_show', show.id)
      socket.off('connect'); socket.off('disconnect')
      socket.off('auction_started'); socket.off('new_bid'); socket.off('timer_tick'); socket.off('auction_ended')
    }
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

  async function goLive() {
    if (!title.trim()) { setStartError('Anna lähetykselle nimi'); return }
    setStarting(true); setStartError('')
    try {
      const { showApi } = await import('@/lib/api')
      const created = await showApi.create({ title: title.trim(), category: category || undefined, alakategoria: alakategoria || undefined, city: city.trim() || undefined, thumbnailUrl: thumbnail ?? undefined })
      const info = await showApi.getStreamInfo(created.id)
      setShow({ id: created.id, title: created.title })
      setStreamKey(info.streamKey)
      setStreamUrl(info.rtmpUrl)
      setIsLive(true)
    } catch (e: any) {
      setStartError(e.message ?? 'Lähetyksen aloitus epäonnistui')
    }
    setStarting(false)
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
    setIsLive(false); setShow(null); setStreamKey(''); setStreamUrl(''); setThumbnail(null); setTitle(''); setCategory(''); setAlakategoria(''); setCity(user?.city ?? '')
    setCurrentIndex(0); setSoldItems([]); setBids([])
    setAuction({ productId: null, currentBid: 0, leaderName: null, timer: 0, active: false })
  }

  const currentProduct = products[currentIndex]

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

  function nextProduct() {
    setCurrentIndex(i => i + 1)
    setAuction(a => ({ ...a, active: false }))
    setBids([])
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`
  const timerColor = auction.timer > 60 ? C.accent : auction.timer > 20 ? '#F59E0B' : '#EF4444'
  const isLast = currentIndex >= products.length - 1
  const isSold = currentProduct && soldItems.includes(currentProduct.id)

  return (
    <div style={{ color: C.text }}>
      {/* Live-banneri */}
      {isLive && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} />
            <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 700 }}>Lähetys käynnissä{!connected ? ' — yhdistetään...' : ''}</span>
          </div>
          <button onClick={endShow} style={{ background: 'none', border: '1px solid #EF4444', color: '#EF4444', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Lopeta</button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{isLive ? 'LIVE' : 'Lähetys'}</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{products.length} tuotetta jonossa</p>
        </div>
        {!isLive && <button onClick={() => setShowSettings(s => !s)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, padding: '8px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Asetukset</button>}
      </div>

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

      {products.length === 0 && (
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

            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Paikkakunta</label>
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
            <button onClick={goLive} disabled={starting} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '10px 30px', borderRadius: 8, fontWeight: 800, fontSize: 15, cursor: starting ? 'default' : 'pointer', opacity: starting ? 0.7 : 1, boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}>
              {starting ? 'Aloitetaan...' : 'Aloita lähetys'}
            </button>
          </div>
        </div>
      )}

      {isLive && show && currentProduct && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#080C16', aspectRatio: '16/9', position: 'relative' }}>
              <video ref={videoRef} muted playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', top: 10, left: 10, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4 }}>LIVE</div>
              {currentProduct.imageUrl && <div style={{ position: 'absolute', bottom: 10, right: 10, width: 72, height: 72, borderRadius: 7, overflow: 'hidden', border: `2px solid ${C.accent}` }}><img src={currentProduct.imageUrl} alt={currentProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
              {auction.active && (
                <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.85)', border: `1px solid ${timerColor}`, borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: timerColor }}>{fmt(auction.timer)}</div>
                </div>
              )}
            </div>

            {/* OBS-asetukset */}
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>OBS-asetukset</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, color: C.textSub, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{streamUrl}</div>
                  <button onClick={() => copy(streamUrl, 'server')} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, padding: '7px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied === 'server' ? '✓' : 'Kopioi'}</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, color: C.textSub, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{streamKey}</div>
                  <button onClick={() => copy(streamKey, 'key')} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, padding: '7px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied === 'key' ? '✓' : 'Kopioi'}</button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Aseta nämä OBS:n Asetukset → Stream -kohtaan (Service: Custom). Katso tarkat ohjeet <a href="/faq#myyja" style={{ color: C.accent }}>FAQ:sta</a>.</div>
            </div>

            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {currentProduct.imageUrl && <img src={currentProduct.imageUrl} alt={currentProduct.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 7, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{currentProduct.name}</div>
                  {currentProduct.description && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{currentProduct.description}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: C.muted }}>{auction.active ? 'Korkein tarjous' : 'Lähtöhinta'}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: auction.active && bids.length > 0 ? C.accent : C.text }}>{auction.active ? auction.currentBid : currentProduct.startPrice}€</div>
                </div>
              </div>

              {!auction.active && !isSold && <button onClick={startAuction} style={{ width: '100%', background: C.accent, color: '#fff', border: 'none', padding: '12px', borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Aloita huutokauppa</button>}
              {auction.active && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={endAuction} style={{ flex: 1, background: C.surface2, border: '1px solid #EF4444', color: '#EF4444', padding: '9px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Lopeta huutokauppa</button>
                </div>
              )}
              {isSold && !isLast && <button onClick={nextProduct} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '12px', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 }}>Seuraava tuote →</button>}
              {isSold && isLast && (
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <div style={{ color: C.accent, fontWeight: 700, marginBottom: 10 }}>Kaikki tuotteet käyty läpi!</div>
                  <button onClick={endShow} style={{ background: C.surface2, border: '1px solid #EF4444', color: '#EF4444', padding: '10px 22px', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Lopeta lähetys</button>
                </div>
              )}
              {!auction.active && !isSold && auction.productId === currentProduct.id && (
                <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8 }}>Huutokauppa päättyi ilman tarjouksia</div>
              )}
            </div>

            {/* Jono */}
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Jono</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {products.map((p, i) => {
                  const sold = soldItems.includes(p.id); const active = i === currentIndex
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, background: active ? C.accentLight : 'transparent', opacity: sold ? 0.4 : 1 }}>
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} /> : <div style={{ width: 26, height: 26, borderRadius: 4, background: C.surface2, flexShrink: 0 }} />}
                      <span style={{ fontSize: 13, color: active ? C.accent : C.text, fontWeight: active ? 700 : 400, flex: 1 }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: C.muted }}>{p.startPrice}€</span>
                      {sold && <span style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>✓</span>}
                      {active && !sold && <span style={{ fontSize: 10, color: C.accent, fontWeight: 800, background: C.accentLight, padding: '2px 6px', borderRadius: 4 }}>NYT</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tarjousloki */}
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px', height: 'fit-content' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Tarjoukset ({bids.length})</div>
            {bids.length === 0
              ? <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Ei tarjouksia vielä</div>
              : bids.slice().reverse().map((bid, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: i === 0 ? C.accentLight : C.surface, borderRadius: 7, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{bid.user}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? C.accent : C.text }}>{bid.amount}€</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
