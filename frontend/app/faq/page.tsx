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
        { q: 'Mikä on Habahub?', a: 'Habahub on suomalainen huutokauppa- ja suoramyyntialusta. Myyjät voivat myydä tuotteitaan reaaliaikaisessa videolähetyksessä (live-huutokauppa), ajastetussa perinteisessä huutokaupassa tai suoraan kiinteällä hinnalla (suoramyynti). Ostajat voivat huutaa tuotteista live-lähetyksen tai perinteisen huutokaupan aikana, tai ostaa suoraan.' },
        { q: 'Onko rekisteröityminen maksullista?', a: 'Ei. Tilin luominen on täysin ilmaista. Maksat vain ostamiesi tuotteiden hinnan ja toimituskulut.' },
        { q: 'Voinko sekä ostaa että myydä samalla tunnuksella?', a: 'Kyllä. Yhdellä tunnuksella voit sekä osallistua huutokauppoihin ostajana että myydä omia tuotteitasi.' },
        { q: 'Missä Habahub toimii?', a: 'Habahub on suunnattu ensisijaisesti suomalaisille käyttäjille. Toimitus tapahtuu pääasiassa Suomessa.' },
      ],
    },
    {
      id: 'ostaja', title: 'Ostajan opas',
      items: [
        { q: 'Miten live-huutokauppa toimii?', a: 'Myyjä avaa videolähetyksen ja esittelee tuotteet livenä. Voit huutaa tuotteista syöttämällä haluamasi summan. Korkein huuto lähetyksen päättyessä voittaa tuotteen.' },
        { q: 'Miten perinteinen (ajastettu) huutokauppa toimii?', a: 'Myyjä asettaa tuotteelle lähtöhinnan ja keston (1-7 päivää) — videolähetystä ei tarvita. Voit huutaa milloin tahansa huutokauppa on käynnissä. Korkein huuto kun aika loppuu voittaa tuotteen.' },
        { q: 'Ovatko huudot sitovia?', a: 'Kyllä. Kaikki huudot ovat sitovia eikä niitä voi peruuttaa. Huutamalla sitoudut ostamaan tuotteen jos voitat.' },
        { q: 'Miten maksan ostokseni?', a: 'Maksu tapahtuu Paytrailin kautta — tuetaan kaikkia suomalaisia pankkeja, MobilePay, korttimaksut, Google Pay ja Apple Pay.' },
        { q: 'Milloin saan tilaukseni?', a: 'Myyjä sitoutuu lähettämään tuotteen 4 vuorokauden sisällä huutokaupan päättymisestä. Saat seurantakoodin heti kun myyjä on lähettänyt paketin.' },
        { q: 'Mitä jos tuote ei saavu tai on erilainen kuin kuvattu?', a: 'Ota yhteyttä asiakastukeen välittömästi. Tutkimme jokaisen tapauksen ja autamme ratkaisemaan tilanteen.' },
      ],
    },
    {
      id: 'myyja', title: 'Myyjän opas',
      items: [
        { q: 'Miten aloitan myymisen?', a: 'Luo tili ja lisää tuotteet dashboardiin. Voit myydä kolmella tavalla: aloita live-lähetys ja huuda tuotteita suorana, aseta tuote ajastettuun perinteiseen huutokauppaan, tai listaa se suoramyyntiin kiinteällä hinnalla — valinta tehdään tuotteen lisäyksen yhteydessä.' },
        { q: 'Mitä voin myydä?', a: 'Voit myydä lähes mitä tahansa laillista käytettyä tai uutta tavaraa. Kiellettyjä ovat mm. aseet ja ampumatarvikkeet, alkoholi, tupakka ja nikotiinituotteet, lääkkeet, huumausaineet ja muut psykoaktiiviset aineet, elävät eläimet, väärennetyt tai tekijänoikeuksia loukkaavat tuotteet, varastettu omaisuus sekä muu lainvastainen tavara. Katso koko lista käyttöehdoista.' },
        { q: 'Milloin saan rahani?', a: 'Kun ostaja vastaanottaa ja hyväksyy tuotteen, tai kun 24 tuntia on kulunut toimituksen vahvistumisesta ilman reklamaatiota — kumpi tahansa tapahtuu ensin. Jos toimitus ei koskaan vahvistu (esim. paketti katoaa), maksu vapautuu viimeistään 14 päivän kuluttua.' },
        { q: 'Mikä on välityspalkkio?', a: 'Habahub perii 3,5% välityspalkkion myyntihinnasta, enintään 35€ per kauppa. Lisäksi peritään maksunkäsittelykulut (n. 1,5% + 0,25€).' },
        { q: 'Miten striimaan lähetyksen OBS:lla?', a: 'Voit striimata OBS Studiolla (ilmainen ohjelma): 1) Lataa ja asenna OBS Studio. 2) Avaa Asetukset → Stream. 3) Valitse Service: Custom. 4) Kopioi Server ja Stream Key dashboardin "Aloita lähetys" -näkymästä OBS:n vastaaviin kenttiin. 5) Paina "Start Streaming" OBS:ssa. Lähetys näkyy katsojille muutaman sekunnin viiveellä.' },
      ],
    },
    {
      id: 'toimitus', title: 'Toimitus',
      items: [
        { q: 'Kuka maksaa toimituskulut?', a: 'Ostaja maksaa toimituskulut. Postitus on kiinteä 6,90€ riippumatta tuotteen koosta.' },
        { q: 'Kuinka nopeasti myyjän pitää lähettää?', a: 'Myyjä sitoutuu lähettämään tuotteen 4 vuorokauden sisällä huutokaupan päättymisestä.' },
        { q: 'Mitä tapahtuu jos myyjä ei lähetä?', a: 'Jos myyjä ei lähetä tuotetta 4 vuorokauden sisällä, Habahub puuttuu tilanteeseen ja ostaja saa täyden hyvityksen.' },
      ],
    },
  ],
  en: [
    {
      id: 'general', title: 'General',
      items: [
        { q: 'What is Habahub?', a: 'Habahub is a Finnish auction and direct-sale marketplace. Sellers can sell their products in real-time video broadcasts (live auctions), in scheduled timed auctions, or directly at a fixed price (direct sale). Buyers can bid during a live stream or a timed auction, or buy items directly.' },
        { q: 'Is registration free?', a: 'Yes. Creating an account is completely free. You only pay for the products you buy and shipping costs.' },
        { q: 'Can I both buy and sell with the same account?', a: 'Yes. With one account you can both participate in auctions as a buyer and sell your own products.' },
        { q: 'Where does Habahub operate?', a: 'Habahub is primarily aimed at Finnish users. Shipping takes place mainly within Finland.' },
      ],
    },
    {
      id: 'buyer', title: 'Buyer Guide',
      items: [
        { q: 'How does a live auction work?', a: 'The seller opens a video stream and presents products live. You can bid by entering your desired amount. The highest bid when the auction ends wins the item.' },
        { q: 'How does a traditional (scheduled) auction work?', a: 'The seller sets a starting price and a duration (1-7 days) - no video stream needed. You can bid any time while the auction is running. The highest bid when time runs out wins the item.' },
        { q: 'Are bids binding?', a: 'Yes. All bids are binding and cannot be cancelled. By bidding you commit to buying the item if you win.' },
        { q: 'How do I pay?', a: 'Payment is made through Paytrail — supporting all Finnish banks, MobilePay, card payments, Google Pay and Apple Pay.' },
        { q: 'When will I receive my order?', a: 'The seller commits to shipping within 4 days of the auction ending. You receive a tracking code as soon as the seller has shipped the package.' },
        { q: "What if the item doesn't arrive or differs from description?", a: 'Contact customer support immediately. We investigate each case and help resolve the situation.' },
      ],
    },
    {
      id: 'seller', title: 'Seller Guide',
      items: [
        { q: 'How do I start selling?', a: 'Create an account and add products to your dashboard. You can sell in three ways: start a live show and auction items in real time, list a product as a scheduled timed auction, or list it for direct sale at a fixed price — you choose when adding the product.' },
        { q: 'What can I sell?', a: 'You can sell almost any legal used or new items. Prohibited items include weapons and ammunition, alcohol, tobacco and nicotine products, medication, narcotics and other psychoactive substances, live animals, counterfeit or copyright-infringing goods, stolen property, and other unlawful items. See the full list in our Terms of Service.' },
        { q: 'When do I get my money?', a: 'When the buyer receives and accepts the item, or when 24 hours have passed since delivery was confirmed without a dispute being raised — whichever happens first. If delivery is never confirmed (e.g. the package is lost), payment is released after 14 days at the latest.' },
        { q: 'What is the commission?', a: 'Habahub charges a 3.5% commission on the sale price, maximum €35 per sale. Payment processing fees also apply (~1.5% + €0.25).' },
        { q: 'How do I stream with OBS?', a: 'You can stream using OBS Studio (free software): 1) Download and install OBS Studio. 2) Open Settings → Stream. 3) Select Service: Custom. 4) Copy the Server and Stream Key from the "Start stream" view in your dashboard into the matching fields in OBS. 5) Click "Start Streaming" in OBS. Viewers will see the stream with a few seconds of delay.' },
      ],
    },
    {
      id: 'shipping', title: 'Shipping',
      items: [
        { q: 'Who pays for shipping?', a: 'The buyer pays shipping costs. Shipping is a fixed €6.90 regardless of item size.' },
        { q: 'How quickly must the seller ship?', a: 'The seller commits to shipping within 4 days of the auction ending.' },
        { q: "What happens if the seller doesn't ship?", a: "If the seller doesn't ship within 4 days, Habahub intervenes and the buyer receives a full refund." },
      ],
    },
  ],
  sv: [
    {
      id: 'allmant', title: 'Allmänt',
      items: [
        { q: 'Vad är Habahub?', a: 'Habahub är en finländsk auktions- och direktförsäljningsplattform. Säljare kan sälja sina produkter i realtidsvideosändningar (liveauktioner), i schemalagda tidsbegränsade auktioner eller direkt till ett fast pris (direktförsäljning). Köpare kan lägga bud under en livesändning eller en tidsbegränsad auktion, eller köpa direkt.' },
        { q: 'Är registrering gratis?', a: 'Ja. Det är helt gratis att skapa ett konto. Du betalar bara för de produkter du köper och fraktkostnaderna.' },
        { q: 'Kan jag både köpa och sälja med samma konto?', a: 'Ja. Med ett konto kan du både delta i auktioner som köpare och sälja dina egna produkter.' },
        { q: 'Var verkar Habahub?', a: 'Habahub riktar sig i första hand till finländska användare. Leveranser sker huvudsakligen inom Finland.' },
      ],
    },
    {
      id: 'kopare', title: 'Köparguide',
      items: [
        { q: 'Hur fungerar en liveauktion?', a: 'Säljaren öppnar en videosändning och presenterar produkterna live. Du kan buda genom att ange önskat belopp. Det högsta budet när sändningen avslutas vinner produkten.' },
        { q: 'Hur fungerar en traditionell (schemalagd) auktion?', a: 'Säljaren anger ett utropspris och en varaktighet (1–7 dagar) — ingen videosändning behövs. Du kan buda när som helst medan auktionen pågår. Det högsta budet när tiden går ut vinner produkten.' },
        { q: 'Är bud bindande?', a: 'Ja. Alla bud är bindande och kan inte återkallas. Genom att buda förbinder du dig att köpa produkten om du vinner.' },
        { q: 'Hur betalar jag?', a: 'Betalning sker via Paytrail — stöder alla finländska banker, MobilePay, kortbetalningar, Google Pay och Apple Pay.' },
        { q: 'När får jag min beställning?', a: 'Säljaren förbinder sig att skicka produkten inom 4 dygn efter att auktionen avslutats. Du får en spårningskod så snart säljaren har skickat paketet.' },
        { q: 'Vad händer om varan inte kommer fram eller skiljer sig från beskrivningen?', a: 'Kontakta kundtjänsten omedelbart. Vi utreder varje fall och hjälper till att lösa situationen.' },
      ],
    },
    {
      id: 'saljare', title: 'Säljarguide',
      items: [
        { q: 'Hur börjar jag sälja?', a: 'Skapa ett konto och lägg till produkter i din dashboard. Du kan sälja på tre sätt: starta en livesändning och auktionera ut produkter direkt, lägg upp en produkt som en schemalagd tidsbegränsad auktion, eller lista den för direktförsäljning till ett fast pris — valet görs när du lägger till produkten.' },
        { q: 'Vad kan jag sälja?', a: 'Du kan sälja nästan alla lagliga begagnade eller nya varor. Förbjudna varor är bland annat vapen och ammunition, alkohol, tobak och nikotinprodukter, läkemedel, narkotika och andra psykoaktiva ämnen, levande djur, förfalskade eller upphovsrättsintrångande produkter, stulen egendom samt annan olaglig egendom. Se hela listan i användarvillkoren.' },
        { q: 'När får jag mina pengar?', a: 'När köparen tar emot och godkänner produkten, eller när 24 timmar har gått sedan leveransen bekräftades utan att en reklamation gjorts — beroende på vilket som inträffar först. Om leveransen aldrig bekräftas (t.ex. paketet försvinner) frigörs betalningen senast efter 14 dagar.' },
        { q: 'Vad är förmedlingsavgiften?', a: 'Habahub tar ut en förmedlingsavgift på 3,5% av försäljningspriset, högst 35€ per affär. Dessutom tillkommer betalningshanteringsavgifter (ca 1,5% + 0,25€).' },
        { q: 'Hur strömmar jag med OBS?', a: 'Du kan strömma med OBS Studio (gratis program): 1) Ladda ner och installera OBS Studio. 2) Öppna Inställningar → Stream. 3) Välj Tjänst: Anpassad (Custom). 4) Kopiera Server och Stream Key från "Starta sändning"-vyn i din dashboard till motsvarande fält i OBS. 5) Klicka på "Start Streaming" i OBS. Sändningen visas för tittarna med några sekunders fördröjning.' },
      ],
    },
    {
      id: 'leverans', title: 'Leverans',
      items: [
        { q: 'Vem betalar fraktkostnaderna?', a: 'Köparen betalar fraktkostnaderna. Frakten är en fast avgift på 6,90€ oavsett produktens storlek.' },
        { q: 'Hur snabbt måste säljaren skicka?', a: 'Säljaren förbinder sig att skicka produkten inom 4 dygn efter att auktionen avslutats.' },
        { q: 'Vad händer om säljaren inte skickar?', a: 'Om säljaren inte skickar produkten inom 4 dygn ingriper Habahub och köparen får full återbetalning.' },
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
  const sections = FAQ_DATA[lang as 'fi' | 'en' | 'sv'] ?? FAQ_DATA.fi

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
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
          {t.faq.contact} <a href="mailto:support@habahub.fi" style={{ color: C.accent }}>support@habahub.fi</a>
        </p>
      </div>
      <Footer />
    </div>
  )
}
