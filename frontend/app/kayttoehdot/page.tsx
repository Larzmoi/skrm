'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'

const SECTIONS = {
  fi: [
    { title: '1. Palvelun kuvaus', content: 'SKRM on verkkoalusta joka yhdistää ostajia ja myyjiä live-huutokauppojen ja suoramyynnin kautta. SKRM ei osta, myy tai omista myytäviä tuotteita — SKRM tarjoaa ainoastaan teknisen alustan, jonka kautta yksityishenkilöt ja yritykset voivat käydä kauppaa keskenään.\n\nSKRM EI OLE OSAPUOLI OSTAJAN JA MYYJÄN VÄLISESSÄ KAUPASSA. Kaikki kauppasopimukset syntyvät suoraan ostajan ja myyjän välille.' },
    { title: '2. Rekisteröityminen', content: 'Palvelun käyttö edellyttää rekisteröitymistä. Rekisteröityessäsi vakuutat olevasi vähintään 18-vuotias. Alle 18-vuotiaat eivät saa rekisteröityä palveluun.' },
    { title: '3. SKRM:n rooli — alustantarjoaja', content: 'SKRM toimii ainoastaan teknisenä alustana. SKRM ei ole vastuussa tuotteiden laadusta, kunnosta tai aitoudesta. SKRM ei ole vastuussa myyjän tai ostajan toiminnasta. SKRM tarjoaa maksujenkeräyspalvelun myyjien puolesta rajoitetussa tarkoituksessa.' },
    { title: '4. Sitovat huudot', content: 'Kaikki huudot ovat sitovia. Huutamalla ostaja sitoutuu ostamaan tuotteen voitettuaan huutokaupan. Myyjä sitoutuu myymään tuotteen korkeimmalle huutajalle. Huutojen peruuttaminen ei ole mahdollista ilman SKRM:n erikseen myöntämää poikkeusta.' },
    { title: '5. Myyjän velvollisuudet', content: 'Myyjä on yksin vastuussa tuotteen kuvauksen oikeellisuudesta, tuotteen lähettämisestä 48 tunnin sisällä ja seurantakoodin toimittamisesta. Myyjä vakuuttaa, että hänellä on oikeus myydä tuote ja että tuote ei ole varastettu tai väärennetty.' },
    { title: '6. Ostajan velvollisuudet', content: 'Ostaja on vastuussa huudon tekemisestä harkitusti — huudot ovat sitovia. Ostaja on vastuussa maksun suorittamisesta voitettuaan huutokaupan ja reklamaatioiden tekemisestä 3 päivän kuluessa tuotteen vastaanottamisesta.' },
    { title: '7. Kielletyt tuotteet', content: 'Palvelussa ei saa myydä aseita, alkoholia, lääkkeitä, eläviä eläimiä, väärennettyä tai tekijänoikeuksia loukkaavaa tavaraa, tai varastettua tavaraa.' },
    { title: '8. Välityspalkkio', content: 'SKRM veloittaa toteutuneista kaupoista 3% välityspalkkion, enintään 20€ per kauppa. Lisäksi peritään maksunkäsittelykulut (~1,5% + 0,25€). Ei listausmaksuja, ei kuukausimaksuja.' },
    { title: '9. Maksuturva', content: 'SKRM pidättää ostajan maksun kunnes myyjä on toimittanut seurantakoodin. Maksu vapautetaan myyjälle lähetyksen vahvistamisen jälkeen.' },
    { title: '10. Vastuunrajoitus', content: 'SKRM:n vastuu rajoittuu aina korkeintaan kyseisestä kaupasta perittyyn välityspalkkioon. SKRM ei vastaa tuotteiden laadusta, toimituksessa tapahtuneista vahingoista tai välillisistä vahingoista.' },
    { title: '11. Sovellettava laki', content: 'Näihin ehtoihin sovelletaan Suomen lakia. Toimivaltainen tuomioistuin on Helsingin käräjäoikeus.' },
    { title: '12. Ehtojen muuttaminen', content: 'SKRM pidättää oikeuden muuttaa näitä ehtoja ilmoittamalla siitä vähintään 15 päivää etukäteen.' },
  ],
  en: [
    { title: '1. Service description', content: 'SKRM is an online platform connecting buyers and sellers through live auctions and direct sales. SKRM does not buy, sell or own any products — SKRM only provides the technical platform.\n\nSKRM IS NOT A PARTY TO THE AGREEMENT BETWEEN BUYER AND SELLER. All agreements are made directly between buyer and seller.' },
    { title: '2. Registration', content: 'Using the service requires registration. By registering you confirm you are at least 18 years old. Minors under 18 may not register.' },
    { title: '3. SKRM\'s role — platform provider', content: 'SKRM acts only as a technical platform. SKRM is not responsible for the quality, condition or authenticity of products. SKRM is not responsible for actions of buyers or sellers. SKRM provides payment collection services on behalf of sellers for limited purposes.' },
    { title: '4. Binding bids', content: 'All bids are binding. By bidding, the buyer commits to purchasing the item if they win. The seller commits to selling to the highest bidder. Bids cannot be cancelled without explicit exception granted by SKRM.' },
    { title: '5. Seller obligations', content: 'The seller is solely responsible for the accuracy of product descriptions, shipping within 48 hours, and providing a tracking code. The seller warrants they have the right to sell the item and that it is not stolen or counterfeit.' },
    { title: '6. Buyer obligations', content: 'The buyer is responsible for bidding carefully — bids are binding. The buyer is responsible for payment upon winning and filing any complaints within 3 days of receiving the item.' },
    { title: '7. Prohibited items', content: 'The service may not be used to sell weapons, alcohol, medication, live animals, counterfeit or copyright-infringing goods, or stolen items.' },
    { title: '8. Commission', content: 'SKRM charges a 3% commission on completed sales, maximum €20 per sale. Payment processing fees also apply (~1.5% + €0.25). No listing fees, no monthly fees.' },
    { title: '9. Payment protection', content: 'SKRM holds the buyer\'s payment until the seller has provided a tracking code. Payment is released to the seller after shipment is confirmed.' },
    { title: '10. Limitation of liability', content: "SKRM's liability is always limited to the commission charged for that particular sale. SKRM is not responsible for product quality, shipping damage or indirect damages." },
    { title: '11. Governing law', content: 'These terms are governed by Finnish law. The competent court is the Helsinki District Court.' },
    { title: '12. Changes to terms', content: 'SKRM reserves the right to modify these terms with at least 15 days notice.' },
  ],
}

export default function KayttoehdotPage() {
  const { C } = useTheme()
  const { t: tRaw, lang } = useLang()
  const t = tRaw ?? {}
  const sections = SECTIONS[lang as 'fi' | 'en'] ?? SECTIONS.fi

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8 }}>{t.terms.title}</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 8 }}>{t.terms.effective}</p>
        <div style={{ background: C.accentLight, border: `1px solid ${C.accent}33`, borderRadius: 10, padding: '14px 18px', marginBottom: 36, fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
          <strong style={{ color: C.text }}>!</strong> {t.terms.notice}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.map(s => (
            <div key={s.title} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '22px 24px' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>{s.title}</h2>
              <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.75, whiteSpace: 'pre-line' }}>{s.content}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 32 }}>
          {t.terms.contactText} <a href="mailto:info@skrm.fi" style={{ color: C.accent }}>info@skrm.fi</a>
        </p>
      </div>
      <Footer />
    </div>
  )
}
