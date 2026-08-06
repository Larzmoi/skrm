'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import Link from 'next/link'

export default function MeistaPage() {
  const { C } = useTheme()
  const { t: tRaw } = useLang()
  const t = tRaw ?? {}

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8 }}>{t.about.title}</h1>
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 40 }}>{t.about.subtitle}</p>

        <section style={{ marginBottom: 40 }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '28px', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>SKRM</h2>
            <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.8, marginBottom: 16 }}>{t.about.description1}</p>
            <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.8, marginBottom: 16 }}>{t.about.description2}</p>
            <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.8 }}>{t.about.description3}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { value: '3%', label: t.about.cheapest, sub: t.about.cheapestSub },
              { value: '14', label: t.about.categories, sub: t.about.categoriesSub },
              { value: '48h', label: t.about.shipping, sub: t.about.shippingSub },
              { value: '100%', label: t.about.binding, sub: t.about.bindingSub },
            ].map(s => (
              <div key={s.label} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.accent, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="yhteystiedot" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>{t.about.contactTitle}</h2>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: t.about.email, value: 'support@skrm.fi' },
                { label: t.about.support, value: 'support@skrm.fi' },
                { label: t.about.sellerSupport, value: 'support@skrm.fi' },
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, width: 130, flexShrink: 0 }}>{c.label}</span>
                  <a href={`mailto:${c.value}`} style={{ fontSize: 13, color: C.accent }}>{c.value}</a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>{t.about.usefulLinks}</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: t.footer.faq, href: '/faq' },
              { label: t.footer.fees, href: '/valityspalkkiot' },
              { label: t.footer.terms, href: '/kayttoehdot' },
              { label: t.footer.privacy, href: '/tietosuoja' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textSub, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                {l.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
