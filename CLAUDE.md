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
      kategoriat.ts               — 14 kategoriaa + alakategoriat {fi, en} (LUKITTU, ks. "Kategoriat"-osio — kommentti oli vanhentunut, korjattu 2026-08-07)
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

## Tekemättä (prioriteettijärjestyksessä — päivitetty 2026-08-07, ks. myös "SEURAAVAKSI TEHTÄVÄT" alempana ominaisuuksien osalta)
1. **Ennakkotarjoukset, chat-moderointi, giveaway** — seuraavat isot ominaisuudet nyt kun storefront on valmis, ks. "SEURAAVAKSI TEHTÄVÄT"
2. **Deploytaus** — Hetzner (backend+DB, nginx-rtmp) + Vercel/Netlify (frontend) — odottaa palvelimen ostoa/OY:tä
3. **Paytrail** — oikea maksuintegraatio (nyt mock-pay-testivirta, koko Order/Cart-skaffoldi on jo valmis ja toimii mockin päällä) — vaatii OY:n
4. **Signicat** — pankkitunnistautuminen (pakollinen ennen huutamista/myymistä) — vaatii OY:n
5. **Resend** — sähköpostinotifikaatiot (odottaa skrm.fi domain-aktivoitumista Zohon jälkeen)
6. **Postin tracking API** — automaattinen toimitusseuranta (nyt myyjä syöttää seurantakoodin manuaalisesti)
7. **Cloudflare R2** — kuvat pois tietokannasta (nyt base64 suoraan Postgresissa)
8. ✅ **Hetzner-palvelin + nginx-rtmp** — TEHTY 2026-08-07, testattu end-to-end ffmpeg-simulaatiolla, ks. "Videostreami"-osio. Jäljellä: DNS-propagoinnin varmistus + oikea OBS-testi käyttäjän toimesta.

## Tunnettuja bugeja / kehityskohteita
- **Tuotteen poisto jolla on jo huutoja kaatuu raakaan Prisma-virheeseen** (`DELETE /products/:id`, myyjän oma poisto dashboardista) — FK constraint violation, ei käsitelty. Admin-poistoon (`DELETE /admin/products/:id`) tämä on jo korjattu (siivoaa Bid/AutoBid/CartItem ensin) — sama korjaus pitäisi tehdä myös myyjän omaan poistoreittiin.
- `socket.ts`:n live-lähetyksen socket-pohjainen huutojärjestelmä ei käytä `bidIncrement`-minimikorotusta ollenkaan (korjattu vain `auctions.ts`:ssä, perinteisille huutokaupoille)
- Selaa-sivun saleType-kuplat (Kaikki/Suoramyynti/Huutokaupat) voivat olla turha kaksinkertainen jaottelu Navbarin ylätason navigoinnin kanssa — ei päätetty, ks. "Selaa-sivun saleType-kuplat" alempana

## Infrastruktuuri

### Domain & DNS
- Domain: **skrm.fi** (Domainhotelli, nimipalvelimet Cloudflaressa: julio + samara)
- DNS: Cloudflare (free)
- Sähköposti: support@skrm.fi → **Zoho Mail (maksullinen taso, muutama €/kk) — päätetty, ei vielä käyttöönotettu.** Antaa sekä vastaanoton että lähetyksen samasta osoitteesta (Cloudflare Email Routing hoiti vain vastaanoton, ei lähetystä samasta osoitteesta, siksi vaihdettu). Vaatii DNS-tietueiden lisäyksen Cloudflareen (MX + verifiointi Zohon ohjeiden mukaan) — tekemättä vielä.

### Hetzner — striimaustestausta varten NYT, koko projektin lopullinen koti MYÖHEMMIN (päätetty)
- Palvelin: **CX23** (~6€/kk), Hetzner Cloud VPS
- **Vaihe 1 (nyt):** nginx-rtmp-asennus ja OBS-yhteyden testaus end-to-end — ei vielä tuotantomittakaavan palvelin, riittää yhden striimin testaukseen. Backend/DB pysyvät toistaiseksi Railwaylla, Hetzner hoitaa aluksi vain striimauksen.
- **Vaihe 2 (myöhemmin, päätetty 2026-08-07):** kun tekemättömät päivitykset (ks. "SEURAAVAKSI TEHTÄVÄT") on saatu tehtyä ja livestriimauksen hiominen alkaa Hetznerillä, **koko projekti (backend + DB + frontend) siirretään Hetznerille** — ei enää kolmea eri palveluntarjoajaa (Railway + Netlify×2 + Hetzner). Ei tarkkaa päivämäärää, laukaisin on "striimaus toimii ja sitä aletaan hioa", ei erillinen OY-riippuvuus.

