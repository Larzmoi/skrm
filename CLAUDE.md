# SKRM — Suomalainen Live-huutokauppa & Marketplace

## Projektin kuvaus
SKRM on suomalainen live-huutokauppa- ja suoramyyntialusta. Myyjät voivat myydä tuotteitaan reaaliaikaisessa videolähetyksessä (live-huutokauppa) tai listata ne suoraan myyntiin (suoramyynti). SKRM ei ole osapuoli kaupassa — marketplace-malli kuten Whatnot.

**Domain:** skrm.fi (ostettu, Cloudflare DNS)
**Testitunnus:** testi@skrm.fi / test1234

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
      kategoriat.ts               — 16 kategoriaa + alakategoriat {fi, en}
      socket.ts                   — Socket.io client
      imageUtils.ts               — Kuvan pienennys (resizeImage)
      i18n/fi.ts, en.ts, sv.ts    — Käännökset
```

## Liiketoimintasäännöt (LUKITTU — ei muuteta)
- Välityspalkkio: **3% max 20€** + Paytrail ~1,5% + 0,25€ (ei kattoa)
- Kaikki huudot **sitovia** — ei peruutuksia
- **Yhdistetty lähetys:** sama myyjä + 6h aikaikkuna = yksi tilaus, yksi postikulut (suurimman pakettikoon mukaan). 6h rajan jälkeen uusi erillinen tilaus.
- **Maksuaika:** voitettu huuto tai ostos → 2h aikaa maksaa → kaikki maksutavat (MobilePay, Google Pay, verkkopankki, kortti) → ei pakollista kortintallennusta
  - **Poikkeus:** perinteisen (ajastetun) huutokaupan **passiivinen voitto** (huutokauppa päättyy itsestään, esim. yöllä) → **24h** maksuaikaa, koska voittaja ei ole aktiivisesti läsnä silloin. "Osta heti" (buy-now) ja live-huuto pysyvät 2h:ssa, koska ostaja on aktiivisesti paikalla klikatessaan. Päätetty 2026-08-07.
- **Rekisteröityminen:** käyttäjän on hyväksyttävä käyttöehdot, tietosuoja ja kaupankäyntipolitiikka erillisillä checkboxeilla ennen kuin voi luoda tilin. Checkboxit pakollisia — ei oletuksena rastitettu.
- **Banni:** 3 maksamatonta tilausta → automaattinen 30 päivän banni. Jokainen seuraava rike → uusi 30 päivän banni. Ei poikkeuksia.
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
| 500€+ | 20,00€ (max) |

## Postihinnat (ostaja maksaa)
XXS 9,90€ · S 11,90€ · M 13,90€ · L 18,90€ · XL 24,90€ · XXL 46,90€

## Tärkeät koodaussäännöt
- **Käännökset:** Käytä AINA `t.xxx` — ei kovakoodattua suomea/englantia
- **Kategoriat:** `getKatNimi(kat, lang)` ja `getAlaNimi(ala, lang)` — nimi on objekti `{fi, en}`
- **Kuvat:** Tallennetaan base64:na, erotin `|||` useampien välillä. Ota ensimmäinen: `imageUrl.split('|||')[0]`
- **Teemat:** Käytä `C.xxx` värejä (C.accent, C.bg, C.text, C.muted, C.border, C.cardBg jne.)
- **Ei mock-dataa:** Kaikki data haetaan backendistä. Jos ei löydy → tyhjä tila
- **API:** NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

## Tekemättä (prioriteettijärjestyksessä)
1. **Deploytaus** — Hetzner (backend+DB) + Vercel (frontend) — odottaa palvelimen ostoa
2. **Paytrail** — maksut (korvaa Stripen, tukee FI pankit + MobilePay + Google/Apple Pay)
3. **Mux** — videostreami live-lähetyksiin
4. **Resend** — sähköpostinotifikaatiot (odottaa skrm.fi domain-aktivoitumista)
5. **Signicat** — pankkitunnistautuminen (pakollinen ennen huutamista/myymistä)
6. **Ilmoitukset & viestit** — reaaliaikaiset notifikaatiot + myyjä↔ostaja viestintä
7. **Ostajan checkout** — maksuvirta kun painaa "Osta heti"
8. **Postin tracking API** — automaattinen toimitusseuranta
9. **Profiilikuva backendiin** — nyt vain localStorage, pitäisi tallentaa palvelimelle

## Tunnettuja bugeja / kehityskohteita
- Profiilikuva tallentuu vain localStorageen — ei näy muille käyttäjille
- Tuotesivun myyjäkuva on vihreä kuvake koska backendistä ei tule kuvaa
- Dashboard lähetys-sivu ei ole kytketty WebSocketiin oikeaan show-id:hen
- Ostot-sivu on tyhjä — odottaa maksuintegraatiota

## Infrastruktuuri

### Domain & DNS
- Domain: **skrm.fi** (Domainhotelli, nimipalvelimet Cloudflaressa: julio + samara)
- DNS: Cloudflare (free)
- Sähköposti: support@skrm.fi → **Zoho Mail (maksullinen taso, muutama €/kk) — päätetty, ei vielä käyttöönotettu.** Antaa sekä vastaanoton että lähetyksen samasta osoitteesta (Cloudflare Email Routing hoiti vain vastaanoton, ei lähetystä samasta osoitteesta, siksi vaihdettu). Vaatii DNS-tietueiden lisäyksen Cloudflareen (MX + verifiointi Zohon ohjeiden mukaan) — tekemättä vielä.

### Hetzner — striimaustestausta varten (päätetty)
- Palvelin: **CX23** (~6€/kk), Hetzner Cloud VPS
- Tarkoitus: nginx-rtmp-asennus ja OBS-yhteyden testaus end-to-end — ei vielä tuotantomittakaavan palvelin, riittää yhden striimin testaukseen
- Backend/DB pysyvät toistaiseksi Railwaylla, Hetzner hoitaa aluksi vain striimauksen

### Hosting — VÄLIAIKAINEN (Railway + Netlify, ei kuluja Hetznerin odotellessa)
Kaikki alla oleva on tarkoituksella tilapäistä — siirtyy kokonaan Hetznerille kun OY ja palvelin ovat valmiit. Ei kannata maksaa Hetznerin ylläpidosta kuukausia etukäteen.
- **skrm.fi** (landing page) → Netlify (`skrm.netlify.app`) — staattinen HTML, FI/SV/EN, "tulossa"-sivu jossa sähköpostin jättö + FAQ + kirjaudu-nappi joka vie testitunnuksilla oikealle sivulle
- **app.skrm.fi** (varsinainen sovellus) → Netlify (`skrmm.netlify.app`) — Next.js
- **Backend** → Railway (`skrm-production.up.railway.app`) — Node.js + Express + Prisma
- **Tietokanta** → Railway PostgreSQL
- Käyttö nyt: harvat ja valitut testaavat sivustoa testitunnuksilla ennen julkista lanseerausta
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

## Noutotuotteet (LUKITTU)
- Nouto myyjältä = ostajan ja myyjän välinen asia — SKRM ei ole mukana
- Ei maksuturvaa, ei SKRM:n vastuuta nouto-kaupoissa
- Myyjän tuotteen lisäyslomakkeessa "Nouto myyjältä" valinta näyttää pakollisen varoituksen
- Varoitusteksti: "Noutotuotteiden kaupassa SKRM ei tarjoa maksuturvaa. Kauppa tapahtuu suoraan ostajan ja myyjän välillä."
- Myyjä rastittaa "Ymmärrän" ennen kuin voi julkaista tuotteen

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

### Testitunnus 2
- testi2@skrm.fi / test1234 (username: testikaksi)
- Olemassa oleva keskustelu testi@skrm.fi kanssa

### Tekemättä (prioriteettijärjestyksessä)
1. Rekisteröitymisen checkboxit (käyttöehdot + tietosuoja + kaupankäyntipolitiikka)
2. Ostoskori + tilaukset (ohjeet tehty)
3. Kategoriat — poista Työkalut & remontointi ja Auto & moottoripyörä (ohjeet tehty)
4. Noutotuote-varoitus myyjälle ja ostajalle (ohjeet tehty)
5. Deploytaus — Hetzner + Vercel
6. Paytrail — maksut (vaatii OY:n)
7. Mux — videostreami
8. Signicat — pankkitunnistautuminen
9. Resend — sähköpostit (odottaa skrm.fi aktivoitumista)

## Toimituksen aikataulu ja maksuturva (LUKITTU)
- Myyjä lähettää + syöttää seurantakoodin → kello käynnistyy
- **Päivä 5** — paketti ei liikkunut → automaattinen ilmoitus myyjälle ja ostajalle
- **Päivä 10** — ei toimitusta → muistutus ostajalle "kuittaa tai ilmoita ongelmasta"
- **Päivä 14** — ostaja ei reagoinut → maksu vapautuu automaattisesti myyjälle
- **Päivä 14 + ostaja ilmoittaa ongelman** → tilanne SKRM:n käsittelyyn, maksu jäädytykseen
- Ostajalla 3 päivää reklamoida kuittauksen tai automaattivapauttamisen jälkeen
- Maksu vapautuu kun: Postin API sanoo toimitettu TAI ostaja kuittaa TAI 14 päivää kulunut
- Ei luoteta pelkästään Postin statukseen — ostajan kuittaus tai aikaraja ratkaisee

## Lähetysintegraatio (tulossa OY:n jälkeen)
- SKRM ostaa lähetykset automaattisesti Postilta/Matkahuollolta yrityssopimuksella
- Myyjä saa tulostettavan lähetystaran dashboardiin
- SKRM ottaa katteen lähetyksistä (esim. Posti 8,50€ → ostaja maksaa 9,90€)
- Tracking API pollaa toimitusstatusta automaattisesti

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

### Tekemättä (prioriteettijärjestyksessä)
1. Rekisteröitymisen checkboxit
2. Kategoriat — poista 2 (ohjeet valmiina)
3. Noutotuote-varoitus (ohjeet valmiina)
4. Deploytaus — Hetzner + Vercel
5. Cloudflare R2 — kuvat pois tietokannasta
6. Paytrail — maksut (vaatii OY:n)
7. Mux — videostreami (ohjeet valmiina)
8. Signicat — pankkitunnistautuminen
9. Resend — sähköpostit
10. Postin tracking API

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

## SEURAAVAKSI TEHTÄVÄT — prioriteettijärjestys (päivitetty)

1. ✅ **Admin-paneeli + ilmiantomekanismi** — TEHTY, ks. "Tehty ✅" alla
2. **Julkinen myyjäprofiili / Storefront** (ks. "Live-ominaisuudet Whatnot-tasolle" -osio) — **seuraava tehtävä**
3. Loput "Live-ominaisuudet Whatnot-tasolle" -osion kohdista (ennakkotarjoukset, chat-moderointi, giveaway) — järjestyksessä storefrontin jälkeen koska ennakkotarjoukset tarvitsevat storefrontin ollakseen käytännössä löydettävissä

**SV-käännös (`frontend/lib/i18n/sv.ts`) jää odottamaan** — ei tehdä vielä, matalampi prioriteetti kuin yllä olevat. FI ja EN ovat ajan tasalla.

## Live-ominaisuudet Whatnot-tasolle (SUUNNITELTU — päätetty, valmis toteutettavaksi)

Pohjautuu Whatnot-vertailuun. Neljä ominaisuutta päätetty, muodostavat yhdessä kokonaisuuden: julkinen myyjäprofiili on se paikka josta ostaja löytää tulevat huutokaupat ja jättää ennakkotarjouksia.

**⚠️ Huom, ei oteta käyttöön Whatnotilta:** "Swipe to Bid/Buy" ja "Auto-Authorize" (automaattinen kortilta veloitus heti voiton jälkeen) — ristiriidassa LUKITTU-sääntöjen kanssa (ei pakollista kortintallennusta, 2h maksuaika, ostaja valitsee maksutavan). Ei myöskään Stripe — Paytrail on jo LUKITTU.

### 1. Ennakkotarjoukset (Pre-bidding)
- Koskee **vain huutokauppatyyppisiä tuotteita**: perinteinen huutokauppa (`saleType: "auction"`) ja live-tuotteet jotka kuuluvat vielä `SCHEDULED`-tilassa olevaan Show'hun. Ei suoramyyntiin (`saleType: "suora"`), koska siellä ei ole huutamista.
- Tekninen pohja on jo olemassa: `Bid`-mallissa `showId` on jo nullable ("null perinteisen huutokaupan huudoille"), eli malli tukee jo huutoja jotka eivät liity käynnissä olevaan liveen.
- Toteutus: salli huudon jättäminen tuotteelle jonka `Show.status === 'SCHEDULED'` (nyt oletettavasti sallitaan huudot vain kun `status === 'LIVE'` — tarkista ja avaa tämä ehto scheduled-tuotteille). Kun show alkaa, korkein ennakkotarjous on jo `Product.currentBid`, live jatkuu siitä normaalisti.
- Ilmoita huutaneelle jos hänet ohitetaan ennakkovaiheessa (käytä olemassa olevaa `OUTBID`-ilmoitustyyppiä).

### 2. Chat-moderointi
- **Myyjä moderoi vain omaa chattiään** (oman huutokaupan/liven aikana) — ei sivustonlaajuista moderointityökalua tässä vaiheessa.
- Toiminnot: viestin poisto, käyttäjän mykistys kyseisessä chatissä (ei koko sivuston laajuinen banni — se on eri, jo olemassa oleva `Ban`-mekanismi).
- Yksinkertaisin toteutus: `Message`-malliin (tai vastaavaan live-chatin tauluun) `deletedAt`-kenttä + kevyt "muted user in this show" -lista Socket.io-tasolla.

### 3. Giveaway / Onnenpyörä — Vaihtoehto A (avainsana-ilmoittautuminen)
Päätetty: avainsana-malli, ei läsnäoloseurantaa (yksinkertaisempi rakentaa, ei vaadi reaaliaikaista "kuka on juuri nyt paikalla" -logiikkaa).

Kulku:
1. Myyjä painaa "Aloita giveaway" livenäkymässä → syöttää avainsanan (tai järjestelmä generoi) → Socket.io lähettää kaikille katsojille ilmoituksen "Kirjoita AVAINSANA chattiin osallistuaksesi!"
2. Järjestelmä kerää kaikki chat-viestit jotka sisältävät tarkalleen avainsanan sinä aikana → poistaa duplikaatit (yksi osallistuminen per käyttäjä) → muodostaa poolin
3. Myyjä painaa "Sulje & arvo" → pyörä-animaatio (frontend) arpoo satunnaisen voittajan poolista (esim. `Math.random()`-pohjainen valinta, ei tarvitse kryptografisesti turvallista satunnaisuutta tähän)
4. Voittaja näkyy kaikille + ilmoitus voittajalle (uusi `NotificationType`, esim. `GIVEAWAY_WON`)
- Ei tarvitse omaa tietokantamallia välttämättä ensimmäisessä versiossa — voi toimia puhtaasti Socket.io-tilassa (in-memory) yhden liven ajan, koska giveaway on kertaluund kulutustapahtuma eikä vaadi pysyvää historiaa (voidaan lisätä myöhemmin jos halutaan tilastoida).

### 4. Julkinen myyjäprofiili (Storefront)
Puuttuu kokonaan koodista (tarkistettu, ei `/myyja/[username]`-tyyppistä sivua ole). Rakennetaan tukemaan yllä olevaa kolmea:
- Uusi julkinen sivu, esim. `frontend/app/myyja/[username]/page.tsx`
- Näyttää: myyjän kaikki aktiiviset tuotteet (kaikki saleType), **tulevat ajastetut livet/huutokaupat korostettuna** (jotta ostaja löytää ne ennakkotarjousta varten), myyjän arvostelut (Review-malli on jo olemassa), lomamoodi-tila jos päällä (Profiili-mallissa jo olemassa)
- Linkki tänne jo olemassa olevista paikoista: tuotesivun myyjän nimi, live-näkymän myyjän nimi jne. — tarkista onko nämä jo linkitetty jonnekin tai pitääkö lisätä

**Toteutusjärjestys suositus:** 4 (storefront) ensin koska 1 (ennakkotarjoukset) tarvitsee paikan josta ostaja löytää tulevat huutokaupat ylipäätään — muuten pre-bidding-ominaisuus ei ole käytännössä löydettävissä.

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
- `Report`-malli lisätty (reporterId, targetType "product"|"show", targetId, reason, description, status PENDING/REVIEWED)
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

## Admin-paneeli + ilmiantomekanismi — alkuperäinen spesifikaatio (arkisto)

Ei aiemmin ollut mitään tapaa ilmoittaa laittomasta/kielletystä sisällöstä (tuote, huutokauppa, live) muuta kuin käyttöehtojen maininta "ota yhteyttä support@skrm.fi" — ei nappia, ei lomaketta, ei admin-näkymää. Admin-roolia ei ole olemassa koodissa lainkaan (ei `role`-kenttää User-mallissa, ei admin-middlewarea, ei admin-reittejä).

### Kiireellisyysero: tuote/huutokauppa vs. live
- **Tuotteet/huutokaupat** (staattinen sisältö) — ilmianto voi odottaa, tarkistetaan admin-sivulta kun ehtii
- **Live-lähetykset** — tarvitsee nopean reagoinnin, koska sisältö on käynnissä juuri nyt. MVP-vaiheessa (ei henkilökuntaa) riittää että ilmianto herättää sinut nopeasti — esim. sähköposti + puhelimen push, tai kevyt Telegram-bot-webhook suoraan puhelimeen (nopeampi ja ilmainen, ~10 min setup). Ei tarvitse rakentaa isoa moderointityökalua vielä.

### 1. Report-malli (uusi, Prisma)
```
model Report {
  id          String       @id @default(cuid())
  reporterId  String
  reporter    User         @relation(fields: [reporterId], references: [id])
  targetType  String       // "product" | "show"
  targetId    String
  reason      String       // dropdown: kielletty tuote, väärennös, harhaanjohtava, muu
  description String?
  status      String       @default("pending") // "pending" | "reviewed"
  createdAt   DateTime     @default(now())
}
```

### 2. Admin-rooli
- Lisää `User`-malliin `role: String @default("USER")` (arvot `"USER"` / `"ADMIN"`)
- Ei vielä erillistä "kutsu adminiksi" -toimintoa — admin-status asetetaan alkuun manuaalisesti tietokannasta (Prisma Studio / Railway) koska ei ole vielä henkilökuntaa
- Backend: uusi middleware joka tarkistaa `req.user.role === 'ADMIN'` ennen admin-reittejä

### 3. "Ilmianna"-nappi käyttäjille
- Tuotesivulle ja live-näkymään nappi joka avaa lomakkeen (syy dropdownista + vapaa kuvaus) → luo `Report`-rivin
- Kun `targetType === 'show'`: laukaisee myös välittömän hälytyksen (sähköposti/push/Telegram — valitse toteutustavaksi mikä on nopein rakentaa nyt)

### 4. Admin-sivu (`/admin` tms., vain `role === 'ADMIN'`)
- Näkymä ilmiannoista (`Report`-lista, merkittävissä käsitellyksi)
- **Admin voi poistaa minkä tahansa tuotteen/huutokaupan/liven** — ei rajattu vain ilmiannettuihin
- **Admin voi bannata käyttäjän suoraan** — käyttää olemassa olevaa `Ban`-mallia (`userId`, `reason`, `endsAt`, `createdAt`). Huom: nykyinen automaattinen 30pv-bannilogiikka on maksamattomille tilauksille (3 rike → banni) — admin-bannaus on erillinen, manuaalinen polku samaan malliin, admin syöttää itse syyn ja keston.

### 5. Ilmoitus myyjälle kun admin poistaa tuotteen
- Uusi `NotificationType`-arvo: `LISTING_REMOVED`
- Käytetään olemassa olevaa `notify.ts`-järjestelmää (sama kuin `AUCTION_ENDED` yms.)
- **Ilmoituksessa näytetään poiston syy** (esim. "Tuotteesi 'X' on poistettu ylläpidon toimesta. Syy: [admin-syy]. Kysyttävää? support@skrm.fi") — päätetty, ei pelkkää geneeristä viestiä
- **Yksi ainoa osoite käytössä toistaiseksi: `support@skrm.fi`**
- Kaikki muut osoitteet (`info@skrm.fi`, `tuki@skrm.fi`, `myyja@skrm.fi`) poistetaan käytöstä — niitä ei ole olemassa/reititetty

## Mobiili-läpikäynti — löydetyt bugit ja ristiriidat (korjattavaksi)

Käyty läpi mobiiliversiota sivu kerrallaan CLAUDE.md:n LUKITTU-sääntöjä vasten. Alla konkreettiset korjaukset tiedostoviitteineen.

**Huom — tarkista aina myös desktop-versio samalla:** Löydökset on tehty mobiililla, mutta suuri osa korjauksista on jaettua sisältöä/komponentteja (i18n-tekstit, sisältötiedostot kuten `content.ts`), jotka näkyvät sellaisenaan myös desktopilla — nämä korjaantuvat automaattisesti samalla. Layout-/ulkoasumuutokset (esim. suodatinnäkymän collapsed-muoto, alakategorioiden korostus) saattavat kuitenkin olla eri koodipolussa tai eri breakpoint-käyttäytymisellä desktopilla — nämä pitää tarkistaa ja tarvittaessa korjata erikseen molemmilla näkymillä.

### 1. Footer — `frontend/lib/i18n/fi.ts` (ja vastaava `en.ts`)
- Rivi ~106: `badgeSecure: 'Turvallinen', badgeBinding: '✓ Sitovat huudot', badgeVerified: 'Todennetut käyttäjät'`
  → Lisää ✓-merkki myös `badgeSecure`- ja `badgeVerified`-teksteihin (nyt vain `badgeBinding`:ssä). Tee sama `en.ts`:ään.
- Rivi ~105: `prohibited: 'Ei sallittu: aseet, alkoholi, lääkkeet, elävät eläimet'`
  → Vanhentunut, suppea lista. Korvaa käyttöehtojen 5.2-kohdan (`frontend/app/kayttoehdot/content.ts`) kanssa yhdenmukaisella, kattavammalla listalla (mainitse ainakin huumausaineet/psykoaktiiviset aineet erikseen, ei vain "lääkkeet"). Käyttöehdot on tässä oikea lähde — päivitä footer vastaamaan sitä, älä keksi uutta listaa.
- Uutiskirje (`newsletter: 'Uutiskirje'`) — sähköpostipalvelua (Resend) ei ole vielä otettu käyttöön eikä uutiskirjeen sisältöä/tiheyttä ole määritelty. Ei koodimuutosta vielä — vain muistiin, että toiminnallisuus on määrittelemättä.

### 2. Selaa- / Huutokaupat- / Live-sivut — suodattimien yhtenäistäminen
- **Selaa-sivu (`frontend/app/selaa/page.tsx`) on jo oikeassa muodossa** — käytä sitä mallina. Oletusnäkymä: vain Kaikki/Suoramyynti/Huutokaupat-valinta + hakukenttä + "Suodata"-nappi. Kategoriat, järjestys ja hinta piilossa kunnes painaa "Suodata".
- **Huutokaupat-sivu ja Live-sivu** (`frontend/app/live-kaikki/page.tsx` tai vastaava, `frontend/app/huutokaupat` — tarkista tarkka polku) näyttävät nyt kaikki kategoriat suoraan auki. → Muuta samaan collapsed-malliin kuin Selaa-sivulla.
- **Alakategoriat**: kun pääkategoria (esim. "Keräilykortit") valitaan ja alakategoriat ilmestyvät, anna niille oma visuaalinen erottuvuus (esim. eri taustasävy kuplille) jotta erottuvat selvästi pääkategorioista.
- **Hintasuodatin**: nyt vain yksi "Enimmäishinta"-kenttä. → Muuta kahdeksi kentäksi: **Minimihinta** ja **Maksimihinta**.

### 3. Meista-sivu — `frontend/app/meista/page.tsx`
- Rivi ~32: tilastokortissa `{ value: '24h', label: t.about.shipping, ... }` → **väärin, pitää olla `48h`** (LUKITTU-sääntö, ristiriidassa käyttöehtojen/FAQ:n/toimitussivun kanssa jotka käyttävät jo oikein 48h:aa)
- Rivi ~31: `{ value: '16', label: t.about.categories, ... }` → **väärin, pitää olla `14`** (kategoriat.ts:ssä tasan 14 pääkategoriaa, LUKITTU-listan mukaisesti)
- Rivit ~49–51: sähköpostit `info@skrm.fi`, `tuki@skrm.fi`, `myyja@skrm.fi` → korvaa kaikki yhdellä `support@skrm.fi`-osoitteella (ks. "Yhteydenottosähköposti"-kohta yllä)

### 4. FAQ-sivu — `frontend/app/faq/page.tsx`
- Rivi ~124: yhteystieto `info@skrm.fi` → vaihda `support@skrm.fi`
- `FAQ_DATA.fi.yleista` ("Mikä on SKRM?") ja `.myyja` ("Miten aloitan myymisen?") kuvaavat palvelun edelleen pelkkänä live-huutokauppa-alustana → päivitä mainitsemaan myös perinteinen huutokauppa ja suoramyynti. Tee sama `en`-versioon.
- `.myyja`-osion "Mitä voin myydä?" -vastaus: sama vanhentunut suppea kielletty-lista kuin footerissa ("aseet, alkoholi, lääkkeet, elävät eläimet ja väärennetyt tuotteet") → yhtenäistä käyttöehtojen 5.2-listan kanssa, sama korjaus kuin footerissa.

### 5. Käyttöehdot — `frontend/app/kayttoehdot/content.ts`
- Kohta 6.2 (rivi ~96, `TERMS_FI`): "Ostaja on velvollinen maksamaan voittamastaan huudosta tai ostoksesta **välittömästi**." → **Ristiriidassa LUKITTU-säännön kanssa (2h maksuaika)**. Korjaa tekstiin selkeästi 2 tunnin maksuaika. Tee sama korjaus `TERMS_EN`:iin (kohta 6.2, rivi ~250: "immediately" → "within 2 hours").

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
