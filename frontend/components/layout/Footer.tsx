'use client'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'

// Visuaalinen tyylipäivitys 2026-09-01 (ks. CLAUDE.md) - vain visuaalinen kerros muuttui
// (typografia, välit, pyöristykset, hover-tila), kaikki tekstit/linkit/rakenteet ennallaan.
//
// Mobiilikorjaus 2026-09-01 (ks. CLAUDE.md "Iso testauskierros" kohta 3): linkkisarakkeet
// käyttivät minmax(150px,...) -ruudukkoa, joka romahti yhdeksi sarakkeeksi kapeilla
// puhelinnäytöillä (esim. 320-360px leveys) - kaikki linkit näyttivät yhdeltä pitkältä
// pystylistalta. Linkkisarakkeet eriytetty omaan, kapeampaan (110px) ruudukkoon joka mahtuu
// luotettavasti kahteen sarakkeeseen/riviin lähes millä tahansa puhelimella. Samalla
// Habahub-nimi/badget siirretty pois ylimmästä sijainnista footerin VIIMEISEKSI elementiksi,
// omistajan pyynnöstä.
export default function Footer() {
  const { C } = useTheme()
  const { t } = useLang()

  const cols = [
    {
      title: t.footer.company,
      links: [
        { label: t.footer.about, href: '/meista' },
        { label: t.footer.becomeSeller, href: '/register' },
        { label: t.footer.contact, href: '/meista#yhteystiedot' },
      ],
    },
    {
      title: t.footer.resources,
      links: [
        { label: t.footer.faq, href: '/faq' },
        { label: t.footer.fees, href: '/valityspalkkiot' },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { label: t.footer.terms, href: '/kayttoehdot' },
        { label: t.footer.privacy, href: '/tietosuoja' },
      ],
    },
    {
      title: t.footer.follow,
      links: [
        { label: 'Instagram', href: '#' },
        { label: 'TikTok', href: '#' },
        { label: 'YouTube', href: '#' },
      ],
    },
  ]

  const linkStyle: React.CSSProperties = { fontSize: 13, color: C.textSub, textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s ease' }

  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, background: C.surface, marginTop: 32, position: 'relative' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '20px 16px', marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
          {cols.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {col.links.map(l => (
                  <Link key={l.label} href={l.href} style={linkStyle} onMouseEnter={e => { e.currentTarget.style.color = C.accent }} onMouseLeave={e => { e.currentTarget.style.color = C.textSub }}>{l.label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}`, maxWidth: 380 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t.footer.newsletter}</div>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>{t.footer.newsletterDesc}</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <input placeholder={t.footer.emailPlaceholder} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 999, padding: '9px 14px', fontSize: 12, color: C.text, minWidth: 0, outline: 'none', fontFamily: 'var(--font-body), sans-serif' }} />
            <button className="hb-btn" style={{ background: C.accentSolid, color: C.accentText, border: 'none', borderRadius: 999, padding: '9px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-display), sans-serif' }}>
              {t.footer.subscribe}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: C.muted }}>{t.footer.copyright}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{t.footer.feeNote} · {t.footer.binding}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{t.footer.prohibited}</span>
        </div>

        {/* Brändinimi + luottamusbadget - tarkoituksella VIIMEisenä elementtinä (ei ylimpänä
            kuten aiemmin), omistajan pyynnöstä */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${C.accentSolid}26`, border: `1px solid ${C.accentSolid}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontSize: 12 }}>H</div>
            <span style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontSize: 15, color: C.text, letterSpacing: '-0.5px' }}>Habahub</span>
          </div>
          {[t.footer.badgeSecure, t.footer.badgeBinding, t.footer.badgeVerified].map(tag => (
            <span key={tag} style={{ fontSize: 11, fontWeight: 600, color: C.textSub, background: C.surface2, border: `1px solid ${C.border}`, padding: '3px 10px', borderRadius: 999 }}>{tag}</span>
          ))}
        </div>
      </div>
    </footer>
  )
}