### Hosting — VÄLIAIKAINEN (Railway + Netlify NYT, siirtyy Hetznerille yllä olevan Vaihe 2:n mukaisesti)
Kaikki alla oleva on tarkoituksella tilapäistä — siirtyy kokonaan Hetznerille kun striimaus on validoitu ja sen hiominen alkaa (ks. yllä). Ei kannata maksaa Hetznerin ylläpidosta kuukausia etukäteen ennen sitä.
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

*(Tämän päivityksen "Tekemättä"-lista on vanhentunut ja poistettu — kaikki tuolloin listatut kohdat paitsi infrastruktuuri/maksut on sittemmin tehty. Ks. ajantasainen lista tiedoston alusta "## Tekemättä".)*

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

### ✅ TEHTY 2026-08-07 — Hetzner-palvelin pystytetty, striimaus testattu end-to-end
- **Palvelin:** CX23, Ubuntu 26.04, Helsinki (hel1), IP `77.42.121.137`. SSH avainpohjainen (ed25519, kommentti "habacards-palvelin"), salasanakirjautuminen ja root-salasanakirjautuminen suljettu (`PasswordAuthentication no`, `PermitRootLogin prohibit-password`).
- `nginx` + `libnginx-mod-rtmp` (apt-paketti, ei tarvinnut kääntää lähdekoodista). Konfiguroitu tarkalleen `infra/nginx-rtmp.conf`-referenssin mukaan: RTMP portissa 1935, HLS `/tmp/hls`, `/hls`-sijainti + `/health`-tarkistus portissa 80.
- `ufw`-palomuuri: sallittu 22 (SSH), 1935 (RTMP), 80 (HTTP/HLS).
- **Webhook-silta (tärkeä poikkeama referenssistä):** `nginx-rtmp`-moduulin `on_publish`/`on_publish_done` eivät tue HTTPS-kohteita (vain plain HTTP) — Railwayn tuotantobackend on HTTPS-pakotettu. Ratkaisu: lisätty paikallinen nginx-palvelin `127.0.0.1:8081` joka proxataan (`proxy_pass` + `proxy_ssl_server_name on`) osoitteeseen `https://skrm-production.up.railway.app`. `on_publish`/`on_publish_done` osoittavat nyt tähän paikalliseen proxyyn eivätkä suoraan Railwayyn.
- **DNS:** `stream.skrm.fi` A-tietue → `77.42.121.137` (harmaa pilvi/DNS-only) — käyttäjä lisää itse Cloudflaren dashboardista, ei vielä propagoitunut viimeisimmän tarkistuksen mukaan.
- **RTMP_URL/HLS_BASE_URL Railwaylla:** ei asetettu eksplisiittisesti — koodin oletusarvot (`rtmp://stream.skrm.fi/live`, `https://stream.skrm.fi/hls`) ovat jo oikeat, joten env-muuttujia ei tarvinnut lisätä.
- **Testattu end-to-end ffmpeg-testikuvalla** (simuloi OBS:ää) tuotanto-backendia vasten: loi oikean Show:n `/shows`-reitillä → sai streamKey:n → `ffmpeg` julkaisi `rtmp://localhost:1935/live/{streamKey}` Hetznerin omalta koneelta → `on_publish`-webhook ampui oikeaan Railway-backendiin → Show `SCHEDULED → LIVE` **automaattisesti** → HLS-segmentit + playlist generoituivat ja olivat haettavissa HTTP:n yli → ffmpeg pysäytetty → `on_publish_done` ampui → Show `LIVE → ENDED` **automaattisesti**. Täyttää LUKITTU-automaattisuusvaatimuksen (ei manuaalisia vaiheita). Testidata siivottu tuotanto-DB:stä jälkikäteen.
- **Työkalut asennettu tätä varten:** `hcloud` CLI ladattu suoraan GitHubista käyttäjän omaan `bin`-kansioon (ei admin-oikeuksia vaadittu, Chocolatey epäonnistui oikeuksien puutteeseen) ja kirjautunut kontekstilla `skrm` (käyttäjä loi API-tokenin itse Hetzner-konsolista, token ei koskaan kulkenut tämän keskustelun kautta).

