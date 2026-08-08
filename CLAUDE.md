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
3. **Paytrail** — oikea maksuintegraatio (nyt mock-pay-testivirta, koko Order/Cart-skaffoldi on jo valmis ja toimii mockin päällä) — vaatii OY:n
4. **Signicat** — pankkitunnistautuminen (pakollinen ennen huutamista/myymistä) — vaatii OY:n
5. **Resend** — sähköpostinotifikaatiot (odottaa skrm.fi domain-aktivoitumista Zohon jälkeen)
6. **Postin tracking API** — automaattinen toimitusseuranta (nyt myyjä syöttää seurantakoodin manuaalisesti)
7. **Cloudflare R2** — kuvat pois tietokannasta (nyt base64 suoraan Postgresissa)
8. ✅ **OBS-testi Hetznerillä — TEHTY osittain, LOPPUUN ASTI TEKEMÄTTÄ.** RTMP-vastaanotto + HLS-tiedostojen generointi + nginx-jakelu on vahvistettu toimivaksi end-to-end (curl 200 OK oikealla HLS-tiedostolla). Jäljellä: frontendin `VideoPlayer` ei vielä näytä kuvaa oikein — todennäköisesti HLS-URL:in rakennuksessa virhe. Ks. "Tunnettuja bugeja" alla.

## Tunnettuja bugeja / kehityskohteita
- **Live-video ei näy sivustolla vaikka HLS-jakelu toimii palvelinpuolella** — vahvistettu 2026-08-07 että OBS→RTMP→HLS-tiedostot→nginx-jakelu toimii täysin (`curl https://stream.skrm.fi/hls/{streamKey}.m3u8` → 200 OK, oikea content-type). Ongelma on frontendin `VideoPlayer`-komponentissa — HLS-URL:in rakennus `Show.hlsUrl`/`HLS_BASE_URL`:sta ei näytä täsmäävän oikeaan muotoon, tai selaimen konsolissa on CORS/verkkovirhe. Vaatii koodin tarkistuksen, ei enää palvelinpuolen debuggausta.
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

## SEURAAVAKSI TEHTÄVÄT — prioriteettijärjestys (päivitetty 2026-08-07)

0. **Live-lähetyksen esikatselu ennen julkista näkyvyyttä** (ks. osio alla) — kriittinen ennen julkaisua, havaittu juuri OBS-testauksessa Hetznerillä, kaiken edellä koska striimaus on paraikaa aktiivisessa testauksessa
1. **Kategoriafokus: Keräilykortit ainoana** (ks. osio alla) — yhteistyökumppanin palaute, ajankohtainen
2. ✅ **Admin-paneeli + ilmiantomekanismi** — TEHTY, ks. "Tehty ✅" alla
3. ✅ **Julkinen myyjäprofiili / Storefront** — TEHTY 2026-08-07, ks. "Live-ominaisuudet Whatnot-tasolle" -osion kohta 4
4. **Loput "Live-ominaisuudet Whatnot-tasolle" -osion kohdista** (ennakkotarjoukset, chat-moderointi, giveaway) — seuraava tehtävä kategoriafokuksen jälkeen. Suositeltu järjestys: 1 (ennakkotarjoukset) ensin, koska storefront on nyt valmis sen edellytykseksi (ostaja löytää tulevat huutokaupat korostettuna myyjäprofiilista).
5. **Tarjoa hintaa -toiminto** (ks. osio alla) — päätetty ja valmis toteutettavaksi, ei vielä tarkkaa sijaintia järjestyksessä loppujen live-ominaisuuksien jälkeen

**SV-käännös (`frontend/lib/i18n/sv.ts`) jää odottamaan** — ei tehdä vielä, matalampi prioriteetti kuin yllä olevat. FI ja EN ovat ajan tasalla.

## Striimin viive — LUKITTU vaatimus, kahdessa vaiheessa (päivitetty 2026-08-08)

Nykyinen viive (OBS→katsoja) on **~30 sekuntia** nginx-rtmp:n klassisella HLS:llä.

