'use client'
import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useTheme } from '@/lib/theme-context'
import { useLang } from '@/lib/lang-context'

const FAQ_DATA = {
  fi: [
    {
      id: 'yleista', title: 'Yleistä',
      items: [
        { q: 'Mikä on SKRM?', a: 'SKRM on suomalainen huutokauppa- ja suoramyyntialusta. Myyjät voivat myydä tuotteitaan reaaliaikaisessa videolähetyksessä (live-huutokauppa), ajastetussa perinteisessä huutokaupassa tai suoraan kiinteällä hinnalla (suoramyynti). Ostajat voivat huutaa tuotteista live-lähetyksen tai perinteisen huutokaupan aikana, tai ostaa suoraan.' },
        { q: 'Onko rekisteröityminen maksullista?', a: 'Ei. Tilin luominen on täysin ilmaista. Maksat vain ostamiesi tuotteiden hinnan ja toimituskulut.' },
        { q: 'Voinko sekä ostaa että myydä samalla tunnuksella?', a: 'Kyllä. Yhdellä tunnuksella voit sekä osallistua huutokauppoihin ostajana että myydä omia tuotteitasi.' },
        { q: 'Missä SKRM toimii?', a: 'SKRM on suunnattu ensisijaisesti suomalaisille käyttäjille. Toimitus tapahtuu pääasiassa Suomessa.' },
      ],
    },
    {
      id: 'ostaja', title: 'Ostajan opas',
      items: [
        { q: 'Miten huutokauppa toimii?', a: 'Myyjä avaa videolähetyksen ja esittelee tuotteet livenä. Voit huutaa tuotteista syöttämällä haluamasi summan. Korkein huuto lähetyksen päättyessä voittaa tuotteen.' },
        { q: 'Ovatko huudot sitovia?', a: 'Kyllä. Kaikki huudot ovat sitovia eikä niitä voi peruuttaa. Huutamalla sitoudut ostamaan tuotteen jos voitat.' },
        { q: 'Miten maksan ostokseni?', a: 'Maksu tapahtuu Paytrailin kautta — tuetaan kaikkia suomalaisia pankkeja, MobilePay, korttimaksut, Google Pay ja Apple Pay.' },
        { q: 'Milloin saan tilaukseni?', a: 'Myyjä sitoutuu lähettämään tuotteen 48 tunnin sisällä huutokaupan päättymisestä. Saat seurantakoodin heti kun myyjä on lähettänyt paketin.' },
        { q: 'Mitä jos tuote ei saavu tai on erilainen kuin kuvattu?', a: 'Ota yhteyttä asiakastukeen välittömästi. Tutkimme jokaisen tapauksen ja autamme ratkaisemaan tilanteen.' },
      ],
    },
    {
      id: 'myyja', title: 'Myyjän opas',
      items: [
        { q: 'Miten aloitan myymisen?', a: 'Luo tili ja lisää tuotteet dashboardiin. Voit myydä kolmella tavalla: aloita live-lähetys ja huuda tuotteita suorana, aseta tuote ajastettuun perinteiseen huutokauppaan, tai listaa se suoramyyntiin kiinteällä hinnalla — valinta tehdään tuotteen lisäyksen yhteydessä.' },
        { q: 'Mitä voin myydä?', a: 'Voit myydä lähes mitä tahansa laillista käytettyä tai uutta tavaraa. Kiellettyjä ovat mm. aseet ja ampumatarvikkeet, alkoholi, tupakka ja nikotiinituotteet, lääkkeet, huumausaineet ja muut psykoaktiiviset aineet, elävät eläimet, väärennetyt tai tekijänoikeuksia loukkaavat tuotteet, varastettu omaisuus sekä muu lainvastainen tavara. Katso koko lista käyttöehdoista.' },
        { q: 'Milloin saan rahani?', a: 'Maksu vapautetaan myyjälle kun seurantakoodi on toimitettu SKRM:lle.' },
        { q: 'Mikä on välityspalkkio?', a: 'SKRM perii 3% välityspalkkion myyntihinnasta, enintään 35€ per kauppa. Lisäksi peritään maksunkäsittelykulut (n. 1,5% + 0,25€).' },
        { q: 'Miten striimaan lähetyksen OBS:lla?', a: 'Voit striimata OBS Studiolla (ilmainen ohjelma): 1) Lataa ja asenna OBS Studio. 2) Avaa Asetukset → Stream. 3) Valitse Service: Custom. 4) Kopioi Server ja Stream Key dashboardin "Aloita lähetys" -näkymästä OBS:n vastaaviin kenttiin. 5) Paina "Start Streaming" OBS:ssa. Lähetys näkyy katsojille muutaman sekunnin viiveellä.' },
      ],
    },
    {
      id: 'toimitus', title: 'Toimitus',
      items: [
        { q: 'Kuka maksaa toimituskulut?', a: 'Ostaja maksaa toimituskulut. Myyjä valitsee pakettikoon tuotetta lisätessään.' },
        { q: 'Kuinka nopeasti myyjän pitää lähettää?', a: 'Myyjä sitoutuu lähettämään tuotteen 48 tunnin sisällä huutokaupan päättymisestä.' },
        { q: 'Mitä tapahtuu jos myyjä ei lähetä?', a: 'Jos myyjä ei lähetä tuotetta 48 tunnin sisällä, SKRM puuttuu tilanteeseen ja ostaja saa täyden hyvityksen.' },
      ],
    },
  ],
  en: [
    {
      id: 'general', title: 'General',
      items: [
        { q: 'What is SKRM?', a: 'SKRM is a Finnish auction and direct-sale marketplace. Sellers can sell their products in real-time video broadcasts (live auctions), in scheduled timed auctions, or directly at a fixed price (direct sale). Buyers can bid during a live stream or a timed auction, or buy items directly.' },
        { q: 'Is registration free?', a: 'Yes. Creating an account is completely free. You only pay for the products you buy and shipping costs.' },
        { q: 'Can I both buy and sell with the same account?', a: 'Yes. With one account you can both participate in auctions as a buyer and sell your own products.' },
        { q: 'Where does SKRM operate?', a: 'SKRM is primarily aimed at Finnish users. Shipping takes place mainly within Finland.' },
      ],
    },
    {
      id: 'buyer', title: 'Buyer Guide',
      items: [
        { q: 'How does the auction work?', a: 'The seller opens a video stream and presents products live. You can bid by entering your desired amount. The highest bid when the auction ends wins the item.' },
        { q: 'Are bids binding?', a: 'Yes. All bids are binding and cannot be cancelled. By bidding you commit to buying the item if you win.' },
        { q: 'How do I pay?', a: 'Payment is made through Paytrail — supporting all Finnish banks, MobilePay, card payments, Google Pay and Apple Pay.' },
        { q: 'When will I receive my order?', a: 'The seller commits to shipping within 48 hours of the auction ending. You receive a tracking code as soon as the seller has shipped the package.' },
        { q: "What if the item doesn't arrive or differs from description?", a: 'Contact customer support immediately. We investigate each case and help resolve the situation.' },
      ],
    },
    {
      id: 'seller', title: 'Seller Guide',
      items: [
        { q: 'How do I start selling?', a: 'Create an account and add products to your dashboard. You can sell in three ways: start a live show and auction items in real time, list a product as a scheduled timed auction, or list it for direct sale at a fixed price — you choose when adding the product.' },
        { q: 'What can I sell?', a: 'You can sell almost any legal used or new items. Prohibited items include weapons and ammunition, alcohol, tobacco and nicotine products, medication, narcotics and other psychoactive substances, live animals, counterfeit or copyright-infringing goods, stolen property, and other unlawful items. See the full list in our Terms of Service.' },
        { q: 'When do I get my money?', a: 'Payment is released to the seller when the tracking code has been provided to SKRM.' },
        { q: 'What is the commission?', a: 'SKRM charges a 3% commission on the sale price, maximum €35 per sale. Payment processing fees also apply (~1.5% + €0.25).' },
        { q: 'How do I stream with OBS?', a: 'You can stream using OBS Studio (free software): 1) Download and install OBS Studio. 2) Open Settings → Stream. 3) Select Service: Custom. 4) Copy the Server and Stream Key from the "Start stream" view in your dashboard into the matching fields in OBS. 5) Click "Start Streaming" in OBS. Viewers will see the stream with a few seconds of delay.' },
      ],
    },
    {
      id: 'shipping', title: 'Shipping',
      items: [
        { q: 'Who pays for shipping?', a: 'The buyer pays shipping costs. The seller chooses the package size when adding the product.' },
        { q: 'How quickly must the seller ship?', a: 'The seller commits to shipping within 48 hours of the auction ending.' },
        { q: "What happens if the seller doesn't ship?", a: "If the seller doesn't ship within 48 hours, SKRM intervenes and the buyer receives a full refund." },
      ],
    },
  ],
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const { C } = useTheme()
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{q}</span>
        <span style={{ color: C.accent, fontSize: 18, flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
      </button>
      {open && <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, paddingBottom: 16 }}>{a}</div>}
    </div>
  )
}

export default function FAQPage() {
  const { C } = useTheme()
  const { t: tRaw, lang } = useLang()
  const t = tRaw ?? {}
  const sections = FAQ_DATA[lang as 'fi' | 'en'] ?? FAQ_DATA.fi

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8 }}>{t.faq.title}</h1>
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 40 }}>{t.faq.subtitle}</p>
        {sections.map(section => (
          <div key={section.id} id={section.id} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.accent, marginBottom: 16 }}>{section.title}</h2>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0 20px' }}>
              {section.items.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
            </div>
          </div>
        ))}
        <p style={{ fontSize: 13, color: C.muted, marginTop: 32 }}>
          {t.faq.contact} <a href="mailto:support@skrm.fi" style={{ color: C.accent }}>support@skrm.fi</a>
        </p>
      </div>
      <Footer />
    </div>
  )
}