### ✅ TEHTY 2026-08-07 (myöhemmin samana päivänä) — DNS varmistettu + löytyi ja korjattiin oikea katsojabugi
- **DNS propagoitui** — `stream.skrm.fi` → `77.42.121.137` vahvistettu toimivaksi useasta julkisesta resolverista (1.1.1.1, 8.8.8.8). Domainin nimipalvelimet (`julio`/`samara.ns.cloudflare.com`) olivat jo oikein delegoitu.
- **Käyttäjä testasi oikealla OBS:llä — katsojan sivu jäi jumiin "lataa"-tilaan videokuvaa odottaessa.** Syy löytyi: kaikkien show'jen `hlsUrl` on `https://stream.skrm.fi/hls/...` (HTTPS-skeema koodin oletusarvona), mutta Hetzner-palvelin kuunteli tässä vaiheessa vain porttia 80 (plain HTTP) — porttiin 443 ei vastannut mitään (`curl https://stream.skrm.fi` → connection timeout). Koska sovellus (Netlify) on itse HTTPS, selain ei olisi edes sallinut HTTP-fallbackia (mixed content) vaikka sellainen olisi tarjottu — video jäi ikuisesti odottamaan manifestia joka ei koskaan tullut.
- **Korjaus:** asennettu `certbot` + `python3-certbot-nginx`, hankittu oikea Let's Encrypt-sertifikaatti `stream.skrm.fi`:lle (`certbot --nginx -d stream.skrm.fi --redirect`), avattu portti 443 palomuurista. Certbot konfiguroi automaattisesti HTTPS-kuuntelun + HTTP→HTTPS-uudelleenohjauksen + automaattisen uusinnan (sertifikaatti vanhenee 2026-11-05, uusiutuu itsestään).
- **Testattu uudelleen end-to-end ffmpeg-simulaatiolla HTTPS:n yli:** uusi Show → streamKey → ffmpeg-julkaisu → Show `LIVE` automaattisesti → HLS-manifesti haettavissa juuri sillä `https://`-osoitteella jota selaimen video-elementti oikeasti käyttää → `200 OK`, oikea sisältö → stream pysäytetty → Show `ENDED` automaattisesti. Testidata siivottu.
- **RTMP itse (portti 1935) ei tarvitse TLS:ää** — OBS:n RTMP-yhteys ei ollut koskaan ongelma, pelkkä katsojan HLS-toisto HTTPS:n puutteen takia.

Striimausinfrastruktuuri on nyt kokonaan valmis ja todennettu toimivaksi tuotannossa. Seuraava oikea testi on kokonaan käyttäjän toimesta: kirjaudu tuotantoon, Dashboard → Lähetys → luo lähetys → OBS:ään RTMP-osoite + stream key → aloita striimaus, ja toisella laitteella pitäisi nyt näkyä oikea videokuva muutamassa sekunnissa.

### ✅ VAHVISTETTU 2026-08-07 — käyttäjä testasi oikealla OBS:llä, live toimii. Kolme sivuhavaintoa selvitetty.
Käyttäjä teki oikean OBS-testin kahdella laitteella (`/dashboard/lahetys` lähettäjänä, `/live/[showId]` katsojana) — **video näkyi katsojalle onnistuneesti**, HTTPS-korjaus toimi tuotannossa.

