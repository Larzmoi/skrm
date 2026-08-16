# SKRM — Suomalainen Live-huutokauppa & Marketplace

## Projektin kuvaus
SKRM on suomalainen live-huutokauppa- ja suoramyyntialusta. Myyjät voivat myydä tuotteitaan reaaliaikaisessa videolähetyksessä (live-huutokauppa) tai listata ne suoraan myyntiin (suoramyynti). SKRM ei ole osapuoli kaupassa — marketplace-malli kuten Whatnot.

**Domain:** skrm.fi (ostettu, Cloudflare DNS)
**Testitunnukset:** poistettu tuotannosta 2026-08-16 (ks. "Testitilien poisto" -osio) — omistaja testaa nyt omalla Larzmoi-tunnuksella. Luo uusi testitunnus tarvittaessa `/register`-sivun kautta.

## Tech Stack
- **Frontend:** Next.js 16.2.12 + TypeScript, App Router, inline styles, Turbopack
- **Backend:** Node.js + Express + Prisma 5 + PostgreSQL
- **WebSocket:** Socket.io (reaaliaikainen bidding)
- **Tietokanta:** PostgreSQL (skrm, localhost:5432, salasana: admin)

## Käynnistys
```powershell
# Backend (port 4000)
cd C:\Users\johan\Desktop\skrm\backend && npm run dev

# Frontend (port 3000)
cd C:\Users\johan\Desktop\skrm\frontend && npm run dev
```

## Rakenne
```
skrm/
  backend/
    src/
      index.ts          — Express server + Socket.io
      socket.ts         — WebSocket handlers (bidding, chat)
      routes/
        auth.ts         — /auth/register, /auth/login
        products.ts     — /products CRUD
        shows.ts        — /shows CRUD
        users.ts        — /users/:username, PATCH /users/me
      middleware/
        auth.ts         — JWT authMiddleware
      db/prisma.ts
    prisma/
      schema.prisma     — User, Show, Product, Bid, Order, Follower
  frontend/
    app/
      page.tsx                    — Etusivu (live + myynnissä)
      selaa/page.tsx              — Selaa-sivu (suoramyynti, suodatus)
      tuotteet/[id]/page.tsx      — Tuotesivu
      live/[showId]/page.tsx      — Live-näkymä (WebSocket)
      live-kaikki/page.tsx        — Kaikki live-lähetykset
      u/[username]/page.tsx       — Julkinen profiili
      ostot/page.tsx              — Ostajan ostohistoria
      dashboard/
        page.tsx                  — Dashboard etusivu
        tuotteet/page.tsx         — Tuotteiden hallinta
        lahetys/page.tsx          — Live-lähetyksen hallinta
        tilitykset/page.tsx       — Tilitykset
        profiili/page.tsx         — Profiili + lomamoodi
      faq/page.tsx
      kayttoehdot/page.tsx
      tietosuoja/page.tsx
      valityspalkkiot/page.tsx
      meista/page.tsx
    components/
      layout/
        Navbar.tsx
        Footer.tsx
        ClientLayout.tsx          — Provider-wrapper
        ThemeToggle.tsx
      dashboard/
        DashboardLayoutClient.tsx
    lib/
      api.ts                      — API client (fetch wrapper)
      auth-context.tsx            — Kirjautuminen
      avatar-context.tsx          — Profiilikuva (jaettu kaikille)
      theme-context.tsx           — Tumma/vaalea teema + värit (C.xxx)
      lang-context.tsx            — FI/EN kielituki
      kategoria-context.tsx       — Aktiivinen kategoria
      kategoriat.ts               — 14 kategoriaa + alakategoriat {fi, en} (LUKITTU, ks. "Kategoriat"-osio — kommentti oli vanhentunut, korjattu 2026-08-07)
      socket.ts                   — Socket.io client
      imageUtils.ts               — Kuvan pienennys (resizeImage)
      i18n/fi.ts, en.ts, sv.ts    — Käännökset
```

## Liiketoimintasäännöt (LUKITTU — ei muuteta)
- Välityspalkkio: **3% max 35€** + Paytrail ~1,5% + 0,25€ (ei kattoa)
- Kaikki huudot **sitovia** — ei peruutuksia
- **Yhdistetty lähetys:** sama myyjä + 6h aikaikkuna = yksi tilaus, yksi postikulut (suurimman pakettikoon mukaan). 6h rajan jälkeen uusi erillinen tilaus.
- **Maksuaika:** voitettu huuto tai ostos → 2h aikaa maksaa → kaikki maksutavat (MobilePay, Google Pay, verkkopankki, kortti) → ei pakollista kortintallennusta
  - **Poikkeus:** perinteisen (ajastetun) huutokaupan **passiivinen voitto** (huutokauppa päättyy itsestään, esim. yöllä) → **24h** maksuaikaa, koska voittaja ei ole aktiivisesti läsnä silloin. "Osta heti" (buy-now) ja live-huuto pysyvät 2h:ssa, koska ostaja on aktiivisesti paikalla klikatessaan. Päätetty 2026-08-07.
- **Rekisteröityminen:** käyttäjän on hyväksyttävä käyttöehdot, tietosuoja ja kaupankäyntipolitiikka erillisillä checkboxeilla ennen kuin voi luoda tilin. Checkboxit pakollisia — ei oletuksena rastitettu.
- **Banni — TIUKENNETTU 2026-08-13:** JO ENSIMMÄINEN maksamaton tilaus → automaattinen 30 päivän banni heti. Jokainen seuraava rike → uusi 30 päivän banni. Ei poikkeuksia, ei kolmen kerran varoitusrajaa enää. ("Oppivat olemaan" — omistajan perustelu, tarkoituksella tiukka.)
- Maksuturva: maksu pidätetään kunnes myyjä toimittaa seurantakoodin
- Myyjällä **48h** aikaa lähettää (lomamoodi: 7 päivää)
- SKRM **ei ole osapuoli** kaupassa — marketplace-malli
- Pankkitunnistautuminen (Signicat) pakollinen ennen huutamista/myymistä (tulossa)
- **Ikäraja: 15+** (huoltajan suostumuksella)

## Välityspalkkiotaulukko
| Myyntihinta | SKRM-palkkio |
|-------------|-------------|
| 10€ | 0,65€ |
| 100€ | 4,75€ |
| 333€ | 13,54€ |
| 500€+ | 35,00€ (max) |

## Postihinnat (ostaja maksaa) — PÄIVITETTY 2026-08-12, LUKITTU
**Yksi kiinteä hinta kaikille paketeille: 9,90€.** Korvaa aiemman kokoportaikon (XXS-XXL, 9,90€-46,90€) kokonaan — poistettu käytöstä.

**Perustelu:** omistaja selvitti, että yritykselle (OY) Postin todellinen kustannus on n. 4-5€ per paketti (painoperusteinen hinnoittelu Postilta) — 9,90€ kiinteä hinta säilyttää terveen katteen kaikilla pakettikoilla, ei tarvitse monimutkaista porrastusta.

**Toimitusvaihtoehdot yksinkertaistettu:** vain kaksi vaihtoehtoa, ei muita:
1. **Postitus** — kiinteä 9,90€
2. **Nouto** — jos ostos menee SKRM:n checkoutin kautta, kuuluu maksuturvan piiriin noutokoodilla vahvistettuna (ks. tarkennettu "Noutotuotteet"-sääntö alempana). Täysin platformin ulkopuoliset sopimukset (ei koskaan Order-riviä) eivät kuulu meille, ennallaan.

**Tekninen huomio VS Coden Claudelle:** tarkista kaikki paikat joissa vanha kokoportaikko (XXS/S/M/L/XL/XXL-hintalogiikka) on koodissa käytössä — tuotteen luontilomake (pakettikoon valinta saattaa muuttua tarpeettomaksi jos hinta ei enää riipu koosta, mutta pakettikoko voi silti olla tarpeen tiedoksi Postin lähetystarraa varten myöhemmin), tilauksen hinnanlaskenta, "Yhdistetty lähetys" -logiikka (LUKITTU: "sama myyjä + 6h ikkuna = yksi tilaus, yksi postikulut suurimman pakettikoon mukaan" — tarkista onko tämä sääntö nyt tarpeeton koska kaikki paketit maksavat saman verran, vai pitääkö "suurimman pakettikoon mukaan" silti säilyä jostain muusta syystä kuten fyysisestä pakkaamisesta), ja Välityspalkkiot-sivun/muiden julkisten sivujen tekstit jotka näyttävät vanhaa hintaportaikkoa.

## Tärkeät koodaussäännöt
- **Käännökset:** Käytä AINA `t.xxx` — ei kovakoodattua suomea/englantia
- **EI EMOJEJA SIVUSTOLLA, EI KOSKAAN.** Ei UI-teksteissä, ei ilmoituksissa, ei painikkeissa, ei chatin oletusviesteissä, ei missään käyttäjälle näkyvässä kohdassa. Käytä tarvittaessa ikoneja (esim. samaa ikonikirjastoa mitä sivustolla jo on) tai pelkkää tekstiä, ei koskaan emojeja kuten ✅🎉😀. Tämä sääntö on toistunut ongelmana koska sitä ei ollut aiemmin kirjattu tänne — nyt LUKITTU, ei poikkeuksia.
- **Kategoriat:** `getKatNimi(kat, lang)` ja `getAlaNimi(ala, lang)` — nimi on objekti `{fi, en}`
- **Kuvat:** Tallennetaan base64:na, erotin `|||` useampien välillä. Ota ensimmäinen: `imageUrl.split('|||')[0]`
- **Teemat:** Käytä `C.xxx` värejä (C.accent, C.bg, C.text, C.muted, C.border, C.cardBg jne.)
- **Ei mock-dataa:** Kaikki data haetaan backendistä. Jos ei löydy → tyhjä tila
- **API (paikallinen kehitys):** NEXT_PUBLIC_BACKEND_URL=http://localhost:4000 — **huom, tämä koskee vain paikallista kehitystä omalla koneella**. Tuotannossa (Hetzner) portit 4000 (backend) ja 3000 (frontend) ovat PM2:n sisäisiä portteja joita nginx reitittää `app.skrm.fi`:n takana — ei suoraan julkisesti näkyviä. Ks. "Hetzner — KOKO PROJEKTI SIIRRETTY" -osio alempana täydelliselle infralle.

## VISUAALINEN JÄÄDYTYS — prioriteetti ennen kaikkea muuta (päätetty 2026-08-08)
Ennen kuin mitään uutta toiminnallisuutta rakennetaan, koko sivusto käydään läpi visuaalisesti ja "jäädytetään" ammattimaisen näköiseksi — tavoite on että omistaja kehtaa esitellä sivua yhteistyökumppaneille sellaisenaan, vaikka kaikki toiminnot eivät vielä toimisi täydellisesti. **Ulkoasu ja tyylikkyys menevät toiminnallisuuden edelle juuri nyt.**
- Käy läpi jokainen sivu: emojit pois (ks. yllä oleva LUKITTU sääntö), layoutit jotka eivät mahdu näyttöön korjataan, epäjohdonmukaiset välit/fontit/värit yhtenäistetään
- Kun omistaja on visuaalisesti tyytyväinen sivuun kokonaisuutena, tämä osio päivitetään "VALMIS"-tilaan eikä ulkoasuun enää kosketa ilman erikseen pyydettyä syytä — keskitytään sen jälkeen toiminnallisuuden loppuunsaattamiseen taustalla, ilman että omistajan tarvitsee jännittää miltä sivu näyttää kesken sen

**Läpikäynti tehty 2026-08-08 (odottaa omistajan lopullista visuaalista hyväksyntää ennen VALMIS-merkintää):**
- Koko sivusto käyty läpi regexillä emojien varalta (kaikki `.tsx`-tiedostot, ei vain aiemmin muokatut) — löytyi yksi rikkomus: 🏖-emoji lomamoodi-bannerissa (`u/[username]`), **poistettu**
- Vahvistettu: muut sivustolla käytetyt merkit (✓ ✕ ⚑ ★ ☆ ➤) ovat sivuston oma vakiintunut ei-värillinen ikonikieli, ei emojisääntöä rikkovia — ei vaadi muutosta
- Layout-ylivuoto oli spesifisti lähetys-sivulla (jo korjattu aiemmin), muut `height:100vh`-tyyppiset sivut (mm. `/live/[showId]`) tarkistettu, olivat jo oikein
- Fontit/välit/värit pistokoetarkistettu, ei löytynyt konkreettisia poikkeamia ilman tarkempaa kohdennusta — **jos omistaja löytää jotain silmämääräisesti tarkistaessaan, kerro tarkka sivu/kohta niin korjataan kohdennetusti**

## Tekemättä (prioriteettijärjestyksessä — päivitetty 2026-08-07, ks. myös "SEURAAVAKSI TEHTÄVÄT" alempana ominaisuuksien osalta)
1. **Ennakkotarjoukset, chat-moderointi, giveaway** — seuraavat isot ominaisuudet nyt kun storefront on valmis, ks. "SEURAAVAKSI TEHTÄVÄT"
2. ✅ **Deploytaus — TEHTY 2026-08-07.** Koko projekti (backend+DB+frontend) on Hetznerillä, PM2:n ja nginxin hallinnassa, SSL kunnossa. Railway ja app.skrm.fi:n Netlify pois käytöstä. Ainoa jäljellä oleva Netlify-kohde on `skrm.fi`-landing-sivu, joka pysyy siellä tarkoituksella (staattinen, ei backend-riippuvuutta). Ks. "Hetzner — KOKO PROJEKTI SIIRRETTY" -osio täydelliselle tekniselle kokoonpanolle.
3. ✅ **Paytrail — TEHTY JA TESTATTU TUOTANNOSSA 2026-08-12** (Shop-in-Shop, testitunnuksilla — ks. "Paytrail-maksuintegraatio" -osio alla täydelliselle selvitykselle, korvaa vanhan mock-pay-testivirran kokonaan)
4. **Signicat** — pankkitunnistautuminen (pakollinen ennen huutamista/myymistä) — vaatii OY:n
5. **Resend** — sähköpostinotifikaatiot (odottaa skrm.fi domain-aktivoitumista Zohon jälkeen)
6. **Postin tracking API** — automaattinen toimitusseuranta (nyt myyjä syöttää seurantakoodin manuaalisesti)
7. **Cloudflare R2** — kuvat pois tietokannasta (nyt base64 suoraan Postgresissa)
8. ✅ **OBS-testi Hetznerillä — TEHTY osittain, LOPPUUN ASTI TEKEMÄTTÄ.** RTMP-vastaanotto + HLS-tiedostojen generointi + nginx-jakelu on vahvistettu toimivaksi end-to-end (curl 200 OK oikealla HLS-tiedostolla). Jäljellä: frontendin `VideoPlayer` ei vielä näytä kuvaa oikein — todennäköisesti HLS-URL:in rakennuksessa virhe. Ks. "Tunnettuja bugeja" alla.

## Paytrail-maksuintegraatio — TEHTY JA TESTATTU TUOTANNOSSA 2026-08-12

Shop-in-Shop-malli, testitunnuksilla. Korvaa vanhan mock-pay-testivirran kokonaan.
Dokumentaatio luettu suoraan github.com/paytrail/api-documentation:sta (OpenAPI-spesifikaatio
+ docs/README.md + docs/examples.md + docs/shop-in-shop.md) ennen toteutusta — HMAC-algoritmi,
Shop-in-Shop-kenttien tarkka muoto ja testitunnukset kaikki vahvistettu sieltä, ei arvattu.

### Arkkitehtuuripäätös: maksun aloitus eriytetty tilauksen luonnista, YKSI maksu per tilaus
`Order.sellerId` on aina yksittäinen kenttä (ei taulukko) — jokainen Order on jo rakenteellisesti
yhden myyjän. Shop-in-Shopia ei siis tarvita usean myyjän YHDEN maksun yhdistämiseen, vaan siihen
että Paytrail jakaa maksun automaattisesti SKRM:n (komissio, 3%/max20€) ja myyjän (sub-merchant)
kesken ilman että SKRM:n tarvitsee pitää omaa pidätetty-saldo-kirjanpitoa tai tehdä manuaalisia
tilisiirtoja.
- Order-luontifunktiot (`cart/checkout`, `createOrderForAuctionWin`) EIVÄT itse kutsu Paytrailia
  — ne vain luovat tilauksen. **`POST /orders/:id/pay`** käynnistää maksun ostajan omasta
  aloitteesta.
- **✅ KORJATTU 2026-08-12 (omistajan testilöydös):** ensimmäinen versio maksoi tuotteen ja
  toimituksen KAHTENA erillisenä Paytrail-maksuna (ensin tuote, sitten myöhemmin toimitus
  erikseen kun pakettikoko valittiin). Omistaja testasi ja totesi selvästi: **"pitäisi maksaa
  kaikki kerralla, ei erikseen"**. Korjattu arkkitehtuurimuutoksella: toimitustapa valitaan
  AINA ennen maksua (kori-sivulla checkout-hetkellä, tai huutokaupan voitolle `/ostot`-sivulla
  juuri ennen maksunappia), ja `POST /orders/:id/pay` veloittaa `productTotal + shippingPrice`
  YHTENÄ Paytrail-maksuna. `OrderStatus.PENDING_SHIPPING_SELECTION` poistui käytöstä kokonaan
  välitilana (Order siirtyy suoraan `PENDING_PAYMENT` → `PENDING_SHIPPING` maksun jälkeen).
  6h-yhdistämisikkuna (sama myyjä, useampi ostos) toimii nyt vain VIELÄ MAKSAMATTOMIIN
  tilauksiin — jos ostaja lisää tuotteita jo maksettuun tilaukseen, se aloittaa uuden erillisen
  tilauksen (looginen, koska maksettua kertaostosta ei voi enää muokata jälkikäteen).

### Toteutus
- `backend/src/lib/paytrail.ts` (kirjoitettu kokonaan uusiksi): HMAC-SHA256-allekirjoitus
  (kaikki `checkout-`-alkuiset parametrit aakkosjärjestykseen, `key:value` per rivi + body,
  `\n`-yhdistettynä), `createPayment()` rakentaa Shop-in-Shop-muotoisen `items[]`-taulukon
  (`merchant`, `commission: {merchant, amount}`), `verifyCallbackSignature()` webhookille,
  `refundFull()`/`refundItem()` hyvityksille
- `getSubmerchantId(sellerId)` palauttaa testivaiheessa aina saman `695874`:n riippumatta
  myyjästä — **ainoa paikka joka pitää päivittää** kun oikeat per-myyjä submerchant-ID:t on
  onboardattu Paytrailin kanssa (myöhempi, erillinen, tietoisesti rajattu pois tästä vaiheesta)
- `computeCommissionCents()`: SKRM:n 3%/max20€ LUKITTU-sääntö, senteissä (Paytrailin API käyttää
  pienintä valuuttayksikköä kaikkialla). Toimitusmaksulle ei komissiota (`chargeCommission:false`)
- Stampiin (`orderId__uuid`) koodataan tilaus niin että webhook löytää oikean Orderin ilman
  erillistä `transactionId`-hakukenttää — Paytrail palauttaa stampin sellaisenaan jokaisessa
  callbackissa
- **`GET /webhooks/paytrail`** (HUOM: GET, ei POST — Paytrail kutsuu redirect- ja callback-
  URL:eja samalla tavalla query-parametrein, ei bodyllä). EI KOSKAAN luoteta ilmoitukseen ennen
  HMAC-varmistusta. Idempotentti (Paytrail voi kutsua useita kertoja samasta tapahtumasta,
  dokumentoitu käytös) — tarkistaa ettei tilausta ole jo viety eteenpäin ennen käsittelyä
- `Order`-malliin `paytrailProductTxId`/`paytrailShippingTxId` — jälkimmäinen on nyt käytännössä
  aina tyhjä uusilla tilauksilla (yksi yhdistetty maksu käyttää vain `paytrailProductTxId`:tä),
  säilytetty schemassa taaksepäin yhteensopivuuden/mahdollisen tulevan tarpeen vuoksi
- **`POST /orders/:id/refund`** — koko tilauksen tai per-tuote-hyvitys (`itemIds` bodyssä),
  Shop-in-Shopin natiivi tuki palauttaa myös komissio-osuuden myyjälle samassa pyynnössä. UI:
  "Hyvitä"-nappi `dashboard/tilaukset`-sivulla (`ConfirmDialog`, ei natiivi `confirm()`)
- `.env`: `PAYTRAIL_TEST_MODE`/`PAYTRAIL_MERCHANT_ID`/`PAYTRAIL_SECRET`/`PAYTRAIL_SUBMERCHANT_ID`
  + uusi `BACKEND_PUBLIC_URL` (`https://app.skrm.fi/api` tuotannossa, nginx: `/api/` → `:4000/`
  prefiksi poistuen) — vaihto tuotantotunnuksiin OY:n valmistuttua on vain näiden neljän arvon
  päivitys, ei koodimuutoksia. **Huom:** `FRONTEND_URL` ei ollut ennen tätä edes asetettu
  tuotannon `.env`:ssä — lisätty nyt (`https://app.skrm.fi`), ilman sitä redirect-URL:t
  olisivat osoittaneet `localhost:3000`:iin tuotannossa.

### Testattu tuotannossa OIKEALLA Paytrailin testi-API:lla (ei vain typecheck)
Curl-pohjainen päästä-päähän-testi testi@skrm.fi/testi2@skrm.fi-tunnuksilla, oikea tuote
("Penny sleeve", 2,90€) + toimitusmaksu (S-paketti, 11,90€) — **huom: tämä testi tehtiin ennen
yhden-maksun-korjausta, jolloin havaittiin kahden-maksun-ongelma. Yhden-maksun-korjauksen
jälkeinen versio on typetarkastettu ja deployattu, mutta ei vielä uudelleen käyty läpi samalla
curl-testillä — seuraava askel jos tarpeen.**
- ✅ Maksun luonti: oikea Paytrail-transactionId + `pay.paytrail.com/pay/...`-osoite, vastasi
  HTTP 200:lla oikeasti selaimessa avattuna
- ✅ Webhookin allekirjoitus: oikein signeerattu synteettinen callback hyväksyttiin ja päivitti
  Orderin statuksen oikein; väärennetty allekirjoitus hylättiin 401:llä
- ✅ Idempotenssi: sama webhook kahdesti ei tuplakäsitellyt/-ilmoittanut
- ✅ Refundin pyyntömuoto vahvistettu oikeaa Paytrail-APIa vasten (Paytrail palautti odotetun
  `"Transaction not paid"`-virheen koska testissä ei koskaan käyty oikeasti maksamassa Paytrailin
  hostatulla sivulla asti — itse pyynnön rakenne/allekirjoitus on silti vahvistettu oikeaksi)
- ✅ **Sivulöydös korjattu testauksessa:** Cloudflare korvaa 502/503/504-vastausten rungon aina
  omalla geneerisellä virhesivullaan riippumatta origin-palvelimen palauttamasta JSON-sisällöstä
  — `/pay`- ja `/refund`-reittien Paytrail-virheet käyttivät alun perin 502:sta, vaihdettu 400:aan
  joka kulkee Cloudflaren läpi muuttumattomana

### Ei vielä testattu (rehellinen rajaus)
- **Oikean maksun loppuunvieminen Paytrailin hostatulla sivulla** (klikkaus läpi testipankin) —
  vaatii interaktiivisen selaimen, ei automatisoitavissa curl:lla turvallisesti. Kaikki tähän asti
  todennettu (maksun luonti, webhook, statussynkronointi) toimii oikeasti Paytrailin API:a vasten,
  mutta täysi "ostaja klikkaa läpi testipankin" -polku vaatii omistajan manuaalisen testin oikeassa
  selaimessa `/kori`- tai `/ostot`-sivulta. **Huom Danske:** Paytrailin oma dokumentaatio sanoo
  Danske-testipankin vaativan OIKEITA Danske-pankkitunnuksia sandbox-testauksessakin — käytä
  Nordeaa tai OP:ta testaukseen (ei vaadi mitään tunnuksia, täysin turvallinen).
- Myyjäkohtainen submerchant-onboarding-prosessi tuotantoon — tietoisesti rajattu pois tästä
  vaiheesta käyttäjän ohjeen mukaisesti, eri myöhempi vaihe
- Uusi kiinteä 9,90€ postihinta (ks. "Postihinnat" -osio) ei vielä toteutettu koodissa
  (`backend/src/lib/shipping.ts` sisältää yhä vanhan kokoportaikon) — ei vaikuta Paytrail-
  integraation toimintaan koska hinta luetaan aina `getShippingPrice()`:n kautta, ei kovakoodattu
  maksulogiikkaan, mutta erillinen tehtävä joka vielä odottaa toteutusta

## Tunnettuja bugeja / kehityskohteita
- ✅ **KORJATTU 2026-08-14 — kolme löydöstä `dashboard/tuotteet`-sivun (myyjän tuotehallinta) testauksesta, omistajan raportoima.**
  1. **Postihinta näkyi kahteen kertaan sama luku peräkkäin ("Postitus 9,9€" ja heti alla vielä "9,9€").** Juurisyy: kun kokoportaikko (XXS-XXL) korvattiin kiinteällä 9,90€ hinnalla (ks. "Postihinnat"-osio), `lib/pakettikoot.ts`:n `nimi`-kenttä muutettiin sisältämään hinta valmiiksi (`"Postitus 9,9€"`), mutta napin renderöinti (`dashboard/tuotteet/page.tsx`) ei päivittynyt samalla — se näytti yhä erillisen `p.hinta`-rivin napin sisällä, joka aiemmassa (kokoportaikko-)mallissa oli tarpeellinen mutta on nyt duplikaatti. Poistettu erillinen hintarivi.
  2. **Sama vanhentunut kokoportaikko löytyi myös julkiselta `/valityspalkkiot`-sivulta** (kuudella koolla XXS-XXL, 9,90€-46,90€) — CLAUDE.md:ssä oli jo aiemmin merkitty tämä tarkistettavaksi ("Tekninen huomio VS Coden Claudelle") muttei koskaan tehty. Korvattu yksinkertaisella kaksiriviisellä taulukolla (Postitus 9,90€ / Nouto myyjältä maksuton).
  3. **"Lots of translations missing" — koko `dashboard/tuotteet`-sivu oli lähes kokonaan kovakoodattua suomea, ei käyttänyt `t.xxx`-järjestelmää lainkaan (paitsi kaupunkikenttä).** Rikkoi LUKITTU koodaussääntöä "Käytä AINA t.xxx". Lisätty uusi `dashboardProducts`-nimiavaruus `lib/i18n/fi.ts`+`en.ts`:ään (~45 avainta: lomakkeen kentät/otsikot/napit, myyntitapavaihtoehdot, kuntoluokat, tuotelistan tekstit) ja kytketty koko sivu käyttämään niitä. Sivuvaikutuksena korjattu myös kategoriapudotusvalikko, joka näytti aina suomenkielisen nimen (`k.nimi.fi`) riippumatta valitusta kielestä — ala-/tyyppikategoriat käyttivät jo oikein `lang`-riippuvaista nimeä, vain ylätason kategoria oli unohtunut.
  4. **✅ KORJATTU 2026-08-14 — jatkokysymys paljasti oikean bugin "Ei muutettu" -kohdan takana.** Omistaja kysyi aiheellisesti: jos tuote on osa tilausta, miksi se silti näkyy "Aktiiviset"-listassa täysin normaalina ja on muokattavissa? Vastaus paljasti todellisen epäjohdonmukaisuuden: kun maksamattoman tilauksen maksuaika umpeutuu (`webhooks.ts` `checkExpiredPayments()`), Order merkitään `CANCELLED`:ksi ja tuote palautetaan oikein `PENDING`-tilaan (näkyy taas aktiivisena, muokattavissa — tämä osa on oikein, koska peruutettu tilaus ei ole enää voimassa). **Mutta itse peruutetun Orderin OrderItem-rivi ei koskaan poistunut** — se jäi ikuisesti roikkumaan tuotteeseen, ja poistotarkistus (`if (product.orderItems.length > 0)`) laski MYÖS peruutetut/koskaan-maksamattomat tilaukset "osaksi tilausta", vaikka niiden takana ei ole mitään oikeaa rahaliikennettä. Lopputulos: tuote näytti täysin aktiiviselta muttei silti voinut koskaan poistaa.
     - **Korjaus:** `DELETE /products/:id` ja `DELETE /admin/products/:id` (`backend/src/routes/products.ts` + `admin.ts`) laskevat nyt vain EI-CANCELLED-tilauksiin kuuluvat OrderItemit poiston esteeksi — peruutettu/maksamaton tilaus ei enää estä. Poistohetkellä siivotaan myös nämä orpoutuneet CANCELLED-tilausten OrderItem-rivit pois ennen `product.delete()`:ää (muuten poisto olisi kaatunut FK-rajoitteeseen, koska `OrderItem.productId` ei ole nullable — sama virheluokka kuin jo aiemmin dokumentoitu Bid/AutoBid-FK-bugi, ks. alempi kohta samassa listassa).
     - Aidosti maksetut/käynnissä olevat/kiistanalaiset tilaukset (`PENDING_PAYMENT`, `PENDING_SHIPPING`, `SHIPPED`, `DELIVERED`, `DISPUTED`) estävät yhä poiston normaalisti — vain `CANCELLED` on poikkeus.
  - Virhe "Tuote on osa tilausta, ei voida poistaa" tulee suoraan backendiltä suomeksi riippumatta valitusta kielestä — sama koskee kaikkia backendin virheviestejä koko sivustolla, ei tälle sivulle ominainen puute, ei korjattu tässä yhteydessä (vaatisi laajemman backend-virhekoodien i18n-arkkitehtuurin).
