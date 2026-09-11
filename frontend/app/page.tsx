'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import ProductCard from '@/components/ProductCard'
import ScrollReveal from '@/components/ScrollReveal'
import { useTheme } from '@/lib/theme-context'
import { useState, useMemo, useEffect } from 'react'
import { useKategoria } from '@/lib/kategoria-context'
import { getKatNimi, getAlaNimi, getTyyppiNimi, getNakyvatKategoriat } from '@/lib/kategoriat'
import { useLang } from '@/lib/lang-context'
import Footer from '@/components/layout/Footer'
import { useAuth } from '@/lib/auth-context'
import { auctionApi, adApi, AdSlot } from '@/lib/api'
import { BACKEND_URL } from '@/lib/backend'
import { formatShowTime } from '@/lib/formatShowTime'

function auctionTimeLeft(ms: number, endedLabel: string) {
  if (ms <= 0) return endedLabel
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (d > 0) return `${d}pv ${h}h`
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

// Mainostila etusivulle (omistajan pyyntö). Kun tuleva lähetys on jo aikataulutettu,
// nostetaan se suoraan tänne omana korostettuna bannerinaan - hyödyntää dataa joka on jo
// haettu (displayUpcoming), ei vaadi erillistä sisällönhallintaa. Jos yhtään lähetystä ei
// ole aikataulutettu, näytetään evergreen-viesti (t.home.promo*) sen sijaan.
//
// KORJAUS 2026-09-02: kaikki tämän komponentin tekstit olivat kovakoodattua suomea (rikkoi
// LUKITTU "AINA t.xxx" -sääntöä) - kielenvaihto EI vaikuttanut tähän bannerinin ollenkaan,
// vahvistettu omistajan raportoimaksi bugiksi. Siirretty t.home-nimiavaruuteen (fi/en/sv).
function PromoBanner({ C, isMobile, upcoming, t, lang }: { C: Record<string, string>; isMobile: boolean; upcoming?: { id: string; seller: string; title: string; thumbnail: string; scheduledAt?: string }; t: any; lang: string }) {
  const { user } = useAuth()
  if (upcoming) {
    return (
      <Link
        href={`/live/${upcoming.id}`}
        className="hb-card"
        style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 0, background: C.accentLight, border: `1px solid ${C.accent}55`, borderRadius: 16, overflow: 'hidden', textDecoration: 'none', marginBottom: 32, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
      >
        <div className="hb-card-img" style={{ width: isMobile ? '100%' : 220, height: isMobile ? 140 : 124, flexShrink: 0, background: C.surface, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {upcoming.thumbnail
            ? <img src={upcoming.thumbnail} alt={upcoming.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <span style={{ fontSize: 28, color: C.dim }}>+</span>
          }
        </div>
        <div style={{ padding: isMobile ? '16px 18px' : '18px 26px', flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>
            {t.home.upcoming}{upcoming.scheduledAt ? ` · ${formatShowTime(upcoming.scheduledAt, t, lang as 'fi' | 'en')}` : ''}
          </div>
          <div style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: isMobile ? 16 : 19, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: '-0.005em' }}>{upcoming.title}</div>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: isMobile ? 12 : 0 }}>@{upcoming.seller} · {t.home.upcomingPreBidOpen}</div>
        </div>
        <div style={{ padding: isMobile ? '0 18px 16px' : '0 26px 0 0', flexShrink: 0 }}>
          <span className="hb-btn" style={{ display: 'inline-block', background: C.accentSolid, color: C.accentText, padding: '9px 18px', borderRadius: 8, fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
            {t.home.watchShow} →
          </span>
        </div>
      </Link>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, background: C.accentLight, border: `1px solid ${C.accent}55`, borderRadius: 16, padding: isMobile ? '18px 20px' : '20px 26px', marginBottom: 32 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>HABAHUB</div>
        <div style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: isMobile ? 16 : 19, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: '-0.005em' }}>{t.home.promoTitle}</div>
        {t.home.promoBody && <div style={{ fontSize: 13, color: C.textSub, maxWidth: 480 }}>{t.home.promoBody}</div>}
      </div>
      {/* Piilotettu kirjautuneilta - "Luo tili" ei ole relevantti kun tili on jo olemassa.
          borderRadius 999 (täysi pilleri) - yhtenäistetty mainosbannerin CTA-tyylin kanssa
          (ks. AdBanner:n ctaStyle), oli aiemmin 8 eli selvästi eri pyöristys samalla sivulla. */}
      {!user && (
        <Link href="/register" className="hb-btn" style={{ background: C.accentSolid, color: C.accentText, padding: '10px 22px', borderRadius: 999, fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {t.home.promoCta} →
        </Link>
      )}
    </div>
  )
}

// Maksettu/nostettu mainospaikka (ks. CLAUDE.md "Iso testauskierros 2026-09-04" kohta 6).
// Sisältö tulee nyt AdSlot-tietokantataulusta (admin muokkaa /admin-paneelin "Mainos"
// -välilehdeltä, ei koodimuutosta joka kerta) - ei enää kovakoodattua t.home.ad*-tekstiä.
// Ei renderöi mitään jos rivi puuttuu tai admin on kytkenyt sen pois päältä (ad === null).
// Karuselli - useampi aktiivinen mainos pyörii automaattisesti (omistajan pyyntö 2026-09-11,
// ks. CLAUDE.md "Mainostila karuselliksi"). Yhden mainoksen tapauksessa ajastin ei vaihda mitään
// havaittavaa (moduloi aina samaan ainoaan indeksiin) - ei tarvitse erillistä ehtoa piilottaa sitä.
function AdBanner({ C, isMobile, t, ads }: { C: Record<string, string>; isMobile: boolean; t: any; ads: AdSlot[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (ads.length < 2) return
    const iv = setInterval(() => setIndex(i => (i + 1) % ads.length), 6000)
    return () => clearInterval(iv)
  }, [ads.length])

  // Jos lista lyhenee kesken kaiken (admin poistaa mainoksen juuri kun se on näytössä), index
  // voisi muuten jäädä range-ulkopuolelle ja renderöidä undefined:n.
  useEffect(() => {
    if (index >= ads.length) setIndex(0)
  }, [ads.length, index])

  if (ads.length === 0) return null
  const ad = ads[index]
  const href = ad.ctaHref || '/huutokaupat'
  // Omistajan pitää voida linkittää MIHIN TAHANSA osoitteeseen, ei vain sivuston omiin
  // reitteihin (ks. CLAUDE.md) - ulkoinen linkki (http/https-alkuinen) renderöidään tavallisena
  // <a>-tagina uuteen välilehteen, sisäinen polku (esim. "/huutokaupat") next/link:llä kuten ennen.
  const ctaContent = <>{ad.ctaText || t.home.adCta} →</>
  const ctaStyle = { whiteSpace: 'nowrap' as const, padding: '10px 22px', borderRadius: 999, background: C.accentSolid, color: C.accentText, fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-display), sans-serif', flexShrink: 0, textDecoration: 'none' }
  // Loopattava GIF/MP4 (LISÄTTY 2026-09-10) ottaa aina etusijan staattiseen kuvaan nähden, jos
  // molemmat on asetettu - admin-lomake ei näytä molempia yhtä aikaa (ks. AdminAdManagement.tsx).
  const isVideo = !!ad.videoUrl && ad.videoUrl.startsWith('data:video/')
  const hasImage = !!ad.imageUrl || !!ad.videoUrl
  // Kuva/video täyttää nyt KOKO laatikon (ei enää pieni 56px kuvake) - omistajan pyyntö 2026-09-07.
  // Tausta on absoluuttisesti asemoitu, tumma liukuväri (scrim) sen päällä pitää tekstin
  // luettavana taustasta riippumatta, sisältö+CTA overlayna liukuvärin päällä.
  // Laatikko myös korkeampi kuin ennen (minHeight) jotta tausta ehtii näkyä kunnolla.
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#0F172A', border: '1px solid #1E293B', borderRadius: 20, minHeight: isMobile ? 260 : 320, display: 'flex', marginBottom: 32, boxShadow: '0 20px 40px -20px rgba(0,0,0,0.4)' }}>
      {/* borderRadius toistettu myös itse media-elementissä (ei vain kääre-divissä) - pelkkä
          kääreen overflow:hidden ei aina riitä, koska video promotoituu omaksi, laitteisto-
          kiihdytetyksi compositing-kerroksekseen (erityisesti Android/Chrome), joka voi jättää
          esi-isän border-radius-rajauksen huomiotta ja vuotaa pyöristettyjen kulmien yli.
          key={ad.id + '-bg'} + hb-ad-fade käynnistää lyhyen opacity-animaation aina kun
          karuselli vaihtaa mainosta (React remounttaa elementin key:n muuttuessa). */}
      <div key={ad.id + '-bg'} className="hb-ad-fade" style={{ position: 'absolute', inset: 0 }}>
        {ad.videoUrl ? (
          isVideo
            ? <video src={ad.videoUrl} autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20 }} />
            : <img src={ad.videoUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20 }} />
        ) : ad.imageUrl && (
          <img src={ad.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20 }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: hasImage
            ? (isMobile
                ? 'linear-gradient(180deg, rgba(15,23,42,0.25) 0%, rgba(15,23,42,0.55) 45%, rgba(15,23,42,0.94) 100%)'
                : 'linear-gradient(90deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.5) 45%, rgba(15,23,42,0.92) 100%)')
            : 'none',
        }} />
      </div>
      {/* "Habahub suosittelee" -badge - siirretty 2026-09-10 pois oikean yläkulman absoluuttisesta
          asemoinnista (omistajan pyyntö: "laita kaikki samaan linjaan vasemmalta oikealle") osaksi
          normaalia sisältövirtaa, samaan vasempaan reunaan eyebrow/otsikko/kuvauksen kanssa.
          Väri vaihdettu läpinäkyvästä valkoisesta (ei erottunut kuvatustan päältä, omistajan
          raportoima) kiinteäksi vihreäksi taustaksi + mustaksi tekstiksi - sama pari kuin muualla
          sivustolla napeissa (accentSolid/accentText), aina riittävä kontrasti kuva-/väritaustasta
          riippumatta. key={ad.id + '-content'} - eri key kuin taustaelementillä, koska React
          vaatii uniikit key-arvot sisarusten kesken vaikka molemmat vaihtuvat samaan aikaan. Tämä
          pysyy normaalissa dokumenttivirtauksessa (ei position:absolute) - jos wrapattaisiin
          samaan absoluuttiseen taustadiviin, pitkä kuvausteksti voisi ylivuotaa minHeight:n yli
          ilman että ulompi flex-laatikko kasvaisi mukana. */}
      <div key={ad.id + '-content'} className="hb-ad-fade" style={{
        position: 'relative', zIndex: 1, width: '100%',
        padding: isMobile ? '40px 20px 24px' : '28px 32px',
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!hasImage && (
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${C.accentSolid}26`, border: `1px solid ${C.accentSolid}66`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
            </div>
          )}
          <div>
            <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.accentText, background: C.accentSolid, padding: '3px 9px', borderRadius: 4, marginBottom: 8 }}>
              {t.home.adLabel}
            </div>
            {ad.eyebrow && <div style={{ fontSize: 11, fontWeight: 700, color: hasImage ? '#fff' : C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{ad.eyebrow}</div>}
            <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: isMobile ? 18 : 24, color: '#fff', marginBottom: 5, textWrap: 'balance' as const }}>{ad.title}</div>
            <p style={{ fontSize: 13, color: '#CBD5E1', margin: 0, maxWidth: 480 }}>{ad.body}</p>
          </div>
        </div>
        {/* mailto:/tel: käsitellään samana "ulkoisena" reittinä kuin http(s) - LISÄTTY 2026-09-10
            omistajan mainostilan varausidean myötä (esim. "mailto:support@habahub.com"). Next.js:n
            oma <Link> on tarkoitettu sivuston sisäisille reiteille, ei taattu toimimaan
            luotettavasti mailto:-skeemalla kaikissa versioissa - ei jätetä tätä arvauksen varaan. */}
        {/^(https?|mailto|tel):/i.test(href)
          ? <a href={href} target={/^https?:/i.test(href) ? '_blank' : undefined} rel="noopener noreferrer" className="hb-btn" style={ctaStyle}>{ctaContent}</a>
          : <Link href={href} className="hb-btn" style={ctaStyle}>{ctaContent}</Link>
        }
      </div>
      {/* Pisteosoittimet - vain kun useampi mainos on aktiivisena, klikattavissa suoraan
          kyseiseen mainokseen hyppäämiseksi. Ei nollaa/käynnistä ajastinta uudestaan tarkoituksella
          - riittävän yksinkertainen, ei tarvitse debouncea klikkauksen ja seuraavan auto-vaihdon välillä. */}
      {ads.length > 1 && (
        <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, zIndex: 2, display: 'flex', justifyContent: 'center', gap: 7 }}>
          {ads.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}/${ads.length}`}
              style={{
                width: i === index ? 18 : 7, height: 7, borderRadius: 4, border: 'none', padding: 0, cursor: 'pointer',
                background: i === index ? C.accentSolid : 'rgba(255,255,255,0.4)', transition: 'width 0.2s ease, background 0.2s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const { C } = useTheme()
  const { activeKat, setActiveKat } = useKategoria()
  const { lang, t } = useLang()
  const { user } = useAuth()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(true)
  const [shows, setShows] = useState<any[]>([])
  const [products, setProductsState] = useState<any[]>([])
  const [auctions, setAuctions] = useState<any[]>([])
  const [heroHidden, setHeroHidden] = useState(false)
  const [activeAla, setActiveAla] = useState('')
  const [activeTyyppi, setActiveTyyppi] = useState('')
  const [now, setNow] = useState(Date.now())
  const [ads, setAds] = useState<AdSlot[]>([])

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    // Piilota hero kirjautuneille jos he ovat piilottaneet sen
    if (user) {
      const hidden = localStorage.getItem('habahub_hero_hidden')
      if (hidden === '1') setHeroHidden(true)
    }
  }, [user])

  useEffect(() => {
    // Ei socket-pohjaista live-päivitystä listaussivuille - pelkkä kertahaku mounttauksessa
    // jätti sivun jumiin siihen tilaan mikä se oli sivun avatessa, eli äsken alkanut live ei
    // koskaan ilmestynyt jos välilehti oli jo auki ennen striimin alkua. 20s pollaus riittää
    // tähän tarkoitukseen ilman uutta reaaliaikaista infraa.
    const fetchShows = () => fetch(BACKEND_URL + '/shows').then(r => r.json()).then(data => { if (Array.isArray(data)) setShows(data) }).catch(() => {})
    fetchShows()
    const showsIv = setInterval(fetchShows, 20000)

    import('@/lib/api').then(({ api }) => {
      api.getProducts({ limit: '12' })
        .then((data: any[]) => { if (Array.isArray(data) && data.length > 0) setProductsState(data) })
        .catch(() => {})
    })

    auctionApi.list({ limit: '4', sort: 'ending_soon' })
      .then((data: any[]) => { if (Array.isArray(data) && data.length > 0) setAuctions(data) })
      .catch(() => {})

    adApi.get().then(data => { if (Array.isArray(data)) setAds(data) }).catch(() => {})

    return () => clearInterval(showsIv)
  }, [])

  const mapShow = (s: any) => ({
    id: s.id, seller: s.seller?.username ?? 'myyjä',
    title: s.title, category: s.category ?? 'muu',
    viewers: s.viewerCount ?? 0,
    thumbnail: s.thumbnailUrl ?? '',
    scheduledAt: s.scheduledAt,
  })

  const displayShows = shows.filter((s: any) => s.status === 'LIVE').map(mapShow)
  const displayUpcoming = shows
    .filter((s: any) => s.status === 'SCHEDULED')
    .map(mapShow)
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))

  const displayProducts = products.map((p: any) => {
    const thumbnail = p.imageUrl ? p.imageUrl.split('|||')[0] : ''
    return {
      id: p.id, name: p.name, price: p.startPrice,
      condition: p.condition ?? '', gradingCompany: p.gradingCompany ?? null, grade: p.grade ?? null,
      seller: p.seller?.username ?? '', sellerBusinessId: p.seller?.businessId ?? null, vatIncluded: !!p.vatIncluded, sellerVerified: !!p.seller?.verified,
      category: p.category ?? 'muu', alakategoria: p.alakategoria ?? '', tyyppi: p.tyyppi ?? '', thumbnail,
    }
  })

  const filteredShows = useMemo(() => {
    if (activeKat === 'kaikki') return displayShows
    return displayShows.filter(s => s.category === activeKat)
  }, [activeKat, JSON.stringify(displayShows)])

  const filteredProducts = useMemo(() => {
    let p = displayProducts
    if (activeKat !== 'kaikki') p = p.filter(x => x.category === activeKat)
    if (activeAla) p = p.filter(x => x.alakategoria === activeAla)
    if (activeTyyppi) p = p.filter(x => x.tyyppi === activeTyyppi)
    return p
  }, [activeKat, activeAla, activeTyyppi, JSON.stringify(displayProducts)])

  const allKats = [{ id: 'kaikki', nimi: { fi: t.selaa.allCategories, en: t.selaa.allCategories, sv: t.selaa.allCategories } }, ...getNakyvatKategoriat()]


  function hideHero() {
    setHeroHidden(true)
    localStorage.setItem('habahub_hero_hidden', '1')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <Navbar />

      {/* Mainostila — AINA sivun ylin elementti (omistajan pyyntö 2026-09-04), navbarin
          alapuolella mutta ennen heroa/kaikkea muuta sisältöä. Sisältö AdSlot-taulusta,
          admin muokkaa /admin-paneelista - renderöi null jos ei konfiguroitu/pois päältä. */}
      {ads.length > 0 && (
        // ⚠️ TODELLINEN JUURISYY LÖYTYI 2026-09-10 pitkän diagnoosin jälkeen - ei ollut
        // koskaan välimuisti, vaan aito CSS-bugi joka ei näy millään palvelinpuolen
        // tarkistuksella (curl ei renderöi CSS:ää). Tämä div on suoran ulomman
        // `display:flex, flexDirection:'column'` -kääreen (rivi ~246) LAPSI - flexbox-
        // spesifikaation mukaan `margin:'0 auto'` flex-itemillä risteysakselilla
        // (pystysuuntaisessa flex-kontissa = vaaka-akseli) EI toimi kuten tavallisessa
        // block-layoutissa: se korvaa oletus `align-items:stretch`-käytöksen ja pakottaa
        // itemin kutistumaan sisältönsä levyiseksi, sitten keskittää sen auto-marginien
        // avulla - täsmälleen se "kapea, keskitetty laatikko" jonka omistaja näki
        // kuvakaappauksissa, riippumatta paddingista tai kuvasta. Alempi, jo ennestään
        // oikein toimiva pääsisältö-kääre (rivi ~330) välttää tämän koska sillä on SEKÄ
        // maxWidth+margin:auto ETTÄ eksplisiittinen width:'100%' - jälkimmäinen puuttui
        // tästä. Lisätty nyt sama width:'100%' tähänkin.
        <div style={{ width: '100%', maxWidth: 1440, margin: '0 auto', padding: isMobile ? '14px 14px 0' : '20px 24px 0' }}>
          <AdBanner C={C} isMobile={isMobile} t={t} ads={ads} />
        </div>
      )}

      {/* Hero */}
      {!heroHidden && (
        <div style={{ position: 'relative' }}>
          {/* Pulssi-efekti taustalla */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${C.accentSolid}1a 0%, transparent 70%)` }} />
          </div>

          <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '48px 24px 32px' : '76px 24px 52px', textAlign: 'center', position: 'relative' }}>
            <ScrollReveal>
              <h1 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: isMobile ? 30 : 52, fontWeight: 800, color: C.text, marginBottom: 14, lineHeight: 1.08, letterSpacing: '-0.03em' }}>
                {t.home.heroTitleLine1}<br />{t.home.heroTitleLine2}
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <p style={{ fontSize: isMobile ? 14 : 17, color: C.muted, marginBottom: 30, lineHeight: 1.6, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
                {t.home.heroSubtitle}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={160}>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
                <Link href="/selaa" className="hb-btn" style={{ background: C.accentSolid, color: C.accentText, padding: isMobile ? '12px 26px' : '14px 34px', borderRadius: 999, fontWeight: 800, fontSize: isMobile ? 14 : 15, textDecoration: 'none', fontFamily: 'var(--font-display), sans-serif' }}>
                  {t.home.heroBrowse}
                </Link>
              </div>
            </ScrollReveal>

            {/* Luottamuspalkki */}
            <ScrollReveal delay={240}>
              <div style={{ display: 'flex', gap: isMobile ? 16 : 32, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { label: t.home.heroTrustSecure },
                  { label: t.home.heroTrustFinnish },
                  { label: t.home.heroTrustCommission },
                  { label: t.home.heroTrustFreeSignup },
                ].map(item => (
                  <span key={item.label} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.accent, display: 'inline-block', flexShrink: 0 }} />
                    {item.label}
                  </span>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Piilota-nappi kirjautuneille */}
          {user && (
            <button onClick={hideHero} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 12, padding: '4px 8px' }}>
              {t.home.heroHide}
            </button>
          )}
        </div>
      )}

      {/* Mobiili: scrollattava kategoriapalkki */}
      {isMobile && (
        <div style={{ overflowX: 'auto', borderBottom: `1px solid ${C.border}`, background: C.navBg }}>
          <div style={{ display: 'flex', padding: '0 12px' }}>
            {allKats.map(kat => (
              <button key={kat.id} onClick={() => setActiveKat(kat.id)} style={{ padding: '10px 14px', fontSize: 13, fontWeight: activeKat === kat.id ? 700 : 400, color: activeKat === kat.id ? C.accent : C.textSub, background: 'transparent', border: 'none', borderBottom: activeKat === kat.id ? `2px solid ${C.accent}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {getKatNimi(kat as any, lang as any)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', maxWidth: 1440, margin: '0 auto', flex: 1, width: '100%' }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={{ width: 200, flexShrink: 0, padding: '16px 10px', borderRight: `1px solid ${C.border}`, position: 'sticky', top: 58, height: 'calc(100vh - 58px)', overflowY: 'auto' }}>
            <button onClick={() => { setActiveKat('kaikki'); setActiveAla(''); setActiveTyyppi('') }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeKat === 'kaikki' ? 700 : 400, color: activeKat === 'kaikki' ? C.accent : C.textSub, background: activeKat === 'kaikki' ? C.accentLight : 'transparent', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
              <span>{t.selaa.allCategories}</span>
              <span style={{ fontSize: 11, color: C.muted }}>{displayProducts.length}</span>
            </button>
            {getNakyvatKategoriat().map(kat => {
              const count = displayProducts.filter(p => p.category === kat.id).length
              return (
                <div key={kat.id}>
                  <button onClick={() => { setActiveKat(kat.id); setActiveAla(''); setActiveTyyppi('') }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeKat === kat.id ? 700 : 400, color: activeKat === kat.id ? C.accent : C.textSub, background: activeKat === kat.id ? C.accentLight : 'transparent', marginBottom: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{getKatNimi(kat, lang as any)}</span>
                    {count > 0 && <span style={{ fontSize: 11, color: C.muted }}>{count}</span>}
                  </button>
                  {activeKat === kat.id && kat.alakategoriat.length > 0 && (
                    <div style={{ marginLeft: 8, marginBottom: 4 }}>
                      {kat.alakategoriat.map((ala: any) => {
                        const alaCount = displayProducts.filter(p => p.alakategoria === ala.id).length
                        return (
                          <div key={ala.id}>
                            <button onClick={() => { setActiveAla(activeAla === ala.id ? '' : ala.id); setActiveTyyppi('') }} style={{ width: '100%', textAlign: 'left', padding: '5px 10px 5px 14px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, color: activeAla === ala.id ? C.accent : C.muted, background: activeAla === ala.id ? C.accentLight : 'transparent', marginBottom: 1, display: 'flex', justifyContent: 'space-between' }}>
                              <span>{getAlaNimi(ala, lang as any)}</span>
                              {alaCount > 0 && <span style={{ fontSize: 11 }}>{alaCount}</span>}
                            </button>
                            {activeAla === ala.id && ala.tyypit?.length > 0 && (
                              <div style={{ marginLeft: 10, marginBottom: 2, background: C.surface, borderRadius: 6, padding: '2px 0' }}>
                                {ala.tyypit.map((ty: any) => {
                                  const tyCount = displayProducts.filter(p => p.tyyppi === ty.id).length
                                  return (
                                    <button key={ty.id} onClick={() => setActiveTyyppi(activeTyyppi === ty.id ? '' : ty.id)} style={{ width: '100%', textAlign: 'left', padding: '4px 10px 4px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: activeTyyppi === ty.id ? 700 : 400, color: activeTyyppi === ty.id ? C.accent : C.muted, background: activeTyyppi === ty.id ? C.accentLight : 'transparent', display: 'flex', justifyContent: 'space-between' }}>
                                      <span>{getTyyppiNimi(ty, lang as any)}</span>
                                      {tyCount > 0 && <span style={{ fontSize: 10 }}>{tyCount}</span>}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pääsisältö */}
        <div style={{ flex: 1, padding: isMobile ? '16px 14px' : '24px 24px', minWidth: 0 }}>

          <PromoBanner C={C} isMobile={isMobile} upcoming={displayUpcoming[0]} t={t} lang={lang} />

          {/* Myynnissä — ensin */}
          {filteredProducts.length > 0 && (
            <ScrollReveal><section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: '-0.005em' }}>{t.home.buyNow}</h2>
                  <span style={{ fontSize: 13, color: C.muted }}>{filteredProducts.length}</span>
                </div>
                <Link href="/selaa" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: isMobile ? 10 : 12 }}>
                {filteredProducts.map(p => (
                  <ProductCard
                    key={p.id} id={p.id} href={`/tuotteet/${p.id}`} name={p.name} imageUrl={p.thumbnail}
                    price={p.price} condition={p.condition} gradingCompany={p.gradingCompany} grade={p.grade} sellerUsername={p.seller} sellerBusinessId={p.sellerBusinessId} vatIncluded={p.vatIncluded} sellerVerified={p.sellerVerified} isMobile={isMobile}
                  />
                ))}
              </div>
            </section></ScrollReveal>
          )}

          {/* Huutokaupat */}
          {auctions.length > 0 && (
            <ScrollReveal><section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: '-0.005em' }}>{t.nav.auctions}</h2>
                  <span style={{ fontSize: 13, color: C.muted }}>{auctions.length}</span>
                </div>
                <Link href="/huutokaupat" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: isMobile ? 10 : 12 }}>
                {auctions.map((a: any) => {
                  const remaining = new Date(a.auctionEndsAt).getTime() - now
                  return (
                    <ProductCard
                      key={a.id} id={a.id} href={`/huutokauppa/${a.id}`} name={a.name} imageUrl={a.imageUrl}
                      price={a.currentBid ?? a.startPrice} sellerUsername={a.seller?.username} sellerBusinessId={a.seller?.businessId} vatIncluded={!!a.vatIncluded} sellerVerified={!!a.seller?.verified} isMobile={isMobile}
                      timeBadge={{ text: auctionTimeLeft(remaining, t.auction.ended), urgent: remaining < 60 * 60 * 1000 }}
                    />
                  )
                })}
              </div>
            </section></ScrollReveal>
          )}

          {/* Live nyt — vain jos lähetyksiä */}
          {filteredShows.length > 0 && (
            <ScrollReveal><section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red, display: 'inline-block' }} />
                  <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: '-0.005em' }}>{t.home.liveNow}</h2>
                  <span style={{ fontSize: 13, color: C.muted }}>{filteredShows.length}</span>
                </div>
                <Link href="/live-kaikki" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile ? 10 : 14 }}>
                {filteredShows.map(show => (
                  <Link key={show.id} href={`/live/${show.id}`} className="hb-card" style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', display: 'block', textDecoration: 'none' }}>
                    <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {show.thumbnail
                        ? <img src={show.thumbnail} alt={show.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <span style={{ fontSize: 32, color: C.dim }}>+</span>
                      }
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)' }} />
                      <div style={{ position: 'absolute', top: 6, left: 6, background: C.red, color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 3 }}>LIVE</div>
                      <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 3 }}>{show.viewers}</div>
                    </div>
                    <div style={{ padding: isMobile ? '8px' : '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.accentSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: C.accentText, flexShrink: 0 }}>{show.seller[0]?.toUpperCase()}</div>
                        <span style={{ fontSize: 11, color: C.muted }}>@{show.seller}</span>
                      </div>
                      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{show.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section></ScrollReveal>
          )}

          {/* Tulossa pian — vain jos lähetyksiä ja kaikki-näkymässä */}
          {activeKat === 'kaikki' && displayUpcoming.length > 0 && (
            <ScrollReveal><section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: '-0.005em' }}>{t.home.upcoming}</h2>
                  <span style={{ fontSize: 13, color: C.muted }}>{displayUpcoming.length}</span>
                </div>
                <Link href="/live-kaikki?status=scheduled" style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{t.home.showAll}</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayUpcoming.map(show => (
                  <div key={show.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 44, height: 32, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {show.thumbnail
                        ? <img src={show.thumbnail} alt={show.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 14, color: C.dim }}>+</span>
                      }
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.accentSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.accentText, flexShrink: 0 }}>{show.seller[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{show.title}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>@{show.seller}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, whiteSpace: 'nowrap', flexShrink: 0 }}>{formatShowTime(show.scheduledAt, t, lang as 'fi' | 'en')}</div>
                  </div>
                ))}
              </div>
            </section></ScrollReveal>
          )}

          {/* Tyhjä tila */}
          {filteredProducts.length === 0 && filteredShows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>{t.home.emptyCategory}</div>
              <button onClick={() => { setActiveKat('kaikki'); setActiveAla('') }} style={{ background: C.accentSolid, color: C.accentText, border: 'none', padding: '9px 20px', borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                {t.home.showAll}
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