Testin yhteydessä nousi kolme erillistä havaintoa, kaikki nyt selvitetty:
1. **✅ OIKEA BUGI, KORJATTU — huutokaupan "Seuraava tuote" -nappi puuttui kun lotti ei myynyt.** `dashboard/lahetys/page.tsx`: nappi näkyi ennen vain kun `isSold` oli tosi (`soldItems`-taulukko täyttyy `auction_ended`-socket-tapahtumasta VAIN jos `data.winnerId` on olemassa). Jos lotti päättyi ilman huutoja, myyjä jäi jumiin ilman tapaa siirtyä seuraavaan tuotteeseen — täsmälleen käyttäjän raportoima "en voinut valita toista kohdetta huutokauppaan". Korjaus: uusi `auctionDoneForCurrent`-tarkistus (`!auction.active && auction.productId === currentProduct.id`, riippumaton myynnistä) ohjaa nyt sekä "Seuraava tuote" -napin että viimeisen tuotteen "Kaikki käyty läpi" -tilan näkyvyyttä. "Aloita huutokauppa" (uudelleenyritys) pysyy myös tarjolla — myyjä saa nyt valinnan kumman tekee.
2. **VÄÄRÄ HÄLYTYS — "lähetykset jäävät päättymisen jälkeen Tulossa-osioon ajastettuina":** tutkittu, ei koodibugi. Kolme jäljellä ollutta testilähetystä olivat kaikki `startedAt: null` — eli `on_publish`-webhook ei ollut koskaan onnistuneesti tavoittanut backendiä niille (luotu ennen HTTPS-korjausta). `PATCH`-logiikassa ei ole mitään koodipolkua joka palauttaisi jo-LIVEksi-menneen show'n takaisin SCHEDULEDiksi — jos show oikeasti käynnistyy, se ei koskaan "palaa" ajastetuksi. Siivottu vanhat jumiutuneet testit pois.
3. **VÄÄRÄ HÄLYTYS (ratkaisematon lopullisesti, mutta ei toistunut) — "huutokauppa ei näkynyt toisella laitteella":** perusteellinen tutkinta (API palautti tuotteen oikein, backend-URL tuotantobuildissa oikein `skrm-production.up.railway.app`, autentikointiportti `proxy.ts` ei ollut syy koska käyttäjä oli kirjautuneena) ei löytänyt koodivikaa. Todennäköisesti hetkellinen häiriö samaan aikaan kun DNS/Hetzner-muutoksia tehtiin. Ei toistunut myöhemmässä testissä — jos toistuu, tutkittava lisää tarkalla selaimen virheilmoituksella.
- **Stream key -suunnittelukysymys käsitelty ja päätetty pysyväksi:** käyttäjä huomasi että jokainen uusi Show saa oman kertakäyttöisen stream keyn (ei yhtä pysyvää per käyttäjä). Esitin tradeoffin (turvallisuus vs. OBS-mukavuus) — **päätetty pitää nykyinen malli** (yksi key per lähetys, turvallisempi koska vuotanut key ei toimi seuraavaan lähetykseen). Ei koodimuutosta.

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

## SEURAAVAKSI TEHTÄVÄT — prioriteettijärjestys (päivitetty 2026-08-07)

1. ✅ **Kategoriafokus: Keräilykortit ainoana** — TEHTY 2026-08-07, ks. osio alla
2. ✅ **Admin-paneeli + ilmiantomekanismi** — TEHTY, ks. "Tehty ✅" alla
3. ✅ **Julkinen myyjäprofiili / Storefront** — TEHTY 2026-08-07, ks. "Live-ominaisuudet Whatnot-tasolle" -osion kohta 4
4. **Loput "Live-ominaisuudet Whatnot-tasolle" -osion kohdista** (ennakkotarjoukset, chat-moderointi, giveaway) — **seuraava tehtävä**. Suositeltu järjestys: 1 (ennakkotarjoukset) ensin, koska storefront on nyt valmis sen edellytykseksi (ostaja löytää tulevat huutokaupat korostettuna myyjäprofiilista).
5. **Tarjoa hintaa -toiminto** (ks. osio alla) — päätetty ja valmis toteutettavaksi, ei vielä tarkkaa sijaintia järjestyksessä loppujen live-ominaisuuksien jälkeen

**SV-käännös (`frontend/lib/i18n/sv.ts`) jää odottamaan** — ei tehdä vielä, matalampi prioriteetti kuin yllä olevat. FI ja EN ovat ajan tasalla.

## Kategoriafokus: Keräilykortit ainoana (✅ TEHTY 2026-08-07)

