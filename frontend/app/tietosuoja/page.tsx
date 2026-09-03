'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'
import { PRIVACY_FI, PRIVACY_EN, PRIVACY_SV } from './content'

export default function TietosuojaPage() {
  const { C } = useTheme()
  const { lang } = useLang()
  const content = lang === 'en' ? PRIVACY_EN : lang === 'sv' ? PRIVACY_SV : PRIVACY_FI

  const sections = content.trim().split('\n\n').filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {sections.map((section, i) => {
            const lines = section.split('\n')
            const first = lines[0]
            const isMainTitle = i === 0
            const isSection = /^\d+\./.test(first)

            if (isMainTitle) {
              return (
                <div key={i} style={{ marginBottom: 32 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 6 }}>{first}</h1>
                  {lines.slice(1).map((l, j) => <p key={j} style={{ fontSize: 13, color: C.muted }}>{l}</p>)}
                </div>
              )
            }

            if (isSection) {
              return (
                <div key={i} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 12 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>{first}</h2>
                  {lines.slice(1).map((l, j) => (
                    <p key={j} style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, marginBottom: l === '' ? 8 : 0 }}>
                      {l.startsWith('- ') ? <span>{'• '}{l.slice(2)}</span> : l}
                    </p>
                  ))}
                </div>
              )
            }

            return (
              <div key={i} style={{ marginBottom: 8 }}>
                {lines.map((l, j) => (
                  <p key={j} style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7 }}>
                    {l.startsWith('- ') ? <span>{'• '}{l.slice(2)}</span> : l}
                  </p>
                ))}
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 32 }}>
          {lang === 'en' ? 'Questions about privacy? Contact us:' : lang === 'sv' ? 'Frågor om integritet? Kontakta oss:' : 'Kysymyksiä tietosuojasta? Ota yhteyttä:'}{' '}
          <a href="mailto:support@habahub.fi" style={{ color: C.accent }}>support@habahub.fi</a>
        </p>
      </div>
      <Footer />
    </div>
  )
}
