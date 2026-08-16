'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Room, RoomEvent, Track } from 'livekit-client'
import { useLang } from '@/lib/lang-context'
import { useAuth } from '@/lib/auth-context'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { resizeImage } from '@/lib/imageUtils'
import { getNakyvatKategoriat, getKatNimi, getAlaNimi } from '@/lib/kategoriat'
import { useIsMobile } from '@/lib/useIsMobile'
import ConfirmDialog from '@/components/ConfirmDialog'

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

// Pieni, huomaamaton paluunappi — AINOA tie takaisin dashboardiin tällä sivulla,
// koska koko sivuston normaali navbar/sidebar on tarkoituksella piilotettu (ks. CLAUDE.md
// "Stream-konsolin uudelleenrakennus — TARKENNETTU KOLMANNEN KERRAN JÄLKEEN").
// Jonon tuoterivit eivät olleet klikattavissa isomman näkymän/muokkauksen avaamiseksi (ks.
// CLAUDE.md "Uudet löydökset 2026-08-13, osa 4" kohta 16) - samantyylinen kuin katsojan
// puolen suurennusmodaali, plus linkki muokkaukseen koska tämä on myyjän oma konsoli.
function QueueProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, maxWidth: 420, width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {product.imageUrl && (
          <img src={product.imageUrl.split('|||')[0]} alt={product.name} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
        )}
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{product.name}</div>
            <button onClick={onClose} style={{ background: '#1A1A1A', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>✕</button>
          </div>
          {product.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{product.description}</p>}
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 14 }}>{product.startPrice}€</div>
          <a href={`/dashboard/tuotteet?edit=${product.id}`} style={{ display: 'block', textAlign: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
            Muokkaa tuotetta →
          </a>
        </div>
      </div>
    </div>
  )
}

function BackButton({ overlay }: { overlay?: boolean }) {
  return (
    <Link
      href="/dashboard"
      style={{
        position: overlay ? 'absolute' : 'fixed', top: 14, left: 14, zIndex: 50,
        width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: overlay ? 'rgba(0,0,0,0.55)' : DARK_PANEL_BG, border: overlay ? 'none' : `1px solid ${DARK_BORDER}`,
        color: overlay ? '#fff' : DARK_TEXT, fontSize: 16, textDecoration: 'none', backdropFilter: overlay ? 'blur(8px)' : undefined,
      }}
      title="Takaisin"
    >←</Link>
  )
}

// Myyjän oma esikatselu — LiveKit-migraatio 2026-08-09 (ks. CLAUDE.md "PÄÄTÖS 2026-08-09:
// Vaihto MediaMTX -> LiveKit"). Liittyy omaan huoneeseensa erillisellä "esikatselu"-
// identiteetillä (ei julkaisijana — OBS julkaisee Ingressin kautta, ei suoraan selaimesta).
type PreviewStats = { w: number; h: number; fps: number; kbps: number }

function HlsPreview({ wsUrl, token, onStats }: { wsUrl: string; token: string; onStats?: (s: PreviewStats | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [waiting, setWaiting] = useState(true)
  // Näkyvät laatutilastot (ks. CLAUDE.md "Uudet löydökset 2026-08-13, osa 5" kohta 23) —
  // ennen tätä ei ollut mitään tapaa nähdä käyttöliittymästä millä resoluutiolla/bitratella
  // striimi oikeasti kulkee, pelkkä silmämääräinen arvio ei riittänyt laadun tarkistamiseen.
  // Siirretty näkyviin ylös LIVE/ESIKATSELU-tilan alle (ks. onStats-callback alla) - itse
  // laskenta pysyy täällä koska se on sidoksissa tähän komponentin omaan LiveKit-huoneeseen.
  const [stats, setStats] = useState<PreviewStats | null>(null)
  const statsTrackRef = useRef<any>(null)
  const lastStatsRef = useRef<{ bytes: number; ts: number } | null>(null)

  useEffect(() => { onStats?.(stats) }, [stats, onStats])

  // TILAPÄINEN DIAGNOSTIIKKA 2026-08-12 — ks. alempi kommentti. Näyttää tarkalleen
  // milloin "Odotetaan OBS-yhteyttä" -teksti oikeasti ilmestyy/katoaa renderissä,
  // erotuksena RoomEvent-lokeista jotka näyttävät vain mitä LiveKit-kirjasto tekee.
  useEffect(() => {
    console.log(`[HlsPreview t+${Math.round(performance.now())}ms] waiting-tila muuttui:`, waiting)
  }, [waiting])

  useEffect(() => {
    if (!wsUrl || !token) return
    let destroyed = false
    const room = new Room()
    // TILAPÄINEN DIAGNOSTIIKKA 2026-08-12 — poista kun "Odotetaan OBS-yhteyttä"
    // -jäänne on vahvistettu korjatuksi/eri juurisyy löydetty. Tarkoitus: nähdä
    // tarkka RoomEvent-järjestys kun "Aloita julkinen lähetys" painetaan, koska
    // goPublic() ei koske previewWsUrl/previewToken/Room-oliota millään tavalla
    // (vain Show.status REST-kutsu) - jos video silti katkeaa siinä hetkessä,
    // syyn pitää löytyä LiveKitin omasta reconnect-tapahtumaketjusta.
    const log = (...args: any[]) => console.log(`[HlsPreview t+${Math.round(performance.now())}ms]`, ...args)

    function attachIfMedia(track: any) {
      if ((track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) && videoRef.current) {
        track.attach(videoRef.current)
        if (track.kind === Track.Kind.Video) {
          setWaiting(false)
          statsTrackRef.current = track
          lastStatsRef.current = null
        }
      }
    }

    // Pollaa oikeat WebRTC-tilastot (resoluutio/fps/bitrate) sen sijaan että arvattaisiin —
    // sama data riippumatta tuliko kuva OBS:n RTMP-Ingressin vai puhelimen suoran WebRTC-
    // julkaisun kautta, koska molemmat vain julkaisevat trackin samaan huoneeseen.
    const statsInterval = setInterval(async () => {
      const track = statsTrackRef.current
      if (!track) { setStats(null); return }
      try {
        const report: RTCStatsReport | undefined = await track.getRTCStatsReport()
        if (!report) return
        report.forEach((entry: any) => {
          if (entry.type !== 'inbound-rtp' || entry.kind !== 'video') return
          const now = performance.now()
          const prev = lastStatsRef.current
          let kbps = 0
          if (prev && entry.bytesReceived != null) {
            const dtSec = (now - prev.ts) / 1000
            if (dtSec > 0) kbps = Math.round(((entry.bytesReceived - prev.bytes) * 8) / dtSec / 1000)
          }
          if (entry.bytesReceived != null) lastStatsRef.current = { bytes: entry.bytesReceived, ts: now }
          if (entry.frameWidth && entry.frameHeight) {
            setStats({ w: entry.frameWidth, h: entry.frameHeight, fps: Math.round(entry.framesPerSecond || 0), kbps: kbps > 0 ? kbps : 0 })
          }
        })
      } catch {}
    }, 2000)

    room.on(RoomEvent.ConnectionStateChanged, (state) => log('ConnectionStateChanged', state))
    room.on(RoomEvent.TrackSubscribed, (track) => { log('TrackSubscribed', track.kind); attachIfMedia(track) })
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      log('TrackUnsubscribed', track.kind)
      track.detach()
      if (track.kind === Track.Kind.Video) { statsTrackRef.current = null; lastStatsRef.current = null; setStats(null) }
    })
    room.on(RoomEvent.Disconnected, (reason) => { log('Disconnected', reason); setWaiting(true) })
    room.on(RoomEvent.Reconnecting, () => { log('Reconnecting'); setWaiting(true) })
    room.on(RoomEvent.Reconnected, () => {
      // Reconnect voi palauttaa jo aiemmin tilatut trackit ilman uutta
      // TrackSubscribed-tapahtumaa (koska tilaus on jo olemassa) — ilman
      // tätä "waiting" jäi jumiin true:hun vaikka video jatkoi toimimista.
      log('Reconnected')
      setWaiting(false)
      const video = videoRef.current
      if (video && video.paused) video.play().catch(() => {})
    })

    log('room.connect() alkaa', wsUrl)
    room.connect(wsUrl, token).then(() => {
      log('room.connect() onnistui')
    }).catch((err) => {
      log('room.connect() epäonnistui', err)
      if (!destroyed) setWaiting(true)
    })

    return () => {
      log('useEffect cleanup / room.disconnect()')
      destroyed = true
      clearInterval(statsInterval)
      room.disconnect()
    }
  }, [wsUrl, token])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* 'contain' eikä 'cover' (ks. CLAUDE.md 2026-08-14, sama korjaus kuin katsojan
          VideoPlayerissä) - myyjän oman esikatselun pitää näyttää täsmälleen se mitä
          katsoja näkee, ei rajattua versiota siitä. */}
      <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      {waiting && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', padding: 16 }}>
          Odotetaan OBS-yhteyttä...
        </div>
      )}
    </div>
  )
}