### Tehty ✅
- `frontend/lib/config.ts` (uusi) — `AKTIIVISET_KATEGORIAT: string[] = ['kerailykortit']`, ainoa kytkin. Tyhjennä palauttaaksesi kaikki 14 kategoriaa.
- `kategoriat.ts`: uusi `getNakyvatKategoriat()` palauttaa rajatun listan (tai kaiken jos `AKTIIVISET_KATEGORIAT` on tyhjä). `KATEGORIAT` itse koskematon — `getKategoria`/`getKatNimi`/`getAlaNimi` toimivat yhä kaikilla 14:llä, joten piilotettujen kategorioiden vanhat tuotteet näyttävät nimensä oikein.
- Piilotus kytketty neljään paikkaan spesifikaation mukaisesti: etusivu (`page.tsx`, mobiili+desktop), Selaa-sivu, jaettu `CategorySidebar` (Huutokaupat + Live-kaikki), Dashboard/Tuotteet-lomakkeen kategoriavalinta. Meista-sivun "14 kategoriaa" -tilastokortti piilotettu kokonaan (ei vaihdettu lukuun 1, koska 14 on yhä tekninen totuus).
- **Ei kosketettu:** `dashboard/lahetys/page.tsx`:n (live-lähetyksen luonti) kategoriavalinta — spesifikaatio ei maininnut sitä eksplisiittisesti neljän piilotuskohdan listassa, jätetty koskemattomaksi tarkoituksella pysyäkseen tarkasti pyydetyn scopen sisällä. Pieni jäännösepäjohdonmukaisuus (myyjä voisi yhä valita "Elektroniikka" livelle) — huomioi jos tulee esiin.
- Backend-reitit eivät rajoita mitään dataa millään tavalla — koko piilotus on puhtaasti frontend-UI-tason valintalistojen suodatusta, kuten spesifikaatio vaati ("älä poista mitään").

### Keräilykorttien kolmitasoinen rakenne (✅ TEHTY) — Kategoria → Peli → Tyyppi
- **Oikea skeemamuutos:** `Product.tyyppi String?` lisätty (kolmas taso), migroitu. Muut 13 kategoriaa eivät saa kolmatta tasoa — vain Keräilykortit.
- `kategoriat.ts`: Keräilykorttien `alakategoriat` (pelit: Pokémon/Magic/Yu-Gi-Oh!/Lorcana/One Piece/Urheilukortit + uusi "Muut keräilytuotteet") saavat jokainen saman `tyypit`-taulukon (`keraiLykorttiTyypit()`-generaattorifunktio): Släbit, Sealed, Irtokortit, Tarvikkeet, Muu {peli}. Vanhat tasaiset "Tarvikkeet"/"Muut kortit" -alakategoriat poistettu (korvautuivat per-peli tyyppitasolla).
- **Oletus tehty puolestasi:** "Muut keräilytuotteet" (esim. sarjakuvat) lisätty omana pelinä Keräilykorttien sisään sen sijaan että koko top-level "Muut"-kategoria (14.) pidettäisiin näkyvissä focus-tilan aikana — pitää julkisen näkymän yhden ylätason kategorian siistinä.
- Dashboard/Tuotteet-lomake: kolmas "Tyyppi"-pudotusvalikko ilmestyy kun peli on valittu ja sillä on `tyypit`. Tuotelistan breadcrumb näyttää nyt `Kategoria › Peli › Tyyppi` kun kaikki kolme on asetettu.
- Backend (`products.ts`, `auctions.ts`): `GET /products` ja `GET /auctions` hyväksyvät `tyyppi`-query-parametrin suodattimena, `POST`/`PUT /products` tallentavat sen.
- **✅ Lisäys 2026-08-07 (myöhemmin samana päivänä):** kolmas taso (Peli → Tyyppi) puuttui alunperin selauspuolen suodattimista — käyttäjä löysi tämän heti testatessaan (etusivu: Keräilykortit → Pokémon → ei mitään sen alla). Korjattu kaikkiin kolmeen paikkaan: etusivun oma sidebar (`page.tsx`, desktop — sama kuvio kuin sillä jo oli kahdella tasolla), jaettu `CategorySidebar.tsx` (mobiili+desktop, uudet valinnaiset `activeTyyppi`/`setActiveTyyppi`-propsit — Live-kaikki ei anna niitä koska Show-malleilla ei ole yksittäistä tyyppiä, Huutokaupat antaa), ja Selaa-sivun oma sidebar (mobiili+desktop). Kaikki kolme resetoivat `activeTyyppi`:n kun ylempi taso vaihtuu.
- **Sivuvaikutuksena löytyi ja korjattiin toinen, tästä riippumaton bugi:** Selaa-sivun `auctionParams` ei koskaan lähettänyt `alakategoria`-suodatinta backendille (vain `category`) — pelin valinta ei siis vaikuttanut huutokauppatuloksiin Selaa-sivulla ollenkaan, vain suoramyyntiin. Korjattu samalla kun `tyyppi` lisättiin sinne, koska muuten uusi tyyppi-suodatin ei olisi voinut toimia oikein huutokauppojen kohdalla.
- Typecheck puhdas, kaikki neljä sivua (`/`, `/selaa`, `/huutokaupat`, `/live-kaikki`) renderöityvät virheittä.
- Testattu curlilla: tuote luotu `category=kerailykortit, alakategoria=pokemon, tyyppi=slabit` → persistoituu oikein, `GET /products?tyyppi=slabit` löytää sen, `GET /products?tyyppi=sealed` ei löydä. Piilotettu kategoria (`elektroniikka`) yhä kyseltävissä API:n kautta (data ei poistettu, vain UI-valinta rajattu). Kaikki kosketetut sivut (`/`, `/selaa`, `/huutokaupat`, `/live-kaikki`, `/meista`, `/dashboard/tuotteet`) renderöityvät virheittä. Typecheck puhdas backend + frontend.

