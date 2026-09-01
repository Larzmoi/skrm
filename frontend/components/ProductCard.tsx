'use client'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'

export interface ProductCardProps {
  id: string
  href: string
  name: string
  imageUrl?: string
  price: number
  condition?: string
  sellerUsername?: string
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
export default function ProductCard({ id, href, name, imageUrl, price, condition, sellerUsername, city, isMobile, timeBadge, bidCount }: ProductCardProps) {
  const { C } = useTheme()
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
      <div style={{ padding: isMobile ? '9px 10px' : '11px 13px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-display), -apple-system, sans-serif',
            fontSize: isMobile ? 12.5 : 13.5, fontWeight: 600, color: C.text, marginBottom: 6, lineHeight: 1.32,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          }}>
            {name}
          </div>
          <div style={{
            fontFamily: 'var(--font-display), -apple-system, sans-serif',
            fontVariantNumeric: 'tabular-nums', fontSize: isMobile ? 15 : 17, fontWeight: 800, color: C.text, letterSpacing: '-0.01em',
          }}>
            {price.toLocaleString('fi-FI')}€
          </div>
          {condition && (
            <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10.5, fontWeight: 600, color: C.textSub, background: C.surface, border: `1px solid ${C.border}`, padding: '2px 7px', borderRadius: 5 }}>
              {condition}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {sellerUsername && <div style={{ fontSize: 11, color: C.muted }}>@{sellerUsername}</div>}
          {city && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{city}</div>}
        </div>
      </div>
    </Link>
  )
}
