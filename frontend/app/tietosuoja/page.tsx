'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'

const SECTIONS = {
  fi: [
    { title: 'Rekisterinpitäjä', content: 'SKRM, info@skrm.fi. Tietosuoja-asioissa: tietosuoja@skrm.fi.' },
    { title: 'Mitä tietoja keräämme', content: 'Rekisteröitymisen yhteydessä: nimi, sähköposti, käyttäjänimi ja salattu salasana. Palvelun käytön yhteydessä: ostotiedot, myyntitiedot, kirjautumistiedot ja IP-osoite.' },
    { title: 'Mihin käytämme tietojasi', content: 'Palvelun tarjoamiseen, tilausten käsittelyyn, maksujen veloittamiseen, asiakaspalveluun ja palvelun kehittämiseen. Emme myy tietojasi kolmansille osapuolille.' },
    { title: 'Tietojen säilytys', content: 'Säilytämme tietojasi niin kauan kuin tilisi on aktiivinen. Voit pyytää tietojesi poistamista ottamalla yhteyttä. Kirjanpitolain vaatimat tiedot säilytetään 7 vuotta.' },
    { title: 'Evästeet', content: 'Käytämme evästeitä kirjautumistietojen tallentamiseen ja palvelun toiminnan varmistamiseen. Emme käytä kolmannen osapuolen seurantaevästeitä.' },
    { title: 'Oikeutesi', content: 'Sinulla on oikeus tarkistaa, korjata tai poistaa tietosi. Voit myös pyytää tietojesi siirtämistä. Ota yhteyttä: tietosuoja@skrm.fi.' },
  ],
  en: [
    { title: 'Data controller', content: 'SKRM, info@skrm.fi. For privacy matters: tietosuoja@skrm.fi.' },
    { title: 'What data we collect', content: 'Upon registration: name, email, username and encrypted password. During service use: purchase data, sales data, login information and IP address.' },
    { title: 'How we use your data', content: 'To provide the service, process orders, charge payments, customer support and service development. We do not sell your data to third parties.' },
    { title: 'Data retention', content: 'We retain your data as long as your account is active. You can request deletion by contacting us. Data required by accounting law is retained for 7 years.' },
    { title: 'Cookies', content: 'We use cookies to store login information and ensure service functionality. We do not use third-party tracking cookies.' },
    { title: 'Your rights', content: 'You have the right to access, correct or delete your data. You can also request data portability. Contact: tietosuoja@skrm.fi.' },
  ],
}

export default function TietosuojaPage() {
  const { C } = useTheme()
  const { t: tRaw, lang } = useLang()
  const t = tRaw ?? {}
  const sections = SECTIONS[lang as 'fi' | 'en'] ?? SECTIONS.fi

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8 }}>{t.privacy.title}</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 40 }}>{t.privacy.effective}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sections.map(s => (
            <div key={s.title} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '24px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 10 }}>{s.title}</h2>
              <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7 }}>{s.content}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 32 }}>
          {t.privacy.contactText} <a href="mailto:tietosuoja@skrm.fi" style={{ color: C.accent }}>tietosuoja@skrm.fi</a>
        </p>
      </div>
      <Footer />
    </div>
  )
}
