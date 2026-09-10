'use client'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'

export interface ProductCardProps {
  id: string
  href: string
  name: string
  imageUrl?: string
  price: number
  condition?: string
  // Gradatun kortin luokitus (tyyppi === "slabit") - näytetään "PSA 9" -muodossa condition-
  // badgen sijaan kun molemmat on asetettu. Ks. CLAUDE.md "WhatsApp-palaute 2026-09-02" kohta 1.
  gradingCompany?: string | null
  grade?: string | null
  sellerUsername?: string
  // Ei-tyhjä = yritysmyyjä, näytetään ALV-läpinäkyvyysmerkintä hinnan alla (ks. CLAUDE.md
  // "ALV yritysmyyjille") — puhtaasti tekstillinen lisäys, ei muuta price-proppia mihinkään.
  sellerBusinessId?: string | null
  // Admin-myöntämä "Vahvistettu käyttäjä" -merkki (User.verified) - pieni sininen checkmark
  // @käyttäjätunnuksen vieressä.
  sellerVerified?: boolean
  city?: string | null
  isMobile?: boolean
  // Aikaraja-badge (esim. huutokaupan jäljellä oleva aika) - kuvan vasempaan alakulmaan.
  timeBadge?: { text: string; urgent?: boolean }
  // Huutomäärä - kuvan oikeaan yläkulmaan.
  bidCount?: number
}

// Jaettu tuotekortti - käytössä /selaa, /huutokaupat ja etusivulla. Yhdistää aiemmin
// kolmeen paikkaan kopioidun, lähes identtisen kortti-JSX:n yhdeksi lähteeksi (ks.
// visuaalinen uudistus 2026-08-31). hb-card/hb-card-img -luokat (globals.css) tuovat
// kohonnan ja kuvan zoomauksen hoverilla; loput tyylistä pysyy C.xxx-teemajärjestelmässä
// kuten muukin sivusto.
export default function ProductCard({ id, href, name, imageUrl, price, condition, gradingCompany, grade, sellerUsername, sellerBusinessId, sellerVerified, city, isMobile, timeBadge, bidCount }: ProductCardProps) {
  const { C } = useTheme()
  const { t } = useLang()
  return (
    <Link
      href={href}
      className="hb-card"
      style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', display: 'block', textDecoration: 'none', transition: 'border-color 0.16s ease' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.accentSolid}80` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border }}
    >
      <div style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imageUrl
          ? <img className="hb-card-img" src={imageUrl.split('|||')[0]} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <span style={{ fontSize: 32, color: C.dim }}>+</span>
        }
        {timeBadge && (
          <div style={{ position: 'absolute', bottom: 8, left: 8, background: timeBadge.urgent ? C.red : 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, fontFamily: 'var(--font-display), -apple-system, sans-serif' }}>
            {timeBadge.text}
          </div>
        )}
        {bidCount != null && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--font-display), -apple-system, sans-serif' }}>
            {bidCount} huutoa
          </div>
        )}
      </div>
      {isMobile ? (
        // Mobiililla oma rivi jokaiselle tiedolle - LUKITTU tähän muotoon 2026-09-10, ks.
        // CLAUDE.md "Etusivun mobiilikortit". Aiempi kahden pystypalstan (nimi/hinta vasemmalla,
        // myyjä/paikkakunta oikealla flex-shrink:0-palstassa) malli ahtautui kapealla kortilla
        // niin ettei kumpikaan palsta koskaan saanut riittävästi tilaa - tekstit menivät
        // päällekkäin/katkesivat. Yksi pystysuuntainen sarake, jokainen rivi omanaan, ratkaisee
        // tämän kokonaan koska mitään ei enää tarvitse mahtua vierekkäin samalle riville.
        <div style={{ padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{
            fontFamily: 'var(--font-display), -apple-system, sans-serif',
            fontSize: 12.5, fontWeight: 600, color: C.text, lineHeight: 1.32,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          }}>
            {name}
          </div>
          <div style={{
            fontFamily: 'var(--font-display), -apple-system, sans-serif',
            fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: '-0.01em',
          }}>
            {price.toLocaleString('fi-FI')}€
          </div>
          {sellerUsername && (
            <div style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{sellerUsername}</span>
              {sellerVerified && (
                <span title={t.product.verifiedUser} style={{ display: 'inline-flex', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="12" fill="#3B82F6" />
                    <path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </div>
          )}
          {city && <div style={{ fontSize: 11, color: C.muted }}>{city}</div>}
          {sellerBusinessId && <div style={{ fontSize: 10, color: C.muted }}>{t.product.vatIncluded}</div>}
          {sellerBusinessId && (
            <div style={{ fontSize: 9.5, fontWeight: 700, color: C.textSub, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: '1px 5px', alignSelf: 'flex-start' }}>
              {t.product.businessSeller}
            </div>
          )}
          {gradingCompany && grade ? (
            <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 600, color: C.textSub, background: C.surface, border: `1px solid ${C.border}`, padding: '2px 7px', borderRadius: 5, alignSelf: 'flex-start' }}>
              {gradingCompany} {grade}
            </span>
          ) : condition && (
            <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 600, color: C.textSub, background: C.surface, border: `1px solid ${C.border}`, padding: '2px 7px', borderRadius: 5, alignSelf: 'flex-start' }}>
              {condition}
            </span>
          )}
        </div>
      ) : (
        <div style={{ padding: '11px 13px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-display), -apple-system, sans-serif',
              fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: 6, lineHeight: 1.32,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
            }}>
              {name}
            </div>
            <div style={{
              fontFamily: 'var(--font-display), -apple-system, sans-serif',
              fontVariantNumeric: 'tabular-nums', fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: '-0.01em',
            }}>
              {price.toLocaleString('fi-FI')}€
            </div>
            {sellerBusinessId && (
              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                {t.product.vatIncluded}
              </div>
            )}
            {gradingCompany && grade ? (
              <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10.5, fontWeight: 600, color: C.textSub, background: C.surface, border: `1px solid ${C.border}`, padding: '2px 7px', borderRadius: 5 }}>
                {gradingCompany} {grade}
              </span>
            ) : condition && (
              <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10.5, fontWeight: 600, color: C.textSub, background: C.surface, border: `1px solid ${C.border}`, padding: '2px 7px', borderRadius: 5 }}>
                {condition}
              </span>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {sellerUsername && (
              <div style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                @{sellerUsername}
                {sellerVerified && (
                  <span title={t.product.verifiedUser} style={{ display: 'inline-flex', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="12" fill="#3B82F6" />
                      <path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>
            )}
            {sellerBusinessId && (
              <div style={{ fontSize: 9.5, fontWeight: 700, color: C.textSub, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: '1px 5px', marginTop: 2, display: 'inline-block' }}>
                {t.product.businessSeller}
              </div>
            )}
            {city && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{city}</div>}
          </div>
        </div>
      )}
    </Link>
  )
}
