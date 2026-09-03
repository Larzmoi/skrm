'use client'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'

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

        {/* Uutiskirjelaatikko poistettu 2026-09-03 (ks. CLAUDE.md) - oli täysin toimimaton UI
            (ei value/onChange/onClick, ei backendiä) eikä anonyymille kirjautumattomalle
            kävijälle ole edes selvää syytä liittyä ennen tiliä. Toiminto siirretty
            profiilisivulle kirjautuneille käyttäjille, ks. dashboard/profiili/page.tsx. */}

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: C.muted }}>{t.footer.copyright}</span>
        </div>
      </div>
    </footer>
  )
}