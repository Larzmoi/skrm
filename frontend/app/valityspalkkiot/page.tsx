'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'

const ROWS = [
  { price: '10€', skrm: '0,35€' },
  { price: '50€', skrm: '1,75€' },
  { price: '100€', skrm: '3,50€' },
  { price: '250€', skrm: '8,75€' },
  { price: '500€', skrm: '17,50€' },
  { price: '1000€+', skrm: '35,00€ (max)' },
]

export default function ValityspalkkiotPage() {
  const { C } = useTheme()
  const { t: tRaw, lang } = useLang()
  const t = tRaw ?? {}

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8 }}>{t.fees.title}</h1>
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 40 }}>{t.fees.subtitle}</p>

        {/* Myyntipalkkio */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 12 }}>{t.fees.commission}</h2>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
              <div style={{ background: C.accentLight, border: `1px solid ${C.accent}44`, borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{t.fees.skrmFee}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.accent, lineHeight: 1, marginBottom: 4 }}>3,5%</div>
                <div style={{ fontSize: 13, color: C.muted }}>max <strong style={{ color: C.text }}>35€</strong> / {lang === 'fi' ? 'kauppa' : 'sale'}</div>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{t.fees.paymentFee}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.textSub, lineHeight: 1, marginBottom: 4 }}>~1,5%</div>
                <div style={{ fontSize: 13, color: C.muted }}>{t.fees.paymentFeeDesc}</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              {lang === 'fi'
                ? 'Ei listausmaksuja, ei kuukausimaksuja, ei maksua myymättömistä tuotteista. Maksat vain toteutuneista kaupoista.'
                : 'No listing fees, no monthly fees, no fees for unsold items. You only pay for completed sales.'}
            </p>
          </div>

          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: C.muted }}>{t.fees.salePrice}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: C.accent }}>{t.fees.skrmCharge}</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={row.price} style={{ borderBottom: i < ROWS.length - 1 ? `1px solid ${C.border}` : 'none', background: i === ROWS.length - 1 ? C.accentLight : 'transparent' }}>
                    <td style={{ padding: '12px 16px', color: C.text, fontWeight: i === ROWS.length - 1 ? 700 : 400 }}>{row.price}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: C.accent, fontWeight: 700 }}>{row.skrm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Toimitus */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 12 }}>{t.fees.shipping}</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>{t.fees.shippingDesc}</p>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: C.muted }}>{t.fees.deliveryMethod}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: C.muted }}>{t.fees.price}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px', color: C.text, fontWeight: 500 }}>{t.fees.shippingPostal}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: C.text, fontWeight: 600 }}>6,90€</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', color: C.text, fontWeight: 500 }}>{t.fees.shippingPickup}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: C.text, fontWeight: 600 }}>{t.fees.shippingFree}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Maksuturva */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 12 }}>{t.fees.protection}</h2>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '24px' }}>
            <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, marginBottom: 12 }}>{t.fees.protectionDesc}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {t.fees.protectionPoints.map((point: string) => (
                <div key={point} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: C.textSub }}>
                  <span style={{ color: C.accent, flexShrink: 0 }}>✓</span>{point}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ei piilomaksuja */}
        <section style={{ background: C.accentLight, border: `1px solid ${C.accent}33`, borderRadius: 12, padding: '20px 24px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>{t.fees.noHidden}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {t.fees.noFees.map((item: string) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.textSub }}>
                <span style={{ color: C.accent, fontWeight: 700 }}>✓</span> {item}
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
