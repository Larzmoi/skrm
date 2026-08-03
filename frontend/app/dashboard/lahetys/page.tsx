'use client'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/lib/theme-context'

interface Product { id: string; name: string; startPrice: number; description?: string; imageUrl?: string; status: string; order: number; auctionDuration?: number }
interface VideoDevice { deviceId: string; label: string }

export default function LahetysPage() {
  const { C } = useTheme()
  const [products, setProducts] = useState<Product[]>([])
  const [isLive, setIsLive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [auctionActive, setAuctionActive] = useState(false)
  const [timer, setTimer] = useState(0)
  const [auctionDuration, setAuctionDuration] = useState(120)
  const [currentBid, setCurrentBid] = useState(0)
  const [bids, setBids] = useState<{ user: string; amount: number }[]>([])
  const [soldItems, setSoldItems] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [camError, setCamError] = useState('')
  const [camReady, setCamReady] = useState(false)
  const [devices, setDevices] = useState<VideoDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    import('@/lib/api').then(({ api }) => {
      api.getMyProducts().then((p: Product[]) => {
        setProducts(p.filter(x => x.status === 'PENDING'))
      }).catch(() => {})
    })
    loadDevices()
    return () => { stopCamera(); if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

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
    if (!camReady) { const ok = await startCamera(selectedDevice || undefined); if (!ok) return }
    setIsLive(true)
  }

  function endShow() {
    if (!confirm('Haluatko varmasti lopettaa lähetyksen?')) return
    stopCamera(); setIsLive(false); setAuctionActive(false)
    setCurrentIndex(0); setSoldItems([]); setBids([])
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const currentProduct = products[currentIndex]

  function startAuction() {
    if (!currentProduct) return
    const dur = currentProduct.auctionDuration ?? auctionDuration
    setAuctionActive(true); setCurrentBid(currentProduct.startPrice); setTimer(dur); setBids([])
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setAuctionActive(false); setSoldItems(s => [...s, currentProduct.id]); return 0 }
        return t - 1
      })
    }, 1000)
  }

  function endAuction() {
    if (timerRef.current) clearInterval(timerRef.current)
    setAuctionActive(false)
    if (currentProduct) setSoldItems(s => [...s, currentProduct.id])
  }

  function nextProduct() {
    setCurrentIndex(i => i + 1); setAuctionActive(false); setCurrentBid(0)
    setTimer(auctionDuration); setBids([])
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`
  const timerColor = timer > 60 ? C.accent : timer > 20 ? '#F59E0B' : '#EF4444'
  const isLast = currentIndex >= products.length - 1
  const isSold = currentProduct && soldItems.includes(currentProduct.id)

  return (
    <div style={{ color: C.text }}>
      {/* Live-banneri */}
      {isLive && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} />
            <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 700 }}>Lähetys käynnissä — kamera tallessa</span>
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
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Kameralähde</label>
            {devices.length === 0
              ? <div style={{ fontSize: 13, color: C.muted }}>Paina "Testaa kamera" salliaksesi käytön</div>
              : <select value={selectedDevice} onChange={e => { setSelectedDevice(e.target.value); if (camReady) startCamera(e.target.value) }} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', marginBottom: 8 }}>
                  {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                </select>
            }
            <div style={{ fontSize: 11, color: C.muted }}>OBS Virtual Camera näkyy listassa kun se on käynnissä</div>
            {camError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '8px 12px', marginTop: 10, color: '#EF4444', fontSize: 13 }}>{camError}</div>}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {!camReady
              ? <button onClick={() => startCamera(selectedDevice || undefined)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Testaa kamera</button>
              : <button onClick={stopCamera} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Sammuta esikatselu</button>
            }
            <button onClick={goLive} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '10px 30px', borderRadius: 8, fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}>
              Aloita lähetys
            </button>
          </div>
        </div>
      )}

      {isLive && currentProduct && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#080C16', aspectRatio: '16/9', position: 'relative' }}>
              <video ref={videoRef} muted playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', top: 10, left: 10, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4 }}>LIVE</div>
              {currentProduct.imageUrl && <div style={{ position: 'absolute', bottom: 10, right: 10, width: 72, height: 72, borderRadius: 7, overflow: 'hidden', border: `2px solid ${C.accent}` }}><img src={currentProduct.imageUrl} alt={currentProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
              {auctionActive && (
                <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.85)', border: `1px solid ${timerColor}`, borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: timerColor }}>{fmt(timer)}</div>
                </div>
              )}
            </div>

            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {currentProduct.imageUrl && <img src={currentProduct.imageUrl} alt={currentProduct.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 7, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{currentProduct.name}</div>
                  {currentProduct.description && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{currentProduct.description}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: C.muted }}>{auctionActive ? 'Korkein tarjous' : 'Lähtöhinta'}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: auctionActive && bids.length > 0 ? C.accent : C.text }}>{auctionActive ? currentBid : currentProduct.startPrice}€</div>
                </div>
              </div>

              {!auctionActive && !isSold && <button onClick={startAuction} style={{ width: '100%', background: C.accent, color: '#fff', border: 'none', padding: '12px', borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Aloita huutokauppa</button>}
              {auctionActive && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setTimer(t => t + 30)} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '9px', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+30s</button>
                  <button onClick={() => setTimer(t => t + 60)} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '9px', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+1 min</button>
                  <button onClick={endAuction} style={{ flex: 1, background: C.surface2, border: '1px solid #EF4444', color: '#EF4444', padding: '9px', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Lopeta</button>
                </div>
              )}
              {isSold && !isLast && <button onClick={nextProduct} style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '12px', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 }}>Seuraava tuote →</button>}
              {isSold && isLast && (
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <div style={{ color: C.accent, fontWeight: 700, marginBottom: 10 }}>Kaikki tuotteet käyty läpi!</div>
                  <button onClick={endShow} style={{ background: C.surface2, border: '1px solid #EF4444', color: '#EF4444', padding: '10px 22px', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Lopeta lähetys</button>
                </div>
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