**Vaihe 1 — ✅ TEHTY 2026-08-08, tavoite 5-10 sekuntia:**
- `hls_fragment` 2s → 1s
- `hls_playlist_length` 10s → 4s
- hls.js: `liveSyncDurationCount: 2`, `maxLiveSyncPlaybackRate: 1.3` sekä katsojan että myyjän soittimiin
- **Mittaustulos:** synteettinen ffmpeg-publikointi tuotantoa vasten, segmentit tulevat tasaisesti 1.0s välein, playlist pitää tarkan 4s-ikkunan — palvelinpuolen laskennallinen viive n. 3-5s, tavoitteen (5-10s) sisällä
- **Rehellinen varaus, ei vielä lopullisesti vahvistettu:** mittaus on palvelinpuolinen (synteettinen lähde, paikallinen RTMP) — oikea OBS + verkkoyhteys + katsojan laite lisäävät päälle jonkin verran viivettä. **Seuraava askel: mittaa oikea päästä-päähän-viive oikealla OBS-striimillä ja kellolla (esim. näytä stopwatch kameralle, katso viive selaimessa).** Jos oikea mitattu viive ylittää 10s, Vaihe 2 kannattaa aikaistaa.

**Vaihe 2 (vahvistettu tulevaksi, ei enää kysymysmerkki, EI ALOITETTU): MediaMTX-migraatio, tavoite alle 5 sekuntia, mieluiten 3.** Klassinen HLS ei pysty luotettavasti alle 5s:n riippumatta viritystasosta — tämä vaatii WebRTC:tä (alle 1s) tai LL-HLS:ää (2-5s), kumpaakaan nginx-rtmp ei tue. MediaMTX ratkaisee tämän, ja sama työ palvelee myös mobiilin asennuksetonta striimausta (ks. "Selainpohjainen mobiilistriimaus" -osio) — yksi migraatio, kaksi hyötyä. Ei aikataulutettu vielä tarkasti, mutta on vahvistettu tehtäväksi, ei valinnainen "ehkä joskus" -kohta.

## Mobiilin live-näkymä — LUKITTU vaatimus (2026-08-08)

Koska suuri osa käyttäjistä on mobiililla, tämä on lyötävä lukkoon molemmille — sekä myyjän live-konsolille (kuvattu "Stream-konsolin uudelleenrakennus" -osiossa) että katsojan `/live/[showId]`-sivulle:

- **Video täyttää koko ruudun** (full-screen, ei skaalattu pieneksi laatikoksi sivun sisällä)
- **Sivu ei saa liikkua/scrollata mihinkään suuntaan** kun ollaan live-näkymässä — ei ylös/alas eikä sivuille. Kiinteä viewport, ei normaalia sivun scrollausta.
- **Kaikki muu (napit, chat, tuotetiedot, huutokauppadata) rakennetaan videon PÄÄLLE overlayna**, ei erillisinä paneeleina jotka veisivät tilaa videolta tai pakottaisivat scrollaamaan nähdäkseen ne

Tämä koskee nimenomaan mobiilia. **Desktop on eri optimointikohde**, käsitellään erikseen (nykyinen kolmen paneelin rinnakkaisrakenne — jono/nykyinen tuote/chat — sopii paremmin isommalle näytölle eikä sitä tarvitse pakottaa samaan full-screen-overlay-malliin kuin mobiilia).

## Selainpohjainen mobiilistriimaus (WebRTC) — TULEVAISUUDEN HARKINTA, ei kiireellinen, mutta hyvin tutkittu 2026-08-08

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

### 1. Ennakkotarjoukset (Pre-bidding)
- Koskee **vain huutokauppatyyppisiä tuotteita**: perinteinen huutokauppa (`saleType: "auction"`) ja live-tuotteet jotka kuuluvat vielä `SCHEDULED`-tilassa olevaan Show'hun. Ei suoramyyntiin (`saleType: "suora"`), koska siellä ei ole huutamista.
- Tekninen pohja on jo olemassa: `Bid`-mallissa `showId` on jo nullable ("null perinteisen huutokaupan huudoille"), eli malli tukee jo huutoja jotka eivät liity käynnissä olevaan liveen.
- Toteutus: salli huudon jättäminen tuotteelle jonka `Show.status === 'SCHEDULED'` (nyt oletettavasti sallitaan huudot vain kun `status === 'LIVE'` — tarkista ja avaa tämä ehto scheduled-tuotteille). Kun show alkaa, korkein ennakkotarjous on jo `Product.currentBid`, live jatkuu siitä normaalisti.
- Ilmoita huutaneelle jos hänet ohitetaan ennakkovaiheessa (käytä olemassa olevaa `OUTBID`-ilmoitustyyppiä).

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