- ✅ **KORJATTU 2026-08-14 — striimin kuvasuhde skaalautui väärin leveillä näytöillä (esim. 32" monitori, koko näytön leveydeltä), n. 20% kuvasta leikkautui ylä-/alareunasta.** Omistajan raportoima. Syy: sekä katsojan `VideoPlayer`- (`frontend/app/live/[showId]/page.tsx`) että myyjän omat esikatselu-`<video>`-elementit (`HlsPreview` ja kameran asetusesikatselu, `frontend/app/lahetys/page.tsx`) käyttivät `objectFit: 'cover'`, joka rajaa/leikkaa kuvan täyttääkseen koko laatikon riippumatta kuvasuhteesta — kun laatikon kuvasuhde (esim. hyvin leveä ikkuna) ei täsmännyt striimin 16:9-kuvasuhteeseen, ylimääräinen kuva leikkautui pois näkymättömiin. **Vaatimus omistajalta: koko kuva pitää aina näkyä kokonaan riippumatta näytön koosta/venytyksestä.** Kaikki kolme vaihdettu `objectFit: 'contain'`:iin — näyttää aina koko kuvan, jättää tarvittaessa mustat palkit sivuille tai ylös-alas (kaikkien video-elementtien taustat ovat jo valmiiksi tummia, joten palkit näyttävät tarkoituksellisilta, ei "reiältä"). Ei koske tuotekuvien/avatarien `cover`-käyttöä (ne ovat tarkoituksella rajattuja neliökuvia, eri tapaus).
- ✅ **KORJATTU 2026-08-08/09 — Live-video ei näytä latautuvan / chat ei toimi luotettavasti kaikilla laitteilla.** Alkuperäinen epäily (HLS-URL:in rakennusvirhe) osoittautui vääräksi — juurisyy oli useampi kerros, ks. "Live-konsolin mobiilikorjaukset ja infrastruktuurikorjaukset" alempana täydelliselle selvitykselle (hls.js:n puuttuva uudelleenyritys, nginxin 60s oletus-proxy_read_timeout tappamassa pitkäkestoisia socket.io-yhteyksiä, ja mobiilioperaattorin NAT joka pudotti vain palvelin→asiakas-suunnan liikenteen).
- **Tuotteen poisto jolla on jo huutoja kaatuu raakaan Prisma-virheeseen** (`DELETE /products/:id`, myyjän oma poisto dashboardista) — FK constraint violation, ei käsitelty. Admin-poistoon (`DELETE /admin/products/:id`) tämä on jo korjattu (siivoaa Bid/AutoBid/CartItem ensin) — sama korjaus pitäisi tehdä myös myyjän omaan poistoreittiin.
- `socket.ts`:n live-lähetyksen socket-pohjainen huutojärjestelmä ei käytä `bidIncrement`-minimikorotusta ollenkaan (korjattu vain `auctions.ts`:ssä, perinteisille huutokaupoille)
- Selaa-sivun saleType-kuplat (Kaikki/Suoramyynti/Huutokaupat) voivat olla turha kaksinkertainen jaottelu Navbarin ylätason navigoinnin kanssa — ei päätetty, ks. "Selaa-sivun saleType-kuplat" alempana

## Infrastruktuuri

### Domain & DNS
- Domain: **skrm.fi** (Domainhotelli, nimipalvelimet Cloudflaressa: julio + samara)
- DNS: Cloudflare (free)
- Sähköposti: support@skrm.fi → **Zoho Mail (maksullinen taso, muutama €/kk) — päätetty, ei vielä käyttöönotettu.** Antaa sekä vastaanoton että lähetyksen samasta osoitteesta (Cloudflare Email Routing hoiti vain vastaanoton, ei lähetystä samasta osoitteesta, siksi vaihdettu). Vaatii DNS-tietueiden lisäyksen Cloudflareen (MX + verifiointi Zohon ohjeiden mukaan) — tekemättä vielä.

### Hetzner — KOKO PROJEKTI SIIRRETTY ✅ (valmis 2026-08-07)
- Palvelin: **CX23**, Hetzner Cloud VPS, IP `77.42.121.137`, hostname `ubuntu-4gb-hel1-4`
- Backend + frontend + PostgreSQL + nginx-rtmp kaikki nyt samalla palvelimella
- SSH: avainpohjainen (salasanakirjautuminen jätetty päälle varajärjestelmänä, kannattaa harkita poistoa myöhemmin)

**Tekninen kokoonpano:**
- **PostgreSQL**: paikallinen, kanta `skrm`, käyttäjä `skrm_app`
- **Backend**: `/root/skrm/backend`, käännetty (`npm run build` → `dist/`), ajossa PM2:ssa nimellä `skrm-backend`, portti 4000
- **Frontend**: `/root/skrm/frontend`, käännetty (`npm run build`), ajossa PM2:ssa nimellä `skrm-frontend`, portti 3000
- **PM2**: `pm2 startup` + `pm2 save` ajettu, käynnistyy automaattisesti palvelimen rebootissa (systemd-palvelu `pm2-root`)
- **nginx**: `/etc/nginx/sites-available/app.skrm.fi` — `/api/` → localhost:4000, muu → localhost:3000
- **SSL**: Let's Encrypt/certbot, `app.skrm.fi`, auto-uusiutuu, vanhenee 2026-11-05
- **DNS**: Cloudflare, `app.skrm.fi` A-tietue → `77.42.121.137`, proxy päällä (oranssi pilvi)
- **Palomuuri**: ufw päällä, sallittu 22/80/443/1935
- **Data**: Railwayn testidata (3 käyttäjää + tuotteet/tilaukset) siirretty `pg_dump --data-only` + `psql`-tuonnilla — vahvistettu toimivaksi, kaikki kolme testitiliä kirjautuu sisään

**Huomioita jos joskus toistat vastaavan siirron:**
- Backend on TypeScript — muista `npm run build` ennen PM2-käynnistystä, pelkkä `npm install` ei riitä (`npm start` ajaa käännettyä `dist/index.js`:ää)
- `sudo -u postgres psql -c "..."` ilman `-d <kanta>` -määrettä yhdistää oletuskantaan (`postgres`), ei sovelluksen omaan kantaan — oikeuksien myöntö menee helposti väärään paikkaan jos tätä ei muista
- CNAME-tietuetta (esim. vanha Netlify-osoitin) ei voi muokata suoraan A-tietueeksi Cloudflaressa — pitää poistaa ja luoda uusi
- Windowsin/selaimen DNS-välimuisti voi näyttää vanhaa osoitetta hetken vaikka Cloudflaren tietue on jo oikein — `ipconfig /flushdns` tai yksityinen selainikkuna auttaa
- `pg_dump --disable-triggers` -lippu antaa "permission denied" -virheitä system-triggereille ilman superuser-oikeuksia, mutta itse `COPY`-komennot menevät silti läpi oikein jos taulut tuodaan riippuvuusjärjestyksessä — virheistä ei tarvitse hätääntyä, tarkista aina lopuksi `SELECT COUNT(*)` oikealla taululla

### Hosting — Railway POISTETTU KOKONAAN, app.skrm.fi:n Netlify pois käytöstä, landing pysyy
Migraatio Hetznerille on valmis ja vahvistettu (ks. yllä). **Railway-projekti on poistettu kokonaan** (2026-08-08) — ei enää olemassa, ei varakopiota sieltä saatavilla jos joskus tarvittaisiin (kaikki tarpeellinen data on jo siirretty Hetznerille aiemmin tehdyllä `pg_dump`-migraatiolla). `app.skrm.fi`:n Netlify-sivusto voidaan sammuttaa Netlify-dashboardista jos ei jo tehty.
- **skrm.fi** (landing page) → **pysyy Netlifyssä** (`skrm.netlify.app`) — staattinen HTML, FI/SV/EN, "tulossa"-sivu, ei liity backendiin, ei syytä siirtää
- **app.skrm.fi** (sovellus) → **Hetzner**, ks. yllä oleva tekninen kokoonpano
- **Backend** → **Hetzner**, PM2 `skrm-backend`
- **Tietokanta** → **Hetzner**, paikallinen PostgreSQL — **ainoa tietokanta, ei enää Railway-varakopiota olemassa**
- Repot: GitLab (https://gitlab.com/lpjr86/skrm, private) ja GitHub (https://github.com/Larzmoi/skrm, **julkinen**)

## Kategoriat (14 kpl — LUKITTU)
1. Keräilykortit
2. Elektroniikka
3. Vaatteet & asusteet
4. Kengät & laukut
5. Kellot & korut
6. Antiikki & keräily
7. Kirjat, elokuvat & musiikki
8. Lelut & harrastukset
9. Pelit & konsolit
10. Musiikki-instrumentit
11. Taide & käsityöt
12. Urheilu & ulkoilu
13. Koti & sisustus
14. Muut

## Noutotuotteet (LUKITTU — TARKENNETTU 2026-08-12)
**Kaksi eri tilannetta, aiemmin sekoittuivat samaksi säännöksi — nyt erotettu:**

1. **Ostos joka menee SKRM:n kautta (oikea tilaus, maksu Paytrailin kautta) ja jonka toimitustavaksi on valittu "Nouto"** — **tämä KUULUU maksuturvan piiriin**, aivan kuten postitetut tilaukset. Koska Postin seurantakoodia ei tässä tapauksessa ole (ei postiteta), toimituksen vahvistus tapahtuu **noutokoodilla**:
   - Ostaja saa tilaukseensa yksilöllisen noutokoodin ostoksen yhteydessä
   - Fyysisessä noudossa ostaja antaa koodin myyjälle
   - Myyjä syöttää koodin järjestelmään → **tämä toimii samana laukaisimena kuin "Postin API sanoo toimitettu"** toimitusaikataulu-säännössä (ks. alla), eli vapauttaa maksun myyjälle heti (ei tarvitse odottaa 14 päivää, koska molemmat osapuolet ovat fyysisesti läsnä ja voivat vahvistaa vaihdon saman tien)
   - Toteutus: uusi kenttä `Order.pickupCode` (generoitu tilauksen synnyssä nouto-toimitustavalle), endpoint jolla myyjä syöttää/vahvistaa koodin

2. **Kaupankäynti kokonaan SKRM:n ulkopuolella** (esim. ostaja viestii myyjälle "tulen hakemaan ja maksan paikan päällä", ei mene koskaan SKRM:n checkoutin läpi, ei Order-riviä, ei Paytrail-maksua) — **tämä EI kuulu meille**, ei maksuturvaa, ei SKRM:n vastuuta, sama kuin ennenkin. Tämä ei ole muuttunut.

**Vanha varoitusteksti tuotelistauslomakkeessa tarkistettava:** "Noutotuotteiden kaupassa SKRM ei tarjoa maksuturvaa" -teksti oli liian laaja — piti täsmentää koskemaan vain tilannetta 2 (täysin platformin ulkopuolinen sopimus), ei tilannetta 1 (nouto valittuna virallisena toimitustapana SKRM-tilaukselle, joka on suojattu normaalisti).

### ✅ TEHTY 2026-08-12 — Noutokoodi-maksuturva toteutettu
- `Order.pickupCode String?` — generoidaan (6-numeroinen, `crypto.randomInt`) kun ostaja valitsee toimitustavaksi "Nouto" `/orders/:id/select-shipping`:ssä
- `POST /orders/:id/confirm-pickup` — myyjä syöttää koodin, täsmätessä tilaus siirtyy suoraan `DELIVERED`-tilaan (ei `SHIPPED`-välitilaa, ei 14 päivän odotusta) — sama ilmoituspari (`PAYMENT_RELEASED` myyjälle, `ORDER_DELIVERED` ostajalle) kuin 14 päivän automaattivapautuksessa
- `pickupCode` piilotettu myyjän omasta `/orders/selling`-vastauksesta — myyjä ei näe koodia etukäteen, vain ostaja voi kertoa/näyttää sen fyysisessä noudossa
- `/ostot`: ostaja näkee koodin isolla kun tilaus on `PENDING_SHIPPING` ja `shippingSize === 'nouto'`
- `/dashboard/tilaukset`: myyjän seurantakoodikenttä korvautuu noutokoodin syöttökentällä nouto-tilauksille
- Tuotelistauslomakkeen (`dashboard/tuotteet`) nouto-varoitus kirjoitettu uudelleen — kertoo nyt maksuturvan koskevan SKRM-checkoutin kautta meneviä noutotilauksia, varoittaa vain täysin platformin ulkopuolisista sopimuksista
- Sivuvaikutuksena korjattu `cart.ts`:n `suggestedPakettikoko`-logiikka, joka oli jäänyt viittaamaan poistettuun XXS-XXL-kokoportaikkoon (aina `null` postitus/nouto-siirtymän jälkeen) — yksinkertaistettu: postitus voittaa jos yksikin tuote sitä tarvitsee, nouto vain jos kaikki tuotteet ovat noutoa

## Viimeisin päivitys (VS Code session)

### Tehty ✅
- Notification + Message mallit ja NotificationType enum — pushattu DB:hen
- `backend/src/lib/notify.ts` — jaettu notifyUser() ja emitToUser()
- GET/POST /notifications, GET/POST /messages (lista, ketju, lähetys, merkitse luetuksi)
- Ilmoitukset kytketty tapahtumiin: huudon voitto, maksu, lähetys, maksuaika umpeutunut, banni, uusi viesti
- join_user socket room — kirjautunut käyttäjä saa push-ilmoitukset reaaliajassa
- /ilmoitukset — lista, klikkaus merkitsee luetuksi, "merkitse kaikki luetuiksi"
- /viestit ja /viestit/[username] — MessagesLayout, mobiilissa yksipaneeli, reaaliaikainen socket
- Navbar kellon ja viestin ikonit kytketty — live unread badget (desktop + mobiili)
- "Kysy myyjältä" tuotesivulla lähettää nyt oikean viestin
- "Viesti" nappi julkisessa profiilissa toimii
- Bugikorjaus: uuden viestin ilmoituksen deep link osoitti user ID:hen eikä usernameen

### Testitunnus 2 (POISTETTU, ks. "Testitilien poisto" -osio)
- ~~testi2@skrm.fi / test1234 (username: testikaksi)~~ — poistettu 2026-08-16

*(Tämän päivityksen "Tekemättä"-lista on vanhentunut ja poistettu — kaikki tuolloin listatut kohdat paitsi infrastruktuuri/maksut on sittemmin tehty. Ks. ajantasainen lista tiedoston alusta "## Tekemättä".)*

## Testitilien poisto — 2026-08-16

Omistajan pyynnöstä `testi@skrm.fi` ja `testi2@skrm.fi` poistettu kokonaan tuotannon tietokannasta,
kaikkine liittyvine riveineen (schema.prismassa ei ole `onDelete: Cascade` -määrityksiä, joten poisto
tehtiin käsin oikeassa FK-riippuvuusjärjestyksessä yhden Prisma-transaktion sisällä — jos jokin olisi
epäonnistunut, mikään ei olisi jäänyt puolitiehen). Ennen poistoa otettu täysi `pg_dump`-varmuuskopio
palvelimelle (`/tmp/skrm-backup-*.dump`) turvaverkoksi.

**Huomio joka yllätti:** tuotannossa on vain kolme käyttäjää (Larzmoi/admin + testi + testi2), ja
Larzmoi oli aktiivisesti testannut ostamalla/myymällä testitilien kanssa — 20 huutoa ja 7 tilausta
joissa Larzmoi oli vastapuolena. Nämä poistuivat siis myös Larzmoin omasta tilaus-/huutohistoriasta
sivuvaikutuksena, koska toinen osapuoli (testi/testi2) ei enää ole olemassa — tämä on odotettu lopputulos
suljetussa 3-tilin testiympäristössä, ei virhe.

**Poistettu:** 9 tuotetta, 36 lähetystä, 97 huutoa, 2 automaattihuutoa, 10 tilausta, 10 tilausriviä,
2 arvostelua, 5 viestiä, 36 ilmoitusta, 3 maksurikkomusta, 1 banni, 1 ilmianto. Jäljellä tuotannossa
vain `johan.risberg@outlook.com` (Larzmoi, ADMIN).

**Jos uusi testitunnus tarvitaan:** rekisteröi normaalisti `/register`-sivun kautta — ei enää mitään
kovakoodattua "testi"-tiliä joka pitäisi muistaa suojata jatkotyössä.

## Toimituksen aikataulu ja maksuturva (LUKITTU)
- Myyjä lähettää + syöttää seurantakoodin → kello käynnistyy
- **Päivä 5** — paketti ei liikkunut → automaattinen ilmoitus myyjälle ja ostajalle
- **Päivä 10** — ei toimitusta → muistutus ostajalle "kuittaa tai ilmoita ongelmasta"
- **Päivä 14** — ostaja ei reagoinut → maksu vapautuu automaattisesti myyjälle
- **Päivä 14 + ostaja ilmoittaa ongelman** → tilanne SKRM:n käsittelyyn, maksu jäädytykseen
- Ostajalla 3 päivää reklamoida kuittauksen tai automaattivapauttamisen jälkeen
- Maksu vapautuu kun: Postin API sanoo toimitettu TAI ostaja kuittaa TAI 14 päivää kulunut TAI **noutokoodi vahvistettu** (nouto-toimitustavan tilauksille, ks. "Noutotuotteet"-osio — vapauttaa heti, ei tarvitse odottaa 14 päivää koska molemmat osapuolet fyysisesti läsnä)
- Ei luoteta pelkästään Postin statukseen — ostajan kuittaus tai aikaraja ratkaisee

## Lähetysintegraatio (tulossa OY:n jälkeen) — TUTKITTU 2026-08-12, Gemini-tutkimus lähdeviittein, vaatii vielä oman vahvistuksen

**⚠️ Varaus:** alla oleva perustuu toisen AI:n (Gemini) tekemään hakuun lähdeviittein (api.posti.fi, developer.posti.com). En pysty itse käymään näissä linkeissä vahvistamassa (posti.fi ei ole sallittujen verkko-osoitteideni listalla), joten tämä on parempi kuin arvaus mutta ei sama kuin oma varmistus — lähdeviitteet antavat kuitenkin hyvän pohjan tarkistaa itse ennen koodaamista.

**Suunta: "labelless" (Vinted-tyylinen), ei tulostettava tarra.** Postin **Sending Code API** (aiemmin "Helppo-koodi") tuottaa 6-merkkisen koodin (numerot 0-9 + kirjaimet A-F) jonka myyjä kirjoittaa suoraan pakettiin.

### Tavoiteltu virtaus
```
Ostaja valitsee Postin noutopisteen (Pickup Point API) → maksaa → SKRM luo lähetyksen/
EDI-tiedon (Orders API V2 / Shipments API V3) → saa trackingNumber-seurantakoodin → 
hakee Sending Code -koodin sillä → näyttää koodin myyjälle → myyjä kirjoittaa koodin 
pakettiin, vie Postille → SKRM seuraa Tracking API:lla → "toimitettu" vapauttaa maksun 
(ks. LUKITTU toimitusaikataulu-sääntö)
```

### API:t ja tarkat endpointit (lähde: api.posti.fi, developer.posti.com/api-catalogue/2025-04)
1. **Pickup Point API** — noutopisteen haku, korvaa poistuneen Location API v1-v3:n (poistui 31.3.2026)
   - `GET https://gateway.posti.fi/2025-04/pickuppoints/{countryCode}`
   - `POST https://gateway.posti.fi/2025-04/pickuppoints` (haku parametreilla, esim. osoite/postinumero)
2. **Orders API V2 / Shipments API V3** — lähetyksen/EDI-tiedon luonti, tuottaa `trackingNumber`:n. Vaihtoehtoisesti moni verkkokauppa käyttää välissä EDI-välittäjää (nShift/Unifaun/Shipit).
3. **Sending Code API** — labelless-koodin luonti/haku
   - Luo: `POST https://gateway.posti.fi/2025-04/labelless`
   - Hae seurantakoodilla: `GET https://gateway.posti.fi/2025-04/labelless/{trackingNumber}`
   - Hae lähetystiedot koodilla: `GET https://gateway.posti.fi/2025-04/labelless/shipment/{sendingCode}`
   - Pyyntö: `{"searchCriteria": {"trackingNumber": "JJFI65432100000000224"}}` — kehitysaikana voi lisätä `"validation": {"noEdiCheck": true}` ohittaakseen EDI-tarkistuksen
   - Vastaus: `{"shipments": [{"trackingNumber": "...", "sendingCode": "654321"}]}`
4. **Tracking API** — kaksi tasoa: *Public* (rajoitettu, pelkällä koodilla) ja *Normal/External* (laajempi, sopimusasiakkaille)

### Autentikointi — OAuth 2.0 Client Credentials
```
POST https://gateway-auth.posti.fi/api/v1/token
Body (x-www-form-urlencoded): grant_type=client_credentials&client_id=<ID>&client_secret=<SECRET>
→ palauttaa access_token, käytetään: Authorization: Bearer <token>
```

### Testiympäristö — vahvistettu epäyhtenäiseksi
- **Orders/Shipments-puolella QA/UAT olemassa:** Shipments QA `argon.ecom-api.posti.com` (vs. tuotanto `ecom-api.posti.com`), Auth QA `oauth2.barium.posti.com`
- **Sending Code API:lla EI mitään julkista/itsepalvelullista testiympäristöä eikä sandboxia** — vaatii aina OAuth-tunnukset jotka pyydetään suoraan Postilta, ei mitään Stripe-tyylistä kokeiluavainta
- **Ei virallisia SDK:ita** (ei Node/Python/PHP-paketteja), ei virallista GitHub-organisaatiota — vain yksittäisten kehittäjien epävirallisia vanhempien API-versioiden kirjastoja löytyy GitHubista

### ⚠️ TÄRKEÄ LÖYDÖS 2026-08-12 — väärä API-tuote, vahvistettu kolmen eri AI:n konsensuksella
Omistajan kaivama laajempi Posti-dokumentaatio paljasti että suuri osa "Orders API V3" / "Shipments API V3" -dokumentaatiosta koskee **GLUE-järjestelmää, joka on nimenomaan Supplier↔Retailer dropshipping-integraatio** (lähde toteaa suoraan: "Shipments API is meant for dropshipping Suppliers to receive orders from Retailers"). Tämä on B2B-tukkukauppamalli, **ei sovi SKRM:n C2C-malliin** (yksi myyjä, yksi ostaja, yksi tuote, yksi kertalähetys per kauppa). **Kolme eri AI:ta (Claude, Gemini, ChatGPT) päätyi itsenäisesti samaan johtopäätökseen** — vahva signaali että havainto pitää paikkansa, ei vain yhden mallin tulkinta.

**Mikä on yhä luotettavasti käyttökelpoinen:** Sending Code API on rakenteeltaan geneerinen — hakee koodin olemassa olevalle `trackingNumber`:lle riippumatta miten se syntyi. Pickup Point API (noutopisteen haku) on todennäköisesti myös riippumaton dropship-mallista.

**Mahdollisia vaihtoehtoisia reittejä `trackingNumber`:n luontiin (Geminin ehdottamia, EI vielä vahvistettu — kysy Postilta):**
- **Posti SmartShip / nShift (ent. Unifaun) -integraatio** — moni suomalainen verkkokauppa-alusta luo EDI-rahtikirjat kuljetusvälittäjän kautta Postin sopimusnumerolla, kutsuu sitten Sending Code APIa erikseen
- **Kevyt "Direct Print API"** — mahdollinen Postin oma suora rahtikirja-API pakettipalveluille ilman koko GLUE-tilausjärjestelmää

**Kysymyslista Postille (`LogEDI@posti.com`) OY:n valmistuttua — käytä tätä sellaisenaan:**

> "Olemme rakentamassa suomalaista C2C-markkinapaikkaa (vastaava kuin Vinted/Tori), jossa alusta toimii Postin sopimusasiakkaana ja ostaa kuljetuksen myyjän puolesta. Yksi myyjä, yksi ostaja, yksi kertalähetys per kauppa — ei tukkukauppa-/dropshipping-mallia. Myyjä ei tulosta osoitekorttia, vaan kirjoittaa pakettiin koodin (Sending Code API)."

Tarkat kysymykset:
1. **Mikä API luo yksittäisen C2C-lähetyksen** (kun Orders/Shipments V3 / GLUE on tarkoitettu B2B-dropshippingiin)?
2. Voiko ostaja valita noutopisteen API:n kautta (Pickup Point API)?
3. Voimmeko käyttää Sending Code API:a tässä käyttötapauksessa?
4. Saammeko toimitusseurannan API:n kautta (Tracking API)?
5. Voiko SKRM tehdä **yhden** Posti-sopimuksen jonka kautta **kaikki** SKRM:n myyjät lähettävät (yksi aggregoitu sopimus, ei jokaiselle myyjälle omaa)?
6. Mitkä ovat hinnat per lähetys ja mahdolliset kuukausi-/sopimusmaksut?
7. Onko olemassa testiympäristö jossa koko virtaus voidaan kokeilla ennen tuotantoa?

**Ei enää koodausta Postin osalta ennen näiden vastauksia.** Älä rakenna mitään GLUE-oletusten varaan.

### Mikä voidaan rakentaa NYT ilman Postin sopimusta/tunnuksia (päätetty 2026-08-12)
Sama strategia joka toimi Paytrailin kanssa (mock-pay-virta valmiina ennen oikeita tunnuksia) — rakennetaan koko integraation "muoto" mock-datalla nyt, ainoa jäljellä oleva askel sopimuksen jälkeen on oikeiden API-kutsujen kytkeminen mockien tilalle.

1. **Tietokantarakenne:** `Order`-malliin kentät `trackingNumber`, `sendingCode`, `pickupPointId`, toimitusstatus — pelkkä skeema, ei vaadi oikeita API-vastauksia
2. **Koko UI-virta mock-datalla:** noutopisteen valinta checkoutissa (kovakoodattu esimerkkilista), myyjän lähetyskoodinäkymä, ostajan toimitusseuranta — kaikki rakennettavissa ilman oikeita API-vastauksia
3. **Abstraktiokerros (`PostiService`-tyyppinen palveluluokka):** funktiot `createShipment()`, `getSendingCode()`, `getTrackingStatus()` palauttavat mock-dataa **täsmälleen dokumentoidussa JSON-muodossa** (ks. Sending Code API:n esimerkkivastaukset yllä). Kun oikeat tunnukset saadaan, vaihdetaan vain funktioiden sisältö — ei muuta sovellusta.
4. **Pickup Point API — tarkistettava erikseen Postilta voiko sitä testata jo nyt:** koska se on todennäköisesti pelkkä sijaintihaku (ei lähetyksen luontia/EDI:tä), saattaa vaatia kevyemmän pääsyn kuin Sending Code / GLUE. Lisää tämä kysymykseksi Postin sähköpostiin (ks. kysymyslista yllä).

### Tunnusten hankinta — konkreettinen seuraava askel kun OY on valmis
- **Yhteystieto: `LogEDI@posti.com`**
- Sähköpostiin tarvitaan: Postin asiakasnumero (jos on), **Y-tunnus**, yhteyshenkilön tiedot
- Ei itsepalvelullista rekisteröitymistä missään vaiheessa — aina suora yhteydenotto

## Tuleva ominaisuus: Perinteinen huutokauppa (SUUNNITELTU)
Kolmas myyntitapa live ja suoramyynnin lisäksi:
- Myyjä listaa tuotteen, asettaa lähtöhinnan ja keston (1-7 päivää)
- Ostajat huutavat milloin haluavat — ei videostreamingia tarvita
- Korkein huutaja voittaa kun aika loppuu
- 2h maksuaika normaalisti
- Lisäominaisuudet: automaattihuuto (proxy bid), ostohinta, viime hetken pidennys (+2min jos huudetaan viimeisellä minuutilla)
- saleType: 'auction' lisätään olemassa olevaan Product-malliin

## Tuleva ominaisuus: Hakuvahti (SUUNNITELTU — myöhemmin)
- Käyttäjä asettaa hakuehdon (esim. "Charizard PSA 9")
- Kun uusi tuote tai lähetys vastaa ehtoa → automaattinen ilmoitus
- Toteutetaan Resend-sähköpostin ja push-ilmoitusten kautta

## Päivitys — Perinteinen huutokauppa + Show thumbnail

### Tehty ✅
- Perinteinen huutokauppa täysin valmis end-to-end
- `/auctions` routes (list, detail, bid, autobid, buy-now)
- closeAuctions cron (minuutin välein) — varaushinta, ei huutoja, voitto
- Snipe protection: huuto viimeisen 2min aikana → +2min lisää
- Auto-bid engine — testattu curl:lla, toimii oikein
- `/huutokaupat` listaussivu, `/huutokauppa/[id]` detail-sivu
- Dashboard tuotteet — auction saleType + keston/varaushinta/osta heti kentät
- Navbar, etusivu, selaa — saleType tabsit
- Show thumbnail upload UI lähetyssivulle

### Poikkeamat ohjeista (perustellut):
- `auctionDurationDays` erillinen kenttä sekunnit-`auctionDuration`:sta — ei törmäystä
- `Bid.showId` nullable (ei product ID:tä show FK:lle)
- Notifikaatiot oikeilla tyypeillä: `OUTBID`, `AUCTION_ENDED`, `AUCTION_SOLD`

### Uudet NotificationType enumit
- OUTBID — joku huusi yli
- AUCTION_ENDED — huutokauppa päättyi ilman voittajaa
- AUCTION_SOLD — huutokauppa myytiin

*(Tämän päivityksen "Tekemättä"-lista on vanhentunut ja poistettu — samat asiat kuin ylemmän arkistoidun listan kohdalla. Ks. ajantasainen lista tiedoston alusta "## Tekemättä".)*

## Navbar päivitykset (tehty VS Codessa)
- Poistettu: Ostot-linkki yläpalkista
- Poistettu: Käyttäjäkuvake yläpalkista (Dashboard-nappi ajaa saman asian)
- Poistettu: Etusivu-linkki (logo ohjaa etusivulle)
- Lisätty: Live-huutokaupat Huutokaupat-linkin viereen
- Muutos jatkuu koko sivuston läpi

## Tuleva ominaisuus: Paikkakunta (SUUNNITELTU)
- Käyttäjä ilmoittaa paikkakunnan profiilissa
- Näkyy julkisessa profiilissa
- Erityisen tärkeä noutotuotteissa — ostaja näkee etäisyyden myyjään
- User-malliin: `location String?`
- Noutotuotteen kortissa näytetään myyjän paikkakunta
- Selaa-sivulle mahdollinen "Lähellä sinua" suodatin myöhemmin

## Päivitys — Profiili, Mux, Navbar

### Tehty ✅
- Profiilisivu päivitetty — kaikki perustiedot valmiina
- Mux integroitu backendiin ja frontendiin — ei vielä testattu OBS:llä
- Navbar päivitetty (poistettu Ostot, käyttäjäkuvake, Etusivu — lisätty Live-huutokaupat)
- Muita pieniä parannuksia

### Testaamatta
- Mux videostreami — vaatii OBS Studio + toinen kone testaukseen

### Paikkakunta — lisättävä vielä
- Profiilisivulle paikkakunta + maa -kenttä (User-malliin: `location String?`, `country String?`)
- Tuotteen/ilmoituksen luonnissa paikkakunta haetaan käyttäjäprofiilista automaattisesti
- Näkyy noutotuotteen kortissa ja tuotesivulla
- Selaa-sivulle paikkakuntasuodatin (erityisesti noutotuotteille)
- Maa-kenttä valmiina laajentumista varten

### Seuraavaksi
1. Paikkakunta profiiliin + tuotteisiin
2. Deploytaus — Hetzner (backend+DB) + Vercel (frontend)
3. Resend — sähköpostit (skrm.fi domain aktivoitunut?)
4. Paytrail — maksut (vaatii OY:n)
5. Signicat — pankkitunnistautuminen
6. OBS-testi Muxille

## Videostreami — päätös

Mux poistetaan käytöstä liian kalliina. Korvataan nginx-rtmp Hetzner-palvelimella.

### Nginx-rtmp malli
- Myyjä streamaa OBS:stä RTMP:llä → Hetzner nginx-rtmp
- Katsojat katsovat HLS-streamia suoraan Hetzneriltä
- Ei tallennusta — stream menee läpi suoraan
- Kustannus: 0€ erikseen, sisältyy Hetzner-palvelimen hintaan

### Mitä pitää muuttaa koodissa
- Poista @mux/mux-node backendistä
- Poista @mux/mux-player-react frontendistä
- Poista backend/src/lib/mux.ts
- Shows-routesta poista Mux live stream luonti — tallenna vain streamKey (generoitu itse) ja playbackUrl (HLS-url Hetzneriltä)
- Live-katsojanäkymässä korvaa MuxPlayer → HTML5 video tag tai video.js HLS-playerilla
- Poista Mux webhook handler
- Show-schemasta: muxStreamId ja muxStreamKey → streamKey, playbackUrl

### HLS-playback frontendissä
Käytä hls.js kirjastoa MuxPlayerin sijaan:
```
npm install hls.js
```

### Env muuttujat (backend)
Poista:
- MUX_TOKEN_ID
- MUX_TOKEN_SECRET

Lisää:
- RTMP_HOST=rtmp://stream.skrm.fi/live (Hetzner palvelimen osoite)
- HLS_BASE_URL=https://stream.skrm.fi/hls (HLS stream URL)

## Videostreami — muutos Muxista nginx-rtmp:hen (LUKITTU)
- Mux poistetaan — liian kallis skaalautuessa
- Korvataan nginx-rtmp omalla Hetzner-palvelimella
- Ei tallenneta videoita — vain live-stream läpi
- Myyjä streamaa OBS:stä RTMP → Hetzner nginx-rtmp
- Katsoja saa automaattisesti HLS-urlin — ei manuaalista toimenpidettä
- Kustannus: sisältyy Hetzner-palvelimen hintaan

### Automaattisuusvaatimus (LUKITTU)
- Myyjä aloittaa streamin OBS:ssä → stream käynnistyy automaattisesti
- Katsoja avaa lähetyksen → video alkaa automaattisesti
- Ei manuaalisia vaiheita kummallakaan osapuolella
- Backend kuuntelee RTMP-tapahtumia (on_publish, on_done) ja päivittää show-statuksen automaattisesti

## Päivitys — nginx-rtmp integraatio valmis

### Tehty ✅
- Mux poistettu kokonaan (backend + frontend + tietosuoja)
- Show.streamKey + Show.hlsUrl korvaavat mux-kentät
- GET /shows/:id/stream-info — myyjälle OBS-asetukset
- POST /webhooks/rtmp/start + /rtmp/done — nginx webhookit
- infra/nginx-rtmp.conf — referenssikonfig Hetznerille
- VideoPlayer hls.js:llä + Safari-fallback
- WaitingForStream placeholder kun ei streamia
- RTMP_URL + HLS_BASE_URL env vars (defaulttaa stream.skrm.fi)

### Tärkeä käyttäytymismuutos
- "Aloita lähetys" EI enää laita show:ta LIVE-tilaan heti
- Show pysyy SCHEDULED kunnes nginx on_publish webhook vahvistaa OBS-yhteyden
- Vasta sitten show tulee julkiseksi ja näkyy katsojille
- Seller console avautuu heti (voi kopioida OBS-asetukset)

### Tekemättä — infrastruktuuri (tehdään Hetzner-vaiheessa)
- Hetzner-palvelimen provisiointi
- nginx + rtmp-moduulin asennus
- RTMP_URL + HLS_BASE_URL env vars tuotantoon
- Cloudflare DNS: stream.skrm.fi → Hetzner IP (harmaa pilvi, ei proxy)

## Muistilista — päivitettävä myöhemmin
- FAQ päivitettävä — sisältää vanhentunutta tietoa (Mux, maksutavat, toimitus jne.)

## Arvostelut (TEHTY ✅)
- Ostaja voi arvostella myyjän ja myyjä ostajan, kun tilaus on DELIVERED
- `Review`-malli: rating 1-5, vapaaehtoinen kommentti, `@@unique([orderId, reviewerId])`
- POST /orders/:id/review — rooli päätellään buyerId/sellerId:stä, 403 jos ei osapuoli
- GET /users/:username/reviews — julkinen lista, GET /users/:username palauttaa avgRating + reviewCount
- UI: /ostot (ostaja→myyjä) ja /dashboard/tilaukset (myyjä→ostaja) DELIVERED-osiossa, tähtivalinta `components/StarRating.tsx`
- Julkinen profiili (`u/[username]`) näyttää keskiarvon ja arvostelulistan
- REVIEW_RECEIVED-ilmoitus arvostelun saajalle

## Signicat — pankkitunnistautuminen (LUKITTU)
- Pakollinen kaikille käyttäjille ennen huutamista tai myymistä
- Ei valinnainen — kaikki käyttäjät tunnistetaan
- Tukee: verkkopankki, mobiilivarmenteen, passin
- Vaatii OY:n ennen käyttöönottoa

## Käyttäjä- ja katsojatilastot (SUUNNITELTU)
- Katsojamäärä livessä — näytetään aina, jo osittain toteutettu (viewerCount)
- Rekisteröityneet käyttäjät — näytetään vasta kun yli 500 käyttäjää
- Aktiiviset käyttäjät nyt — näytetään vasta kun yli 50 aktiivista
- Kynnysarvojen alle ei näytetä lukuja — vältetään negatiivinen sosiaalinen todiste
- Sijoitus: footer tai etusivun luottamuspalkki

## KRIITTINEN TILANNEKATSAUS — 2026-08-09, kilpailutilanne muuttui

Kilpailija (n. 20 striimaajaa, oma puhelinsovellus) laajentaa kuulemma Ruotsiin ennen kuin on edes saanut jalansijaa Suomessa. **Tämä on tilaisuus, ei vain uhka** — jos SKRM saadaan oikeasti kuntoon nyt, kilpailija voidaan ohittaa kokonaan sekä Suomessa että Ruotsissa ennen kuin he ehtivät vakiinnuttaa asemaansa. Tästä eteenpäin: **ei pelleilyä, tehdään oikein.**

### Kolme bugia raportoitu 2026-08-09 — tila epäselvä suhteessa juuri tehtyihin korjauksiin
Omistaja raportoi nämä kolme, mutta ei ole vahvistettu testattiinko ennen vai jälkeen alla dokumentoitujen infrakorjausten (ks. "Live-konsolin mobiilikorjaukset ja infrastruktuurikorjaukset" -osio):

1. **Viive edelleen todella pitkä (koettu ~30s).** Ei ole tehty mitään uutta latenssin eteen tämän korjauskierroksen aikana — vain Vaihe 1 (ks. "Striimin viive" -osio) on tehty, eikä sitäkään ole vielä vahvistettu oikealla OBS-striimillä, vain synteettisesti. **Vaihe 1:n oma ehto laukesi: "jos oikea mitattu viive ylittää 10s, Vaihe 2 kannattaa aikaistaa" — 30s ylittää tämän selvästi. Vaihe 2 (MediaMTX) starttaa NYT, ei enää "myöhemmin".**
2. **Live näkyy vain ~50% todennäköisyydellä.** Täsmää mahdollisesti jo korjattuihin syihin: nginx `proxy_read_timeout` tappoi pitkät socket-yhteydet (korjattu), HLS ei yrittänyt uudestaan fataalin virheen jälkeen jos OBS ei ollut vielä ehtinyt yhdistää (korjattu 3s retry-loopilla). **Vaatii uuden testikierroksen korjausten jälkeen sen vahvistamiseksi onko tämä yhä ongelma.**
3. **Puhelimen chat ei näytä viestejä, vaikka lähetys toimii** (viestit näkyvät pöytäkoneella/läppärillä). Täsmää täsmälleen löydettyyn juurisyyhyn: mobiilioperaattorin NAT pudotti vain palvelin→asiakas-suunnan liikenteen — koneelta lähetetyt viestit näkyivät muille, mutta puhelin ei koskaan vastaanottanut mitään. Osittainen korjaus tehty (`pingInterval`/`pingTimeout` tiukennettu ~18s:iin nopeampaa uudelleenyhdistämistä varten), mutta tämä **ei poista itse operaattorin verkko-ongelmaa**, vain lyhentää aikaa jolloin yhteys on "kuollut mutta ei vielä havaittu". **Vaatii uuden testikierroksen vahvistaakseen riittääkö tämä lievennys, vai tarvitaanko perustavanlaatuisempi ratkaisu (esim. Socket.io:n polling-fallback pakotettuna tietyille operaattoriverkoille, tai kokonaan eri reaaliaikaprotokolla).**

### Uusi prioriteetti: MediaMTX-migraatio NYT (ei enää "vahvistettu myöhemmäksi")
Kilpailuedusta johtuen tämä on nyt ensimmäinen tehtävä ennen mitään muuta visuaalista hiontaa. Tavoite: **alle 6 sekuntia, ei kompromisseja** (tiukennettu aiemmasta 5-10s-välitavoitteesta liiketoiminnan kiireellisyyden vuoksi). Ks. "Selainpohjainen mobiilistriimaus (WebRTC)" -osio teknisille yksityiskohdille — sama työ ratkaisee myös puhelimen asennuksettoman striimauksen, joka on toinen kilpailuetu kilpailijan omaa appia vastaan.

### Tärkeä korjaus tilannekuvaan (2026-08-09, omistajan tarkennus)
Omistaja tarkensi: nämä kolme bugia (erityisesti näkyvyys ja mobiilichat) **ei ole yksittäisiä, uusia löydöksiä** — niitä on yritetty korjata 3-5 kertaa aiemmin vaihtelevin tuloksin ("välillä toimii, välillä ei"). **Tämä on signaali, ei sattuma:** toistuva, epäjohdonmukainen epäonnistuminen samassa asiassa useiden korjausyritysten jälkeen tarkoittaa että nykyinen perusta (nginx-rtmp:n klassinen HLS + vakio-Socket.io epävakaiden mobiiliverkkojen yli) on rakenteellisesti liian hauras tähän käyttötarkoitukseen, ei että joku yksittäinen rivi koodia olisi väärin. **Vaatimus on ehdoton: 99% ajasta pitää toimia sulavasti, ei "yleensä toimii".** MediaMTX-migraatio ei siis ole vain latenssikorjaus — se on koko epäluotettavan perustan korvaaminen kunnolla suunnitellulla ratkaisulla.

### Chat/Socket-arkkitehtuurin uudelleenarviointi (SUUNNITELTU, seuraa MediaMTX:n jälkeen)

**⚠️ Ennen migraatiota: erota kaksi mahdollista syytä toisistaan (2026-08-09, omistajan huomio)**
Omistaja raportoi: mobiilissa chat ei näy ollenkaan, ei edes silloin kun se muuten "toimii". Tämä voi olla jompikumpi kahdesta eri ongelmasta, jotka näyttävät samalta mutta vaativat eri korjauksen:
1. **Verkkokerros** — viestit eivät koskaan saavu puhelimelle (jo tunnistettu operaattorin NAT-ongelma, pudottaa palvelin→asiakas-liikennettä)
2. **Renderöintikerros** — viestit SAAPUVAT puhelimelle mutta CSS piilottaa ne. Tämä on nyt aidosti mahdollista koska stream-konsolin uudistuksessa mobiilichat muutettiin "overlay videon päällä" -tyyliseksi (`position:absolute`) — jos kontin korkeus/z-index/overflow on väärin, data voi tulla perille mutta ei näy ruudulla.

**Diagnoosi ennen korjausta:** avaa mobiiliselaimen kehittäjätyökalut (tai käytä remote debuggingia, esim. Chrome DevTools puhelimeen liitettynä), tarkista **saapuuko** Socket.io-tapahtuma ollenkaan (console.log tai Network-välilehden WS-rivi) kun joku kirjoittaa chattiin. Jos data saapuu mutta ei näy → CSS-bugi, nopea korjaus, ei vaadi koko arkkitehtuurimuutosta. Jos data ei saavu ollenkaan → vahvistaa alkuperäisen verkko-diagnoosin, pub/sub-migraatio on oikea ratkaisu.

**Älä aloita täyttä pub/sub-migraatiota ennen tätä diagnoosia** — jos kyse on pelkästä CSS-bugista, migraatio olisi täysin turhaa työtä väärän ongelman ratkaisemiseksi.
Sama diagnoosi kuin MediaMTX-päätöksessä: mobiilichat epäonnistuu toistuvasti tietyllä operaattoriverkolla useiden korjausyritysten (transport fallback, ping-timeoutit, nginx-timeoutit) jälkeenkin — merkki väärästä perustasta, ei yksittäisestä bugista.

**Suunta:** siirretään reaaliaikaliikenne (chat, presence/katsojamäärä, moderointitapahtumat) omalta Socket.io-palvelimelta **managed pub/sub-palveluun** (Pusher tai Ably, ei Firebase — teidän malli, huoneet/broadcast/presence, sopii pub/sub-mallille paremmin kuin Firebasen dokumenttisynkronointiin). Sama etu kuin MediaMTX:ssä: operaattoriverkkojen NAT-ongelmien selvittäminen tulee palveluntarjoajan vastuulle globaalissa mittakaavassa, ei yhden VPS:n varaan.

**Tärkeä rajaus, isompi kuin MediaMTX-vaihto:** video oli puhdas protokollaraja (RTMP sisään, eri ulostuloprotokolla, ei bisneslogiikkaa siinä välissä). Socket välittää myös huutologiikkaa, snipe-protection-ajastimia ja moderointia — oikeaa bisneslogiikkaa, ei vain viestinvälitystä. Pub/sub-palvelu on "tyhmä putki", joten:
- **Pub/sub-palveluun siirtyy:** chat-viestit, presence/katsojamäärä, moderointi-ilmoitukset (mute/poisto) — puhdas tapahtumien jakelu kaikille kuuntelijoille
- **Backendille jää:** huutojen validointi, snipe-protection-ajastimet, kaikki raha-/kauppalogiikka — pysyy REST-API:n takana, ei koskaan suoraan client-to-client. Pub/sub vain ilmoittaa lopputuloksen sen jälkeen kun backend on jo validoinut ja tallentanut.

**Ennen toteutusta, vaadittu suunnitelma:**
1. Konkreettinen vertailu Pusher vs. Ably — hinnoittelu SKRM:n mittakaavassa, presence-tuen kypsyys, server-side-validoidun event-julkaisun tuki
2. Selkeä, kirjallinen raja mikä siirtyy pub/subiin vs. mikä pysyy backendillä (ks. yllä alustava jako)

**Sekvensointi: EI aloiteta ennen kuin MediaMTX on vahvistettu toimivaksi tuotannossa.** Kaksi isoa reaaliaikainfran migraatiota yhtä aikaa on tarpeeton riski — MediaMTX on kiireellisempi (suoraan kilpailuedun ydin, ks. "KRIITTINEN TILANNEKATSAUS"). Suunnitelman voi kuitenkin laatia rinnakkain nyt, vain itse toteutus odottaa.

### ⚠️ REGRESSIO 2026-08-09 — video ei toimi ENÄÄN OLLENKAAN (oli välillä toimiva, nyt ei koskaan)
Omistaja vahvistaa: MediaMTX-työn aikana/jälkeen video meni aiemmasta "toimii n. 50% ajasta" -tilasta täysin toimimattomaksi. **Tämä on regressio, ei sama vanha ongelma.** Selkeä prioriteettijärjestys omistajalta, ei teknisiä mieltymyksiä toteutustavasta:
1. **Video/striimi toimimaan luotettavasti ENSIN** — tämä on ainoa tavoite juuri nyt, ei latenssin hienosäätö eikä chat
2. Chat vasta sen jälkeen kun video on vahvistetusti toimiva

**Toimintaohje:** jos MediaMTX-migraatio on kesken ja epävakaa, harkitse palauttaa väliaikaisesti edellinen toimiva nginx-rtmp-tila (parempi hidas mutta toimiva kuin nopea mutta rikki), ja jatka MediaMTX-työtä huolellisemmin taustalla ilman että tuotanto on rikki sillä välin. Toteutustapa ei ole tärkeä omistajalle — lopputulos ("kuva tulee luotettavasti perille") on.

### Tilannepäivitys 2026-08-09: video toimii jälleen, viive parantunut mutta ei tavoitteessa
- **Video-regressio korjattu** — MediaMTX toimii luotettavasti, toistettu testaus vahvisti (ei enää "toimii kerran, ei toisella kerralla")
- **Viive nyt 8-20s** (aiemmasta 30s) — parannus, mutta ei vielä alle 6s -tavoitteessa
- **Syy tunnistettu:** OBS:n keyframe-väli oli 8.3s, pitäisi olla 1-2s jotta segmentit pysyvät lyhyinä. **Tämä on omistajan oma OBS-asetus, ei korjattavissa palvelinpuolelta** — omistaja päivittää: Asetukset → Lähtö → Advanced-tila → Streaming-välilehti → Keyframe Interval → 2s
- **Seuraava askel:** mittaa viive uudelleen keyframe-korjauksen jälkeen, useampi kerta peräkkäin
- **Mux vs. jatka itse -päätös on yhä auki** — ei päätetty vielä, odottaa tätä seuraavaa mittausta ennen lopullista arviota kannattaako jatkaa itse rakennetulla MediaMTX-pohjalla vai vaihtaa managed-palveluun

## Uudet löydökset 2026-08-13, osa 2 — ✅ TEHTY (ks. yhteenveto alempana "KAIKKI 13 KOHTAA")

**8. Jonon "seuraava tuote" -valinta jumittuu kun myydään listan viimeinen tuote.** Toistettu: myytiin jonon viimeisenä ollut tuote ensimmäisenä (siis jono tyhjeni). Sen jälkeen vasemman Jono-paneelin kautta ei saatu valittua seuraavaa tuotetta normaalisti — piti ensin lisätä yksi uusi tuote jonoon, painaa "Seuraava", ja vasta sen jälkeen tuotevalinta toimi taas vapaasti. Reunatapaus: jonon tyhjentyminen jättää valinta-UI:n rikkinäiseen tilaan.

**9. Custom-huutosumman syöttökenttä hankala käyttää.** Testattu toisella tunnuksella: ehdotettua huutosummaa ei saanut helposti pyyhittyä/korvattua — piti klikata kentän alkuun, lisätä numero, poistaa merkkejä kiertotietä pitkin, jotta summa ei hetkeksikään näyttänyt olevan alle minimihuudon (mikä esti syötön). Koettu "todella ärsyttäväksi". Todennäköisesti kentän validointi estää välitilan (esim. tyhjä/liian pieni arvo kesken kirjoittamisen) sen sijaan että sallisi vapaan kirjoittamisen ja validoisi vasta lähetyshetkellä.

**10. Huutoilmoituksen viive liian pitkä.** Kun huudetaan (esim. 3€), "Huusit"-ilmoitus/vahvistus ilmestyy n. sekunnin viiveellä huudon jälkeen — tuntuu hitaalta. Ehdotus: lyhennä esim. puoleen nykyisestä.

**11. KRIITTINEN: selaimen "edellinen sivu" -navigointi (monella tapaa mahdollista, esim. takaisin-nappi/-ele) katkaisee pääsyn käynnissä olevaan streamiin.** Jos käyttäjä (todennäköisesti myyjä, kesken lähetyksen hallinnan) päätyy vahingossa edelliselle sivulle, ei pääse enää jatkamaan/palaamaan käynnissä olevaan streamiin normaalisti. Tämä on vakava luotettavuusongelma — streami voi jäädä "orvoksi" (OBS lähettää yhä, mutta hallintanäkymä ei enää seuraa/hallitse sitä oikein). Vaatii tutkimista: todennäköisesti komponentin tila (React state, socket/huoneen liittyminen) ei palaudu oikein kun sivulle navigoidaan takaisin — pitäisi hakea nykyinen lähetyksen tila uudelleen palatessa, ei luottaa pelkkään paikalliseen tilaan.

**12. Myyjä pystyi huutamaan omassa huutokaupassaan samalla tunnuksella jolla striimasi — ei pitäisi olla mahdollista.** Perustavanlaatuinen sääntörikkomus: myyjän ei tule koskaan pystyä osallistumaan huutoon omaan tuotteeseensa (esti hinnan keinotekoisen nostamisen / itsehuutamisen). **Korjaus: backendin huutoreitin pitää tarkistaa ja hylätä huuto jos `bidderId === product.sellerId` (tai vastaava), ei riitä pelkkä frontendin piilotus koska sen voi ohittaa.**

**13. Korjaus 2026-08-13: "Odottaa maksua" -tila ON olemassa ostajan puolella, mutta ajastin näyttää väärän ajan.** Omistaja tarkisti: ostajan näkymässä on jo "Odottaa maksua" -tila ajastimella — tämä osa on siis kunnossa, ei puuttunut kokonaan niin kuin aiemmin luultiin. **Mutta ajastin näyttää 6 tuntia, kun LUKITTU-sääntö on 2h maksuaika.** Todennäköinen syy: sekaannus kahden eri 6h/2h-säännön välillä koodissa — "2h maksuaika voitetusta huudosta" (tämä) vs. "6h aikaikkuna Yhdistetty lähetys -säännössä" (eri asia, koskee useamman tuotteen yhdistämistä samaan tilaukseen samalta myyjältä). **Korjaus: varmista että maksuajastin käyttää 2h:aa, ei 6h:aa — tarkista ettei koodissa ole vahingossa käytetty väärää vakiota näiden kahden säännön välillä.**
- **Myyjän puolelta puuttuu yhä vastaava näkymä** (ei vahvistettu olevan olemassa) — tarkista onko myyjän tuotelistauksessa vastaava "Odottaa maksua" -tila voitetulle tuotteelle, lisää jos puuttuu.
- **Testaamatta: mitä tapahtuu kun maksuaika kuluu loppuun ilman maksua?** Pitäisi laukaista LUKITTU-logiikka (maksamaton tilaus → **heti** 30pv banni, ei enää 3 kerran raja, ks. "Banni"-sääntö), tuote palautuu myytävien listalle. Ei vahvistettu toimivaksi käytännössä, kannattaa testata erikseen — erityisesti että banni todella laukeaa jo ensimmäisestä kerrasta uuden säännön mukaisesti.

## Uudet löydökset 2026-08-13 (mobiili live-testaus, myyjän ja ostajan puolelta) — ✅ KAIKKI 13 KOHTAA + SÄÄNTÖMUUTOS TEHTY (2026-08-13)

Kaikki alla listatut 13 kohtaa + bannisäännön tiukennus korjattu, backend+frontend typecheck puhtaana. Tiivistetyt ratkaisut:
- **11 (kriittinen):** `/lahetys`-sivun tilantarkistus ajettiin vain ensimmäisellä mountilla — Next.js:n router-cache saattoi palauttaa vanhentuneen tilan takaisin-navigoinnissa. Lisätty `checkForActiveShow()` joka ajetaan uudelleen `pageshow`/`visibilitychange`-tapahtumissa, varmistaa aina palvelimelta.
  - **⚠️ REGRESSIO/EI KORJANNUT 2026-08-13:** omistaja vahvisti että "edellinen sivu" -navigointi katkaisee yhä pääsyn käynnissä olevaan streamiin, sama oire kuin ennen korjausta. **Tarkennettu 2026-08-13:** kyseessä on `/lahetys`-sivun oma sisäinen "←"-paluunappi (vasemmassa yläkulmassa, näkyy kuvakaappauksissa), joka ohjaa `/dashboard`-sivulle — EI selaimen omaa takaisin-nappia. Tämä kaventaa vianetsintää merkittävästi: tarkista mitä tapahtuu kun tätä juuri tätä nappia painetaan kesken käynnissä olevan lähetyksen, ja miten palataan takaisin `/lahetys`-sivulle sen jälkeen (dashboardin kautta linkki? suora URL?) — todennäköisesti paluu ei enää tunnista käynnissä olevaa lähetystä oikein siinä kohtaa.

**22. KRIITTINEN(?), TODENNÄKÖISESTI SAMA JUURISYY KUIN KOHTA 11 — huutokauppa päättyy välittömästi jos striimi suljetaan kesken kaiken.** Testattu: myyjä sulki streamin kesken käynnissä olevan huudon → huutokauppa päättyi heti, nykyinen korkein huuto voitti. **Ongelma:** jos myyjä poistuu sivulta vahingossa (esim. sama tilanne kuin kohta 11, tai selain kaatuu, verkkoyhteys katkeaa hetkeksi) kesken huudon, huutokauppa päättyy ennenaikaisesti mahdollisesti epäreilun matalaan hintaan sen sijaan että ajastin saisi juosta loppuun asti. **Omistajan oma huomio: tämä on vielä kysymysmerkki, koska kohta 11:n korjaus on kesken — todennäköisesti sama juurisyy (myyjän yhteyden/sivun tilan katkeaminen), tarkista uudelleen KUN kohta 11 on ratkaistu, ei välttämättä tarvitse erillistä korjausta jos 11:n korjaus ratkaisee tämänkin.** Jos 11:n korjauksen jälkeen tämä toistuu yhä, huutokaupan ajastimen pitäisi olla täysin palvelinpuolinen (ei riipu myyjän selaimen/sivun tilasta pysyäkseen käynnissä) — vain eksplisiittinen "Lopeta"/"Myyty"-painallus saa päättää sen ennenaikaisesti.

**23. ✅ TEHTY 2026-08-14 — Striimin kuvanlaatu liian matala, arviolta 200-360p, tavoite 720p-1080p.** Omistaja tarkensi: "200-360" ei ollut näytöllä näkyvä lukema, vain kokemusperäinen arvio. Kaksi juurisyytä löytyi ja korjattiin:
- **LiveKit Ingress transkoodasi RTMP-tulon aina uudelleen ilman eksplisiittistä `video`-asetusta**, käytti oletuspresettiä `H264_720P_30FPS_3_LAYERS` — 1280×720/1900kbps KATTONA riippumatta lähteen todellisesta resoluutiosta. `backend/src/lib/livekit.ts`:n `createSellerIngress()` korjattu asettamaan `H264_1080P_30FPS_3_LAYERS` (1920×1080/3500kbps, simulcast säilyy joten heikko verkko mukautuu yhä alaspäin automaattisesti). `getOrCreateStreamKey()` päivittää myös olemassa olevien myyjien Ingressin.
- **WebRTC-julkaisupolku ("ilman OBS:aa"):** `getUserMedia({ video: true })` ilman resoluutiovaatimusta valitsi usein pienen oletusresoluution. Korjattu: `width: {ideal:1920}, height: {ideal:1080}, frameRate: {ideal:30}`.
- **Ei korjattavissa koodista:** jos lähde on kolmannen osapuolen puhelimen RTMP-sovellus (esim. Larix), sen omat asetukset pitää itsekin olla ~1080p/3-4.5 Mbps, muuten Ingressin katto ei auta koska syöte on jo pienempi.
- **Näkyvyys lisätty:** `/lahetys`-konsolin `HlsPreview` näyttää pysyvän tilastobadgen ("1280×720 · 30fps · 1850 kbps") vasemmassa alakulmassa, punakeltainen alle 720p:n, muuten vihreä. Lukemat oikeasta WebRTC-tilastosta (`getRTCStatsReport()`), ei arviota.

**24. Chat ei ole yhä omana selkeänä laatikkonaan — vahvistettu kuvakaappauksella, todennäköisesti sama juurisyy kuin kohta 1.** Chat-tekstikenttä ("Kirjoita viesti...") ja tuotetietolaatikko (nimi/lähtöhinta/hinta) ovat yhä ahtaasti sekaisin/päällekkäin videon keskiosassa, kameran mykistys-ikonin päällä. **Vaatimus: chat pitää olla oma erillinen laatikkonsa, joka sijoittuu AUTOMAATTISESTI AINA tuotetietolaatikon (kesto/hinta jne.) yläpuolelle** — ei koskaan päällekkäin tai sekaisin sen kanssa. Tämä ei ole enää pelkkä z-index-korjaus vaan layout-rakenteen selkeyttäminen: kaksi selvästi erillistä, pinottua laatikkoa (chat ylempänä, tuotetiedot alempana), ei yksi sekava alue.

**25. Keston valintanapin "120" puuttuu yksikkö — epäjohdonmukainen muihin verrattuna.** Kestovalinnat näyttävät "30s", "1min", "2min", mutta neljäs vaihtoehto näyttää pelkän "120" ilman yksikköä. Lisää yksikkö johdonmukaisesti (esim. "120s" tai muu selkeä muoto joka sopii samaan tyyliin kuin muut).

**26. iPad-kokoisella näytöllä chat katkeaa/ei näy kunnolla — vahvistaa aiemman tablettibugin (ks. "Uudet löydökset 2026-08-12, tablettikoon responsiivisuustesti").** Chat-paneeli oikealla ("CHAT", "Ei viestejä vielä") näyttää katkeavan/leikkautuvan alareunasta, tekstikenttä ei näy kunnolla. Sama juurisyy kuin aiemmin raportoitu 768-1024px-välin puuttuva breakpoint-käyttäytyminen — ei uusi bugi, uusi vahvistus samasta.
**✅ JUURISYY LÖYTYI JA KORJATTU 2026-08-14:** breakpoint itsessään oli jo olemassa (`isTablet`-tila, gridi vaihtuu `1fr 220px`:ksi), mutta chatin gridi-solu (`frontend/app/live/[showId]/page.tsx`, "Chat"-kommentin jälkeinen `<div>`) ei sisältänyt `minHeight: 0`:aa — Shop-paneelin vastaavassa solussa se ON. Ilman sitä flexbox/grid-solun oletus (`min-height: auto`, määräytyy sisällön mukaan) esti solua kutistumasta annettuun tilaan, jolloin sisältö (viestilista + syöttökenttä) saattoi työntyä gridi-solun ULKOPUOLELLE — syöttökenttä katosi/leikkautui näkyvistä. Sama puute löytyi myös `ChatArea`-komponentin SISÄLLÄ olevista kahdesta vieritettävästä listasta (chat-viestit, Watching-lista) — molemmilla oli `flex: 1` mutta ei `minHeight: 0`, sama riski jos viestejä/katsojia on paljon. Lisätty kaikkiin kolmeen kohtaan. Tämä oli todennäköisesti koko ajan sama syy myös alkuperäisessä 2026-08-12-raportissa, ei vain kapeus — leveys+kutistumattomuus yhdessä tekivät ongelman näkyväksi juuri tablettikoossa.

**27. Vaalea teema näyttää huonolta stream-sivulla — puhdas valkoinen ei sovi tyyliin.** Kun käytössä on vaalea/valkoinen teema, live-lähetys-sivu näyttää sekoittuneelta/ei-yhtenäiseltä siihen muuten tummaan striimaustyyliin. **Ehdotus: käytä stream-sivulla hieman eri (esim. lämpimämpi/pehmeämpi, sivuston omaan brändiin sopiva) sävyä puhtaan valkoisen sijaan**, kun vaalea teema on valittuna — ei tarvitse olla identtinen muun sivuston vaalean teeman kanssa jos stream-konteksti kaipaa omaa käsittelyään.
**✅ JUURISYY LÖYTYI JA KORJATTU 2026-08-14 — kohde oli `/lahetys`, ei `/live/[showId]`:** katsojan `/live/[showId]`-sivu oli jo lähes kokonaan kovakoodattu tummaksi, ei "puhdasta valkoista" löytynyt sieltä. Todellinen lähde: myyjän OMA `/lahetys`-konsoli (jonka nimi kirjaimellisesti tarkoittaa "live-lähetys"), jonka juuritausta (`background: C.bg`) ja koko asetuslomake (OBS-avaimet, kesto-/kategoriavalinnat) käyttivät yhä teeman mukaan vaihtuvia `C.xxx`-värejä — vaalealla teemalla `C.bg` on lähes valkoinen (`#F8FAF8`) ja `C.cardBg` täysin valkoinen (`#FFFFFF`), suoraan ristiriidassa tiedoston OMAN, jo aiemmin LUKITUN periaatteen kanssa ("Lähetys-konsoli on aina tumma riippumatta käyttäjän sivustonlaajuisesta teema-asetuksesta"). Sen sijaan että keksittäisiin kolmas, oma "pehmeä vaalea stream-sävy" (mikä olisi vain lisännyt yhden teema-riippuvan erikoistapauksen lisää samaan ongelmaluokkaan), koko `/lahetys`-sivu vaihdettiin käyttämään SAMOJA kiinteitä tumman teeman arvoja kuin loppu konsolista jo tekee (`DARK_BG`/`DARK_SURFACE`/`DARK_PANEL_BG`/`DARK_BORDER`/`DARK_TEXT`/`DARK_TEXT_SUB`/`DARK_MUTED`/`DARK_SURFACE2`/`DARK_DIM`, kaikki samat hex-arvot kuin tumman teeman `C`-oliossa — tumman teeman käyttäjälle ei siis näy MITÄÄN visuaalista muutosta, vain vaalean teeman käyttäjän bugi katoaa). `useTheme()` poistui tiedostosta kokonaan koska se jäi käyttämättömäksi korjauksen jälkeen.

**28. Chat-viestien värit huonontuneet, huutohinnat eivät erotu — omistaja EI pyytänyt näihin koskemista, todennäköinen tahaton sivuvaikutus.** Kuvakaappauksessa chat näyttää yhtenäisiä tummanvihreitä laatikoita ("Larzmoi" toistuu), joista huutohintoja ei enää erota selvästi — heikko kontrasti/luettavuus. **Tärkeä huomio: tätä väriskeemaa ei ole pyydetty muutettavaksi missään vaiheessa** — todennäköisesti tahaton sivuvaikutus jostain muusta äskettäisestä muutoksesta (esim. kohdan 17 "kirkasta vihreää" -värimuutos on saattanut vuotaa myös chat-viestikupliin, tai jokin muu väriyhtenäistys osui vahingossa tähän). **Korjaus: palauta chat-viestien luettavuus — riittävä kontrasti, huutohinnat pitää erottua selvästi tavallisesta chat-tekstistä (esim. eri väri/lihavointi kuten aiemmin oli).** Tarkista mikä äskettäinen muutos aiheutti tämän, älä vain korjaa oiretta ymmärtämättä syytä.
**✅ JUURISYY LÖYTYI JA KORJATTU 2026-08-14 — epäily kohdasta 17 osui oikeaan, mutta mekanismi oli tarkalleen tämä:** kohdan 17 korjaus teki `/lahetys`-tiedostoon laajan haku-korvaa-operaation (`C.accent`→`GREEN_DIM`, `C.accentBright`→`GREEN`, `C.accentLight`→`GREEN_BG`) joka oli tarkoitettu pikatoimintonapeille, mutta samat kolme tunnusta olivat käytössä myös chat-syötteen huuto-/osto-laatikoissa — ne lakaisiutuivat mukaan samaan korvaukseen. Tumman teeman arvot olivat numeerisesti IDENTTISET ennen/jälkeen (`GREEN_BG` = tumman teeman `accentLight`), joten tumman teeman käyttäjälle ei näkynyt mitään muutosta — mutta huuto- JA ostolaatikot molemmat päätyivät käyttämään SAMAA `GREEN_BG`-taustaa, ja niiden ainoa erottava tekijä (`GREEN_DIM` vs. `GREEN`, kaksi hyvin lähellä toisiaan olevaa vihreän sävyä) oli jo alun perinkin heikko erottelija. Koska aktiivisen huudon aikana suurin osa syötteen viesteistä ON huutoja, syöte näytti "seinältä identtisiä laatikoita" — täsmälleen raportoitu oire. **Korjaus, kaksiosainen:** (1) huudot eivät ole enää omia laatikoitaan ollenkaan — rivimäinen esitys tavallisen chatin sekaan, käyttäjänimi `GREEN_DIM`, mutta itse €-summa selvästi lihavoitu `GREEN`, erottuu ilman että dominoi koko näkymää; (2) osto-laatikko (harvinaisempi, aidosti juhlittava tapahtuma) säilyi omana korostettuna laatikkonaan, nyt selkeästi ainoa laatikko-tyylinen elementti syötteessä. Sama korjaus myös mobiilin chat-overlayssä (huudon summa erottuu omana lihavoituna `GREEN`-tekstinä, ei enää pelkkä käyttäjänimivärin ero). **Sivuvaikutuksena löytyi ja korjattiin (ks. kohta 27):** samalla haku-korvaa-operaatiolla oli myös jättänyt chatin YMPÄRILLÄ olevan paneelin (`C.cardBg`/`C.border`/`C.text`) korjaamatta, mikä paljasti laajemman kohdan 27 -bugin.

## Uudet löydökset 2026-08-13, osa 5 (Shop-PiP-käytös, tuotetiedot, ja KRIITTINEN Paytrail-regressio)

**19. Shop-paneelin PiP-video pitäisi voida palauttaa klikkaamalla itse pientä videota, ei vain yläpalkin X:ää.** Kun Shop avataan, video pienenee oikein kelluvaksi PiP-ikkunaksi (toimii). Mutta suurentaminen takaisin vaatii nyt erikseen yläpalkin X-napin painamista — omistaja haluaa että **itse pientä PiP-videota klikkaamalla** se suurenisi takaisin täyteen näkymään, intuitiivisempi tapa.

**20. Vahvistus: tuotetiedot eivät yhä näy katsojalle ("LOT #0", ei kuvaa) — sama kuin aiemmin raportoitu kohta 3.** Uusi kuvakaappaus vahvistaa saman ongelman toistuvan: katsojan puolella nykyisen tuotteen kohdalla lukee yhä "LOT #0" / "Ei tuotteita jonossa" eikä kuvaa näy, vaikka huuto onnistui normaalisti (huutohistoria "testi Huusi 2€...6€" näkyy oikein). Tuotetiedot ja huutodata ovat siis eri lähteistä — huutodata toimii, tuotetiedot eivät välity.

**21. KRIITTINEN REGRESSIO(?): Paytrail-maksuvirtaus antoi 404-virheen kesken maksua — 2026-08-16: Danske-teoria kyseenalaistettu, todennäköisesti OP:n oma reitti rikki testitilassa.** Voitettu huuto siirtyi oikein ostoskoriin, maksu aloitettiin normaalisti, mutta kesken Paytrail-maksuvirtaa tuli **404 "Etsimääsi sivua ei löytynyt"** osoitteessa `services.paytrail.com/payments/{id}/osuu...`.

Ensimmäinen teoria (Danske vaatii oikeita pankkitunnuksia testitilassa, ks. Paytrail-osio) osoittautui todennäköisesti vääräksi kredentiaalitonta, automatisoitua diagnostiikkaa vasten: `createPayment()`-kutsu tuotannon oikealla koodilla (`backend/src/lib/paytrail.ts`) synteettisellä tilauksella onnistui täydellisesti (200, ei 404), ja Paytrailin oma maksusivu listasi OP:n, Nordean ja Dansken kaikki saatavilla olevina. Mutta kun sivulta poimittiin OP:n (Osuuspankki) oma linkki ja sitä kutsuttiin suoraan (`GET`, oikeat evästeet mukana koko uudelleenohjausketjun ajan, ei pelkkä irrallinen kutsu) — **`https://services.paytrail.com/payments/{id}/osuuspankki/loading-and-redirect` palautti 404** kolmella eri, itsenäisesti luodulla maksusessiolla. `osuu...` alkuperäisessä virheilmoituksessa on lähes varmasti "**osuuspankki**" (OP), ei Danske. Nordean/Danske linkit olivat rakenteeltaan erilaisia (valmiiksi allekirjoitettuja success/cancel-URL:eja) eivätkä toistaneet samaa 404:ää.

**Varaus:** Paytrailin oikea maksusivu on todennäköisesti JS-pohjainen SPA joka saattaa rakentaa lopullisen pankkilinkin vasta klikkaushetkellä tuoreella tokenilla — pelkkä staattisen HTML:n kaapiminen (mitä diagnostiikka teki) ei välttämättä vastaa 100-prosenttisesti oikeaa selainklikkausta. **Ei siis vielä täysin varmistettu**, mutta vahva signaali että vika on OP:ssa, ei Danskessa — käänteinen johtopäätös aiempaan verrattuna. **Kysytty omistajalta:** millä pankilla "purchase did work" -vahvistus (ks. edellinen viesti) tehtiin — jos OP:lla, tämä diagnostiikka on jotenkin harhaanjohtava (esim. token-aikaraja); jos Nordealla/Danskella, vahvistaa OP-teorian. **Älä vielä piilota Danskea perustuen alkuperäiseen (nyt kyseenalaistettuun) teoriaan.**

**29. ✅ TEHTY 2026-08-16 — Live-konsolin pikalisäyslomakkeesta ("+ Lisää tuote") puuttuu minimikorotus-kenttä kokonaan.** Vahvistettu koodista (`frontend/app/lahetys/page.tsx`, `quickAddProduct()`/`showQuickAdd`-lomake): tämä on eri, kevyempi lomake kuin dashboardin täysi tuotelomake (jossa "Minimikorotus"-kenttä lisättiin jo aiemmin, ks. "Mobiili-läpikäynti"-osion kohta 8) — pikalisäyksessä on vain nimi, lähtöhinta ja kuva. `api.createProduct()`-kutsu ei välitä `bidIncrement`-arvoa ollenkaan, joten kaikki näin lisätyt tuotteet menevät aina 1€-oletuskorotukseen. **Korjattu:** lisätty `qaBidIncrement`-kenttä lomakkeeseen (valinnainen, tyhjä→1€ fallback, sama periaate kuin täydellä lomakkeella), välitetään `createProduct()`-kutsussa, nollataan onnistuneen lisäyksen jälkeen.

**30. ✅ TEHTY 2026-08-16 — "Jaa striimi" -nappi.** Lisätty sekä `/lahetys`-konsolin yläpalkkiin (myyjälle, `pillBtn`-tyylillä muiden yläpalkin nappien vieressä) että katsojan `/live/[showId]`-sivulle (mobiilin pyöreä ikonipalkki + desktopin tekstinappi, ➤-ikoni samaa vakiintunutta ei-emoji-ikonikieltä kuin ⚑/✕/✓). Käyttää `navigator.share()`:ia (natiivi jako-valikko) kun saatavilla — pääosin mobiiliselaimet — muuten kopioi linkin leikepöydälle ja näyttää lyhyen vahvistuksen (`copied`-tila `/lahetys`:ssä, `toast`-tila katsojan puolella). Katsojan puolen tekstit uusilla `t.live.share`/`t.live.linkCopied`-avaimilla (fi+en); `/lahetys` pysyy hardkoodatun suomen linjassa koska koko tiedosto ei käytä i18n-järjestelmää missään muuallakaan.

**✅ TEHTY 2026-08-16 — kaksi jatkopyyntöä samaan aiheeseen:**
- **Laatutilastobadge siirretty:** oli videon vasemmassa alakulmassa (ks. kohta 23), omistajan pyynnöstä nostettu `/lahetys`-konsolin yläpalkkiin, LIVE/ESIKATSELU-tilaindikaattorin alle. Tila (`stats`) nostettiin `HlsPreview`-komponentista ylös `LahetysPage`:n omaksi `previewStats`-tilaksi uuden `onStats`-callback-propin kautta — laskenta pysyy `HlsPreview`:ssä (sidoksissa sen omaan LiveKit-huoneeseen), vain näyttö siirtyi.
- **Shop-paneelin tuotteet suurentuvat klikattaessa** — sama `ProductDetailModal` jota nykyisen/seuraavan lotin klikkaus jo käytti, laajennettu kattamaan minkä tahansa Shop-paneelin tuotteen. `productModalOpen`-boolean korvattu `modalProduct: ShowProduct | null` -tilalla jotta modaali voi näyttää MINKÄ TAHANSA tuotteen, ei vain `currentProduct`:ia. Shop-paneelin "Pre-bid"/"Osta heti" -napit pysäyttävät klikkauksen kuplinnan (`stopPropagation`) etteivät ne vahingossa avaa modaalia.

## Uudet löydökset 2026-08-13, osa 4 (myyjän konsolin jatkokehitys — kuvakaappaus)

**16. Jonon tuotteita ei voi klikata avatakseen isommaksi/muokataksesi.** Vasemman Jono-paneelin tuoterivit (kuva+nimi) eivät ole klikattavissa — ei pääse näkemään isompaa kuvaa, kuvausta tai muokkaamaan tuotetta suoraan konsolista. Lisää klikkaus-toiminto joka avaa tuotteen tiedot/muokkauksen (samantyylinen kuin katsojan puolelle jo speksattu suurennusmodaali, kohta 4).

**17. Pikatoimintonappien vihreä sävy liian tumma — kirkastettava.** Nykyiset napit (+10s, Kiinnitä, Myyty, Seuraava, Giveaway) käyttävät liian tummaa vihreää, omistaja haluaa kirkkaamman sävyn. Liittyy jo aiemmin mainittuun "väriyhtenäistys"-tarpeeseen (ks. "Uudet löydökset 2026-08-08" -osio) — hoidetaan samassa yhteydessä.

**18. KRIITTINEN: Shop-paneelin tuotteet eivät näy toisella laitteella, vain streamaavalla laitteella.** Testattu: tuotteet (jonossa olevat) näkyvät Shop-paneelissa vain sillä laitteella jolla myyjä striimaa — toisella laitteella (esim. katsojan puhelin) Shop-paneeli ei näytä samoja tuotteita. Tämä rikkoo koko "Katsojan Shop-paneeli" -konseptin (ks. oma osio) — tuotteiden pitäisi tulla palvelimelta kaikille katsojille samana, ei paikallisesta selaimen tilasta. Todennäköinen syy: Shop-paneelin data haetaan/pidetään vain paikallisessa React-tilassa striimaavalla laitteella sen sijaan että se haettaisiin palvelimelta jokaiselle katsojalle erikseen.

**Yleinen huomio:** omistaja ei saanut vertailukuvia kilpailijan (Popify) myyjän hallintapaneelista, joten oma konsoli kehittyy jatkossa ilman suoraa referenssiä siltä osin — ei estä kehitystä, mutta tarkoittaa enemmän omaa iterointia.
- **12 (kriittinen/turva):** perinteinen huutokauppareitti tarkisti jo `sellerId === userId`-eston, mutta live-huudon `socket.ts`-käsittelijästä puuttui sama tarkistus. Lisätty.
- **1:** z-index-korjaus, chat-overlay nostettu tuotelaatikon yläpuolelle
- **2:** juurisyy oli `mutedWords` muistivarainen Map, häviää joka deployssä — siirretty `Show.mutedWords`-kenttään tietokantaan
- **3:** lisätty "Seuraavaksi: [nimi]" -rivi katsojan näkymään
- **4:** klikattava suurennusmodaali lisätty (kuva, kunto, kuvaus, hinta)
- **5:** huutosumma-stepper tehty joustavammaksi ahtailla näytöillä (ei visuaalisesti vahvistettu alkuperäistä leikkautumista)
- **6:** "Myyty" selitetty ja säilytetty — se on normaali tapa päättää lot ennen ajastimen loppumista, ei päällekkäinen muiden nappien kanssa
- **7:** duplikaatti "Lopeta" poistettu pikatoimintoriviltä
- **8:** juurisyy: `isSold`-tarkistus viittasi väärään (nykyiseen) tuotteeseen jonon rivien sijaan — poistettu tarpeettomana tarkistuksena
- **9:** `onChange` pakotti minimiarvon joka näppäimenpainalluksella — poistettu, `placeBid()` validoi jo lähetyshetkellä
- **10:** ei keinotekoista viivettä — kolme peräkkäistä DB-kutsua rinnakkaistettu, huudon kirjoitus siirretty pois kriittiseltä polulta
- **13:** backend oli jo oikein (2h), näkyvyysbugi: `/ostot` näytti vain 6h-lähetysvalinta-ajastimen, ei 2h-maksuaikaa — molemmat näytetään nyt selvästi. Myyjän puolen "Odottaa maksua" -näkymä lisätty (vahvistetusti puuttui).
- **Sääntömuutos:** `VIOLATIONS_BEFORE_BAN` 3→1, muu bannin uusiutumislogiikka oli jo oikein

**Odottaa: lupa committaa, pushata ja deployata tämä paketti tuotantoon.**

## Uudet löydökset 2026-08-13, osa 3

**Hyvä uutinen — LiveKit-viive jopa parempi kuin raportoitu:** vahvistettu että viive on välillä **0-1 sekuntia**, ei vain aiemmin mitattu 2-3s. LiveKit-päätös oli vielä parempi kuin osattiin odottaa.

**Kaksi uutta bugia:**

**14. Kielenvaihto ei näy mobiililla.** Navbarin kielenvalitsin (FI/EN, ks. koodaussääntö "käännökset t.xxx-järjestelmällä") ei näy/toimi mobiililaitteella — tarkista onko se piilotettu vahingossa jossain responsiivisuusmuutoksessa, vai puuttuuko se kokonaan mobiili-navbarista.

**15. Footer näkyy epäjohdonmukaisesti eri sivuilla ja laitteilla — tarkka tilannekuva:**
- **Mobiili:** Etusivulla footer näkyy oikein. **Selaa-sivulla footer ei näy ollenkaan.** Huutokaupat-sivulla footer näkyy mutta ei pysy sivun alareunassa (renderöityy jossain väärässä kohtaa). Live-sivulla sama ongelma kuin Huutokaupat-sivulla.
- **Desktop/selain:** Etusivulla ok. **Selaa-sivulla footer ei näy ollenkaan** (sama kuin mobiilissa). Muualla ok.
- **Yhteenveto korjattavaksi:** Selaa-sivulta footer puuttuu kokonaan sekä mobiilissa että desktopilla — tämä on todennäköisesti sama juurisyy molemmilla laitteilla, korjaa kerralla. Huutokaupat/Live-sivujen "väärässä kohtaa" -ongelma voi olla eri syy (esim. sivun sisällön korkeus ei laske footeria oikein pohjalle) — tarkista erikseen.

**1. Nykyisen tuotteen tietolaatikko ("Reiska"-tyylinen kortti: kuva+nimi+hinta+kesto) renderöityy chat-tekstikentän PÄÄLLE, estää kirjoittamisen — vahvistettu kuvasta 2026-08-13.**
Korjaa aiemman virheellisen diagnoosin (ks. yllä oleva historia) — todellinen syy on **z-index/kerrosjärjestysongelma**: tuotetietolaatikko on korkeammalla kerroksella kuin chat-inputin `position:absolute`-overlay, joten se peittää tekstikentän kokonaan tai osittain käyttäjän sormen/kohdistimen tavoittamattomiin. **Tämä täsmää aiemmin raportoituun ja "korjattuun" bugiin** ("Huutokauppakohteen avaus blokkaa chatin valinnan", ks. "Uudet löydökset 2026-08-10" -osion kohta 3) — joko se korjaus ei toiminut kunnolla, tai tämä on sama ongelma toisessa kohtaa UI:ta (nyt vahvistettu myyjän omalla `/lahetys`-konsolilla, ei vain katsojan puolella). **Korjaus: tarkista kaikki paikat missä nämä kaksi overlayta (tuotetietolaatikko + chat-input) voivat olla päällekkäin, aseta chat-inputille korkeampi z-index tai siirrä tuotetietolaatikko niin ettei se voi koskaan mennä tekstikentän päälle.** **Rajaus vahvistettu 2026-08-13: koskee VAIN myyjän omaa `/lahetys`-konsolia, ei ostajan/katsojan puolta** — katsojan puolella chat toimi testissä normaalisti, ainoa katsojapuolen ongelma on erillinen kohta 3 (tuotetiedot eivät näy ollenkaan katsojalle). Älä siis etsi tätä z-index-bugia katsojan sivulta, keskity vain myyjän konsoliin.

**⚠️ EI KORJANNUT, LÖYDETTY UUDESTAAN 2026-08-14 — z-index EI ollutkaan oikea diagnoosi.** Omistaja vahvisti kuvakaappauksella ettei aiempi "z-index nostettu" -korjaus riittänyt — chat-tekstikenttä oli yhä tuotetietolaatikon alla myyjän omalla `/lahetys`-konsolilla mobiilissa. **Oikea juurisyy löytyi tarkemmalla koodiluvulla:** chat-overlayn (zIndex:12) pohja-`padding` oli kiinteä arvattu luku (`190px`), jonka piti tehdä juuri sen verran tilaa alapalkille (tuotetietolaatikko + kesto/aloitusnappi + 5 pikatoimintonappia) ettei ne osuisi päällekkäin. Alapalkin TODELLINEN korkeus kuitenkin vaihtelee tilan mukaan — erityisesti ennen huutokaupan alkua (kesto-valinta+"Aloita"-nappi+5 pikatoimintonappia, jotka voivat kääriytyä kahdelle riville kapealla näytöllä) korkeus ylittää 190px helposti, jolloin alapalkin yläosa (tuotekuva/nimi/hinta) tunkeutuu chat-inputin varattuun tilaan riippumatta z-indexistä — z-index ratkaisee VAIN kuka näkyy PÄÄLLIMMÄISENÄ kun kaksi elementtiä oikeasti on samassa kohdassa, ei sitä ETTEIVÄT ne koskaan olisi samassa kohdassa. Alkuperäinen z-index-korjaus oli siis oikea MUTTA riittämätön — ratkaisi vain sen tapauksen missä ne olivat päällekkäin, ei estänyt päällekkäisyyttä syntymästä ensinkään.
**✅ OIKEA KORJAUS 2026-08-14:** kiinteän 190px-arvauksen sijaan alapalkin korkeus MITATAAN oikeasti DOM:sta (`bottomBarRef` + `ResizeObserver`, `frontend/app/lahetys/page.tsx`), ja chat-overlayn pohja-padding sekä Jono-paneelin pohjaraja käyttävät nyt mitattua `bottomBarHeight`-arvoa kiinteän luvun sijaan — sopeutuu automaattisesti riippumatta mitä nappeja/tiloja alapalkissa sattuu olemaan näkyvissä tai kuinka moni pikatoimintonappi kääriytyy toiselle riville, ei enää vaadi arvaamista tai uutta magic-numeroa joka rikkoutuisi seuraavan sisältömuutoksen myötä.

**2. Muted Words -suodatin ei toimi — tarkennettu 2026-08-13, korvaa aiemman epätarkan version.** Kyse ei ole "Tee moderaattoriksi" -toiminnosta (se on jo oikein poistettu käytöstä, ks. 2026-08-10 kohta 1) — kyse on **kiellettyjen sanojen suodattimesta** (ks. "Chat & moderointi" -osion "Muted Words" -kohta). Testattu: myyjä lisäsi kielletyksi sanaksi "moi", mutta chat ei suodattanut/piilottanut sitä sisältäviä viestejä tavalliselta yleisöltä. **Korjaus: varmista että Muted Words -lista oikeasti tarkistetaan jokaista saapuvaa chat-viestiä vastaan, ja täsmäävät viestit piilotetaan normaalilta yleisöltä (moderaattorit näkevät ne yhä, ks. alkuperäinen speksi).**

**3. Ostajan puolella kiinnitetty/seuraava tuote ei näy.** Katsojan näkymässä ei näy tietoa siitä mikä tuote on kiinnitettynä tai mikä on jonossa seuraavana — tämä tieto on olemassa myyjän puolella mutta ei välity katsojalle.

**4. Tuotetta ei voi klikata isommaksi/kuvauksen näkemiseksi.** Katsoja ei pääse avaamaan nykyistä tuotetta suurempaan näkymään nähdäkseen kuvauksen tai muut tiedot — puuttuva interaktio.

**5. Sisältö ylivuotaa näytön ulkopuolelle, vaikka scroll on oikein estetty — tarkennettu 2026-08-13.** Vahvistettu: sivun EI pidä pystyä scrollaamaan mihinkään suuntaan (ylös/alas/vasen/oikea) mobiilissa/tabletilla — tämä on edelleen oikea, LUKITTU vaatimus. **Chat-viestilista on eri asia ja saa scrollata sisäisesti normaalisti.** Kuvakaappauksessa näkyy kuitenkin että esim. "+"-nappi (määrän lisäys) jää osittain näytön reunan ulkopuolelle — eli scroll-esto toimii teknisesti oikein, mutta **sisältö ei mahdu kokonaan näkyvään alueeseen**, jolloin osa siitä on käytännössä tavoittamattomissa. **Korjaus: varmista että KAIKKI interaktiiviset elementit (napit, syöttökentät) mahtuvat kokonaan näkyvän viewportin sisään millä tahansa mobiili-/tablettikoolla — pienennä/järjestä uudelleen elementtejä tarvittaessa, älä vain estä scrollausta sisällön ylivuotaessa.**

**6. "Myyty"-napin tarkoitus epäselvä omistajalle.** Ei tiedetä mitä se tekee/pitäisi tehdä. **Pyydä VS Coden Claudea selittämään alkuperäinen tarkoitus** (esim. onko se tarkoitettu merkitsemään nykyinen tuote myydyksi manuaalisesti huutokauppa-ajastimen ulkopuolella) — jos se osoittautuu tarpeettomaksi/päällekkäiseksi muiden toimintojen kanssa, poistetaan. Ei poisteta vielä ilman selitystä.

**7. "Lopeta"-nappi kahteen kertaan, sekoittaa — poista alempi.** Yläpalkissa on jo oma "Lopeta"-nappi (lopettaa koko lähetyksen). Pikatoimintorivillä alempana on toinen "Lopeta"-nappi jonka omistaja luuli lopettavan vain nykyisen huutokaupan/tuotteen, ei koko streamiä — sekaannusta aiheuttava kaksinkertaisuus. **Päätös: poista alempi "Lopeta"-nappi kokonaan, jätä vain yläpalkin nappi.** Jos tarvitaan erillinen "lopeta vain nykyinen huutokauppa" -toiminto, se pitää nimetä selvästi eri tavalla (esim. "Peruuta huutokauppa") eikä käyttää samaa "Lopeta"-sanaa kuin koko streamin lopetuksessa.

## Uudet löydökset 2026-08-12 (tablettikoon responsiivisuustesti)

**iPad-kokoinen näyttö (768×1024) ei skaalaudu oikein julkisella `/live/[showId]`-sivulla.** Testattu Responsively App -työkalulla. Havainto: Shop-paneeli (vasen) ja Keskustelu/chat-paneeli (oikea) eivät mahdu näkymään oikein tällä leveydellä — chat-paneeli leikkautuu osittain näytön ulkopuolelle oikeasta reunasta, video-alue ei skaalaudu suhteessa jäljelle jäävään tilaan. Nykyinen layout (desktop: video 70-75%/chat 20-25%, mobiili: video 100% + overlay) ei kata tätä väliin jäävää tablettikokoa — tarvitaan oma breakpoint-käyttäytyminen n. 768-1024px leveyksille, ei vain kaksi ääripäätä (desktop/mobiili).

## Uudet löydökset 2026-08-09 (chat toimii, huutokauppa testattu ensi kertaa)

**Hyvä uutinen:** chat saatiin toimimaan (diagnoosin jälkeen — ei vielä varmistettu kumpi syy se lopulta oli, verkko vai CSS, kysy VS Coden Claudelta jos ei mainittu).

**Neljä uutta löydöstä huutokaupan/liven testauksesta:**

1. **Huutokaupan päättymisen jälkeen jää jäänteinen UI-tila.** Testattu: omistaja voitti oman huutokaupan. Sen jälkeen "Sinä johdossa" -teksti ja "nykyinen huuto" jäävät näkyviin vaikka huutokauppa on jo päättynyt, eikä UI päivity "myyty/päättynyt"-tilaan. Lisäksi huutokenttä näyttää yhä seuraavan minimihuudon summan, vaikka huutokauppa on jo ohi (pitäisi olla joko piilossa tai selvästi merkitty "päättynyt"). **Selkeä bugi:** auktion päättymistapahtuma ei siivoa/päivitä frontendin tilaa oikein.

2. **Live "toimii mutta tökkii"** — epämääräinen, vaatii tarkempaa havainnointia (nykäyksiä toistossa? puskurointitaukoja?). Voi liittyä siihen samaan keyframe-interval-asiaan (8.3s, ei vielä korjattu) — pidemmät segmentit voivat aiheuttaa nykäyksiä lyhyemmän hls.js-puskurin kanssa. Korjaa keyframe-väli ensin (ks. "Tilannepäivitys 2026-08-09" -osio), tarkista tökkiikö vielä sen jälkeen.

3. **Shop-paneelin PiP-video on tyhjä.** Klikattiin "Shop", video pieneni oikein picture-in-picture-ikkunaksi (rakenne toimii), mutta itse PiP-ikkunassa ei näkynyt kuvaa — musta/tyhjä. Regressio Shop-paneelin toteutuksessa, videoelementti ei toistu PiP-tilassa vaikka pienentyminen itsessään toimii.

4. **Striimin uudelleenkäynnistys: epäsymmetrinen viive myyjän ja katsojan välillä.** Kun omistaja käynnisti striimin uudelleen samalla koneella, hänen OMA esikatselunsa kesti 15-30s ennen kuvan tuloa — mutta **toisella laitteella (katsojana) kuva tuli nopeasti/normaalisti**. Tämä viittaa siihen että myyjän oma esikatselukomponentti ei havaitse/reagoi striimin uudelleenkäynnistykseen kunnolla (esim. vanha hls.js-instanssi ei lataa manifestia uudelleen), erillinen ongelma yleisestä striimin viiveestä.

## PÄÄTÖS 2026-08-09: Vaihto MediaMTX → LiveKit

**Testi ja tulos:** OBS-keyframe-korjaus (8.3s→2s, tunnistettu tarkka syy pitkälle viiveelle) tehtiin, **ei tuottanut mitään parannusta viiveeseen.** Tämä täytti aiemmin asetetun päätöskriteerin: jos tunnistettu, konkreettinen korjaus ei auta, kyse ei ole enää yksittäisestä asetuksesta vaan väärästä perustasta.

**Päätös: siirrytään LiveKitiin (WebRTC SFU, WHIP/WHEP).** Perustelut:
- MediaMTX:n paras realistinen kattoarvo olisi ollut n. 2-5s (LL-HLS) — LiveKit tähtää alle 500ms:ään, eri luokka kokonaan
- LiveKit ratkaisee **kaksi jonossa ollutta tehtävää samalla migraatiolla**: viiveen JA sen myöhemmäksi siirretyn "selainstriimaus ilman OBS:ää" -ominaisuuden (LiveKit tukee sekä WHIP-vastaanottoa suoraan selaimesta/puhelimesta että perinteistä RTMP-syötettä OBS:lle)
- Avoimen lähdekoodin — voidaan hostata itse Hetznerillä (kontrolli+kustannus hallinnassa) tai vaihtaa LiveKit Cloudiin myöhemmin jos operatiivinen taakka kasvaa liikaa, sama "voi vaihtaa myöhemmin ilman uudelleenrakennusta" -periaate kuin Mux-vertailussa
- 24h+ työtä MediaMTX:n kanssa vaihtelevin tuloksin, sama toistuvan epäonnistumisen kuvio kuin aiemmissa vaihdoissa (nginx-rtmp→MediaMTX-päätöksen taustalla)

**Mitä EI oteta käyttöön nyt, huolimatta ehdotuksista:**
- **Redis** — ehdotettu chatin/huutokaupan nopeuttamiseksi, mutta väärä työkalu juuri tähän. WebSocket (Socket.io) on jo käytössä, ei uusi teknologia. Redis on tarkoitettu horisontaaliseen skaalaukseen (useampi backend-instanssi jakamassa tilaa) — ei ratkaise operaattoriverkon NAT-ongelmaa, koska data lähtisi silti samasta yhdestä origin-palvelimesta. Redis harkitaan myöhemmin nimenomaan skaalaustarpeeseen, ei nyt luotettavuuskorjaukseksi.
  - **Poikkeus, selvennetty 2026-08-10:** tämä kielto koskee Redisin käyttöä SKRM:n OMAAN chat-/huutokauppalogiikkaan. Se **ei koske** LiveKitin **Ingress-komponentin** (RTMP-vastaanotto OBS:lle) sisäistä pakollista teknistä riippuvuutta Redisiin — tämä on LiveKitin oma toteutusyksityiskohta sen sisäiseen RPC-kommunikointiin, ei jotain jonka SKRM-backend käyttäisi suoraan. **Hyväksytty ratkaisu:** pieni, vain-paikallinen (`localhost`, ei julkisesti auki) Redis-instanssi ainoastaan Ingress-RPC:tä varten, ei kosketa chattia/huutokauppaa/muuta backendiä.
- **Stripe Connect** — maksut ovat jo LUKITTU Paytrail, ei muuteta

**Chat/Socket-päätös pysyy ennallaan:** ks. "Chat/Socket-arkkitehtuurin uudelleenarviointi" -osio — pub/sub-migraatio (Pusher/Ably) on yhä oikea polku chatille jos verkkodiagnoosi vahvistaa NAT-syyn, tämä ei muutu LiveKit-päätöksen myötä.

**MediaMTX-työ ei mennyt hukkaan** — RTMP-vastaanotto ja koko infra-osaaminen siirtyy suurelta osin LiveKitin asennukseen, ja koodikannan abstraktiokerros (`Show.streamKey`+`Show.hlsUrl`-tyyppinen erottelu) tekee tästäkin vaihdosta hallittavan, ei "rakenna kaikki uusiksi".

## PÄIVITYS 2026-08-10: LiveKit-viive vahvistettu — 2-3 sekuntia, tavoite YLITETTY

Omistaja vahvisti oikealla testauksella: viive on nyt 2-3 sekuntia, parempi kuin alkuperäinen 5s-tavoitekin. LiveKit-vaihto oli oikea päätös, MediaMTX-työstä luopuminen kannatti.

**Kaksi uutta löydöstä samasta testistä:**

1. **"Yhdistetään..." (connecting) -teksti jää roikkumaan näkyviin** vaikka video jo toimii ja näyttää kuvaa — turha/jäänteinen tilaviesti joka ei siivoudu pois kun yhteys on oikeasti muodostunut. Pieni mutta selvä UI-bugi.

2. **Mobiilichat ei näy edelleenkään**, vaikka työpöytäpuolella toimii — **tärkeä diagnostinen huomio: tämä sama oire toistuu identtisenä nyt TÄYSIN ERI videoinfralla (LiveKit) kuin aiemmin (MediaMTX/nginx-rtmp).** Koska koko video-/verkkokerros vaihdettiin kokonaan eikä chat-mobiilibugi muuttunut yhtään, tämä **vahvistaa aiemman epäilyn: kyse on todennäköisesti renderöinti-/CSS-tason bugista mobiilin chat-overlayssä, ei verkko-/operaattori-NAT-ongelmasta.** Jos syy olisi ollut verkkotasolla (operaattorin NAT), video-infran täydellinen vaihto olisi todennäköisesti muuttanut käytöstä edes jonkin verran. Että se pysyi täysin identtisenä, osoittaa vahvasti frontendin renderöintikoodiin, ei infraan.

**Selkeä seuraava askel:** älä enää tutki verkko-/NAT-selitystä tälle — keskity suoraan mobiilin chat-overlay-komponentin CSS:ään/renderöintiin (position/z-index/overflow/korkeus), ks. aiempi "kaksi kerrosta" -diagnoosiohje "Chat/Socket-arkkitehtuurin uudelleenarviointi" -osiossa, mutta paino nyt selvästi kerroksella 2 (renderöinti), ei kerroksella 1 (verkko).

## Uudet löydökset 2026-08-10 (neljäs testauskierros LiveKitin kanssa)

**1. Moderaattoritoiminto poistetaan käytöstä toistaiseksi — väärä laukaisin, aiheuttaa nyt myös chatin täyden toimimattomuuden.**
**Tarkennettu kuvaus (korvaa aiemman epätarkan version):** "Tee moderaattoriksi" -valikko ilmestyy **joka kerta kun joku tekee huudon toisella tunnuksella** — eli sen laukaisin on virheellisesti kytketty huutotapahtumaan, ei käyttäjän klikkaukseen chatissa niin kuin piti. Tämän seurauksena **chatin viestit eivät näy enää ollenkaan** — pahempi regressio kuin pelkkä visuaalinen sekaannus. **Päätös: poista tämä toiminto kokonaan käytöstä nyt.** Harkitaan myöhemmin uudella lähestymistavalla — esim. moderaattori lisätään **ennen liveä nimimerkillä** (osana lähetyksen esikatseluvaihetta), ei klikkaamalla käyttäjää kesken chatin.

**2. Mobiilissa jää "Odottaa OBS-yhteyttä" -teksti näkyviin vaikka esikatselu toimi ja livelle mennään.**
Testikuva näkyi esikatselussa oikein, mutta kun mentiin oikeasti liveen, jäi jumiin teksti joka väittää ettei OBS-yhteyttä ole vaikka striimi on jo käynnissä. Sukua aiemmalle "Yhdistetään..."-jäänneteksti-bugille (ks. "PÄIVITYS 2026-08-10" -osio) — sama kategoria: yhteystilan tekstiä ei päivitetä oikeaan tilaan kun yhteys on jo muodostunut, tällä kertaa mobiilissa liveen siirryttäessä.

**3. Huutokauppakohteen avaus blokkaa chatin valinnan.**
Kun huutokauppakohde (tuotepaneeli) avataan, se estää chat-tekstikentän valitsemisen/kirjoittamisen — käyttäjä ei pääse kirjoittamaan chattiin sillä aikaa. **Korjaus: siirrä tuotepaneelin avautumiskohta/z-index niin ettei se enää blokkaa chat-inputin fokusointia.**

**4. Desktopin tarjouksenteko-UI vaatii uudelleensuunnittelun — mobiili on ok, desktop ei.**
Omistajan sanoin: nykyinen desktop-tarjousmekanismi vaatii "pitkän viivan vetämisen" tarjouksen tekemiseksi, koettu liian työlääksi/ärsyttäväksi. **Mobiilissa vastaava toiminto koetaan hyväksi** (yksinkertaisempi, luultavasti numeropohjainen +/- -säädin). **Päätös: yksinkertaista desktop-tarjousmekanismi samantyyliseksi kuin mobiilissa jo on** — ei vaadi vetämistä/raahausta, vaan suoraviivainen syöttö/pikanapit. Tarkista VS Coden Claudelle tarkalleen mikä komponentti tämä on (todennäköisesti eri kuin mobiilin numerosyöttö, koska omistaja erottelee ne selvästi "mobiili ok, desktop ei").

## SEURAAVAKSI TEHTÄVÄT — prioriteettijärjestys (päivitetty 2026-08-13)

1. ✅ **LiveKit-migraatio** — TEHTY, vahvistettu 2-3s viive tuotannossa, ylitti tavoitteen
2. ✅ **Kriittiset live/chat-bugit (13 kpl + bannisääntö)** — TEHTY 2026-08-13, deployattu
3. **Mux vs. jatka itse -päätös** — käytännössä ratkennut itsestään: LiveKit toimii nyt 2-3s viiveellä eikä ole toistanut aiempaa "korjattu 3-5 kertaa, edelleen rikki" -kuviota. Ei akuuttia syytä vaihtaa managed-palveluun juuri nyt — pidetään avoimena jos luotettavuusongelmia ilmenee isommassa mittakaavassa, mutta ei enää kiireellinen päätös.
4. **Visuaalisen jäädytyksen lopullinen silmämääräinen hyväksyntä** — tekninen työ tehty useissa kierroksissa, odottaa vain omistajan katsomista kokonaisuutena läpi ja vahvistusta
5. **OY-rekisteröinti** — ei tekninen tehtävä, mutta avaa lukot sekä Paytrailin tuotantotunnuksiin (testivaihe jo valmis) että Posti-integraatioon (LogEDI@posti.com-yhteydenotto, kysymyslista jo valmiina) — todennäköisesti suurin yksittäinen pullonkaula juuri nyt
6. **WHIP/selainstriimaus ilman OBS:ää** — ei vielä aloitettu, tärkeä kun käyttäjäkunta laajenee puhelinkäyttäjiin
7. **Loput "Live-ominaisuudet Whatnot-tasolle" -kohdista** — ✅ ennakkotarjoukset TEHTY 2026-08-16 (ks. oma osio alempana), jäljellä: chat-moderoinnin loput (co-host, chat-komennot), giveaway, Katsojan Shop-paneeli
8. **Tarjoa hintaa -toiminto** — päätetty, ei vielä aikataulutettu
9. **Kategoriafokus: Keräilykortit ainoana** — suurelta osin tehty, tarkista jäännöskohdat jos ei jo tehty

**SV-käännös jää yhä odottamaan** — matalin prioriteetti.

## Striimin viive — LUKITTU vaatimus, kahdessa vaiheessa (päivitetty 2026-08-08)

Nykyinen viive (OBS→katsoja) on **~30 sekuntia** nginx-rtmp:n klassisella HLS:llä.

**Vaihe 1 — ✅ TEHTY 2026-08-08, tavoite 5-10 sekuntia:**
- `hls_fragment` 2s → 1s
- `hls_playlist_length` 10s → 4s
- hls.js: `liveSyncDurationCount: 2`, `maxLiveSyncPlaybackRate: 1.3` sekä katsojan että myyjän soittimiin
- **Mittaustulos:** synteettinen ffmpeg-publikointi tuotantoa vasten, segmentit tulevat tasaisesti 1.0s välein, playlist pitää tarkan 4s-ikkunan — palvelinpuolen laskennallinen viive n. 3-5s, tavoitteen (5-10s) sisällä
- **Rehellinen varaus, ei vielä lopullisesti vahvistettu:** mittaus on palvelinpuolinen (synteettinen lähde, paikallinen RTMP) — oikea OBS + verkkoyhteys + katsojan laite lisäävät päälle jonkin verran viivettä. **Seuraava askel: mittaa oikea päästä-päähän-viive oikealla OBS-striimillä ja kellolla (esim. näytä stopwatch kameralle, katso viive selaimessa).** Jos oikea mitattu viive ylittää 10s, Vaihe 2 kannattaa aikaistaa.

**Vaihe 2 — KÄYNNISTETÄÄN NYT (2026-08-09, kilpailutilanteen vuoksi aikaistettu), tavoite alle 6 sekuntia:** Oikea päästä-päähän-viive vahvistettu omistajan toimesta ~30 sekunniksi — Vaihe 1:n oma ehto ("jos ylittää 10s, aikaista Vaihe 2:ta") on täyttynyt selvästi. MediaMTX-migraatio klassisen HLS:n tilalle/rinnalle: WebRTC (alle 1s) tai LL-HLS (2-5s), kumpaakaan nginx-rtmp ei tue. Sama työ ratkaisee myös mobiilin asennuksettoman striimauksen (ks. "Selainpohjainen mobiilistriimaus" -osio) — yksi migraatio, kaksi kilpailuetua kilpailijaa vastaan.

## Mobiilin live-näkymä — LUKITTU vaatimus (2026-08-08)

Koska suuri osa käyttäjistä on mobiililla, tämä on lyötävä lukkoon molemmille — sekä myyjän live-konsolille (kuvattu "Stream-konsolin uudelleenrakennus" -osiossa) että katsojan `/live/[showId]`-sivulle:

- **Video täyttää koko ruudun** (full-screen, ei skaalattu pieneksi laatikoksi sivun sisällä)
- **Sivu ei saa liikkua/scrollata mihinkään suuntaan** kun ollaan live-näkymässä — ei ylös/alas eikä sivuille. Kiinteä viewport, ei normaalia sivun scrollausta.
- **Kaikki muu (napit, chat, tuotetiedot, huutokauppadata) rakennetaan videon PÄÄLLE overlayna**, ei erillisinä paneeleina jotka veisivät tilaa videolta tai pakottaisivat scrollaamaan nähdäkseen ne

Tämä koskee nimenomaan mobiilia. **Desktop on eri optimointikohde**, käsitellään erikseen (nykyinen kolmen paneelin rinnakkaisrakenne — jono/nykyinen tuote/chat — sopii paremmin isommalle näytölle eikä sitä tarvitse pakottaa samaan full-screen-overlay-malliin kuin mobiilia).

## Selainpohjainen mobiilistriimaus (WebRTC) — ✅ TEHTY 2026-08-12, testattu ja korjattu 2026-08-12

**Huom (2026-08-12):** tämä osio kuvasi aiemmin tulevaisuuden suunnitelmaa — ominaisuus on nyt oikeasti rakennettu ja tuotannossa. Toteutus: `backend/src/lib/livekit.ts`:n `createPublisherToken()` (identity `{userId}-phone`, eri kuin OBS:n Ingress-osallistujan) + `POST /users/me/publish-token`, `/lahetys`:n "Ilman OBS:aa"/"OBS:lla" -valinta joka julkaisee jo auki olevan kameran suoraan LiveKitiin `livekit-client`:llä (ei Ingressiä/RTMP:tä/WHIP:iä välissä). Sama huone kuin OBS käyttäisi, katsojan puolella ei muutoksia. Löydetyt jatkotestibugit korjattu:
1. Puuttuva `participant_left`-webhook-käsittely jätti lähetyksen ikuisesti LIVE-tilaan kun välilehti suljettiin (`webhooks.ts` — sama `ENDED`-merkintä kuin OBS:n `ingress_ended`:lla)
2. Julkaisutavan nimeäminen selkeytetty: "Puhelimella" → "Ilman OBS:aa" (universaalimpi, ei sido tiettyyn laitteeseen)
3. Mobiilin video-overlay-chat pakotti aina scrollin pohjaan (näytti vain viim. 5 viestiä ilman historiaa) — lisätty stick-to-bottom-vain-jos-jo-pohjassa-logiikka (`/live/[showId]` ja `/lahetys`), näkyvä historia kasvatettu 40 viestiin
4. **KRIITTINEN — live-huutokaupan "✓ Myyty" ei tehnyt tuotteelle mitään.** `socket.ts`:n `stop_auction`-käsittelijä (se mitä "✓ Myyty" -nappi kutsuu — todellisuudessa yleisin tapa päättää live-huutokauppa) ei koskaan merkinnyt tuotetta myydyksi, ei luonut Orderia, ei ilmoittanut voittajalle. Sama puute myös automaattisessa ajastimen loppumisessa. Sama Order-luonti-aukko joka jo korjattiin `auctions.ts`:lle/`closeAuctions.ts`:lle 2026-08-07, mutta ei koskaan portattu `socket.ts`:n erilliseen live-huutojärjestelmään. Korjattu: jaettu `finalizeLiveAuctionSale()`-apufunktio kutsuu `createOrderForAuctionWin()`:ia molemmissa päättymispoluissa + `ORDER_WON`-ilmoitus oikealla `/ostot`-linkillä
5. Myydyt tuotteet erotettu jonossa omaan "Myydyt"-osioonsa `/lahetys`:ssä, ei enää sekaisin himmennettyinä aktiivisen jonon kanssa

Alla oleva teksti on jätetty historiakontekstiksi, ei enää ajantasainen suunnitelma:

**Päätös OBS:sta:** OBS/RTMP-pohjainen striimaus **jää käyttöön työpöydälle** — se toimii ja on jo rakennettu. Tämä osio koskee vain **mobiililaitteita**, joilla halutaan "paina nappia ja olet livenä" ilman mitään erillistä asennusta (ei edes appia, koska appi vaatisi silti App Store/Play Store -asennuksen — tavoite "ilman muita asennuksia" osoittaa suoraan **selainpohjaiseen WebRTC-ratkaisuun**, ei natiiviin sovellukseen).

### Tutkittu referenssi: miten Whatnot tekee tämän yhdellä laitteella
Whatnot ei vaadi kahta laitetta (kamera + ohjain erikseen) — yksi puhelin riittää sekä kuvaamiseen että hallintaan. Havaittu rakenne (kuvakaappauksin dokumentoitu):
1. **Ennen liveä:** puhelimen kamera näkyy suoraan, chat-kenttä + "Store"-nappi (tuotteet) päällekkäin kuvan kanssa, iso "Start Show" -nappi
2. **Live käynnissä:** "Live Listings" -näkymä, jossa tuotteet jaettu välilehtiin: **Auction | Buy Now | Giveaway | Sold | Offers**. Tuotteesta suoraan "Start Auction"
3. **Huutokaupan asetukset ennen käynnistystä:** pieni popup — lähtöhinta, kesto ("Required Time"), counter-bid-aika (esim. 5s/7s/10s, resetoi laskurin jos uusi huuto tulee alle 10s jäljellä), "Sudden Death" -kytkin (viimeinen huutaja voittaa kun aika loppuu)
4. **Huutokauppa käynnissä:** kuva jatkuu, huutokauppa-data näkyy päällä (korkein huuto, huutaja, aika)

### Ehdotettu SKRM-mobiilirakenne (hahmoteltu yhdessä, ei lopullinen)
```
Ennen liveä: kamera + chat + tuotelista + "Aloita huutokauppa"
Tuotteen valinta: Lähtöhinta / Kesto / Jatkoaika → "Aloita"
Huutokauppa käynnissä: 🔴 LIVE, katsojat, korkein huuto + huutajalista, "Seuraava tuote", tuotteet/chat pikakuvakkeina
```
Tämä on hyvin lähellä jo speksattua "Stream-konsolin uudelleenrakennus" -rakennetta (jono/nykyinen tuote/chat), mutta mobiilioptimoituna yhdeksi virtaviivaiseksi näkymäksi kolmen erillisen paneelin sijaan — vahvistaa aiemman "mobiili tarvitsee oman layoutin" -havainnon.

### Tekninen huomio, ennallaan
nginx-rtmp (nykyinen) ei osaa vastaanottaa WebRTC:tä — tarvitsee joko rinnakkaisen työkalun (esim. **MediaMTX**, tukee sekä RTMP:tä että WebRTC:tä samassa binäärissä, voisi mahdollisesti korvata koko nykyisen pinon) tai managed-palvelun (esim. LiveKit). Tämä on edelleen iso infratyö, ei pieni lisäys — odottaa kunnes visuaalinen jäädytys ja nykyisten toimintojen viimeistely on ohi.

Havaittu 2026-08-07 OBS-testauksessa: `streamKey` generoidaan nyt **per Show** (`POST /shows`, `crypto.randomBytes`) — eli jokainen uusi lähetys pakottaa myyjän kaivamaan uuden avaimen ja syöttämään sen OBS:iin uudestaan. Tämä on turhaa kitkaa — myyjä ei jaksa säätää OBS-asetuksia joka kerta.

### Ratkaisu: streamKey siirtyy Userille, pysyvä + manuaalinen regenerointi
- Uusi kenttä `User.streamKey String? @unique` — generoidaan **kerran** (esim. lasi rekisteröitymisessä, tai lazily ensimmäisellä pyynnöllä)
- Sama avain toimii kaikissa myyjän tulevissa lähetyksissä — OBS konfiguroidaan kerran, ei koskaan uudestaan normaalikäytössä
- **"Generoi uusi avain" -nappi** dashboardin OBS-asetuksissa — manuaalinen escape hatch (esim. jos avain vuotaa), vanha avain mitätöityy heti kun uusi generoidaan, varoita käyttäjää että vanha OBS-konfiguraatio pitää päivittää

### Tekninen muutos webhookiin (tärkeä, ei triviaali)
Koska `streamKey` ei enää yksilöi suoraan yhtä `Show`ia, `on_publish`-webhookin logiikka muuttuu:
- **Ennen:** streamKey → suoraan yksi Show
- **Jälkeen:** streamKey → `User` (myyjä) → etsi kyseisen myyjän **`SCHEDULED`-tilassa oleva lähetys** (uusin, jos useampia — mutta normaalisti pitäisi olla korkeintaan yksi kerrallaan) → merkitse se `LIVE`:ksi kun OBS yhdistää
- Jos myyjällä ei ole yhtään `SCHEDULED`-lähetystä kun OBS yrittää yhdistää: hylkää selkeällä virheellä ("luo lähetys ensin dashboardista") — ei voi striimata tyhjyyteen

### Muut vaikutukset
- `GET /shows/:id/stream-info` korvautuu/täydentyy `GET /users/me/stream-info`:lla — palauttaa RTMP-palvelimen + käyttäjän pysyvän avaimen, saatavilla milloin tahansa, ei tarvitse edes olla lähetystä luotuna nähdäkseen omat OBS-asetuksensa
- `Show.hlsUrl` voidaan yhä rakentaa/tallentaa per lähetys näyttöä varten, mutta itse `streamKey` ei enää liity Show-riviin

## Stream-konsolin uudelleenrakennus — TARKENNETTU KOLMANNEN KERRAN JÄLKEEN (2026-08-08, tämä versio on lopullinen)

**Miksi aiemmat yritykset eivät osuneet kohdalleen:** speksi kuvasi paneelien SISÄLLÖN mutta ei koskaan eksplisiittisesti kieltänyt sivuston normaalia navigaatiokehystä (dashboard-sidebar, navbar) näkymästä. Tuloksena live-konsoli rakennettiin dashboardin *sisälle* yhtenä alisivuna, jolloin koko vasen navigaatio (Hallintapaneeli/Tuotteet/Lähetys/Ostot/Myynnit/Tilitykset/Profiili + käyttäjätiedot) vie ison osan leveydestä eikä video koskaan pääse hallitsemaan näkymää niin kuin Whatnot-referensseissä. Tämä ei ole hienosäätöasia — se on rakenteellinen virhe joka pitää korjata juuresta.

**LUKITTU vaatimus: Live-tila on TÄYSNÄKYMÄ (full takeover), ei dashboardin alisivu.**
- Kun myyjä menee lähetys-sivulle TAI kun striimi on tilassa `LIVE`/`SCHEDULED`-esikatselu, **koko sivuston normaali kehys (navbar ylhäällä, dashboard-sidebar vasemmalla) piiloutuu kokonaan**. Ei osittain kutistettuna, ei minimoituna — pois näkyvistä.
- Tilalle tulee oma erillinen, koko selainikkunan täyttävä layout, jolla ei ole mitään yhteistä komponenttia tavallisen dashboardin kanssa (paitsi tietysti sama teema/värit)
- Poistumiseen pieni, huomaamaton paluu-/sulkunappi (esim. vasemmassa yläkulmassa, pieni ←-ikoni) — ei täyttä navigaatiota takaisin

### Tilankäytön suhteet (desktop) — noudata näitä prosentteja, älä arvaa
- **Video: n. 70-75% näkymän leveydestä**, korkeus täyttää koko käytettävissä olevan pystytilan (ei pieni laatikko sivun keskellä, vaan dominoiva elementti)
- **Chat: kapea sarake oikealla, n. 20-25% leveydestä** — ei yhtä leveä kuin video, selvästi kapeampi
- **Tuotejono ja nykyisen tuotteen kontrollit: OVERLAY videon päällä/alla**, ei omana isona laatikkonaan joka vie tilaa videolta. Esim. ohut pikatoimintopalkki videon alaosan päällä (puoliläpinäkyvä tausta), tuotejono pienenä liukuvana listana jonka saa auki/kiinni, ei aina auki isona pysyvänä laatikkona.
- **Yläpalkki (kesto/katsojat/myynti):** ohut rivi videon YLÄPUOLELLA overlayna, ei erillinen iso laatikko

### Mobiili (jo LUKITTU aiemmin, pätee edelleen)
Video täyttää koko ruudun, kaikki muu overlay-tyylisesti sen päällä, ei sivupaneeleita ollenkaan. Sama täysnäkymä-periaate kuin desktopilla, vain vielä tiukempana koska tilaa on vähemmän.

### Sisältö (mikä paneeleissa on, tämä osa oli jo oikein aiemmin — ei muutu)
- **Tuotejono:** raahattava lista, "Lisää tuote" -nappi
- **Nykyinen tuote:** kuva, nimi, huuto, aikalaskuri, pikatoiminnot (+10s, Kiinnitä, Myyty, Seuraava, Aloita giveaway, Lopeta lähetys)
- **Chat:** viestivirta + ostohälytykset upotettuna (esim. "joonas osti Gengar TG06" vihreällä) + moderointitoiminnot (ks. "Chat & moderointi" -osio)

### Väri
Sivuston oma tumma teema, `C.xxx`-värit — ei muutu.

## Live-lähetyksen esikatselu ennen julkista näkyvyyttä — ✅ TEHTY 2026-08-08

Havaittu testauksessa 2026-08-07: myyjä ei päässyt testaamaan OBS-yhteyttä/kameraa ennen kuin painoi "Mene liveen" — mutta se teki striimin heti julkisesti näkyväksi kaikille.

**Toteutettu ja tuotannossa vahvistettu:**
- RTMP-palvelin + pysyvä stream key + "Generoi uusi avain" näkyvät heti sivulle tultaessa, ennen kuin mitään on luotu
- Lähetyksen luonti ei enää tee siitä julkista — pysyy `SCHEDULED`-tilassa, myyjä näkee oikean OBS-lähdön yksityisenä esikatseluna (oikea hls.js-toistin, ei paikallinen webkamera)
- `on_publish`-webhook ei enää automaattisesti julkaise lähetystä OBS:n yhdistyessä — vain eksplisiittinen "Aloita julkinen lähetys" -painike tekee sen
- Testattu tuotannossa oikealla RTMP-yhteydellä: status pysyi `SCHEDULED` koko testipublikoinnin ajan, manuaalinen julkaisu/lopetus toimivat oikein

### Huomio yksityisyydestä testausvaiheessa (yhä relevantti)
Vaikka `status` on yhä `SCHEDULED`, HLS-tiedostot alkavat teknisesti syntyä palvelimelle heti kun OBS yhdistää — tekninen raakavideo-URL (`https://stream.skrm.fi/hls/{streamKey}.m3u8`) on siis olemassa ja periaatteessa saavutettavissa jos joku arvaisi/saisi tarkan URL:n, vaikka sitä ei näytetä julkisella sivulla ennen `LIVE`-statusta. Koska `streamKey` on 32-merkkinen satunnainen hex-merkkijono, tämä on käytännössä turvallinen "security through obscurity" -taso MVP:lle — ei täydellinen yksityisyys, mutta riittävä nyt. Täydellisempi ratkaisu (esim. token-suojattu HLS-pääsy) voidaan harkita myöhemmin jos tarve ilmenee.

## Työskentelytapa — huom VS Coden Claudelle (lisätty 2026-08-07 väärinkäsityksen jälkeen)

Tätä projektia kehitetään **kahdessa rinnakkaisessa kanavassa**, molemmat saman ihmisen (Johanin) ohjaamina:
1. **VS Code / Claude Code** — tavallinen koodityö tässä repossa
2. **Erillinen Claude.ai-keskustelu** — suunnittelu, päätökset, ja **myös suoraan ajetut terminaalikomennot Hetzner-palvelimelle** (Johan liittää terminaalin tulosteen chattiin, saa seuraavan komennon, kopioi sen omaan SSH-istuntoonsa)

Tämä tarkoittaa: **palvelin, tietokanta, nginx-konfiguraatio ja CLAUDE.md itse voivat muuttua ilman että VS Coden Claude on tehnyt sitä** — ei kyse ulkopuolisesta toimijasta tai turvallisuusuhkasta, vaan Johanista joka työskentelee kahdella eri kanavalla saman projektin parissa. Jos näet muutoksia joita et tee muistaakseen tehneesi (esim. uusi git-commit, palvelimen tila muuttunut, nginx-konfiguraatio toisenlainen kuin viimeksi), tarkista ensin tilanne Johanilta ennen kuin oletat jotain vialliseksi — todennäköisin selitys on tämä rinnakkainen kanava, ei bugi tai tunkeutuja.

Koko Hetzner-migraatio (2026-08-07, ks. "Hetzner — KOKO PROJEKTI SIIRRETTY" -osio) tehtiin juuri tällä tavalla — suoraan Claude.ai-keskustelussa annetuin komennoin, ei VS Coden Claude Codella.

## Kategoriafokus: Keräilykortit ainoana (PÄÄTETTY — palautettavissa)

Mahdolliselta yhteistyökumppanilta tuli selkeä palaute: keskitytään aluksi pelkästään keräilykortteihin, muut 13 kategoriaa pois näkyvistä. **Tämä on tietoisesti pidetty helposti peruutettavana** — jos yhteistyö ei etene, palataan takaisin kaikkiin 14 kategoriaan ilman koodiarkeologiaa.

### Periaate: älä poista mitään, piilota yhdellä kytkimellä
- LUKITTU "14 kategoriaa" -sääntö ja `kategoriat.ts`:n koko sisältö **pysyvät koskemattomina** tietokannassa ja koodissa — tämä on vain UI-tason rajaus päälle, ei rakenteellinen muutos
- Toteutus: yksi selkeä config-vakio (esim. `frontend/lib/config.ts`: `AKTIIVISET_KATEGORIAT = ['kerailykortit']`), jota kaikki alla olevat kohdat lukevat
- Kun/jos halutaan palata kaikkiin kategorioihin: poista/tyhjennä tämä yksi vakio, ei tarvitse käydä läpi jokaista sivua erikseen

### Mitä piilotetaan (kaikki, kun `AKTIIVISET_KATEGORIAT` on asetettu)
- Navbar / etusivun kategorialistaus — näytä vain keräilykortit (ja sen ala-/tyyppikategoriat, ks. alla)
- Selaa-, Huutokaupat- ja Live-sivujen `CategorySidebar`/kategoriasuodattimet — muut 13 pois listasta kokonaan (ei vain harmaana/disabloituna)
- Dashboard/Tuotteet-lomake (uuden tuotteen lisäys) — kategoriavalinnassa vain keräilykortit
- Meista-sivun "14 kategoriaa" -tilastokortti — **harhaanjohtava juuri nyt**. Piilota tämä tilastokortti kokonaan focus-tilan ajaksi (älä vaihda lukua 14→1, koska 14 on yhä tekninen totuus taustalla — piilotus on siistimpi kuin väärä luku)

### Mitä EI tehdä
- Ei poisteta mitään tietokannasta tai `kategoriat.ts`:stä
- Ei muuteta LUKITTU "14 kategoriaa" -sääntöä — se kuvaa yhä alustan täyttä kapasiteettia, ei nykyistä julkista tarjontaa

### Keräilykorttien uusi kolmitasoinen rakenne (PÄÄTETTY, tarkennettu 2026-08-07 — korvaa aiemman tasoisen alakategorialistan)

Yhteistyökumppanin palautteen mukaan Keräilykortit tarvitsee kolme tasoa, ei kahta: **Kategoria → Peli → Tyyppi**. Nykyinen `alakategoriat`-lista (Pokémon/Magic/Yu-Gi-Oh/Lorcana/One Piece/Urheilukortit/Tarvikkeet/Muut kortit) on tasainen yhden tason lista — pelit ja "Tarvikkeet"/"Muut kortit" ovat samalla tasolla keskenään. Uusi rakenne pitää pelit omana tasonaan, ja jokaisella pelillä on omat tyyppinsä.

**⚠️ Tämä vaatii oikean tietokantamuutoksen**, ei pelkkää `kategoriat.ts`:n listan muokkausta — nykyinen `Product`-malli tukee vain kahta tasoa (`category` + `alakategoria`).

**Rakenne:**
```
Keräilykortit (category, muuttumaton)
  ├─ Pokémon (peli / alakategoria)
  │    ├─ Släbit
  │    ├─ Sealed
  │    ├─ Irtokortit
  │    ├─ Tarvikkeet
  │    └─ Muu Pokémon
  ├─ Magic: The Gathering (peli)
  │    ├─ Släbit / Sealed / Irtokortit / Tarvikkeet / Muu Magic  (sama tyyppisetti toistuu joka pelillä)
  ├─ Yu-Gi-Oh!
  │    └─ (sama tyyppisetti)
  ├─ Lorcana, One Piece, Urheilukortit
  │    └─ (sama tyyppisetti)
  └─ Muut keräilytuotteet  (uusi "peli"-tason kohta — esim. sarjakuvat ja muu ei-korttikeräily, jotta koko erillistä "Muut"-yläkategoriaa ei tarvitse pitää näkyvissä category-focus-tilan aikana)
       └─ (sama tyyppisetti, tai kevyempi ilman kolmatta tasoa — päätettävissä toteutuksessa)
```

**Oletus tehty puolestasi (korjaa jos väärin):** "muut keräilytuotteet, esim. sarjakuvat" -kysymys ratkaistu lisäämällä se omana "peli"-tason kohtana Keräilykorttien sisään, sen sijaan että koko top-level "Muut"-kategoria (14. LUKITTU kategoria) pidettäisiin näkyvissä category-focus-tilan aikana. Tämä pitää julkisen näkymän siistinä (vain yksi ylätason kategoria näkyvissä).

**Toteutus:**
1. `Product`-malliin uusi kenttä, esim. `tyyppi String?` (kolmas taso — `category` = Keräilykortit, `alakategoria` = peli, `tyyppi` = Släbit/Sealed/jne). Prisma migration.
2. `kategoriat.ts`: Keräilykorttien `alakategoriat`-lista pysyy pelilistana (Pokémon/Magic/jne + uusi "Muut keräilytuotteet"), mutta jokainen peli-objekti saa uuden `tyypit`-taulukon: `[{id: 'slabit', nimi: {fi: 'Släbit', en: 'Slabs'}}, {id: 'sealed', ...}, {id: 'irtokortit', ...}, {id: 'tarvikkeet', ...}, {id: 'muu-' + peliId, nimi: {fi: 'Muu ' + peli, en: 'Other ' + peli}}]`
3. Dashboard/Tuotteet-lomake: kolmas pudotusvalikko (Tyyppi) ilmestyy kun peli on valittu, samalla ehdollisella logiikalla kuin nyt kategoria→alakategoria toimii
4. Selaa-/Huutokaupat-/Live-sivujen `CategorySidebar`: laajennettava tukemaan kolmatta tasoa (peli valittuna → näytä sen tyypit suodattimena)
5. Backend: tuotteen luonti/muokkaus- ja hakureitit hyväksymään ja suodattamaan uudella `tyyppi`-kentällä

## Tarjoa hintaa — suoramyyntiin (SUUNNITELTU — päätetty, valmis toteutettavaksi)

Vinted-tyylinen "Tarjoa hintaa" -toiminto, mutta **vain suoramyyntituotteille** (`saleType: "suora"`). Ei koske huutokauppaa tai livejä — niissä tarjoaminen tapahtuu jo huutamalla, tarjousmekanismi ei ole tarpeen eikä toivottu (sekoittaisi huutokauppalogiikkaa).

### Malli (uusi, Prisma)
```
model Offer {
  id         String      @id @default(cuid())
  productId  String
  product    Product     @relation(fields: [productId], references: [id])
  buyerId    String
  buyer      User        @relation(fields: [buyerId], references: [id])
  amount     Float
  status     String      @default("pending") // "pending" | "accepted" | "declined" | "countered" | "expired"
  counterAmount Float?   // myyjän vastatarjous, jos status = "countered"
  createdAt  DateTime    @default(now())
  respondedAt DateTime?
}
```

### Toimintalogiikka
- Ostaja näkee tuotesivulla "Tarjoa hintaa" -napin (vain `saleType: "suora"` tuotteille), syöttää summan → luo `Offer`-rivin, tila `pending`
- Myyjä saa ilmoituksen (uusi `NotificationType`: `OFFER_RECEIVED`), näkee tarjouksen dashboardissa, voi:
  - **Hyväksyä** → tarjous muuttuu tavalliseksi tilaukseksi samalla logiikalla kuin "Osta heti" (2h maksuaika alkaa hyväksynnästä, ei tarjouksen jättöhetkestä), muut samaan tuotteeseen tehdyt avoimet tarjoukset asetetaan automaattisesti `declined`-tilaan ja niiden tekijät saavat ilmoituksen
  - **Hylätä** → `declined`, ostaja saa ilmoituksen (`OFFER_DECLINED`)
  - **Tehdä vastatarjouksen** → `countered` + `counterAmount`, ostaja saa ilmoituksen (`OFFER_COUNTERED`) ja voi hyväksyä/hylätä/tehdä uuden tarjouksen
- **Tarjouksen vanhentuminen:** jos myyjä ei reagoi 48h sisällä (sama aikaikkuna kuin lähetysajassa, looginen yhdenmukaisuus), tarjous vanhenee automaattisesti tilaan `expired` — ei jää roikkumaan ikuisesti
- Useampi ostaja voi tehdä tarjouksen samaan tuotteeseen samanaikaisesti — ensimmäinen jonka myyjä hyväksyy voittaa, loput perutaan automaattisesti (ks. yllä)

### Uudet NotificationType-arvot
`OFFER_RECEIVED`, `OFFER_ACCEPTED`, `OFFER_DECLINED`, `OFFER_COUNTERED`

### UI-tarpeet
- Tuotesivu: "Tarjoa hintaa" -nappi + syöttökenttä (vain suoramyynti)
- Dashboard: uusi näkymä/välilehti saapuneille tarjouksille, Hyväksy/Hylkää/Vastatarjous-toiminnot
- Ostajan puolella: oma tarjoushistoria (esim. "Ostot"-osiossa tai omana "Tarjoukseni"-näkymänä) jossa näkyy tila (odottaa/hyväksytty/hylätty/vastatarjous)

## Settilistaus / Variantit (SUUNNITELTU — isompi ominaisuus, MVP-rajaus päätetty, tarkennettu 2026-08-07)

Idea: myyjällä on esim. 1000 kortin erä samasta setistä (esim. Pokémon Surging Sparks). Sen sijaan että jokainen kortti olisi oma erillinen tuote-rivi, myyjä listaa **yhden "settilistauksen"**, ja ostaja valitsee sieltä yhden tai useamman yksittäisen kortin dropdownista/hakukentästä ostoskoriin. Tavoitteena Cardmarket-tyylinen "massasyöttö" (klikkaa checklististä kortti, syötä lukumäärä/hinta) — mutta parempi UX.

**Rehellinen arvio:** ei liian monimutkainen, mutta on aidosti isompi rakenteellinen lisäys — uusi varianttimalli nykyisen "yksi tuote = yksi rivi" -mallin päälle. Sopii erinomaisesti kategoriafokuksen (Keräilykortit) ja sen kolmitasoisen rakenteen kanssa (`tyyppi: "Irtokortit"` on luonnollinen paikka tälle). Kun kaikki muu (streamaus, admin, storefront, kategoriafokus) toimii ensin, tämä on todennäköisesti aidosti erottautumistekijä yhteisölle.

**Ei per-kortti-kuvia** — päätetty. Ostaja tietää yleisesti miltä kortti näyttää setin/pelin perusteella, yksi kuva koko settilistaukselle riittää.

### Rakenneratkaisu: jaettu checklist-katalogi (ei jokainen myyjä kirjoita samaa listaa erikseen)
Jotta klikattava checklist ylipäätään toimii ilman että jokainen myyjä syöttää 1000 kortin nimeä käsin uudestaan, checklist rakennetaan **kerran per setti** ja kaikki myyjät jotka myyvät samaa settiä käyttävät samaa jaettua listaa — täyttävät vain omat lukumääränsä/hintansa siihen päälle. Tämä myös pitää korttien nimet yhtenäisinä koko alustalla (parempi haku ostajalle yli myyjärajojen).

### Mallit (uusi, Prisma)
```
model CardSet {
  id       String          @id @default(cuid())
  game     String          // esim. "pokemon" — vastaa kategoriat.ts:n peli-id:tä
  name     String          // esim. "Surging Sparks"
  entries  CardSetEntry[]
  createdAt DateTime       @default(now())
}

model CardSetEntry {
  id         String   @id @default(cuid())
  cardSetId  String
  cardSet    CardSet  @relation(fields: [cardSetId], references: [id])
  cardName   String   // esim. "Pikachu ex"
  cardNumber String?  // esim. "#238"
  order      Int      @default(0)  // checklistin näyttöjärjestys
}

model ProductVariant {
  id             String        @id @default(cuid())
  productId      String
  product        Product       @relation(fields: [productId], references: [id])
  cardSetEntryId String?       // viittaus jaettuun checklistiin, jos setti on olemassa katalogissa
  cardSetEntry   CardSetEntry? @relation(fields: [cardSetEntryId], references: [id])
  cardName       String        // kopio nimestä (toimii myös ilman cardSetEntryId:tä, esim. harvinaisemmat setit)
  price          Float
  quantity       Int           @default(1)
  condition      String?
  createdAt      DateTime      @default(now())
}
```
- `CartItem` ja `OrderItem`: uusi valinnainen `variantId String?` + relaatio `ProductVariant`iin — nullable, tavalliset tuotteet toimivat ennallaan

### Checklistin täyttö — kaksi tapaa, molemmat päätetty tukea
1. **Massasyöttö (ensisijainen, Cardmarket-tyylinen mutta parempi):** myyjä valitsee olemassa olevan `CardSet`in (esim. "Surging Sparks"), näkee koko checklistin taulukkona, syöttää lukumäärän + hinnan suoraan riville jokaisen kortin kohdalle jota myy (tyhjä/0 = ei myynnissä). Nopea, ei kirjoitusvirheitä, koska nimet tulevat valmiiksi katalogista.
2. **CSV-tuonti / manuaalinen rivilomake:** jos settiä ei vielä ole katalogissa, tai kyseessä on harvinaisempi/pienempi erä — myyjä syöttää kortin nimi+hinta+määrä itse, joko CSV:llä tai rivi kerrallaan. Nämä eivät automaattisesti liity mihinkään `CardSetEntry`iin (`cardSetEntryId` jää tyhjäksi), toimivat silti normaalisti.

### Checklist-katalogin ylläpito
- **Ei ulkoista korttitietokanta-APIa v1:ssä** — päätetty aiemmin, pysyy voimassa. Checklistit rakennetaan/seedataan käsin (esim. kertaluontoinen CSV-tuonti adminin toimesta) suosituille seteille (esim. Surging Sparks) kysynnän mukaan
- Kun myyjä syöttää uuden setin manuaalisesti (tapa 2) ja se osoittautuu suosituksi, se voidaan myöhemmin nostaa jaetuksi `CardSet`-katalogimerkinnäksi jälkikäteen — ei tarvitse päättää tätä prosessia vielä tarkasti

### Toimintalogiikka (ostaja + tilaus)
- Ostaja tuotesivulla: hakukenttä/lista näyttää saatavilla olevat kortit (`quantity > 0`), valitsee yhden tai useamman → "Lisää koriin", jokainen oma `CartItem` (`variantId` täytettynä)
- Varannon vähennys: ostettaessa `ProductVariant.quantity` vähenee, 0:ssa kortti ei enää näy ostettavissa
- **Yhdistetty lähetys toimii automaattisesti** — sama `sellerId` kaikilla saman settilistauksen varianteilla, olemassa oleva 6h-yhdistämislogiikka kattaa tämän jo, ei erillistä työtä

### Ilmoituksen luonti — kaksi erillistä polkua (tarkennettu 2026-08-07)
Kalliimmat/arvokkaammat yksittäiset kortit (esim. gradetut kortit, ASC/PSA-kortit) **eivät** mene settilistaukseen — ne pysyvät tavallisina yksittäisinä tuotteina omilla kuvillaan ja hinnoillaan, ihan kuten nytkin. Settilistaus on tarkoitettu nimenomaan bulkkierille (esim. 1000 kortin Surging Sparks -erä), ei arvokorteille.

Dashboard/Tuotteet "Lisää tuote" -aloitusnäkymään lisätään valinta heti alkuun:
- **"Yksittäinen tuote"** — nykyinen lomake muuttumattomana (kuva, nimi, hinta, kunto, jne.)
- **"Settilistaus"** — avaa erillisen näkymän: valitse `CardSet` katalogista (tai luo uusi manuaalisesti/CSV:llä) → massasyöttö-checklist täytettäväksi (ks. yllä)

### Haku yhdistää molemmat tyypit
Kun ostaja hakee esim. "Charizard ex", tulosten pitää näyttää **molemmat**:
1. Yksittäiset tuotteet joiden `Product.name` täsmää (nykyinen haku, ei muutosta)
2. Settilistaukset joissa on `ProductVariant.cardName` täsmäävä ja `quantity > 0` — tulos linkkaa settilistauksen tuotesivulle, ihanteellisesti korostaen/scrollaten suoraan siihen korttiin checklistissä, tai ainakin näyttäen hakutuloksessa selvästi "X kpl saatavilla [Myyjän nimi]:n Surging Sparks -erästä"
- Backend-haku laajennettava hakemaan myös `ProductVariant.cardName`-kentästä `Product.name`:n lisäksi, tulokset yhdistettävä yhdeksi listaksi mutta selvästi eroteltavissa tyypin mukaan (esim. pieni badge "Settilistaus" hakutuloskortissa)

Pohjautuu Whatnot-vertailuun. Neljä ominaisuutta päätetty, muodostavat yhdessä kokonaisuuden: julkinen myyjäprofiili on se paikka josta ostaja löytää tulevat huutokaupat ja jättää ennakkotarjouksia.

**⚠️ Huom, ei oteta käyttöön Whatnotilta:** "Swipe to Bid/Buy" ja "Auto-Authorize" (automaattinen kortilta veloitus heti voiton jälkeen) — ristiriidassa LUKITTU-sääntöjen kanssa (ei pakollista kortintallennusta, 2h maksuaika, ostaja valitsee maksutavan). Ei myöskään Stripe — Paytrail on jo LUKITTU.

### 1. ✅ TEHTY 2026-08-16 — Ennakkotarjoukset (Pre-bidding)
- Koskee **vain huutokauppatyyppisiä tuotteita**: perinteinen huutokauppa (`saleType: "auction"`) ja live-tuotteet jotka kuuluvat vielä `SCHEDULED`-tilassa olevaan Show'hun. Ei suoramyyntiin (`saleType: "suora"`), koska siellä ei ole huutamista.
- Tekninen pohja on jo olemassa: `Bid`-mallissa `showId` on jo nullable ("null perinteisen huutokaupan huudoille"), eli malli tukee jo huutoja jotka eivät liity käynnissä olevaan liveen.
- Toteutus: salli huudon jättäminen tuotteelle jonka `Show.status === 'SCHEDULED'` (nyt oletettavasti sallitaan huudot vain kun `status === 'LIVE'` — tarkista ja avaa tämä ehto scheduled-tuotteille). Kun show alkaa, korkein ennakkotarjous on jo `Product.currentBid`, live jatkuu siitä normaalisti.
- Ilmoita huutaneelle jos hänet ohitetaan ennakkovaiheessa (käytä olemassa olevaa `OUTBID`-ilmoitustyyppiä).

**Toteutus (huom: koskee vain `saleType: "live"`/`"both"` + `SCHEDULED`-showia — perinteinen huutokauppa `saleType: "auction"` tuki tätä jo ennestään `auctions.ts`:n kautta, ei vaatinut muutosta):**
- Uusi `POST /products/:id/prebid` (`backend/src/routes/products.ts`) — samat validoinnit kuin `auctions.ts`:n huutoreitillä (minimikorotus, ei omaan tuotteeseen, bannaus estää), mutta vaatii lisäksi `product.show.status === 'SCHEDULED'`. Persistoi samoihin `Product.currentBid`/`currentBidderId`-kenttiin joita perinteinen huutokauppa jo käyttää — ei uusia kenttiä, ei migraatiota.
- `GET /products/:id` palauttaa nyt myös `show`-relaation (`status` mukana, jotta frontend tietää onko tuote ennakkotarjottavissa) ja `bids`/`_count` samalla periaatteella kuin `GET /auctions/:id`.
- **Kriittinen jatko:** `socket.ts`:n `start_auction` tarkisti aiemmin AINA vain lähtöhinnan, ei koskaan `Product.currentBid`:ia — jos tätä ei olisi korjattu, ensimmäinen ennakkotarjoaja olisi hiljaisesti menettänyt tarjouksensa kun myyjä aloittaa livehuudon (huutokauppa olisi alkanut nollasta, ei ennakkotarjouksesta). Korjattu: hakee tuotteen `currentBid`/`currentBidderId`:n ja jatkaa siitä jos korkeampi kuin lähtöhinta, hakee myös johtavan tarjoajan käyttäjänimen. `auction_started`-tapahtuma välittää nyt `leaderId`/`leaderName` heti, molemmat frontendit (`/lahetys` + `/live/[showId]`) päivitetty näyttämään tämä heti eikä vasta seuraavassa huudossa.
- Frontend: `frontend/app/tuotteet/[id]/page.tsx` — aiempi kiinteä "Tämä tuote myydään live-lähetyksessä" -teksti korvattu oikealla tarjouslomakkeella kun `isPreBiddable` (korkein tarjous, tarjousmäärä, syöttökenttä, "Jätä tarjous"). `saleType: "both"` näyttää sekä Osta heti- että ennakkotarjous-osion päällekkäin.
- **Testattu tuotannossa curlilla end-to-end** (kaksi tilapäistä testitiliä, siivottu pois testin jälkeen samalla transaktiopohjaisella periaatteella kuin testi/testi2-poisto): liian pieni tarjous hylätään oikealla minimihinnalla, kelvollinen tarjous päivittää `currentBid`/`currentBidderId`/`_count.bids` oikein, myyjä ei voi tarjota omasta tuotteestaan, tarjous evätään heti kun show siirtyy `LIVE`-tilaan.
- **Ei vielä testattu:** `start_auction`-jatko oikealla socket-yhteydellä (vaatisi täyden OBS/selainjulkaisu-simulaation) — koodi tarkistettu lukemalla, looginen ketju on suora jatko jo vahvistetusta REST-puolesta, mutta ei kertaakaan ajettu läpi oikealla live-huudolla.

### 2. Chat & moderointi — laajennettu speksi (tutkittu Whatnotilta, tarkennettu 2026-08-08, korvaa aiemman suppean version)

**Perustoiminnot:**
- Reaaliaikainen viestien lähetys, @-maininnat (autocomplete käyttäjänimestä kirjoittaessa), mainitulle käyttäjälle ilmoitus — rajoita mainintojen/ilmoitusten määrää spämmin estämiseksi
- Chat toimii osana yhtä livea, katsojat keskustelevat keskenään ja myyjän kanssa

**Myyjän/moderaattorin toiminnot (klikkaa käyttäjää chatissa avataksesi hallintatoiminnot):**
- Tee käyttäjästä moderaattori / poista moderaattorin oikeudet — voidaan tehdä sekä ennen liveä että kesken sen
- **Poista liven ajaksi** ("Remove from Show") vs. **Estä/Banni** — nämä ovat eri tasoisia, tärkeä ero: poistettu käyttäjä ei voi chatata/huutaa/liittyä takaisin siihen yhteen liveen, mutta ei ole sivustonlaajuisesti bannattu. Sivustonlaajuinen banni on eri, jo olemassa oleva `Ban`-mekanismi.
- Moderaattori voi: poistaa käyttäjän livestä, nähdä mutetut viestit (katsojat eivät näe), valvoa keskustelua, poistaa sopimattomia viestejä, vastata kysymyksiin

**Suodattimet/mute:**
- Chat-välilehdet: **Kysymykset / Ostajat / Moderaattorit / Mutetut** — kysymykset korostetaan omana kategorianaan
- **"Muted Words"** — myyjä määrittää kiellettyjä sanoja, viestit joissa niitä esiintyy piilotetaan normaalilta yleisöltä mutta moderaattorit näkevät ne yhä

**Kiinnitetty kommentti (uusi idea, havaittu kilpailijan streamilla 2026-08-10) — ei vielä päätetty toteutukseen:**
Myyjä voi kiinnittää yhden chat-viestin/kommentin pysyvästi näkyviin chatin yläreunaan (esim. linkki Cardmarket-hintavertailuun, tai muu tärkeä tieto jonka halutaan pysyvän esillä koko liven ajan). **Huom, tämä on eri asia kuin "Kiinnitä"-pikatoiminto stream-konsolissa** (joka kiinnittää nykyisen *tuotteen* näkyviin, ks. "Live-ominaisuudet Whatnot-tasolle" -osio) — tässä kiinnitetään *chat-viesti*, ei tuote. Pidä nämä kaksi selvästi erillään nimeämisessä ja toteutuksessa ettei synny sekaannusta.

### Kilpailijahavainto (Popify.fi, kuvakaappaus 2026-08-10) — vahvistaa/täydentää jo suunniteltuja ominaisuuksia
- **Kiinnitetty kommentti nähty käytännössä:** myyjän ("wasacards", sinisellä varmennusmerkillä) viesti pysyy kiinnitettynä chatin alaosassa, visuaalisesti erotettu (vaalea tausta) tavallisista viesteistä, aina näkyvissä syöttökentän yläpuolella. Vahvistaa yllä olevan "Kiinnitetty kommentti" -idean toteutuskelpoisuuden.
- **Ennakkotarjous-napin tekstimalli hyvä referenssi:** "Ennakko-huuto · alkaen [hinta]€" — selkeä, kertoo sekä toiminnon että lähtöhinnan yhdellä silmäyksellä. Tuotelistan otsikossa lisäksi selittävä teksti "Ennakkohuuda kaupassa · Huuda livenä kortilla" joka opastaa käyttäjää kahdesta eri tavasta osallistua. Hyödynnä tätä kun toteutetaan "Ennakkotarjoukset"-ominaisuus (ks. "Live-ominaisuudet Whatnot-tasolle" -osion kohta 1).
- **Toimituskulut näkyvät suoraan tuotelistassa per tuote** (esim. "Toimitus 7,96€") — läpinäkyvä, ostaja näkee kokonaishinnan jo selatessaan ilman että pitää avata tuote erikseen. Harkittava lisäys omaan tuotelistaukseen.

**Chat-komennot (harkittava kevyempänä tulevaisuuden lisäyksenä, ei kriittinen v1:ssä):**
- `/announce viesti` — nostaa viestin näkyvästi esiin
- `/hide viesti` — näkyy vain myyjälle ja moderaattoreille (hyödyllinen kulissien takaiseen koordinointiin kesken liven)
- `/slow 5` — asettaa chattiin 5s cooldownin viestien välille
- `/raid käyttäjänimi` — liven lopussa yleisö ohjataan toiseen liveen (tämä on sama konsepti kuin aiemmin Whatnot-vertailussa mainittu "Raidit"-ominaisuus)

**Katsojalista (Viewer list):**
- **Watching**-välilehti: kaikki katsojat, ystävät, host+moderaattorit, top-ostajat
- **Activity**-välilehti: raidit, uudet seuraajat, tipit, huutokauppavoitot, ostot
- Käyttäjän vieressä @-nappi tägätäksesi suoraan chattiin

**Co-host (erillinen ominaisuus, liittyy käyttäjienhallintaan):**
- Myyjä voi kutsua yhden käyttäjän co-hostiksi — tulee mukaan omalla video/äänisyötteellään, näkyy videolla, voi puhua/chattailla/esitellä tuotteita
- Co-host ei hallitse itse liveä (ei voi aloittaa/lopettaa, ei pääsyä myyjän omaan konsoliin)

**Toteutusprioriteetti:** perustoiminnot (mod-status, remove-from-show, muted words, viewer list) ensin. Chat-komennot ja co-host ovat pienemmän prioriteetin lisäyksiä, voidaan tehdä myöhemmin erikseen.

### Katsojan Shop-paneeli livessä — PÄÄTETTY 2026-08-08 (mobiilikäyttäytyminen nyt vahvistettu)
Whatnotilla katsojalla on oma selauspaneeli livessä: haku, suodattimet (**Filter / Sort / Auction / Buy Now**), tuotelista jossa jokaisella tuotteella oma "Pre-bid"/"Buy Now" -nappi.

**Mobiilikäyttäytyminen vahvistettu (screenshotein 2026-08-08):**
- Mobiilissa Shop **ei ole kiinteä sivupaneeli** (kuten desktopilla) vaan **täysruudun overlay/modaali** joka liukuu esiin "Shop"-napista
- Kun Shop avataan, itse live-video **pienenee automaattisesti pieneksi picture-in-picture-ikkunaksi** ruudun kulmaan (ei katoa, jatkaa toistoa pienenä) — käyttäjä ei menetä yhteyttä liveen vaikka selaa tuotteita
- Sama PiP-käytös toistuu kun käyttäjä painaa pientä alanuolta palatakseen etusivun selaukseen kesken liven — video jää pieneksi kelluvaksi ikkunaksi ruudun kulmaan, voi sulkea sen X:llä tai jatkaa selailua sen kanssa auki

**Päätös SKRM:lle:** toteutetaan samalla periaatteella — mobiilissa Shop-paneeli täysruudun overlaina, live-video pienenee PiP:ksi kun se avataan. Tämä ratkaisee myös aiemman "video ei saa koskaan kadota näkyvistä" -tyyppisen huolen elegantisti.

### Muita mobiilista havaittuja UI-kuvioita (talteen, ei vielä priorisoitu toteutukseen)
- **"More"-valikko** kokoaa harvemmin käytetyt toiminnot piiloon (esim. Report, Sound/äänenhallinta) — pitää pääruudun siistinä, ei tungeta kaikkea kerralla näkyviin
- **Maksutiedot kysytään vasta ensimmäisen huudon/oston yhteydessä**, ei etukäteen pakotettuna — huom, tämä eroaa SKRM:n mallista jossa korttia ei vaadita pakolliseksi ollenkaan (LUKITTU sääntö), joten tätä ei kopioida suoraan, mutta ajoitusperiaate (kysy vasta kun oikeasti tarvitaan, ei etukäteen) on hyvä yleinen UX-periaate
- Giveaway-osallistujamäärä näkyy pienenä laskurina videon oikeassa yläkulmassa koko ajan kun giveaway on käynnissä

### Sivun layout-periaate — kiinteä runko (LUKITTU, täydentää "Mobiilin live-näkymä" -osiota)
Havaittu Whatnotilta: koko live-sivun runko (video, tuotelaatikko, chat-laatikko) **pysyy kiinteän kokoisena ja paikallaan riippumatta selainikkunan koosta** — ei koskaan tarvitse scrollata koko sivua ylös/alas nähdäkseen kaiken. **Ainoastaan chatin sisältö scrollaa oman laatikkonsa sisällä**, video/tuotelaatikko eivät liiku. Tämä koskee sekä desktopia (ikkunan koon muutos) että mobiilia (jo LUKITTU "Mobiilin live-näkymä" -osiossa) — sama periaate, molemmat muodot.

### 3. Giveaway / Onnenpyörä — Vaihtoehto A (avainsana-ilmoittautuminen)
Päätetty: avainsana-malli, ei läsnäoloseurantaa (yksinkertaisempi rakentaa, ei vaadi reaaliaikaista "kuka on juuri nyt paikalla" -logiikkaa).

Kulku:
1. Myyjä painaa "Aloita giveaway" livenäkymässä → syöttää avainsanan (tai järjestelmä generoi) → Socket.io lähettää kaikille katsojille ilmoituksen "Kirjoita AVAINSANA chattiin osallistuaksesi!"
2. Järjestelmä kerää kaikki chat-viestit jotka sisältävät tarkalleen avainsanan sinä aikana → poistaa duplikaatit (yksi osallistuminen per käyttäjä) → muodostaa poolin
3. Myyjä painaa "Sulje & arvo" → pyörä-animaatio (frontend) arpoo satunnaisen voittajan poolista (esim. `Math.random()`-pohjainen valinta, ei tarvitse kryptografisesti turvallista satunnaisuutta tähän)
4. Voittaja näkyy kaikille + ilmoitus voittajalle (uusi `NotificationType`, esim. `GIVEAWAY_WON`)
- Ei tarvitse omaa tietokantamallia välttämättä ensimmäisessä versiossa — voi toimia puhtaasti Socket.io-tilassa (in-memory) yhden liven ajan, koska giveaway on kertaluund kulutustapahtuma eikä vaadi pysyvää historiaa (voidaan lisätä myöhemmin jos halutaan tilastoida).

### 4. ✅ TEHTY (2026-08-07) — Julkinen myyjäprofiili (Storefront)
**Poikkeama spesifikaatiosta (perusteltu):** spesifikaatio olettaa ettei julkista profiilisivua ole ja ehdottaa uutta reittiä `/myyja/[username]`. Todellisuudessa `frontend/app/u/[username]/page.tsx` on jo olemassa ja tekee suurimman osan tästä (tuotteet, arvostelut, seuraa/viesti/ilmianna) — uuden rinnakkaisen reitin luominen olisi luonut kaksi URL:ia samalle konseptille. Sen sijaan laajennettu olemassa olevaa `/u/[username]`-sivua puuttuvilla osilla.

**Lisätyt puuttuvat osat:**
- **Lomamoodi ei ollut edes olemassa palvelinpuolella** — se oli pelkkä `localStorage`-tila (`skrm_vacation`-avain `dashboard/profiili/page.tsx`:ssä), näkyi vain myyjälle itselleen samalla selaimella, ei koskaan kenellekään muulle. Tämä oli spesifikaation virheellinen oletus ("Profiilimallissa jo olemassa") — ei ollut. Lisätty oikeasti: `User.vacationUntil DateTime?` + `User.vacationMessage String?` schemaan, `PATCH /users/me` tallentaa (eksplisiittinen `null`-tuki pois päältä kytkemiseen), `GET /users/:username` palauttaa `onVacation`/`vacationUntil`/`vacationMessage` julkisesti. `dashboard/profiili/page.tsx` kirjoitettu uudelleen käyttämään backendiä localStoragen sijaan (lomapäivämäärä nyt pakollinen kun laittaa päälle, koska yhden nullable-kentän varaan ei voi rakentaa erillistä "päällä ilman päättymispäivää" -tilaa siististi).
- **Tulevat ajastetut livet + aktiiviset huutokaupat, korostettuna** — `GET /users/:username` palauttaa nyt myös `upcomingShows` (SCHEDULED-tilaiset) ja `activeAuctions` (saleType auction, ei vielä päättynyt) kyseiseltä myyjältä. `/u/[username]`-sivulla oma korostettu (accent-reunus) osio ennen tavallista tuotelistaa — juuri tämä on ennakkotarjousten edellytys (kohta 1), koska muuten ostaja ei löydä tulevia huutokauppoja ollenkaan.
- **Linkit myyjäprofiiliin tarkistettu:** tuotesivu (`/tuotteet/[id]`) ja huutokauppasivu (`/huutokauppa/[id]`) olivat jo linkitettyjä. Live-näkymässä (`/live/[showId]`) myyjän nimi/avatar EI ollut linkki kummassakaan (mobiili+desktop) — lisätty `Link`-wrapperi molempiin.
- Testattu curlilla end-to-end: lomamoodi päälle/pois vaikuttaa `onVacation`-kenttään oikein julkisessa profiilissa; `upcomingShows`/`activeAuctions` palauttavat oikeaa dataa. Sivut renderöityvät (`/u/[username]`, `/dashboard/profiili`, `/live/[showId]`) virheittä.

**Tekemättä / rajattu pois tarkoituksella:** "lomamoodi pidentää lähetysaikaa 7 päivään" -sääntöä ei ollut aiemmin valvottu koodissa mitenkään (ei 48h-lähetysdeadlinea backendissä ollenkaan, vain UI-tekstiä) — tämä on erillinen, jo olemassa oleva aukko joka ei liity tähän muutokseen, ei korjattu nyt.

### Kilpailijahavainto (Popify.fi, kuvakaappaukset 2026-08-12) — profiilisivu ja maksuvirtaus, vertailukohdaksi/parannettavaksi
Omistaja piti profiilisivun selkeydestä ja MobilePay-maksuvirtauksesta, tavoite "tähän ja vähän parempaan".

**Profiilisivun rakenne (vertaa `/u/[username]`-toteutukseen):**
- Nimi + @käyttäjätunnus + seuraajamäärä + "seurattavaa"-määrä + live-tilailmaisin ("On live-tilassa, katso liveä") heti kun myyjä striimaa
- Neljä nappia: Seuraa / Viesti / Jaa / Info
- Bio "Lue lisää" -laajennuksella (ei täyttä tekstiä heti auki)
- Kolme välilehteä: **Kauppa / Livet / Arvostelut**
- "Tulevat livet" -osio: kortit joissa päivä/kellonaika-badge kuvan päällä + kirjanmerkki/tallenna-ikoni oikeassa yläkulmassa — **tämä on hyvä lisä ennakkotarjous-osioon** (kohta 909 yllä) joka jo näyttää tulevat livet, mutta ei vielä bookmark/muistuta-toimintoa

**Maksuvirtaus — huom, tarkoituksellinen ero SKRM:n mallissa, ei kopioida sellaisenaan:**
- Popify pyytää maksutavan (Kortti/MobilePay) tallennettavaksi **ennen** kuin voi huutaa, selkeällä huomautuksella "Sinua ei veloiteta ennen kuin voitat huutokaupan tai painat Osta"
- **SKRM:n LUKITTU malli on tarkoituksella erilainen:** "Ei pakollista kortintallennusta" — ostaja valitsee maksutavan vasta voitettuaan, 2h maksuaika. Tätä eroa ei pidä hämärtää — Popifyn malli madaltaa kynnystä huutaa (kortti jo tallessa) mutta SKRM on tietoisesti valinnut matalamman kynnyksen osallistua ilman ennakkositoumusta.
- **MobilePay vahvistettu hyväksi maksutavaksi** — jo LUKITTU-listalla SKRM:n maksutapoihin, ei muutosta, mutta hyvä nähdä kilpailijan validoivan saman valinnan
- **MobilePay-UX-huomio Paytrail-integraatioon:** MobilePay toimii tyypillisesti push-ilmoituksella suoraan ostajan MobilePay-sovellukseen hyväksyttäväksi, ei kortinsyöttölomakkeen kautta — varmista Paytrail-integraatiota rakentaessa että tämä virtaus toteutuu oikein (ks. "3. Paytrail" -kohta Tekemättä-listassa)
- **Yhdistetty toimitus vahvistettu oikeaksi lähestymistavaksi:** Popify näyttää yhdistävän toimituskulut kun ostetaan useampi tuote samalta myyjältä — täsmää suoraan SKRM:n jo olemassa olevaan LUKITTU-sääntöön ("sama myyjä + 6h aikaikkuna = yksi tilaus, yksi postikulut"). Ei muutostarvetta, vahvistaa vain että sääntö on oikea/odotettu alan käytäntö.
- Erillinen "Maksutavat"-asetussivu (`popify.fi/buyer/payment-methods`) tallennettujen korttien/MobilePay-yhteyden hallintaan — SKRM:n mallissa tämä ei ole yhtä kriittinen koska kortti ei ole pakollinen etukäteen, mutta harkittavissa mukavuuslisäyksenä myöhemmin niille jotka haluavat tallentaa maksutavan nopeuttaakseen toistuvia ostoja

Koodaussääntö "Käännökset: Käytä AINA t.xxx — ei kovakoodattua suomea/englantia" ei toteutunut useassa paikassa. **✅ KORJATTU** — kaikki alla listatut tekstit siirretty `t.xxx`-järjestelmään (fi+en), admin-paneelin este on siis poistunut.

### Kovakoodatut suomenkieliset tekstit
- `frontend/app/huutokauppa/[id]/page.tsx`: "Päättyy", "Lähtöhinta"/"Korkein huuto", "Varaushinta ei ole vielä täyttynyt", "Toimitus & turvaaminen", "Myyjä sitoutuu lähettämään 48h sisällä", "Kaikki huudot sitovia", "Seurantakoodi toimitetaan ostajalle"
- `frontend/app/live-kaikki/page.tsx`: "Tulossa pian", "X lähetystä", "X katsojaa"
- `frontend/app/live/[showId]/page.tsx`: "Odotetaan lähetyksen alkua...", "LOT #X", "NYKYINEN", "Ei tuotteita jonossa", "katsojaa"
- `frontend/components/dashboard/DashboardLayoutClient.tsx`: koko dashboard-navi kovakoodattu — "Hallintapaneeli", "Tuotteet", "Lähetys", "Ostot", "Myynnit", "Tilitykset", "Profiili", "Kirjaudu ulos", "Välityspalkkio"
- `frontend/app/selaa/page.tsx`: saleTabs-labelit "Suoramyynti" ja "Huutokaupat" kovakoodattu (vain "Kaikki" käyttää `t.xxx`:ää)

Korjaus: siirrä kaikki yllä olevat tekstit `t.xxx`-käännösjärjestelmään (`frontend/lib/i18n/fi.ts` + `en.ts`), samalla tavalla kuin muu sivusto jo tekee. Tarkista molemmat kielet.

### Selaa-sivun saleType-kuplat — UX-kysymys, ei vielä päätetty
Navbarissa on jo ylätason navigointi Selaa/Huutokaupat/Live. Selaa-sivun sisällä on tämän lisäksi oma Kaikki/Suoramyynti/Huutokaupat-suodatin (`saleTabs`, rivit ~139–154). Käyttäjälle tämä voi näyttää turhalta kaksinkertaiselta jaottelulta. Ei toimenpidettä vielä — pohdittava erikseen poistetaanko vai selkeytetäänkö.

### Live-lähetyksen kategoria — tarkistettu, toimii koodissa
`frontend/app/dashboard/lahetys/page.tsx` (rivit ~286–289) sisältää jo "Kategoria"-pudotusvalikon lähetyksen luontilomakkeessa, ja `live-kaikki/page.tsx` suodattaa oikeasti sen mukaan. Jos tämä silti tuntui puuttuvan testatessa, kyse on todennäköisesti näkyvyydestä/UX:stä eikä toiminnallisuudesta — tarkista uudelleen ennen kuin käytetään kehitysaikaa tähän.

### Paikkakunta browse-sivulla — jo osittain koodissa, ei uusi löydös
`Paikkakunta`-suodatin on jo `frontend/app/selaa/page.tsx`:ssä ("Kaikki paikkakunnat" -oletuksella), mutta piiloutuu koska yhdelläkään tuotteella ei ole vielä kaupunkitietoa. Sama asia kuin TEKEMÄTTÄ-kohta #4 ("Paikkakunta — profiiliin + tuotteisiin + suodatin") — ei uusi, vahvistaa vain että se on yhä auki.

## Admin-paneeli + ilmiantomekanismi (✅ TEHTY)

### Tehty ✅
- `User.role` (Role enum USER/ADMIN) oli jo schemassa valmiina — ei tarvinnut lisätä
- `Report`-malli lisätty (reporterId, targetType "product"|"show" — myöhemmin laajennettu "user":lla, ks. Lisäys alla —, targetId, reason, description, status PENDING/REVIEWED)
- `NotificationType.LISTING_REMOVED` lisätty
- `backend/src/middleware/admin.ts` — adminMiddleware, tarkistaa roolin tuoreena kannasta (JWT ei kanna roolia)
- `POST /reports` — kirjautuneen käyttäjän ilmianto, kohde tarkistetaan olemassaolevaksi ennen tallennusta
- `backend/src/lib/telegram.ts` — hälytys admin-puhelimeen kun live ilmiannetaan (kiireellinen). **Vaatii `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` env-muuttujat toimiakseen oikeasti — nyt vain konsoliloki, koska botin tunnuksia ei ole vielä luotu/annettu.** Ks. https://core.telegram.org/bots#how-do-i-create-a-bot
- `GET /admin/reports?status=`, `PATCH /admin/reports/:id` (merkitse käsitellyksi), `DELETE /admin/products/:id`, `DELETE /admin/shows/:id`, `GET /admin/users?search=`, `POST /admin/users/:id/ban` — kaikki `authMiddleware` + `adminMiddleware`
- Tuotteen admin-poisto: siivoaa AutoBid/Bid/CartItem-rivit ja irrottaa Message-viestit ennen poistoa; **kieltäytyy jos tuotteella on jo OrderItem** (osa tilausta — ei poisteta rahaliikenteen historiaa)
- Liven admin-poisto: irrottaa tuotteet (`showId = null`, tuotteet jäävät olemaan), poistaa showId:hen sidotut Bid-rivit, poistaa Show:n
- Molemmat ilmoittavat myyjälle `LISTING_REMOVED`-notifikaatiolla, syy näkyvissä viestissä
- Frontend: `components/ReportModal.tsx` (uudelleenkäytettävä), "Ilmianna"-nappi tuotesivulla (`/tuotteet/[id]`) ja live-näkymässä (`/live/[showId]`, sekä mobiili että desktop)
- `/admin`-sivu — rooligeittattu (redirect `/`:iin jos ei ADMIN), kaksi välilehteä: Ilmiannot (suodatus käsittelemätön/käsitelty/kaikki, kohteen esikatselu+linkki, merkitse käsitellyksi, poista syyn kanssa) ja Käyttäjät (haku nimellä/käyttäjänimellä/sähköpostilla, bannaa syyn+keston kanssa — käyttää olemassa olevaa Ban-mallia, sama automaattisen bannin logiikka poimii sen)
- Admin-linkki `DashboardLayoutClient`-navissa, näkyy vain kun `user.role === 'ADMIN'`
- **testi@skrm.fi promotoitu ADMIN-rooliin** tietokannassa suoraan (ei vielä UI:ta roolin muuttamiseen — tarkoituksella, ks. alkuperäinen spesifikaatio)
- Testattu end-to-end curlilla: ilmianto → admin näkee sen → poisto syyn kanssa → myyjä saa LISTING_REMOVED-ilmoituksen → merkitse käsitellyksi; käyttäjähaku → banni → banni näkyy heti olemassa olevassa `isUserBanned`-tarkistuksessa (huutokaupat)
- Typecheck puhdas backend + frontend, sivut renderöityvät (`/admin`, `/tuotteet/[id]`, `/live/[showId]`) virheittä

### Tekemättä / rajattu pois tarkoituksella
- Ei UI:ta admin-roolin myöntämiseen toiselle käyttäjälle — vain suora tietokantamuokkaus, koska ei vielä henkilökuntaa (alkuperäisen spesifikaation mukaista)
- Telegram-hälytys ei lähde oikeasti ilman bot-tokenia — käyttäjän pitää luoda botti ja antaa `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` `.env`:iin

### Lisäys 2026-08-07 — käyttäjän ilmianto
- Alkuperäinen spesifikaatio kattoi vain tuote/live-ilmiannon. Lisätty kolmas `targetType: "user"` — "Ilmianna käyttäjä" -nappi julkisella profiilisivulla (`/u/[username]`), näkyy vain kirjautuneelle käyttäjälle jonka profiili ei ole oma
- Käyttäjäilmiannon syyt eri kuin tuote/live: Häirintä, Huijaus, Muu (ei "kielletty tuote"/"väärennös", ne eivät sovi käyttäjään)
- Itsensä ilmianto estetty (400 "Et voi ilmiantaa itseäsi")
- Admin-sivun ilmiantolistassa käyttäjäilmiannon toiminto on **Bannaa** (syy + kesto päivinä) "Poista sisältö" -napin sijaan, koska käyttäjätiliä ei poisteta — käyttää samaa `POST /admin/users/:id/ban` -reittiä kuin Käyttäjät-välilehti
- Testattu curlilla: itsensä ilmianto torjuttu, käyttäjäilmianto tallentuu ja näkyy admin-listassa oikein rikastettuna (username, rooli)

### Lisäys 2026-08-07 — Ilmianna-nappi puuttui huutokauppasivulta
- `/huutokauppa/[id]` (perinteinen huutokauppa) oli ainoa jäljellä oleva tuote/live-tyyppinen sivu jolla ei ollut "Ilmianna"-nappia — lisätty (`targetType: "product"`, sama kuin `/tuotteet/[id]`, koska huutokauppa on teknisesti Product jonka `saleType: "auction"`)
- Samalla siirretty tuotteen kuvaus näkyvämpään paikkaan: heti huuto/automaattihuuto/"Osta heti" -lohkon jälkeen, ennen myyjäkorttia (oli aiemmin sivun tyhjentymässä, toimituskorttien alla)

### Admin-oikeudet — kuka on admin nyt (2026-08-07)
- **Tuotanto (Railway, `spectacular-motivation`-projekti, `skrm`-palvelu):** `Larzmoi` (johan.risberg@outlook.com) on ADMIN. `testi@skrm.fi` ei ole koskaan ollutkaan admin tuotannossa.
- **Paikallinen dev-tietokanta:** kumpikaan ei ole admin oletuksena — `testi@skrm.fi` promotoitiin väliaikaisesti testausta varten, sittemmin demotoitu takaisin `USER`:iksi. Promotoi manuaalisesti tarvittaessa (ks. "Admin-rooli"-kohta yllä, ei UI:ta tähän vielä).
- Railway CLI asennettu ja kirjautuneena `johan.risberg@outlook.com`-tunnuksella tässä ympäristössä, projekti linkitetty (`railway link -p spectacular-motivation -e production -s skrm`) — voidaan käyttää `railway run -- node script.js` -kuvion kautta tuotanto-DB:n kertaluontoisiin muutoksiin ilman että yhteysmerkkijono koskaan näkyy keskustelussa.

## Mobiili-läpikäynti — löydetyt bugit ja ristiriidat (✅ VALMIS paitsi #6)

Käyty läpi mobiiliversiota sivu kerrallaan CLAUDE.md:n LUKITTU-sääntöjä vasten. Kaikki kohdat 1–5 ja 7–10 tehty ja/tai vahvistettu 2026-08-07. Kohta 6 (Dashboard UX) jätetty tarkoituksella auki — palataan siihen kun striimaus on testattu OBS:llä.

**Huom — tarkista aina myös desktop-versio samalla:** Löydökset on tehty mobiililla, mutta suuri osa korjauksista on jaettua sisältöä/komponentteja (i18n-tekstit, sisältötiedostot kuten `content.ts`), jotka näkyvät sellaisenaan myös desktopilla — nämä korjaantuvat automaattisesti samalla. Layout-/ulkoasumuutokset (esim. suodatinnäkymän collapsed-muoto, alakategorioiden korostus) saattavat kuitenkin olla eri koodipolussa tai eri breakpoint-käyttäytymisellä desktopilla — nämä pitää tarkistaa ja tarvittaessa korjata erikseen molemmilla näkymillä.

### 1. ✅ TEHTY — Footer
Kaikissa kolmessa badgessa (`badgeSecure`, `badgeBinding`, `badgeVerified`) on nyt ✓-merkki. Kielletty-lista päivitetty. Uutiskirjeen sisältö/tiheys on yhä määrittelemättä (ei koodimuutosta, ei kiireellinen — odottaa Resendiä).

### 2. ✅ TEHTY — Selaa- / Huutokaupat- / Live-sivut yhtenäistetty
Huutokaupat- ja Live-sivuilla on nyt sama `showFilters`-collapsed-malli kuin Selaa-sivulla. Selaa-sivulla on erilliset Minimihinta/Maksimihinta-kentät (ei enää yksi "Enimmäishinta"). Alakategorioiden visuaalinen korostus ei ole erikseen varmistettu — pieni jäännösriski, tarkista jos tulee esiin.

### 3. ✅ TEHTY — Meista-sivu
`frontend/app/meista/page.tsx`: tilastokortit näyttävät nyt oikein `14` (kategoriaa) ja `48h` (lähetysaika). Kaikki kolme yhteystietoa on jo `support@skrm.fi`.

### 4. ✅ TEHTY — FAQ-sivu
Ei enää `info@skrm.fi`-jäänteitä frontendissä (tarkistettu koko `frontend/app`). Kielletty-lista yhtenäistetty. *(Ei erikseen varmistettu kuvaako FAQ_DATA.fi.yleista/.myyja-teksti nimenomaisesti kaikkia kolmea myyntitapaa — pieni jäännösriski, tarkista jos tulee esiin.)*

### 5. ✅ TEHTY — Käyttöehdot
`kayttoehdot/content.ts` kohta 6.2 sanoo nyt selkeästi "2 tunnin kuluessa" (FI) / "within 2 hours" (EN) — ei enää "välittömästi"/"immediately".

### 6. Dashboard — yleinen UX-hionta (ei kiireellinen, ei konkreettista korjausta vielä)
- Hallintapaneelin aloitussivu ja Lähetys-hallinta-sivu koettu kömpelöiksi visuaalisesti/rakenteellisesti — ei tarkkaa ratkaisua vielä, palataan kun striimaus on oikeasti testattu OBS:llä (Hetzner-vaihe)
- "Näin aloitat" -ohje (`frontend/app/dashboard/lahetys/page.tsx` tms.) olettaa yksinomaan Whatnot-tyylistä live-myyntiä → päivitetään kun päätetty miten dashboard ohjaa myyjää valitsemaan live/perinteinen/suoramyynti

### 7. ✅ TEHTY — Dashboard/Tuotteet mobiilikortit
Tuotekortit pinoutuvat nyt pystysuuntaisesti mobiilissa (kuva+nimi → hinta/kunto/kategoria → badge+napit omina riveinään) yhden ahtaan flex-rivin sijaan. Desktop-layout on erillinen koodipolku, ei koskettu. Yhteenvetorivi ("X live-jonossa · Y suoramyynnissä · Z huutokaupassa") jaettu kolmeksi omaksi riviksi — sovellettu sekä mobiiliin että desktopiin, koska selkeämpi kaikkialla.

### 8. ✅ TEHTY — Minimikorotus huudoille
- `Product.bidIncrement Float?` lisätty schemaan, migroitu
- "Minimikorotus"-kenttä lomakkeessa näkyy live/both/auction-tuotteille (sama ehto kuin olemassa olevalla reservePrice-kentällä). Tyhjä → 1€ fallback, sallii esim. 0,10€.
- `product.bidIncrement ?? 1` kytketty kaikkiin kolmeen kovakoodattuun kohtaan `auctions.ts`:ssä — kahden alkuperäisen lisäksi löytyi kolmas samanlainen `+1` auto-bid-moottorista (`processAutoBids`), joka olisi jättänyt custom-korotukset huomiotta autobidissä
- Sama korjaus frontendin huutokauppasivun peilatuille `+1`-laskuille (ehdotettu huutosumma, minimihuuto-teksti)
- Bonuslöytö: `5.10 + 0.10` antoi JS:ssä `5.199999999999999` virheilmoituksiin → lisätty `roundCents()`-apufunktio backend+frontend, käytössä kaikkialla missä korotusta lasketaan
- Testattu end-to-end curlilla: 0,10€ korotus, alle-korotuksen huudot hylätään siististi (`5.2€`, ei rumaa float-arvoa)

**Kaksi uutta löydöstä korjauksen sivutuotteena (ei vielä korjattu, vain kirjattu):**
- Tuotteen poisto jolla on jo huutoja kaatuu raakaan Prisma-virheeseen (FK constraint violation, ei käsitelty) — tarvitsee siistin virheenkäsittelyn
- `socket.ts`:n live-lähetyksen socket-pohjainen huutojärjestelmä ei käytä minimikorotusta ollenkaan — sama puute kuin `auctions.ts`:ssä oli, mutta tehtävänanto koski nimenomaan vain `auctions.ts`:ää, joten tätä ei korjattu vielä

### 9. ✅ TEHTY — Automaattihuudon huutosota ei konvergoinut oikein
- Bugi: kaksi kilpailevaa automaattihuutoa samalla tuotteella (esim. 50€ ja 500€ maksimit, lähtöhinta 1€) — järjestelmän piti heti mennä 51€:oon (toiseksi korkein maksimi + korotus), mutta pysähtyi 3€:oon eikä 50€:n automaattihuuto koskaan "huutanut takaisin"
- Syy: `processAutoBids()` `backend/src/routes/auctions.ts`:ssä teki vain YHDEN huutoaskeleen kutsua kohden eikä koskaan tarkistanut uudelleen voiko juuri ohitettu automaattihuutaja vastata
- Korjaus: kirjoitettu uudelleen suoraksi tasapainolaskennaksi (klassinen "toiseksi korkein maksimi + korotus" -sääntö, sama periaate kuin eBaylla) — ei enää rekursiota/silmukkaa, yksi laskenta per kutsu
- Testattu curlilla end-to-end: 1€ lähtöhinta, 50€+500€ automaattihuudot → lopputulos 51€, 500€:n käyttäjä voittaa

### 10. ✅ TEHTY — Huutokaupan voitosta ei syntynyt koskaan Order-riviä
- Bugi: kun perinteinen huutokauppa päättyi voittajalla (`closeAuctions.ts`) tai "Osta heti" käytettiin (`auctions.ts` buy-now), tuote merkittiin `SOLD`:ksi ja lähetettiin ilmoitus "sinulla on 2h aikaa maksaa" — mutta **Orderia ei koskaan luotu**. Voittaja ei siis päässyt koskaan oikeasti maksamaan, ei edes mock-pay-testivirran kautta.
- Korjaus: uusi jaettu `backend/src/lib/auctionOrder.ts` → `createOrderForAuctionWin()`, sama luo-tai-liitä-olemassaolevaan-logiikka kuin `cart/checkout`:ssa (6h yhdistämisikkuna toimii myös huutokaupoille). Kutsutaan sekä `closeAuctions.ts`:stä että `auctions.ts`:n buy-now-reitiltä.
- **Maksuaika eriytetty:** huutokaupan passiivinen päättyminen (closeAuctions) → 24h. Osta heti (buyer aktiivisesti läsnä) → normaali 2h. Ks. LUKITTU-säännön poikkeus yllä.
- Ilmoitusten deep-linkit korjattu osoittamaan oikeaan paikkaan: ostaja → `/ostot` (missä oikeasti voi maksaa), myyjä → `/dashboard/tilaukset` (ei enää `/dashboard/tuotteet`, koska nyt on oikea Order seurattavana)
- Sivuvaikutus korjattu: `webhooks.ts`:n `checkExpiredPayments()` palautti ennen KAIKKI peruutetut tuotteet `PENDING`-tilaan — huutokauppatuotteelle tämä olisi aiheuttanut äärettömän silmukan (`auctionEndsAt` on jo mennyt → `closeAuctions` poimisi sen heti uudestaan). Huutokauppatuotteet menevät nyt `UNSOLD`-tilaan (kentät nollattu) maksamattoman voiton jälkeen — myyjä listaa uudestaan manuaalisesti jos haluaa. Suoramyynti/live-tuotteet toimivat kuten ennen (palaavat `PENDING`-tilaan).
- Testattu curlilla end-to-end kolmessa skenaariossa: (1) passiivinen voitto → 24h Order + mock-pay toimii, (2) osta heti → 2h Order, yhdistyi oikein olemassaolevaan samalta myyjältä 6h sisällä olevaan tilaukseen, (3) maksamaton voitto → tuote `UNSOLD`, ei ääretöntä ilmoitussilmukkaa

## Live-konsolin mobiilikorjaukset ja infrastruktuurikorjaukset (✅ TEHTY 2026-08-08 — 2026-08-09)

Useampi testauskierros oikealla OBS-striimillä ja useammalla laitteella (tietokone joka streamaa, toinen tietokone katsojana, puhelin katsojana) paljasti sekä UI-bugeja että kaksi eri infrastruktuuritason juurisyytä epäluotettavalle videolle/chatille. Ks. myös päivitetty "Tunnettuja bugeja" -kohta.

### UI/UX-korjaukset (`/lahetys`, `/live/[showId]`)
- Kategoriapudotusvalikko `/lahetys`:n esikatselulomakkeessa käytti raakaa `KATEGORIAT`-listaa `getNakyvatKategoriat()`:n sijaan — rikkoi kategoriafokuksen (näytti kaikki 14 vaikka pitäisi näyttää vain keräilykortit)
- `/lahetys`:n esikatselulomake muutettu yksisarakkeisesta (`maxWidth:560`, pakotti scrollaamaan) kaksisarakkeiseksi CSS-gridiksi (`maxWidth:1080`) — OBS-asetukset+kamera vasemmalla, lomake oikealla, kaikki näkyy kerralla leveämmällä näytöllä
- Väriteeman yhtenäistys: löytyi useita kovakoodattuja "väärän vihreitä" (`#22c55e`, `#16a34a`, `rgba(34,197,94,...)`) sekaisin `C.accent`/`C.accentBright`-teemavärien kanssa eri puolilla lähetys-konsolia ja dashboardia — kaikki yhtenäistetty teemavärehin
- `quickBtnPrimary` (Myyty/Seuraava-tyyppiset napit) vaihdettu gradientista (tummeni alaspäin, näytti "halvalta") kiinteään `C.accentBright`-täyttöön + eriytetty ghost/danger-variantit pikatoiminnoille visuaalisen hierarkian selkeyttämiseksi
- `components/ConfirmDialog.tsx` (uusi) — korvaa natiivit `confirm()`-dialogit (esim. "Haluatko varmasti lopettaa lähetyksen?") sivuston tyylin mukaisilla, tummilla, aina-tumma-teemaisilla modaaleilla sekä `/lahetys`:ssä että `/live/[showId]`:ssä (lopeta lähetys, regeneroi stream key, mykistä käyttäjä, poista livestä)
- `HlsPreview` (myyjän esikatselu) ja `VideoPlayer` (ostajan `/live/[showId]`): hls.js **ei yritä automaattisesti uudestaan** fataalin virheen jälkeen (esim. manifesti ei vielä saatavilla koska OBS ei ole ehtinyt yhdistää) — soitin jäi pysyvästi "Odotetaan..."-tilaan vaikka striimi tulisi hetkeä myöhemmin. Lisätty 3s uudelleenyritys-looppi molempiin.
- `frontend/lib/socket.ts`: `transports: ['websocket']` → `['websocket', 'polling']` — osa mobiiliverkoista/operaattoriproksyista rikkoo WebSocket-upgrade-kättelyn hiljaa, jolloin yhteys jäi ikuisesti "yhdistetään..."-tilaan vaikka polling (tavallinen HTTP) olisi toiminut
- **`/lahetys` jatkaa nyt olemassa olevaa SCHEDULED/LIVE-lähetystä sivun avatessa** (`GET /shows/mine`, uusin LIVE/SCHEDULED otetaan) sen sijaan että loisi aina uuden Show:n — ilman tätä toisella laitteella/välilehdellä avattu `/lahetys` loi täysin erillisen lähetyksen omalla chat-huoneellaan eikä keskustelu synkronoitunut alkuperäisen kanssa
- `/live/[showId]`:n mobiilin chat-inputista puuttui sama `disabled={!user}` + "Kirjaudu kirjoittaaksesi..." -esto joka desktopin `ChatArea`:lla jo oli — kirjautumaton käyttäjä pystyi kirjoittamaan/lähettämään mutta mitään ei tapahtunut, ei virhettä eikä selitystä. Yhtenäistetty desktopin kanssa.
- `VideoPlayer`:in natiivi `controls`-attribuutti poistettu — törmäsi visuaalisesti omien chat/shop-overlayjen kanssa mobiilissa. Korvattu yhdellä omantyylisellä mykistys-napilla (oli ainoa syy `controls`:in olemassaololle, koska video on oletuksena mykistetty)
- `/lahetys`:n täysnäkymä-konsolin ulkokehys: `100vh` → `100dvh` + eksplisiittinen `position:'relative'` — ilman näitä mobiilin virtuaalinäppäimistön avautuminen saattoi työntää koko overlay-layoutin (OBS-paneeli, chat-input) väärään kohtaan koska `100vh` ei ota näppäimistöä huomioon eikä `position:absolute`-lapsilla ollut vakaata sijoituskontekstia
- `GET /shows` (julkinen listaus): lisätty suodatin joka piilottaa `SCHEDULED`-lähetykset joilla ei ole `scheduledAt`-arvoa (= myyjän yksityinen esikatselu-/testilähetys `/lahetys`:n "Luo lähetys ja testaa yhteys" -napista) — nämä näkyivät virheellisesti julkisessa "tulevat lähetykset" -listassa heti kun myyjä poistui konsolista

### Infrastruktuurikorjaukset (EI git-repossa — vain tuotantopalvelimen elävä tila)
Kaksi erillistä, peräkkäistä juurisyytä epäluotettavalle chatille/videolle, löydetty testaamalla suoraan tuotantoa vasten (kaksi rinnakkaista socket.io-yhteyttä simuloimaan eri laitteita) sen sijaan että arvattaisiin frontend-koodista:
1. **nginx `proxy_read_timeout`/`proxy_send_timeout` puuttui `/api/`-lohkosta** (`/etc/nginx/sites-available/app.skrm.fi` Hetznerillä) → oletus 60s tappoi pitkäkestoiset socket.io-yhteydet hiljaisuuden aikana vaikka socket.io:n oma ping piti ne teknisesti hengissä, näkyi jatkuvana yhdistä/katkea-syklinä backendin lokeissa ja kadonneina chat-viesteinä katkon aikana. **Korjaus:** `proxy_read_timeout 3600s; proxy_send_timeout 3600s;` lisätty `/api/`-lohkoon, `nginx -t` + `systemctl reload nginx`. Vanha konfiguraatio varmuuskopioitu ennen muutosta (`app.skrm.fi.bak-*`).
2. **Mobiilioperaattorin NAT/middlebox pudotti vain palvelin→asiakas-suunnan liikenteen** — havaittu 2026-08-09: Android-puhelin mobiilidatalla (ei WiFi) pystyi lähettämään chat-viestejä (näkyivät muille laitteille) muttei koskaan vastaanottanut mitään, ei edes omaa kaikuaan — toistui identtisenä sekä Chromella että Firefoxilla samalla puhelimella/verkolla, ei toistunut WiFillä/tietokoneella. Palvelin/nginx/Cloudflare vahvistettu terveiksi kolmella erillisellä testillä tuotantoa vasten (mm. pakotettu polling-only-yhteys). **Korjaus:** `backend/src/index.ts`, socket.io-serverin `pingInterval`/`pingTimeout` tiukennettu oletuksesta (25s/20s, ~45s ennen kuolleen yhteyden havaitsemista) arvoihin `10000`/`8000` (~18s) — ei poista operaattorin verkko-ongelmaa mutta saa katsojan nopeammin pois "yhdistetty mutta mykkä" -tilasta automaattisen uudelleenyhdistämisen kautta.

**Huom jatkoa varten:** kohta 1 (nginx) ja socket.io:n `pingInterval`/`pingTimeout`-asetus (kohta 2) EIVÄT ole git-repossa — nginx-konfiguraatio on suoraan palvelimen `/etc/nginx/`:ssa, ei koskaan synkronoitu repoon (vain `infra/nginx-rtmp.conf` on referenssikonfig repossa, ei elävä tiedosto). Jos palvelin joskus provisioidaan uudestaan tai konfiguraatio nollataan, nämä kaksi asetusta pitää muistaa lisätä uudestaan manuaalisesti.
