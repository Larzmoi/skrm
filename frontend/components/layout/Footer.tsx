'use client'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'

export default function Footer() {
  const { C } = useTheme()
  const { t, lang } = useLang()

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
        { label: 'Facebook', href: '#' },
      ],
    },
  ]

  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, background: C.surface, marginTop: 48 }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 24px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 32, marginBottom: 40 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: C.text, letterSpacing: '-0.5px', marginBottom: 10 }}>SKRM</div>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
              {lang === 'fi' ? 'Live-huutokauppa ja suoramyynti. Osta ja myy turvallisesti.' : 'Live auction and marketplace. Buy and sell safely.'}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['🇫🇮 Suomi', lang === 'fi' ? '🔒 Turvallinen' : '🔒 Secure', lang === 'fi' ? '✓ Sitovat huudot' : '✓ Binding bids'].map(tag => (
                <span key={tag} style={{ fontSize: 11, color: C.muted, background: C.surface2, padding: '3px 8px', borderRadius: 10 }}>{tag}</span>
              ))}
            </div>
          </div>

          {cols.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{col.title}</div>
              {col.links.map(l => (
                <div key={l.label} style={{ marginBottom: 8 }}>
                  <Link href={l.href} style={{ fontSize: 13, color: C.textSub, textDecoration: 'none' }}>{l.label}</Link>
                </div>
              ))}
            </div>
          ))}

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{t.footer.newsletter}</div>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>{t.footer.newsletterDesc}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <input placeholder={t.footer.emailPlaceholder} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: C.text, minWidth: 0, outline: 'none' }} />
              <button style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.footer.subscribe}
              </button>
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.muted }}>{t.footer.copyright}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{t.footer.feeNote} · {t.footer.binding}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{t.footer.prohibited}</span>
        </div>
      </div>
    </footer>
  )
}