// Lähetys-konsoli on aina tumma riippumatta käyttäjän sivustonlaajuisesta teema-
// asetuksesta (ks. CLAUDE.md "Stream-konsolin uudelleenrakennus": "Sivuston oma tumma
// teema... ei muutu"). Teeman C.accent/C.accentBright vaihtelevat kuitenkin käyttäjän valitseman
// vaalea/tumma-teeman mukaan (vaalea teema = tummempi vihreä), mikä näytti "liian
// tummalta" konsolissa joka on aina musta taustaltaan (ks. "Uudet löydökset 2026-08-13,
// osa 4" kohta 17). Kiinteät arvot varmistavat saman kirkkaan vihreän aina.
const GREEN = '#4ADE80'
const GREEN_DIM = '#2ECC71'
const GREEN_BG = '#0D2818'

// KORJAUS 2026-08-14 (ks. CLAUDE.md "Uudet löydökset 2026-08-13, osa 5" kohta 28): yllä oleva
// GREEN-kiinnitys koski vain napteja, mutta chat-syötteen huuto/osto-laatikot käyttivät SAMOJA
// C.accent/C.accentBright/C.accentLight-tunnuksia ja lakaistuivat mukaan samaan korjaukseen
// ilman että syötteen YMPÄRILLÄ oleva paneeli (C.cardBg/C.border/C.text) korjattiin samalla.
// Tumman teeman käyttäjälle tämä ei näkynyt mitenkään (arvot olivat numeerisesti identtiset
// ennen/jälkeen), mutta vaalean teeman käyttäjälle syntyi juuri raportoitu oire: valkoinen
// paneeli jonka SISÄLLÄ kelluu aina-tummia vihreitä laatikoita, joita ei enää erota toisistaan.
// Viimeistellään sama "aina tumma" -periaate koko chat-syötteeseen, ei vain nappeihin.
//
// LAAJENNUS 2026-08-14 (ks. CLAUDE.md "Uudet löydökset 2026-08-13, osa 5" kohta 27): sama
// C.bg/C.surface/C.cardBg-vuoto koski myös koko sivun juuritaustaa ja lähetyksen asetus-
// lomaketta (OBS-asetukset, kategoria/kesto-valinnat) — vaalealla teemalla koko konsoli
// näytti "puhtaan valkoiselta" LUKITTUA "aina tumma" -periaatetta vastaan. Sen sijaan että
// keksittäisiin kolmas, teemasta riippuva "pehmeämpi vaalea" -sävy stream-sivulle erikseen
// (mikä toisintaisi saman C.xxx-vuoto-ongelmaluokan uudestaan myöhemmin), koko sivu käyttää
// nyt samoja kiinteitä tumman teeman arvoja kuin loppu konsolista jo tekee — yksi johdonmukainen
// "aina tumma"-toteutus koko `/lahetys`-reitille, ei osittainen.
const DARK_BG = '#070F09'
const DARK_SURFACE = '#0D1A10'
const DARK_PANEL_BG = '#0D1A10'
const DARK_BORDER = '#1E3324'
const DARK_TEXT = '#E8F5EE'
const DARK_TEXT_SUB = '#9DBFA8'
const DARK_MUTED = '#5A7A65'
const DARK_SURFACE2 = '#132018'
const DARK_DIM = '#1E3324'

