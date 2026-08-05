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
- **Rekisteröityminen:** käyttäjän on hyväksyttävä käyttöehdot, tietosuoja ja kaupankäyntipolitiikka erillisillä checkboxeilla ennen kuin voi luoda tilin. Checkboxit pakollisia — ei oletuksena rastitettu.
- **Banni:** 3 maksamatonta tilausta → automaattinen 30 päivän banni. Jokainen seuraava rike → uusi 30 päivän banni. Ei poikkeuksia.
- Maksuturva: maksu pidätetään kunnes myyjä toimittaa seurantakoodin
- Myyjällä **48h** aikaa lähettää (lomamoodi: 7 päivää)
- SKRM **ei ole osapuoli** kaupassa — marketplace-malli
- Pankkitunnistautuminen (Signicat) pakollinen ennen huutamista/myymistä (tulossa)

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
- Domain: **skrm.fi** (Domainhotelli, nimipalvelimet Cloudflaressa)
- DNS: Cloudflare (free)
- Sähköposti: support@skrm.fi → Cloudflare Email Routing → oma Gmail
- GitLab: https://gitlab.com/lpjr86/skrm (private)
- GitHub: https://github.com/Larzmoi/skrm (private)

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
