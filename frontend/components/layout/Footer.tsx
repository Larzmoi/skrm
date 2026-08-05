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

  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, background: C.surface, marginTop: 32 }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 24px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: C.text, letterSpacing: '-0.5px', marginBottom: 8 }}>SKRM</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
              {[t.footer.badgeSecure, t.footer.badgeBinding, t.footer.badgeVerified].map(tag => (
                <span key={tag} style={{ fontSize: 11, color: C.muted, background: C.surface2, padding: '3px 8px', borderRadius: 10 }}>{tag}</span>
              ))}
            </div>
          </div>

          {cols.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{col.title}</div>
              {col.links.map(l => (
                <div key={l.label} style={{ marginBottom: 3 }}>
                  <Link href={l.href} style={{ fontSize: 13, color: C.textSub, textDecoration: 'none' }}>{l.label}</Link>
                </div>
              ))}
            </div>
          ))}

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{t.footer.newsletter}</div>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 6, lineHeight: 1.5 }}>{t.footer.newsletterDesc}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <input placeholder={t.footer.emailPlaceholder} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: C.text, minWidth: 0, outline: 'none' }} />
              <button style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.footer.subscribe}
              </button>
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 12, color: C.muted }}>{t.footer.copyright}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{t.footer.feeNote} · {t.footer.binding}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{t.footer.prohibited}</span>
        </div>
      </div>
    </footer>
  )
}