export default function LahetysPage() {
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
  const [previewWsUrl, setPreviewWsUrl] = useState('')
  const [previewToken, setPreviewToken] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [connected, setConnected] = useState(false)
  const [showObsInfo, setShowObsInfo] = useState(false)
  const [showModTools, setShowModTools] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; danger?: boolean; onConfirm: () => void } | null>(null)
  const [productDetailId, setProductDetailId] = useState<string | null>(null)
  const [mutedWordsInput, setMutedWordsInput] = useState('')
  const [mutedWordsSaved, setMutedWordsSaved] = useState(false)

  const [currentProductId, setCurrentProductId] = useState<string | null>(null)
  const [auction, setAuction] = useState<AuctionState>({ productId: null, currentBid: 0, leaderName: null, timer: 0, active: false })
  const [auctionDuration, setAuctionDuration] = useState(120)
  const [durationOverride, setDurationOverride] = useState<number | null>(null)
  const [soldItems, setSoldItems] = useState<string[]>([])
  const [soldAmounts, setSoldAmounts] = useState<Record<string, number>>({})
  const [showSettings, setShowSettings] = useState(false)
  const [camError, setCamError] = useState('')
  const [camReady, setCamReady] = useState(false)
  const [devices, setDevices] = useState<VideoDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [copied, setCopied] = useState('')
  // Laatutilastot nostettu HlsPreviewistä ylös LIVE/ESIKATSELU-tilaindikaattorin alle,
  // omistajan pyynnöstä (aiemmin videon alareunassa, vähemmän huomiota herättävä paikka).
  const [previewStats, setPreviewStats] = useState<PreviewStats | null>(null)

  // Puhelimesta suoraan striimaus ilman OBS:aa (ks. CLAUDE.md "Selainpohjainen
  // mobiilistriimaus") — julkaisee streamRef.current-median suoraan LiveKitiin
  // WebRTC:llä, sama huone kuin OBS:n Ingress käyttäisi. Katsojan/myyjän esikatselun
  // puolella (VideoPlayer/HlsPreview) ei ole eroa kummalla tavalla trackit syntyivät.
  const [publishMode, setPublishMode] = useState<'obs' | 'phone'>('phone')
  const [phonePublishing, setPhonePublishing] = useState(false)
  const [phonePublishError, setPhonePublishError] = useState('')
  const publishRoomRef = useRef<Room | null>(null)
  const publishModeTouched = useRef(false)

  // useIsMobile() palauttaa true ennen ensimmäistä mittausta (ks. lib/useIsMobile.ts),
  // joten oletus lukitaan tähän vasta kun oikea arvo on tiedossa - muuten desktop
  // näyttäisi hetken "puhelin"-tilaa oletuksena. Ei aja enää jos käyttäjä on jo
  // itse valinnut tilan käsin.
  useEffect(() => {
    if (!publishModeTouched.current) setPublishMode(isMobile ? 'phone' : 'obs')
  }, [isMobile])

  // Yläpalkin tilastot
  const [viewers, setViewers] = useState(0)
  const [liveSince, setLiveSince] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  // Jonon raahaus
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [qaName, setQaName] = useState('')
  const [qaPrice, setQaPrice] = useState('')
  const [qaBidIncrement, setQaBidIncrement] = useState('')
  const [qaImage, setQaImage] = useState<string | null>(null)
  const [qaSaving, setQaSaving] = useState(false)
  const [qaError, setQaError] = useState('')
  const qaImageRef = useRef<HTMLInputElement>(null)

  // Chat + pikatoimintojen "tulossa pian" -ilmoitus
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [chatInput, setChatInput] = useState('')
  const [stubMsg, setStubMsg] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)

  // Mobiilin video-overlay-chat: vieritä pohjaan uuden viestin tullessa VAIN jos käyttäjä
  // oli jo pohjassa - sama korjaus kuin katsojan /live/[showId]:ssä.
  const mobileFeedRef = useRef<HTMLDivElement>(null)
  const mobileFeedStickToBottom = useRef(true)
  useEffect(() => {
    const el = mobileFeedRef.current
    if (el && mobileFeedStickToBottom.current) el.scrollTop = el.scrollHeight
  }, [feed])

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const thumbnailRef = useRef<HTMLInputElement>(null)

  // KORJAUS 2026-08-14: mobiilin chat-overlay varasi aiemmin KIINTEÄN 190px-tilan alapalkille
  // (tuotetietolaatikko + kesto/aloitusnappi + pikatoimintorivi), jotta chat-input pysyisi
  // näkyvissä sen yläpuolella. Alapalkin todellinen korkeus vaihtelee kuitenkin paljon tilan
  // mukaan (esim. ennen huutokaupan alkua kesto-nappi+"Aloita"-nappi+5 pikatoimintonappia,
  // jotka voivat kääriytyä useammalle riville kapealla näytöllä, ylittävät 190px helposti) —
  // kun todellinen korkeus ylitti oletuksen, alapalkin YLÄOSA (tuotekuva/nimi/hinta) tunkeutui
  // chat-inputin varattuun tilaan, jolloin ne menivät sekaisin/päällekkäin täysin ennalta-
  // arvaamattomasti riippuen mitä nappeja/tiloja sattui olemaan näkyvissä. Kiinteän arvauksen
  // sijaan mitataan alapalkin OIKEA korkeus DOM:sta ja varataan chatille juuri sen verran tilaa.
  const bottomBarRef = useRef<HTMLDivElement>(null)
  const [bottomBarHeight, setBottomBarHeight] = useState(190)
  useEffect(() => {
    const el = bottomBarRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => setBottomBarHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  })

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

  // Jatka olemassa olevaa lähetystä jos myyjällä on jo yksi kesken (esim. luotu toisella
  // laitteella/välilehdellä) — muuten sivun avaaminen esim. puhelimella loisi VIELÄ YHDEN
  // erillisen Show:n omalla chat-huoneellaan, eikä keskustelu/tila synkronoituisi ollenkaan
  // tietokoneen kanssa jolla lähetys oikeasti on käynnissä. Eriytetty omaksi funktioksi
  // (ks. CLAUDE.md "KRIITTINEN: selaimen 'edellinen sivu' -navigointi katkaisee pääsyn
  // käynnissä olevaan streamiin") — kutsutaan paitsi ensimmäisellä mountilla myös aina kun
  // sivu tulee uudelleen näkyviin (esim. selaimen takaisin-navigointi), koska Next.js:n
  // client-side router-cache voi palauttaa vanhan, jo "ei-livenä" olevan React-tilan
  // suorittamatta mount-efektiä uudestaan — paikallinen tila ei siis ole luotettava, tila
  // pitää aina varmistaa palvelimelta kun käyttäjä palaa sivulle.
  async function checkForActiveShow() {
    try {
      const { showApi } = await import('@/lib/api')
      const shows: any[] = await showApi.mine()
      const active = shows
        // SCHEDULED-lähetys on yksityinen esikatselu/testivaihe joka ei realistisesti kestä
        // päiviä — vanha unohdettu testiluonnos (esim. selain suljettu ilman "Lopeta
        // lähetys" -painallusta) ei saa jäädä "aktiiviseksi" ikuisesti ja yllättäen resumeta
        // vahingossa myöhemmin, jolloin myyjä päätyisi hämmentävästi vanhaan lähetykseen
        // tajuamatta miksi. LIVE-lähetykselle ei ole vastaavaa rajaa, koska julkinen lähetys
        // pitää aina pystyä jatkamaan riippumatta siitä miten kauan se on ollut käynnissä.
        .filter(s => s.status === 'LIVE' || (s.status === 'SCHEDULED' && Date.now() - new Date(s.createdAt).getTime() < 3 * 60 * 60 * 1000))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      if (active) {
        setShow({ id: active.id, title: active.title })
        setShowStatus(active.status)
        setIsLive(true)
        if (active.status === 'LIVE' && active.startedAt) setLiveSince(new Date(active.startedAt).getTime())
        if (active.thumbnailUrl) setThumbnail(active.thumbnailUrl)
      }
    } catch {}
  }

  useEffect(() => {
    import('@/lib/api').then(({ api, userApi }) => {
      api.getMyProducts().then((p: Product[]) => {
        setProducts(p.filter(x => x.status === 'PENDING'))
      }).catch(() => {})
      // OBS-asetukset (RTMP-palvelin + pysyvä stream key) haetaan heti sivulle tultaessa —
      // ei vasta kun lähetys on jo luotu tai livenä. Ks. CLAUDE.md "esikatselu ennen julkista näkyvyyttä".
      userApi.getStreamInfo().then((info: { rtmpUrl: string; streamKey: string; wsUrl: string; previewToken: string }) => {
        setStreamUrl(info.rtmpUrl); setStreamKey(info.streamKey); setPreviewWsUrl(info.wsUrl); setPreviewToken(info.previewToken)
      }).catch(() => {})
      checkForActiveShow()
    })
    loadDevices()
    return () => { stopCamera(); publishRoomRef.current?.disconnect() }
  }, [])

  // Varmistus takaisin-navigoinnille: jos sivu tulee näkyviin eikä paikallinen tila usko
  // lähetyksen olevan käynnissä, kysytään palvelimelta uudestaan — ei luoteta pelkkään
  // paikalliseen Reactin tilaan joka on voinut jäädä jälkeen todellisuudesta.
  useEffect(() => {
    function recheck() {
      if (!isLive && document.visibilityState === 'visible') checkForActiveShow()
    }
    window.addEventListener('pageshow', recheck)
    document.addEventListener('visibilitychange', recheck)
    return () => {
      window.removeEventListener('pageshow', recheck)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [isLive])

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
    // TILAPÄINEN DIAGNOSTIIKKA 2026-08-12 — sama tarkoitus kuin HlsPreviewin lokit,
    // mutta Socket.io-puolella ("LIVE — yhdistetään..." -teksti käyttää tätä
    // connected-tilaa, EI HlsPreviewin waiting-tilaa — kaksi eri mekanismia jotka
    // voivat molemmat jäädä jumiin näyttäen samalta, ks. CLAUDE.md).
    const slog = (...args: any[]) => console.log(`[Lahetys/socket t+${Math.round(performance.now())}ms]`, ...args)
    socket.on('connect', () => { slog('connect'); setConnected(true); socket.emit('join_show', { showId: show.id, token }) })
    socket.on('disconnect', (reason) => { slog('disconnect', reason); setConnected(false) })

    // Palauttaa käynnissä olevan huudon tilan kun konsoli liittyy huoneeseen uudestaan (esim.
    // paluu /dashboard-sivun "←"-napin kautta) - ilman tätä myyjän konsoli näytti aina
    // huutokaupan olevan käynnissä server-puolella. Sama tapahtuma jota katsojan
    // /live/[showId]-sivu jo käyttää samaan tarkoitukseen.
    socket.on('auction_state', (data: any) => {
      if (!data.productId) return
      setAuction({ productId: data.productId, currentBid: data.currentBid, leaderName: data.leaderName, timer: data.timer, active: data.active })
      setCurrentProductId(data.productId)
    })

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

    if (socket.connected) { slog('already connected (fallback)'); setConnected(true); socket.emit('join_show', { showId: show.id, token }) }

    return () => {
      socket.emit('leave_show', show.id)
      socket.off('connect'); socket.off('disconnect')
      socket.off('auction_state')
      socket.off('auction_started'); socket.off('new_bid'); socket.off('timer_tick'); socket.off('auction_ended')
      socket.off('viewer_count'); socket.off('chat_message'); socket.off('chat_message_deleted'); socket.off('muted_words_saved')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  // KRIITTINEN KORJAUS (ks. CLAUDE.md "Uudet löydökset 2026-08-13, osa 4" kohta 18): tuotejono
  // haettiin aina vain myyjän omasta GET /products/mine:sta, jota ei koskaan liitetty Show-
  // riviin tietokannassa - katsojan Shop-paneeli (GET /shows/:id:n products-relaatio) näytti
  // siksi tyhjää/vajaata muille kuin striimaavalle laitteelle. Liitetään kaikki myyjän
  // odottavat tuotteet tähän showhun heti kun show tunnetaan.
  useEffect(() => {
    if (!show) return
    import('@/lib/api').then(({ showApi }) => showApi.claimProducts(show.id).catch(() => {}))
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

  async function startCamera(deviceId?: string): Promise<boolean> {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    try {
      // Ilman ideal-resoluutiovaatimusta selain valitsee usein paljon kameran maksimia
      // pienemmän oletusresoluution (ks. CLAUDE.md "Uudet löydökset 2026-08-13, osa 5"
      // kohta 23 — havaittu heikko laatu puhelimella). "ideal" ei kaadu jos kamera ei
      // yllä 1080p:hen, selain valitsee lähimmän tuetun sen sijaan.
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 },
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCamError(''); setCamReady(true); return true
    } catch (err: any) {
      // Jos tarkka deviceId ei enää kelpaa (laite vaihtui/deviceId vanhentui edellisestä
      // enumeroinnista), yritetään ilman tarkkaa laitevaatimusta ennen luovuttamista.
      if (deviceId && err?.name === 'OverconstrainedError') return startCamera(undefined)
      // Näytetään oikea virheen syy geneerisen "tarkista luvat" -tekstin sijaan - tämä on
      // toistuvasti ollut vaikea diagnosoida koska sama teksti näkyi ihan eri syistä
      // (luvat evätty / laite jo toisen sovelluksen kuten OBS:n käytössä / laitetta ei löydy).
      const reason =
        err?.name === 'NotAllowedError' ? 'Selain esti pääsyn — tarkista selaimen kameraluvat.'
        : err?.name === 'NotReadableError' ? 'Kamera on jo toisen sovelluksen käytössä (esim. OBS) — sulje se ja yritä uudelleen.'
        : err?.name === 'NotFoundError' ? 'Kameraa ei löytynyt.'
        : `Kameraan ei saada yhteyttä (${err?.name || 'tuntematon virhe'}).`
      setCamError(reason); setCamReady(false); return false
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamReady(false)
  }

  // Puhelimesta suoraan striimaus ilman OBS:aa — julkaisee jo auki olevan kameran
  // (streamRef.current, "Testaa kamera") suoraan LiveKit-huoneeseen WebRTC:llä.
  // Katsojan puolella (VideoPlayer) ei ole mitään eroa tuliko track OBS:n Ingressin
  // vai tämän kautta - molemmat vain julkaisevat trackeja samaan "seller-{userId}" huoneeseen.
  async function startPhonePublish() {
    setPhonePublishError('')
    if (!streamRef.current) {
      const ok = await startCamera(selectedDevice || undefined)
      if (!ok || !streamRef.current) { setPhonePublishError('Kameraa ei saatu käyttöön'); return }
    }
    try {
      const { userApi } = await import('@/lib/api')
      const { wsUrl, token } = await userApi.getPublishToken()
      const room = new Room()
      room.on(RoomEvent.Disconnected, () => setPhonePublishing(false))
      await room.connect(wsUrl, token)
      const stream = streamRef.current!
      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]
      if (videoTrack) await room.localParticipant.publishTrack(videoTrack, { source: Track.Source.Camera })
      if (audioTrack) await room.localParticipant.publishTrack(audioTrack, { source: Track.Source.Microphone })
      publishRoomRef.current = room
      setPhonePublishing(true)
    } catch (err: any) {
      setPhonePublishError(err?.message ?? 'Lähetyksen aloitus epäonnistui')
      setPhonePublishing(false)
    }
  }

  function stopPhonePublish() {
    publishRoomRef.current?.disconnect()
    publishRoomRef.current = null
    setPhonePublishing(false)
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
    // TILAPÄINEN DIAGNOSTIIKKA 2026-08-12 — ankkuripiste HlsPreviewin ja socketin
    // lokeille: goPublic() ei koske previewWsUrl/previewToken/Room-oliota eikä
    // socket-yhteyttä millään tavalla (vain Show.status REST-kutsu) - jos video tai
    // "yhdistetään..."-teksti silti reagoi juuri tässä hetkessä, se pitäisi näkyä
    // ajallisesti lähellä tätä logia muissa [HlsPreview]/[Lahetys/socket] -riveissä.
    console.log(`[Lahetys/goPublic t+${Math.round(performance.now())}ms] alkaa`)
    setGoingPublic(true)
    try {
      const { showApi } = await import('@/lib/api')
      await showApi.setStatus(show.id, 'LIVE')
      console.log(`[Lahetys/goPublic t+${Math.round(performance.now())}ms] REST-kutsu onnistui, status LIVE`)
      setShowStatus('LIVE')
      setLiveSince(Date.now())
    } catch (e: any) {
      console.log(`[Lahetys/goPublic t+${Math.round(performance.now())}ms] epäonnistui`, e)
      setStartError(e.message ?? 'Julkaisu epäonnistui')
    }
    setGoingPublic(false)
  }

  function endShow() {
    setConfirmDialog({ message: 'Haluatko varmasti lopettaa lähetyksen?', danger: true, onConfirm: () => { setConfirmDialog(null); doEndShow() } })
  }

  async function doEndShow() {
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
    stopPhonePublish()
    setIsLive(false); setShow(null); setShowStatus(null); setThumbnail(null); setTitle(''); setCategory(''); setAlakategoria(''); setCity(user?.city ?? '')
    setCurrentProductId(null); setSoldItems([]); setSoldAmounts({}); setFeed([]); setLiveSince(null); setViewers(0); setShowObsInfo(false); setShowModTools(false); setShowQueue(false)
    setAuction({ productId: null, currentBid: 0, leaderName: null, timer: 0, active: false })
  }

  const currentIndex = products.findIndex(p => p.id === currentProductId)
  const currentProduct = currentIndex >= 0 ? products[currentIndex] : products[0]
  const effectiveDuration = durationOverride ?? currentProduct?.auctionDuration ?? auctionDuration

  useEffect(() => { setDurationOverride(null) }, [currentProductId])

  function startAuction() {
    if (!currentProduct || !show) return
    const token = localStorage.getItem('skrm_token')
    connectSocket().emit('start_auction', { showId: show.id, productId: currentProduct.id, startPrice: currentProduct.startPrice, duration: effectiveDuration, token })
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

  // Web Share API mobiilissa (natiivi jako-valikko) — työpöydällä sitä ei yleensä ole
  // saatavilla, jolloin pudotaan takaisin leikepöydälle kopiointiin (sama copy()-apuri
  // jota OBS-avainten kopiointi jo käyttää, näyttää "✓ Kopioitu" napissa hetken).
  function shareStream() {
    if (!show) return
    const url = `${window.location.origin}/live/${show.id}`
    if (navigator.share) {
      navigator.share({ title: title || 'SKRM-lähetys', url }).catch(() => {})
    } else {
      copy(url, 'share')
    }
  }

  function regenerateKey() {
    setConfirmDialog({
      message: 'Vanha stream key lakkaa toimimasta heti — OBS:n Stream-asetuksiin pitää syöttää uusi avain. Jatketaanko?',
      onConfirm: () => { setConfirmDialog(null); doRegenerateKey() },
    })
  }

  async function doRegenerateKey() {
    try {
      const { userApi } = await import('@/lib/api')
      const info = await userApi.regenerateStreamKey()
      setStreamKey(info.streamKey); setPreviewWsUrl(info.wsUrl); setPreviewToken(info.previewToken)
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
    setConfirmDialog({ message: 'Mykistetäänkö tämä käyttäjä tässä lähetyksessä?', onConfirm: () => { setConfirmDialog(null); doMuteUser(userId) } })
  }

  function doMuteUser(userId: string) {
    if (!show) return
    const token = localStorage.getItem('skrm_token')
    connectSocket().emit('mute_user', { showId: show.id, userId, token })
  }

  async function quickAddProduct() {
    if (!qaName.trim() || !qaPrice) return
    const price = Number(qaPrice.replace(',', '.'))
    if (!price || price <= 0) { setQaError('Anna kelvollinen hinta'); return }
    // Tyhjä kenttä -> ei välitetä bidIncrement:iä, backend/frontend molemmat tulkitsevat
    // puuttuvan arvon 1€ oletuskorotukseksi (sama fallback kuin dashboardin täydellä
    // lomakkeella, ks. CLAUDE.md "Mobiili-läpikäynti" kohta 8).
    const bidIncrement = qaBidIncrement ? Number(qaBidIncrement.replace(',', '.')) : undefined
    setQaSaving(true); setQaError('')
    try {
      const { api } = await import('@/lib/api')
      const created = await api.createProduct({ name: qaName.trim(), saleType: 'live', startPrice: price, bidIncrement, imageUrl: qaImage ?? undefined, showId: show?.id })
      setProducts(p => [...p, created])
      setQaName(''); setQaPrice(''); setQaBidIncrement(''); setQaImage(null); setShowQuickAdd(false)
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
  const timerColor = auction.timer > 60 ? GREEN_DIM : auction.timer > 20 ? '#F59E0B' : '#EF4444'
  const isLast = currentIndex >= products.length - 1
  const isSold = currentProduct && soldItems.includes(currentProduct.id)
  // Huutokauppa käyty läpi nykyiselle tuotteelle — joko myyty tai päättyi ilman tarjouksia.
  // "Seuraava tuote" pitää päästä painamaan kummassakin tapauksessa, ei vain kun myytiin.
  const auctionDoneForCurrent = !!currentProduct && !auction.active && auction.productId === currentProduct.id
  const elapsedSeconds = liveSince ? Math.floor((now - liveSince) / 1000) : 0
  const todaySales = Object.values(soldAmounts).reduce((sum, v) => sum + v, 0)

  // Pikatoimintojen napit — eriytetty visuaalinen hierarkia: PRIMARY (kirkas vihreä liukuväri,
  // pääasiallinen "vie eteenpäin" -toiminto), GHOST (neutraali lasimainen, aina-käytettävissä
  // apu­toiminnot) ja DANGER (Lopeta). Kaikki lasittavat hieman ja saavat kevyen varjon, jotta
  // ne erottuvat videon päällä eivätkä näytä litteiltä yleispainikkeilta.
  const quickBtnBase: React.CSSProperties = { flex: '1 1 auto', minWidth: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, padding: '9px 8px', borderRadius: 9, fontSize: 11, fontWeight: 800, letterSpacing: 0.2, cursor: 'pointer', backdropFilter: 'blur(8px)' }
  const quickBtnGhost: React.CSSProperties = { ...quickBtnBase, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)' }
  const quickBtnGhostDisabled: React.CSSProperties = { ...quickBtnGhost, opacity: 0.35, cursor: 'not-allowed', boxShadow: 'none' }
  const quickBtnPrimary: React.CSSProperties = { ...quickBtnBase, background: GREEN, border: 'none', color: '#06210F', boxShadow: `0 3px 12px ${GREEN}66` }

  const quickActionsRow = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button onClick={extendTimer} disabled={!auction.active} style={auction.active ? quickBtnGhost : quickBtnGhostDisabled}>+10s</button>
      <button onClick={() => stub('Kiinnitä')} style={quickBtnGhost}>Kiinnitä</button>
      <button onClick={endAuction} disabled={!auction.active} style={auction.active ? quickBtnPrimary : quickBtnGhostDisabled}>✓ Myyty</button>
      <button onClick={nextProduct} disabled={!auctionDoneForCurrent || isLast} style={(auctionDoneForCurrent && !isLast) ? quickBtnPrimary : quickBtnGhostDisabled}>Seuraava →</button>
      <button onClick={() => stub('Giveaway')} style={quickBtnGhost}>Giveaway</button>
    </div>
  )

  const obsCardContent = (
    <>
      <div style={{ fontSize: 13, fontWeight: 700, color: DARK_TEXT, marginBottom: 10 }}>OBS-asetukset</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, color: DARK_TEXT_SUB, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{streamUrl || 'Ladataan...'}</div>
          <button onClick={() => copy(streamUrl, 'server')} style={{ background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, color: DARK_MUTED, padding: '7px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied === 'server' ? '✓' : 'Kopioi'}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, color: DARK_TEXT_SUB, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{streamKey || 'Ladataan...'}</div>
          <button onClick={() => copy(streamKey, 'key')} style={{ background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, color: DARK_MUTED, padding: '7px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied === 'key' ? '✓' : 'Kopioi'}</button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: DARK_MUTED, marginTop: 8 }}>Aseta nämä OBS:n Asetukset → Stream -kohtaan (Service: Custom). Tämä avain on pysyvä ja sama kaikissa tulevissa lähetyksissäsi. Katso tarkat ohjeet <a href="/faq#myyja" style={{ color: GREEN_DIM }}>FAQ:sta</a>.</div>
      <button onClick={regenerateKey} style={{ marginTop: 10, background: 'none', border: `1px solid ${DARK_BORDER}`, color: DARK_MUTED, padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Generoi uusi avain</button>
    </>
  )

  const modToolsContent = (
    <>
      <div style={{ fontSize: 13, fontWeight: 700, color: DARK_TEXT, marginBottom: 6 }}>Kielletyt sanat</div>
      <div style={{ fontSize: 11, color: DARK_MUTED, marginBottom: 8 }}>Viestit joissa esiintyy jokin näistä sanoista piilotetaan katsojilta — sinä ja moderaattorit näette ne yhä. Yksi sana per rivi.</div>
      <textarea value={mutedWordsInput} onChange={e => setMutedWordsInput(e.target.value)} rows={3} placeholder={'esim.\nhuijaus\nkielletty sana'} style={{ width: '100%', background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, borderRadius: 6, padding: '8px 10px', color: DARK_TEXT, fontSize: 12, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' }} />
      <button onClick={saveMutedWords} style={{ marginTop: 8, background: GREEN_DIM, border: 'none', color: '#fff', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{mutedWordsSaved ? 'Tallennettu' : 'Tallenna'}</button>
    </>
  )

  const activeQueueProducts = products.filter(p => !soldItems.includes(p.id))
  const soldQueueProducts = products.filter(p => soldItems.includes(p.id))

  const queuePanelContent = (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, flexShrink: 0 }}>Jono ({activeQueueProducts.length})</div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {activeQueueProducts.map((p) => {
          const i = products.indexOf(p)
          const active = p.id === currentProductId
          return (
            <div
              key={p.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onClick={() => setCurrentProductId(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, background: active ? 'rgba(46,204,113,0.18)' : 'rgba(255,255,255,0.04)', cursor: 'grab', border: `1px solid ${active ? GREEN_DIM : 'transparent'}`, flexShrink: 0 }}
            >
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>⠿</span>
              {p.imageUrl ? <img src={p.imageUrl.split('|||')[0]} alt={p.name} style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} /> : <div style={{ width: 26, height: 26, borderRadius: 4, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />}
              <span style={{ fontSize: 12, color: active ? GREEN : '#eee', fontWeight: active ? 700 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <button onClick={e => { e.stopPropagation(); setProductDetailId(p.id) }} title="Näytä isompana / muokkaa" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: 2, flexShrink: 0 }}>⤢</button>
            </div>
          )
        })}

        {soldQueueProducts.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 2 }}>Myydyt ({soldQueueProducts.length})</div>
            {soldQueueProducts.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', opacity: 0.5, flexShrink: 0 }}>
                {p.imageUrl ? <img src={p.imageUrl.split('|||')[0]} alt={p.name} style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} /> : <div style={{ width: 26, height: 26, borderRadius: 4, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />}
                <span style={{ fontSize: 12, color: '#eee', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ fontSize: 10, color: GREEN, fontWeight: 700, flexShrink: 0 }}>✓</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        {showQuickAdd ? (
          <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 10 }}>
            <input value={qaName} onChange={e => setQaName(e.target.value)} placeholder="Tuotteen nimi" style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '7px 9px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
            <input type="text" inputMode="decimal" value={qaPrice} onChange={e => setQaPrice(e.target.value)} placeholder="Lähtöhinta €" style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '7px 9px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
            <input type="text" inputMode="decimal" value={qaBidIncrement} onChange={e => setQaBidIncrement(e.target.value)} placeholder="Minimikorotus € (oletus 1€)" style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '7px 9px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
            <div onClick={() => qaImageRef.current?.click()} style={{ width: '100%', aspectRatio: '1', maxHeight: 60, borderRadius: 6, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden' }}>
              {qaImage ? <img src={qaImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>+ Kuva</span>}
            </div>
            <input ref={qaImageRef} type="file" accept="image/*" onChange={handleQaImage} style={{ display: 'none' }} />
            {qaError && <div style={{ fontSize: 11, color: '#FCA5A5', marginBottom: 6 }}>{qaError}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setShowQuickAdd(false); setQaError('') }} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ccc', padding: '7px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Peruuta</button>
              <button onClick={quickAddProduct} disabled={qaSaving || !qaName.trim() || !qaPrice} style={{ flex: 1, background: GREEN_DIM, border: 'none', color: '#fff', padding: '7px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: qaSaving || !qaName.trim() || !qaPrice ? 0.6 : 1 }}>Lisää</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowQuickAdd(true)} style={{ width: '100%', marginTop: 10, background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', color: '#ccc', padding: '8px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Lisää tuote</button>
        )}
      </div>
    </>
  )

  const chatFeedContent = (
    <>
      <div ref={feedRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {feed.length === 0 && <div style={{ color: DARK_MUTED, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Ei viestejä vielä</div>}
        {feed.map(item => {
          if (item.kind === 'system') return <div key={item.id} style={{ fontSize: 11, color: DARK_MUTED, textAlign: 'center', padding: '4px 0' }}>{item.text}</div>
          // Huudot eivät ole enää omia laatikoitaan — aktiivisen huudon aikana niitä tulee
          // paljon peräkkäin, ja jokainen omana samanvärisenä laatikkonaan näytti "seinältä
          // identtisiä laatikoita" (ks. CLAUDE.md "Uudet löydökset 2026-08-13, osa 5" kohta 28).
          // Rivimäinen esitys + erottuva lihavoitu hintasumma riittää erottamaan huudon
          // tavallisesta viestistä ilman että se dominoi koko syötettä visuaalisesti.
          if (item.kind === 'bid') return (
            <div key={item.id} style={{ fontSize: 12 }}>
              <span style={{ color: GREEN_DIM, fontWeight: 700 }}>{item.username} </span>
              <span style={{ color: DARK_TEXT_SUB }}>huusi </span>
              <span style={{ color: GREEN, fontWeight: 800 }}>{item.amount}€</span>
            </div>
          )
          if (item.kind === 'purchase') return (
            <div key={item.id} style={{ padding: '7px 9px', background: GREEN_BG, border: `1px solid ${GREEN}55`, borderRadius: 7, fontSize: 12 }}>
              <span style={{ color: GREEN, fontWeight: 700 }}>{item.username}</span>
              <span style={{ color: DARK_TEXT }}> osti </span>
              <span style={{ color: DARK_TEXT, fontWeight: 700 }}>{item.productName}</span>
              <span style={{ color: GREEN, fontWeight: 800 }}> {item.amount}€</span>
            </div>
          )
          return (
            <div key={item.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, color: DARK_TEXT }}>{item.username}: </span>
                <span style={{ color: DARK_TEXT_SUB, overflowWrap: 'break-word' }}>{item.message}</span>
              </div>
              <button onClick={() => deleteMessage(item.id)} title="Poista" style={{ background: 'none', border: 'none', color: DARK_DIM, cursor: 'pointer', fontSize: 11, padding: 0, flexShrink: 0 }}>✕</button>
              <button onClick={() => muteUser(item.userId)} title="Mykistä" style={{ background: 'none', border: 'none', color: DARK_DIM, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: 0, flexShrink: 0 }}>MYKISTÄ</button>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '8px 10px', borderTop: `1px solid ${DARK_BORDER}`, display: 'flex', gap: 6, flexShrink: 0 }}>
        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Kirjoita viesti..." style={{ flex: 1, background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, borderRadius: 18, padding: '7px 12px', color: DARK_TEXT, fontSize: 12, outline: 'none', minWidth: 0 }} />
        <button onClick={sendChat} style={{ background: GREEN_DIM, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#fff', fontSize: 13 }}>➤</button>
      </div>
    </>
  )

  const topStats = [
    { label: 'Kesto', value: fmtDuration(elapsedSeconds) },
    { label: 'Katsojia', value: String(viewers) },
    { label: 'Myynti', value: `${todaySales.toLocaleString('fi-FI')}€` },
    { label: 'Myyty', value: `${soldItems.length} kpl` },
  ]

  const pillBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 14, fontSize: 11, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }

  // ===== Ei vielä lähetystä: esikatselu/asetusnäkymä (myös tämä täysnäkymässä, ei dashboard-kehystä) =====
  if (!isLive) {
    return (
      <div style={{ minHeight: '100vh', background: DARK_BG, color: DARK_TEXT }}>
        <BackButton />
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '60px 20px 40px' : '60px 32px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: DARK_TEXT }}>Lähetys</h1>
              <p style={{ color: DARK_MUTED, fontSize: 13, marginTop: 4 }}>{products.length} tuotetta jonossa</p>
            </div>
            <button onClick={() => setShowSettings(s => !s)} style={{ background: DARK_SURFACE, border: `1px solid ${DARK_BORDER}`, color: DARK_MUTED, padding: '8px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Asetukset</button>
          </div>

          {showSettings && (
            <div style={{ background: DARK_PANEL_BG, border: `1px solid ${DARK_BORDER}`, borderRadius: 12, padding: '18px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DARK_TEXT, marginBottom: 12 }}>Oletuskesto per tuote</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {[60, 120, 180, 300, 600].map(s => (
                  <button key={s} onClick={() => setAuctionDuration(s)} style={{ background: auctionDuration === s ? GREEN_DIM : DARK_SURFACE2, border: `1px solid ${auctionDuration === s ? GREEN_DIM : DARK_BORDER}`, color: auctionDuration === s ? '#fff' : DARK_MUTED, padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: auctionDuration === s ? 700 : 400 }}>
                    {s >= 60 ? `${s / 60} min` : `${s}s`}
                  </button>
                ))}
              </div>
              <input type="number" value={auctionDuration} onChange={e => setAuctionDuration(Number(e.target.value))} placeholder="tai syötä oma (sekunteina)" style={{ width: 200, background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, borderRadius: 6, padding: '8px 12px', color: DARK_TEXT, fontSize: 13, outline: 'none' }} />
            </div>
          )}

          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 14, color: DARK_MUTED, marginBottom: 16 }}>Ei tuotteita — lisää tuotteita ensin</div>
              <a href="/dashboard/tuotteet" style={{ background: GREEN_DIM, color: '#fff', textDecoration: 'none', padding: '10px 24px', borderRadius: 7, fontWeight: 700, fontSize: 14 }}>→ Lisää tuotteita</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
              {/* Vasen: julkaisutavan valinta + kamera-esikatselu */}
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button
                    onClick={() => { publishModeTouched.current = true; setPublishMode('phone') }}
                    style={{ flex: 1, background: publishMode === 'phone' ? GREEN_DIM : DARK_SURFACE, border: `1px solid ${publishMode === 'phone' ? GREEN_DIM : DARK_BORDER}`, color: publishMode === 'phone' ? '#fff' : DARK_MUTED, padding: '9px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                  >Ilman OBS:aa</button>
                  <button
                    onClick={() => { publishModeTouched.current = true; setPublishMode('obs') }}
                    style={{ flex: 1, background: publishMode === 'obs' ? GREEN_DIM : DARK_SURFACE, border: `1px solid ${publishMode === 'obs' ? GREEN_DIM : DARK_BORDER}`, color: publishMode === 'obs' ? '#fff' : DARK_MUTED, padding: '9px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                  >OBS:lla</button>
                </div>

                {publishMode === 'obs' && (
                  <div style={{ background: DARK_PANEL_BG, border: `1px solid ${DARK_BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                    {obsCardContent}
                  </div>
                )}

                <div style={{ borderRadius: 12, overflow: 'hidden', background: '#080C16', aspectRatio: '16/9', position: 'relative', marginBottom: 12 }}>
                  <video ref={videoRef} muted playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  {!camReady && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>●</div>
                      <div style={{ fontSize: 14 }}>Kamera ei ole päällä</div>
                    </div>
                  )}
                  {camReady && (
                    <div style={{ position: 'absolute', top: 10, left: 10, background: phonePublishing ? '#EF4444' : GREEN_DIM, color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4 }}>
                      {phonePublishing ? 'LÄHETYS KÄYNNISSÄ' : 'ESIKATSELU'}
                    </div>
                  )}
                </div>

                {publishMode === 'phone' ? (
                  <>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      {!camReady && <button onClick={() => startCamera(selectedDevice || undefined)} style={{ flex: 1, background: DARK_SURFACE, border: `1px solid ${DARK_BORDER}`, color: DARK_TEXT, padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Testaa kamera</button>}
                      {camReady && !phonePublishing && (
                        <>
                          <button onClick={stopCamera} style={{ flex: 1, background: DARK_SURFACE, border: `1px solid ${DARK_BORDER}`, color: DARK_MUTED, padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Sammuta kamera</button>
                          <button onClick={startPhonePublish} style={{ flex: 1, background: GREEN_DIM, border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Aloita kameralähetys</button>
                        </>
                      )}
                      {phonePublishing && <button onClick={() => { stopPhonePublish(); stopCamera() }} style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Lopeta kameralähetys</button>}
                    </div>
                    <div style={{ fontSize: 11, color: DARK_MUTED }}>{phonePublishing ? 'Kamerasi kuva menee nyt suoraan lähetykseen — ei tarvitse OBS:aa.' : 'Aloita kamera, ja paina sitten "Aloita kameralähetys" julkaistaksesi kuvan suoraan tästä laitteesta ilman OBS:aa.'}</div>
                    {phonePublishError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '8px 12px', marginTop: 10, color: '#EF4444', fontSize: 13 }}>{phonePublishError}</div>}
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                    {!camReady
                      ? <button onClick={() => startCamera(selectedDevice || undefined)} style={{ flex: 1, background: DARK_SURFACE, border: `1px solid ${DARK_BORDER}`, color: DARK_TEXT, padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Testaa kamera</button>
                      : <button onClick={stopCamera} style={{ flex: 1, background: DARK_SURFACE, border: `1px solid ${DARK_BORDER}`, color: DARK_MUTED, padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Sammuta esikatselu</button>
                    }
                  </div>
                )}
                {publishMode === 'obs' && <div style={{ fontSize: 11, color: DARK_MUTED }}>Tämä on vain esikatselu sinulle — itse lähetys striimataan OBS:lla (ohjeet näkyvät kun aloitat lähetyksen)</div>}
                {camError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '8px 12px', marginTop: 10, color: '#EF4444', fontSize: 13 }}>{camError}</div>}
              </div>

              {/* Oikea: lähetyksen tiedot -lomake */}
              <div>
                <div style={{ background: DARK_PANEL_BG, border: `1px solid ${DARK_BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: DARK_MUTED, display: 'block', marginBottom: 8 }}>Lähetyksen nimi *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="esim. Pokémon-kortteja livenä" style={{ width: '100%', background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, borderRadius: 7, padding: '9px 12px', color: DARK_TEXT, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: DARK_MUTED, display: 'block', marginBottom: 8 }}>Kategoria</label>
                      <select value={category} onChange={e => { setCategory(e.target.value); setAlakategoria('') }} style={{ width: '100%', background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, borderRadius: 7, padding: '9px 12px', color: DARK_TEXT, fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}>
                        <option value="">Valitse...</option>
                        {getNakyvatKategoriat().map(k => <option key={k.id} value={k.id}>{getKatNimi(k, lang as any)}</option>)}
                      </select>
                    </div>
                    {(getNakyvatKategoriat().find(k => k.id === category)?.alakategoriat ?? []).length > 0 && (
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: DARK_MUTED, display: 'block', marginBottom: 8 }}>Alakategoria</label>
                        <select value={alakategoria} onChange={e => setAlakategoria(e.target.value)} style={{ width: '100%', background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, borderRadius: 7, padding: '9px 12px', color: DARK_TEXT, fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}>
                          <option value="">Valitse...</option>
                          {getNakyvatKategoriat().find(k => k.id === category)?.alakategoriat.map(a => <option key={a.id} value={a.id}>{getAlaNimi(a, lang as any)}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <label style={{ fontSize: 12, fontWeight: 600, color: DARK_MUTED, display: 'block', marginBottom: 8 }}>{t.selaa.city}</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="esim. Helsinki" style={{ width: '100%', background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, borderRadius: 7, padding: '9px 12px', color: DARK_TEXT, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

                  <label style={{ fontSize: 12, fontWeight: 600, color: DARK_MUTED, display: 'block', marginBottom: 8 }}>Kameralähde (esikatselu)</label>
                  {devices.length === 0
                    ? <div style={{ fontSize: 13, color: DARK_MUTED, marginBottom: 12 }}>Paina "Testaa kamera" salliaksesi käytön</div>
                    : <select value={selectedDevice} onChange={e => { setSelectedDevice(e.target.value); if (camReady) startCamera(e.target.value) }} style={{ width: '100%', background: DARK_SURFACE2, border: `1px solid ${DARK_BORDER}`, borderRadius: 7, padding: '9px 12px', color: DARK_TEXT, fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}>
                        {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                      </select>
                  }

                  <label style={{ fontSize: 12, fontWeight: 600, color: DARK_MUTED, display: 'block', marginBottom: 8 }}>Markkinointikuva (valinnainen)</label>
                  <div
                    onClick={() => thumbnailRef.current?.click()}
                    style={{
                      width: '100%', aspectRatio: '21/9', borderRadius: 10,
                      border: `2px dashed ${thumbnail ? GREEN_DIM : DARK_BORDER}`, background: DARK_SURFACE2,
                      cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', position: 'relative',
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
                      <div style={{ textAlign: 'center', color: DARK_MUTED }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>+</div>
                        <div style={{ fontSize: 12 }}>Lisää markkinointikuva</div>
                      </div>
                    )}
                  </div>
                  <input ref={thumbnailRef} type="file" accept="image/*" onChange={handleThumbnail} style={{ display: 'none' }} />
                </div>

                {startError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '10px 14px', marginBottom: 16, color: '#EF4444', fontSize: 13 }}>{startError}</div>}

                <button onClick={createShow} disabled={starting} style={{ width: '100%', background: GREEN_DIM, color: '#fff', border: 'none', padding: '12px', borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: starting ? 'default' : 'pointer', opacity: starting ? 0.7 : 1 }}>
                  {starting ? 'Luodaan...' : 'Luo lähetys ja testaa yhteys'}
                </button>
                <div style={{ fontSize: 11, color: DARK_MUTED, textAlign: 'center', marginTop: 8 }}>Tämä ei vielä näy katsojille — vasta erillinen "Aloita julkinen lähetys" -painallus tekee lähetyksestä julkisen.</div>
              </div>
            </div>
          )}
        </div>
        {confirmDialog && <ConfirmDialog message={confirmDialog.message} danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />}
      </div>
    )
  }

  if (!show || !currentProduct) return null

  // ===== Live/esikatselukonsoli — TÄYSNÄKYMÄ, ei dashboard-kehystä, video hallitsee =====
  return (
    <div style={{ height: '100dvh', width: '100vw', overflow: 'hidden', background: DARK_BG, display: 'flex', flexDirection: isMobile ? 'column' : 'row', position: 'relative' }}>
      {/* ===== VIDEO-ALUE: 100% mobiilissa, ~74% desktopilla ===== */}
      <div style={{ position: 'relative', flex: isMobile ? '1 1 auto' : '0 0 75%', minHeight: 0, background: '#080C16' }}>
        <HlsPreview wsUrl={previewWsUrl} token={previewToken} onStats={setPreviewStats} />
        <BackButton overlay />

        {/* Yläpalkki-overlay: tila + kesto/katsojat/myynti + toiminnot, videon YLÄREUNAN päällä */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)', padding: isMobile ? '10px 10px 26px 54px' : '12px 16px 30px 60px', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
            {showStatus === 'LIVE' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>LIVE{!connected ? ' — yhdistetään...' : ''}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: GREEN }}>ESIKATSELU</span>
              </div>
            )}
            {previewStats && (
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: previewStats.h >= 720 ? '#4ADE80' : '#FBBF24', paddingLeft: 13 }}>
                {previewStats.w}×{previewStats.h} · {previewStats.fps}fps · {previewStats.kbps > 0 ? `${previewStats.kbps} kbps` : '…'}
              </div>
            )}
          </div>
          {topStats.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={shareStream} style={pillBtn}>{copied === 'share' ? '✓ Kopioitu' : 'Jaa striimi'}</button>
          <button onClick={() => setShowModTools(s => !s)} style={pillBtn}>Moderointi</button>
          <button onClick={() => setShowObsInfo(s => !s)} style={pillBtn}>OBS</button>
          {showStatus === 'SCHEDULED' && (
            <button onClick={goPublic} disabled={goingPublic} style={{ ...pillBtn, background: GREEN_DIM, opacity: goingPublic ? 0.7 : 1 }}>
              {goingPublic ? 'Julkaistaan...' : 'Aloita julkinen lähetys'}
            </button>
          )}
          <button onClick={endShow} style={{ ...pillBtn, background: 'rgba(239,68,68,0.85)' }}>Lopeta</button>
        </div>

        {(showObsInfo || showModTools) && (
          <div style={{ position: 'absolute', top: isMobile ? 56 : 60, right: 12, zIndex: 20, width: isMobile ? 'calc(100% - 24px)' : 320, background: 'rgba(15,15,15,0.92)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '14px 16px', color: '#fff' }}>
            {showObsInfo ? obsCardContent : modToolsContent}
          </div>
        )}

        {auction.active && (
          <div style={{ position: 'absolute', top: isMobile ? 52 : 60, left: '50%', transform: 'translateX(-50%)', zIndex: 5, background: 'rgba(0,0,0,0.75)', border: `1px solid ${timerColor}`, borderRadius: 8, padding: '5px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 900, color: timerColor }}>{fmt(auction.timer)}</div>
          </div>
        )}

        {/* Jono: kapea liukuva overlay-paneeli videon vasemmasta reunasta, oletuksena kiinni */}
        <button onClick={() => setShowQueue(s => !s)} style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', zIndex: 15, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '0 8px 8px 0', padding: '10px 6px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', writingMode: 'vertical-rl' as const }}>
          Jono ({products.length})
        </button>
        {showQueue && (
          // bottom (ei 0) jättää tilaa alapalkille ja mobiilin chat-overlaylle yläpuolelle -
          // ennen Jono ulottui koko korkeuden yli ja peitti korkeammalla z-indexillä molemmat,
          // jolloin chat-tekstikenttä ei enää saanut klikkauksia/fokusta läpi. Käyttää samaa
          // mitattua bottomBarHeight-arvoa kuin chat-overlay (ks. bottomBarRef-kommentti
          // yllä) kiinteän arvauksen sijaan, samasta syystä.
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: isMobile ? bottomBarHeight + 10 : 200, zIndex: 14, width: isMobile ? '78%' : 240, background: 'rgba(10,10,10,0.94)', backdropFilter: 'blur(10px)', borderRight: '1px solid rgba(255,255,255,0.12)', borderBottom: '1px solid rgba(255,255,255,0.12)', borderBottomRightRadius: 12, padding: '54px 12px 12px', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            {queuePanelContent}
          </div>
        )}

        {/* Alapalkki-overlay: nykyinen tuote + pikatoiminnot, videon ALAREUNAN päällä */}
        <div ref={bottomBarRef} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, background: 'linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.1) 100%)', padding: isMobile ? '30px 10px 10px' : '40px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {currentProduct.imageUrl && <img src={currentProduct.imageUrl.split('|||')[0]} alt={currentProduct.name} style={{ width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: `2px solid ${GREEN_DIM}` }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentProduct.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{auction.active ? 'Nykyinen huuto' : 'Lähtöhinta'}{auction.leaderName ? ` · ${auction.leaderName} johtaa` : ''}</div>
            </div>
            <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: auction.active && auction.leaderName ? GREEN : '#fff', flexShrink: 0 }}>{auction.active ? auction.currentBid : currentProduct.startPrice}€</div>
          </div>

          {!auction.active && !isSold && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Kesto:</span>
                {[30, 60, 120].map(s => (
                  <button key={s} onClick={() => setDurationOverride(s)} style={{ background: effectiveDuration === s ? GREEN_DIM : 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: effectiveDuration === s ? 700 : 400, cursor: 'pointer' }}>
                    {s >= 60 ? `${s / 60}min` : `${s}s`}
                  </button>
                ))}
                <input
                  type="number"
                  value={effectiveDuration}
                  onChange={e => setDurationOverride(Number(e.target.value) || 1)}
                  style={{ width: 64, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 11, outline: 'none' }}
                />
              </div>
              <button onClick={startAuction} style={{ width: '100%', background: GREEN_DIM, color: '#fff', border: 'none', padding: '10px', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>Aloita huutokauppa ({fmt(effectiveDuration)})</button>
            </>
          )}
          {auctionDoneForCurrent && !isLast && <button onClick={nextProduct} style={{ width: '100%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>Seuraava tuote →</button>}
          {auctionDoneForCurrent && isLast && <div style={{ textAlign: 'center', color: GREEN, fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Kaikki tuotteet käyty läpi!</div>}

          {quickActionsRow}
          {stubMsg && <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{stubMsg}</div>}
        </div>
      </div>

      {/* ===== CHAT: kapea sarake oikealla desktopilla (~25-26%); mobiilissa ei omaa saraketta, chat on osa overlayta ===== */}
      {!isMobile && (
        <div style={{ flex: '0 0 25%', minWidth: 260, height: '100%', background: DARK_PANEL_BG, borderLeft: `1px solid ${DARK_BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${DARK_BORDER}`, fontSize: 12, fontWeight: 700, color: DARK_MUTED, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>Chat</div>
          {chatFeedContent}
        </div>
      )}

      {/* Mobiili: chat overlay videon alareunan yläpuolella, kompaktina. zIndex korkeampi kuin
          alapalkin (10). KORJAUS 2026-08-14: pohja-padding oli aiemmin kiinteä 190px-arvaus
          alapalkin korkeudesta - kun alapalkin todellinen korkeus (kesto-valinta+aloitusnappi+
          5 pikatoimintonappia, voivat kääriytyä useammalle riville) ylitti sen, alapalkin
          yläosa (tuotekuva/nimi/hinta) meni sekaisin/päällekkäin chat-inputin kanssa - täsmälleen
          se mistä tämä kommentti aiemmin varoitti, mutta arvattu vakio ei riittänyt kaikissa
          tiloissa. `bottomBarHeight` mitataan nyt oikeasti DOM:sta (ks. bottomBarRef yllä), ei
          arvata. */}
      {isMobile && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 12, padding: `0 10px ${bottomBarHeight + 10}px`, pointerEvents: 'none' }}>
          <div
            ref={mobileFeedRef}
            onScroll={e => {
              const el = e.currentTarget
              mobileFeedStickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
            }}
            style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'auto' }}
          >
            {feed.slice(-40).map(item => {
              if (item.kind === 'system') return <div key={item.id} style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{item.text}</div>
              if (item.kind === 'purchase') return (
                <div key={item.id} style={{ background: 'rgba(46,204,113,0.4)', borderRadius: 10, padding: '4px 9px', backdropFilter: 'blur(8px)', alignSelf: 'flex-start' }}>
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{item.username} osti {item.productName} · {item.amount}€</span>
                </div>
              )
              return (
                <div key={item.id} style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: '4px 9px', backdropFilter: 'blur(8px)', alignSelf: 'flex-start', maxWidth: '85%' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: GREEN_DIM }}>{item.username} </span>
                  {item.kind === 'bid'
                    ? <><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>huusi </span><span style={{ fontSize: 11, color: GREEN, fontWeight: 800 }}>{item.amount}€</span></>
                    : <span style={{ fontSize: 11, color: '#fff' }}>{item.message}</span>}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, pointerEvents: 'auto' }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Kirjoita viesti..." style={{ flex: 1, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '7px 12px', color: '#fff', fontSize: 12, outline: 'none', minWidth: 0 }} />
            <button onClick={sendChat} style={{ background: GREEN_DIM, border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#fff', fontSize: 12 }}>➤</button>
          </div>
        </div>
      )}
      {confirmDialog && <ConfirmDialog message={confirmDialog.message} danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />}
      {productDetailId && (() => {
        const p = products.find(x => x.id === productDetailId)
        return p ? <QueueProductModal product={p} onClose={() => setProductDetailId(null)} /> : null
      })()}
    </div>
  )
}