## Kategoriafokus: Keräilykortit ainoana — alkuperäinen spesifikaatio (arkisto)

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

### 4. ✅ TEHTY (2026-08-07) — Julkinen myyjäprofiili (Storefront)
**Poikkeama spesifikaatiosta (perusteltu):** spesifikaatio olettaa ettei julkista profiilisivua ole ja ehdottaa uutta reittiä `/myyja/[username]`. Todellisuudessa `frontend/app/u/[username]/page.tsx` on jo olemassa ja tekee suurimman osan tästä (tuotteet, arvostelut, seuraa/viesti/ilmianna) — uuden rinnakkaisen reitin luominen olisi luonut kaksi URL:ia samalle konseptille. Sen sijaan laajennettu olemassa olevaa `/u/[username]`-sivua puuttuvilla osilla.

**Lisätyt puuttuvat osat:**
- **Lomamoodi ei ollut edes olemassa palvelinpuolella** — se oli pelkkä `localStorage`-tila (`skrm_vacation`-avain `dashboard/profiili/page.tsx`:ssä), näkyi vain myyjälle itselleen samalla selaimella, ei koskaan kenellekään muulle. Tämä oli spesifikaation virheellinen oletus ("Profiilimallissa jo olemassa") — ei ollut. Lisätty oikeasti: `User.vacationUntil DateTime?` + `User.vacationMessage String?` schemaan, `PATCH /users/me` tallentaa (eksplisiittinen `null`-tuki pois päältä kytkemiseen), `GET /users/:username` palauttaa `onVacation`/`vacationUntil`/`vacationMessage` julkisesti. `dashboard/profiili/page.tsx` kirjoitettu uudelleen käyttämään backendiä localStoragen sijaan (lomapäivämäärä nyt pakollinen kun laittaa päälle, koska yhden nullable-kentän varaan ei voi rakentaa erillistä "päällä ilman päättymispäivää" -tilaa siististi).
- **Tulevat ajastetut livet + aktiiviset huutokaupat, korostettuna** — `GET /users/:username` palauttaa nyt myös `upcomingShows` (SCHEDULED-tilaiset) ja `activeAuctions` (saleType auction, ei vielä päättynyt) kyseiseltä myyjältä. `/u/[username]`-sivulla oma korostettu (accent-reunus) osio ennen tavallista tuotelistaa — juuri tämä on ennakkotarjousten edellytys (kohta 1), koska muuten ostaja ei löydä tulevia huutokauppoja ollenkaan.
- **Linkit myyjäprofiiliin tarkistettu:** tuotesivu (`/tuotteet/[id]`) ja huutokauppasivu (`/huutokauppa/[id]`) olivat jo linkitettyjä. Live-näkymässä (`/live/[showId]`) myyjän nimi/avatar EI ollut linkki kummassakaan (mobiili+desktop) — lisätty `Link`-wrapperi molempiin.
- Testattu curlilla end-to-end: lomamoodi päälle/pois vaikuttaa `onVacation`-kenttään oikein julkisessa profiilissa; `upcomingShows`/`activeAuctions` palauttavat oikeaa dataa. Sivut renderöityvät (`/u/[username]`, `/dashboard/profiili`, `/live/[showId]`) virheittä.

**Tekemättä / rajattu pois tarkoituksella:** "lomamoodi pidentää lähetysaikaa 7 päivään" -sääntöä ei ollut aiemmin valvottu koodissa mitenkään (ei 48h-lähetysdeadlinea backendissä ollenkaan, vain UI-tekstiä) — tämä on erillinen, jo olemassa oleva aukko joka ei liity tähän muutokseen, ei korjattu nyt.

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
