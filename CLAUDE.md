# HABAHUB (koodinimi SKRM) — Suomalainen Live-huutokauppa & Marketplace

## Projektin kuvaus
Habahub (projektin sisäinen koodinimi/repo-nimi on yhä "SKRM") on suomalainen live-huutokauppa- ja suoramyyntialusta. Myyjät voivat myydä tuotteitaan reaaliaikaisessa videolähetyksessä (live-huutokauppa) tai listata ne suoraan myyntiin (suoramyynti). Habahub ei ole osapuoli kaupassa — marketplace-malli kuten Whatnot.

**Domain — VAIHDETTU 2026-08-25:** ~~skrm.fi~~ → **habahub.com** (kanoninen) + **habahub.fi** (ohjautuu .com:iin, ks. "Hosting"-osio). Cloudflare DNS.
**Y-tunnus:** 3497347-6 (rekisteröity toiminimi Postin järjestelmässä: "Muistikuva Oy" — brändi "Habahub" on eri asia kuin virallinen toiminimi, ks. "Lähetysintegraatio"-osio)
**Testitunnukset:** poistettu tuotannosta 2026-08-16 (ks. "Testitilien poisto" -osio) — omistaja testaa nyt omalla Larzmoi-tunnuksella. Luo uusi testitunnus tarvittaessa `/register`-sivun kautta.

## Posti-lähetyksen E41-virhe ("Inactive pickup point") 2026-09-05 — ✅ virheviesti selkeytetty, ei muuta muutosta

Omistaja raportoi `POST /orders/:id/create-shipment`:n epäonnistuneen `500 {"error":{"message":"E41: Inactive pickup point, please choose an alternative pickup point"}}` -virheellä, sekä huomion ettei noutopistehaku "Sepänkylä"-haulla näyttänyt kaikkia mahdollisia pisteitä.

**Tutkittu suoraan tuotantodatasta, ei arvattu:** kyseinen tilaus (`cmtofp1l40001ki8je9m3vx4x`, omistajan oma tuotantotesti Larzmoi-myyjätilillä + testiuser-ostajalla, `trackingCode:"asdasdasd"` paljastaa manuaalisen testiarvon) oli valinnut noutopisteeksi `656143202` = "Postin automaatti, Ulkoautomaatti S-market Sepänkylä" (Mustasaari). Vahvistettu ettei tämä ollut oikea asiakastilaus — ei vaatinut korjausta datassa, omistaja oli jo kiertänyt sen manuaalisella seurantakoodilla nähdäkseen lopun virran.

**Kaksi löydöstä, molemmat vahvistettu suoraan Postin API:a vasten:**
1. **Noutopistehaku EI ollut rikki.** Koko Suomen 3285 pisteen datasta löytyy tasan YKSI piste Sepänkylän/Mustasaaren alueelta (edellä mainittu automaatti, `city:"Mustasaari"`, ei "Sepänkylä" — nimi tulee vain `name`-kentästä), ja haku ("Sepänkylä") löysi sen oikein `name`-kentän osumana. Vahvistettu simuloimalla frontendin täsmälleen sama suodatuslogiikka koko datasettiä vasten Node-skriptillä. Ei siis ollut kadonneita tuloksia — kyseisellä alueella ei yksinkertaisesti ole Postin datassa muita pisteitä.
2. **E41-virhe on aito ristiriita Postin KAHDEN eri API:n välillä.** `GET /pickuppoints`-listaus-API ei sisällä mitään `active`/`status`-kenttää jonka avulla voisimme suodattaa "kuolleet" pisteet pois etukäteen (vahvistettu hakemalla täydet raakakentät suoraan Postilta — vain `capabilities[]`-taulukko `parcelDropoff`/`parcelPickup`-arvoineen, ei mitään yleistä aktiivisuuslippua). Lähetyksen LUONTI-API on ainoa paikka joka paljastaa pisteen olevan käytöstä poistettu/inaktiivinen — tätä ei voi ennustaa etukäteen listaus-API:n datalla. Tämä on Postin oman datan laatuongelma, ei meidän koodimme virhe.

**Korjaus, päätetty omistajan kanssa (kysytty kahden vaihtoehdon välillä, valittiin suppeampi):** VAIN virheviesti selkeytetty — ei rakennettu ostajalle jälkikäteistä noutopisteen vaihtomahdollisuutta (harkittu, tietoisesti rajattu pois toistaiseksi). `backend/src/lib/postiClient.ts`:n `createShippingOrder()` tunnistaa nyt tämän yhden tunnetun Posti-virhekoodin (`/inactive pickup point/i`-täsmäys suoraan Postin JSON-vastauksen `error.message`-kentästä) ja heittää selkeän suomenkielisen virheen ("Ostajan valitsema noutopiste ei ole enää Postin käytössä. Pyydä ostajaa valitsemaan toinen noutopiste tilaukselleen...") sen sijaan että näyttäisi raa'an Posti-JSON-dumpin myyjälle asti. Raaka Posti-vastaus lokitetaan silti palvelimen konsoliin (`console.error`) diagnostiikkaa varten. Muut/tuntemattomat Posti-virheet näyttävät yhä teknisen raakadatan — ei yleistetty kaikkiin virhekoodeihin, koska vain tämä yksi on toistaiseksi nähty/tunnistettu tuotannossa.

**⬜ Tietoisesti rajattu pois nyt, mahdollinen jatkokehitys:** jos tämä toistuu usein, harkitse ostajalle mahdollisuutta vaihtaa noutopiste `/ostot`-sivulta niin kauan kuin `Order.trackingNumber` on vielä tyhjä (ennen kuin myyjä on onnistuneesti luonut lähetyksen) — vaatisi uuden `PATCH /orders/:id/pickup-point`-reitin + pienen UI-lisäyksen, ei tehty nyt koska tapaus on toistaiseksi harvinainen eikä oikeaa asiakastilausta ole vielä jäänyt jumiin siihen.

## Ajastetun lähetyksen Shop-paneeli tyhjä 2026-09-05 — ✅ juurisyy löydetty ja korjattu

Omistaja raportoi: ajastettu lähetys näkyy etusivulla oikein ("Ennakkotarjous auki"), mutta kun sitä klikkasi ("Katso lähetys"), Shop-paneeli oli tyhjä vaikka samalla tunnuksella oli juuri lisätty 2 tuotetta. Samalla kysyi onko ajastettu lähetys näkyvissä nyt samassa "mainostilassa" (AdSlot) jonka rakensin juuri aiemmin — **ei ole**: ajastetun lähetyksen esittely tulee erillisestä, jo pitkään olemassa olleesta `PromoBanner`-komponentista (`frontend/app/page.tsx`), joka on sisällöltään ja sijainniltaan täysin eri asia kuin uusi omistajan muokattava `AdBanner`/`AdSlot`-mainostila (joka on tällä hetkellä pois päältä, ei sisältöä syötetty vielä `/admin`:in "Mainos"-välilehdeltä).

**Juurisyy vahvistettu suoraan tuotantodatasta:** kaksi juuri lisättyä tuotetta (`showId: null`) eivät koskaan liittyneet mihinkään Show-riviin, koska ne lisättiin `dashboard/tuotteet`-lomakkeen kautta, ei `/lahetys`-live-konsolin kautta. **`POST /shows/:id/claim-products`** (liittää myyjän kaikki `PENDING`-tuotteet annettuun show-riviin) on olemassa jo aiemmasta korjauksesta (ks. "Uudet löydökset 2026-08-13, osa 4" kohta 18), mutta sitä kutsutaan VAIN `/lahetys`-sivun omasta `useEffect`:stä sivun latautuessa — jos myyjä ei koskaan avaa `/lahetys`-konsolia kyseiselle lähetykselle sen jälkeen kun on lisännyt tuotteita muualta, tuotteet jäävät pysyvästi `showId:null`-tilaan eikä `GET /shows/:id` (jota katsojan Shop-paneeli käyttää) koskaan näytä niitä.

**Korjaus:** `frontend/app/dashboard/tuotteet/page.tsx`:n `save()`-funktio kutsuu nyt samaa `claimProducts()`-mekanismia heti onnistuneen UUDEN tuotteen luonnin jälkeen (ei koske `buy_now`-pelkkää suoramyyntiä, koska sitä ei ole tarkoitettu live-jonoon). **Tärkeä rajaus, tietoisesti tehty riskin takia:** kutsutaan VAIN kun myyjällä on täsmälleen YKSI `SCHEDULED`/`LIVE`-tilainen lähetys — jos niitä on useampi (kuten omistajan omalla tuotantotilillä oli tätä korjatessa: neljä samanaikaista ajastettua lähetystä, osa vanhoja/käyttämättömiä), arvaaminen kumpaan uusi tuote kuuluu olisi todellinen riski väärän lähetyksen jonon saastuttamisesta, ei vain teoreettinen. Moniselitteisessä tapauksessa (0 tai 2+ ajastettua/livenä olevaa lähetystä) myyjän pitää yhä avata `/lahetys`-konsoli kerran normaalisti, kuten ennenkin.

**Omistajan oma tuotantotilanne korjattu heti manuaalisesti:** kaksi orpoutunutta tuotetta ("Pikachu ex (ASC 277)", "Iono's Bellibolt ex (ASC 279)") liitetty oikeaan "Testi"-lähetykseen (`cmtnu93ib000jmk3w705ss72h`, ajastettu 2026-09-05 klo 18:00 — tunnistettu ajoituksen perusteella ainoaksi järkeväksi kohteeksi neljästä ehdokkaasta, koska se oli luotu samana päivänä ja lähimpänä tuotteiden lisäysajankohtaa), vahvistettu `GET /shows/:id`:llä että molemmat näkyvät nyt oikein.

**⬜ Sivuhuomio, ei korjattu, tietoinen rajaus:** omistajan tuotantotilillä on neljä samanaikaista `SCHEDULED`-lähetystä, joista ainakin "Mökki stream" (ajastettu 2026-08-29, siis jo mennyt) ja "Jjhc" (ei ajastettu ollenkaan) vaikuttavat käyttämättömiltä/hylätyiltä testeiltä. Ei siivottu pois — omistajan oma päätös poistaa/peruuttaa (`DELETE /shows/:id` toimii vain `SCHEDULED`-tilaisille) jos ne ovat tarpeettomia. Näiden olemassaolo on juuri se syy miksi yllä olevaa auto-liitäntää ei tehty "arvaa lähin/uusin" -periaatteella.

## Rekisteröitymisen 14 päivän 0%-tutustumisjakso 2026-09-03 — ✅ TEHTY JA DEPLOYATTU

Selvisi miksi kolmella myyjätilillä (`habacardsoy`/`michaelbacklund`/`danielbacklund`) oli manuaalisesti asetettu `customCommissionRate:0`/`customCommissionCap:1` (ks. edellinen admin-käyttäjälista-osio): omistajan päätös — **kaikki uudet myyjät kauppaavat provisiovapaasti ensimmäiset 2 viikkoa rekisteröitymisestä.**

Omistaja tunnisti itse ongelman etukäteen: jos 0%/0€ tallennetaan `User`-riville rekisteröitymishetkellä (kuten manuaalisesti tehtiin näille kolmelle), joku joutuu 2 viikon kuluttua käymään palauttamassa jokaisen tilin käsin takaisin 3,5%/35€:oon — työlästä ja unohtuu helposti.

**Ratkaisu: ei tallenneta mitään, lasketaan joka maksuhetkellä `User.createdAt`:sta.** `backend/src/lib/paytrail.ts`: uusi `getEffectiveCommissionOverride(seller)` — jos `seller.createdAt` on alle 14 vrk vanha JA admin ei ole asettanut eksplisiittistä `customCommissionRate`/`customCommissionCap`-arvoa, palauttaa `{rate:0, cap:0}`; muuten `{rate:null, cap:null}` (→ `computeCommissionCents()`:n oma 3,5%/35€-oletus). Admin-paneelista asetettu eksplisiittinen arvo (`PATCH /admin/users/:id`) menee AINA promojakson edelle — pysyvä yliajo, ei koskaan promon piirissä. `backend/src/routes/orders.ts`:n `POST /:id/pay` (ainoa paikka missä komissio oikeasti veloitetaan) hakee nyt myyjän `createdAt`:n samassa kyselyssä kuin `customCommissionRate`/`Cap`:n ja kutsuu uutta funktiota ennen Paytrail-maksupyynnön muodostamista.

**Kolmen tilin siivous:** koska eksplisiittinen `customCommissionRate`/`Cap`-arvo menee promon edelle pysyvästi, niiden jättäminen `0`/`1`:een olisi jäädyttänyt ne SIIHEN ikuisesti (ei olisi koskaan siirtynyt promon kautta takaisin 3,5%/35€:oon). Tyhjennetty `PATCH /admin/users/:id`:llä takaisin `null`:iksi — kaikki kolme olivat rekisteröitymishetkellä (2026-09-01/03) yhä alle 14 vrk vanhoja, joten ne putoavat oikein promo-logiikan piiriin ja siirtyvät automaattisesti normaalihintaan 14 vrk:n täytyttyä ilman että kukaan koskee niihin uudestaan.

## Mainosbannerin mobiiliylivuoto + uutiskirjeen Broadcast-segmentti 2026-09-03 — ✅ TEHTY JA DEPLOYATTU

Omistaja raportoi että etusivun `AdBanner`-mainoslaatikon ("Habahub suosittelee" -badge) teksti menee muun tekstin päälle mobiilissa. Vahvistettu koodista: badge on `position:absolute, top:12` laatikon sisällä, mutta mobiilissa laatikon flex-column-sisältö alkoi heti 20px-paddingin reunasta ilman mitään varattua tilaa badgelle — badge peitti "Viikon kohokohdat" -yläotsikkotekstin. Korjattu kasvattamalla mobiilin yläpaddingia 20px:stä 40px:ään (`frontend/app/page.tsx`, `AdBanner`), muu layout ennallaan.

**Samalla kysytty "miten lähetän markkinointisähköpostin" — vastaus: Resendin oma dashboard, ei sovelluksen sisäinen ominaisuus (päätetty jo 2026-08-26, ks. "Resend"-osio Tekemättä-listassa).** Tutkittaessa löytyi kuitenkin este joka olisi tehnyt tästä käytännössä mahdotonta: `syncNewsletterContact()` (`backend/src/lib/resend.ts`) loi/päivitti kontakteja Resendiin, mutta ei koskaan liittänyt niitä mihinkään segmenttiin — Resendin uudempi SDK (6.18.1, "Audiences" korvattu "Segments"illä) vaatii `CreateBroadcastOptions`:lta pakollisen `segmentId`:n, eli ilman segmenttiä Broadcast-lähetyksen vastaanottajavalinnassa ei olisi ollut ketään valittavaa.

**Korjaus, vahvistettu suoraan Resendin API:a vasten palvelimella (kertakäyttöiset testiskriptit, poistettu käytön jälkeen):**
- Tilillä on jo valmiiksi automaattisesti luotu oletussegmentti **"General"** (id `c00636db-a207-4c30-ab19-81c8a11ff47f`, luotu 2026-09-01 kontaktisynkronoinnin käyttöönoton yhteydessä) — ei tarvinnut luoda uutta.
- `syncNewsletterContact()` kutsuu nyt `resend.contacts.segments.add({email, segmentId})`:tä jokaisen synkronoinnin yhteydessä (sekä uudelle että olemassa olevalle kontaktille), lisäksi `segments: [{id: ...}]` suoraan `contacts.create()`-varapolkuun. Kontakti liitetään segmenttiin riippumatta `subscribed`-arvosta — Resendin Broadcast-lähetys ohittaa automaattisesti `unsubscribed:true`-kontaktit segmentin sisällä, joten `unsubscribed`-lippu hoitaa sen ettei perunut tilaaja saa mitään, ei tarvitse itse poistaa/lisätä segmentistä tilan mukaan.
- Testattu suoraan API:a vasten ennen koodimuutosta: `contacts.segments.list()` palautti tyhjän listan olemassa olevalle testikontaktille (`johan.risberg@outlook.com`) ennen korjausta, `contacts.segments.add()` lisäsi sen "General"-segmenttiin onnistuneesti, `contacts.segments.list()` vahvisti jälkikäteen.

**Miten omistaja oikeasti lähettää markkinointisähköpostin nyt:** Resend-dashboard (resend.com) → Broadcasts-välilehti → New Broadcast → kirjoita sisältö → valitse vastaanottajaksi **"General"**-segmentti (nyt sisältää kaikki uutiskirjeen tilanneet käyttäjät, koska profiilisivun "Uutiskirje"-kytkin synkronoi sinne) → lähetä tai ajasta. Ei vaadi mitään koodia — tämä on täysin Resendin oman käyttöliittymän kautta, sovellus vain pitää huolen että oikeat vastaanottajat ovat siellä.

## Julkisen profiilin kaksi kriittistä bugia + seuraajalista 2026-09-03 — ✅ TEHTY JA DEPLOYATTU

Omistaja raportoi kaksi kriittistä bugia julkisella profiilisivulla (`/u/[username]`), molemmat vahvistettu koodista ja korjattu heti:

1. **Kuvaus (bio) ei näkynyt koskaan profiilissa vaikka käyttäjä oli kirjoittanut sellaisen.** Juurisyy: `GET /users/:username` -reitin (`backend/src/routes/users.ts`) Prisma-`select`-objektista puuttui `bio: true` kokonaan — kenttä oli tallessa tietokannassa mutta ei koskaan tullut mukaan API-vastaukseen. Lisätty.
2. **KRIITTINEN: profiilisivu näytti KAIKKI sivuston myynnissä olevat tuotteet, ei vain kyseisen myyjän tuotteita.** Juurisyy: `GET /products`-reitti (`backend/src/routes/products.ts`) ei koskaan lukenut `seller`-query-parametria pyynnöstä eikä käyttänyt sitä `where`-ehdossa, vaikka frontend lähetti sen jo valmiiksi — jokainen profiilisivu haki siis saman rajoittamattoman 23 tuotteen listan riippumatta siitä kenen profiilissa oltiin. Korjattu: `seller`-parametri resolvoidaan käyttäjänimestä ID:ksi, käytetään sentinel-arvoa `'__none__'` jos käyttäjänimi ei resolvoidu (sama puolustava kuvio kuin aiemmin bulkkiparserissa/nouto-suodattimessa — palauttaa tyhjän tuloksen väärän syötteen tapauksessa sen sijaan että jättäisi suodattimen kokonaan asettamatta). Testattu tuotannossa: suodatettu haku palautti oikean 1 tuotteen, suodattamaton 23, virheellinen käyttäjänimi 0.
3. **Uusi ominaisuus, ei kriittinen mutta pyydetty samalla:** seuraajalista näkyviin profiilista. `GET /users/:username/followers` (uusi reitti) + profiilisivun seuraaja-tilastosta tuli klikattava, avaa modaalin (samalla `ReportModal`-tyylisellä overlay-kuviolla) jossa lista seuraajien nimi/käyttäjänimi/avatar, jokainen linkkinä omaan profiiliinsa. Cache tyhjennetään kun oma seuraa/lopeta seuraaminen -tila muuttuu.

Sivutuotteena löytyi ja poistettiin LUKITTU "ei mock-dataa" -säännön rikkomus: `t.profile.bio`-i18n-avain sisälsi käyttämättömän, keksityn esimerkkikuvaustekstin (kaikissa kolmessa kielessä) — grepillä vahvistettu ettei sillä ollut yhtään käyttöpaikkaa koodissa, poistettu.

## Myyjän lähetysaika 48h → 4 vuorokautta + ruotsinkieliset käännökset 2026-09-03 — ✅ TEHTY JA DEPLOYATTU

Omistaja sai kritiikkiä liian tiukasta 48h-lähetysajasta, pyysi venyttämään sitä 4 vuorokauteen kaikkialla missä se mainitaan. Ks. myös LUKITTU-säännön päivitys yllä ("Liiketoimintasäännöt"). Muutettu: `frontend/lib/i18n/{fi,en,sv}.ts` (`shipIn24`-avain), `frontend/app/kayttoehdot/content.ts` (FI+EN, §5.3), `frontend/app/faq/page.tsx` (FI+EN, kolme kohtaa/kieli), `frontend/app/dashboard/profiili/page.tsx` (lomamoodi-selite), `frontend/app/meista/page.tsx` (tilastokortti — huom, arvo piti tehdä kielikohtaiseksi koska "48h" oli kielineutraali mutta "4 vrk" ei ole).

**Samalla korjattu, koodista vahvistettu, EI omistajan erikseen pyytämä mutta löytyi 48h-haun sivutuotteena:** rekisteröitymislomakkeen kaupankäyntipolitiikka-checkbox (`policyPoint3`, `lib/i18n/{fi,en,sv}.ts`) sanoi kaikissa kolmessa kielessä "3 maksamatonta tilausta johtaa banniin" — tämä on vanhentunut, LUKITTU-sääntö tiukennettiin jo 2026-08-13 niin että JO ENSIMMÄINEN maksamaton tilaus laukaisee bannin. Korjattu vastaamaan nykyistä sääntöä kaikissa kolmessa kielessä.

**Samalla hoidettu laajempi pyyntö "paljon tekstiä on kääntämättä sv":**
- **FAQ oli täysin kääntämättä ruotsiksi** (`FAQ_DATA`-objektissa ei ollut `sv`-avainta ollenkaan, `?? FAQ_DATA.fi`-fallback näytti ruotsinkielisille käyttäjille suomenkielistä FAQ:ta) — lisätty täysi `sv`-käännös, sama 4-osainen rakenne kuin fi/en.
- **Käyttöehdot ja tietosuojaseloste eivät koskaan olleet olemassa ruotsiksi** (`TERMS_SV`/`PRIVACY_SV` puuttuivat kokonaan `content.ts`-tiedostoista, sivut näyttivät aina suomea ruotsinkieliselle käyttäjälle koska `lang === 'en' ? ... : TERMS_FI` ei tunnistanut `sv`:tä ollenkaan) — lisätty molemmat, ~170 riviä käännöstä kumpikin, peilaten suomenkielisen version täyttä rakennetta (englanninkielinen versio on tiiviimpi/lyhennetty, ei käytetty pohjana). **Huom laatuvaraus: nämä ovat sitovia lakitekstejä (käyttöehdot, tietosuoja) — suositellaan että omistaja tai äidinkielinen ruotsinpuhuja lukee ne läpi ennen kuin niihin luotetaan täysin, samalla tavalla kuin mihin tahansa käännettyyn sopimustekstiin.**
- **`frontend/lib/i18n/sv.ts` oli rakenteellisesti jo täysi** (kaikki samat avaimet kuin fi.ts/en.ts, ei puuttuvia avaimia) — mutta sisälsi useita käännösvirheitä jotka löytyivät suoralla fi/en/sv-vertailulla rivi riviltä: jäänyt suomenkielinen sana kääntämättä (`bidIncrementLabel`: "Minimikorotus" → "Minsta höjning"), täysin väärät sanat (`browse: 'Mynts'` → 'Bläddra', `reasonCounterfeit: 'Afterlik'` → 'Förfalskning', `reasonMisleading: 'Förljande'` → 'Vilseledande', `reasonHarassment: 'Härvling'` → 'Trakasserier', `subcategory`/`subcategoryLabel: 'Underskattning'` [tarkoitti "aliarviointi"] → 'Underkategori', `allCities: 'Alle lägenheter'` [tarkoitti "kaikki asunnot", sekoitus norjaa] → 'Alla orter'), kirjoitusvirheitä (`Anbuad placerat` → 'Anbud placerat', `Inna kommande` → 'Inga kommande'), jäänyt englanninkielinen sana (`accepts` → 'accepterar' kahdessa kohdassa), ja rikkinäistä kielioppia (`vändas`, `tvist` pienellä, `väntar på hämtnings`, `den högsta anbuds`).

**Kaksi löydöstä jotka JÄTETTIIN KOSKEMATTA, vaativat omistajan päätöksen ennen korjausta:**
1. **Ostajan 24h/48h toimitushyväksymisikkuna on yhä epäjohdonmukainen koodissa.** LUKITTU-sääntö (ks. "Toimituksen aikataulu ja maksuturva" -osio) tiukennettiin 48h → 24h jo 2026-09-01, mutta `kayttoehdot/content.ts`:n §7 (FI) ja vastaava EN-kohta sanovat yhä "48 tuntia" — tätä ei koskettu tässä (eri sääntö kuin myyjän 4vrk-lähetysaika), koska en halunnut hiljaa muuttaa sitovaa lakitekstiä varmistamatta ensin onko 2026-09-01-päätös oikeasti jo viety koodin muualle (`backend/src/routes/orders.ts`, `backend/src/jobs/deliveryTimeline.ts`) — jos ei ole, kyseessä on laajempi, jo aiemmin olemassa ollut epäjohdonmukaisuus joka kannattaa korjata kokonaisuutena kaikkialla kerralla, ei vain käyttöehtojen tekstissä.
2. **`support@habahub.fi` on käytössä KAIKKIALLA sivustolla** (footer, FAQ, käyttöehdot, tietosuoja, meista) — mutta CLAUDE.md:n oman "Hosting"-osion mukaan kanoninen domain on **habahub.com**, ja "Tekemättä"-listan mukaan sähköposti (Zoho tms.) pitää vielä rekisteröidä uudelleen uudelle domainille — ei ole vahvistettu onko `support@habahub.fi` ylipäätään toimiva/valvottu osoite juuri nyt. Ei muutettu mihinkään (kaikki paikat käyttävät samaa osoitetta johdonmukaisesti, joten ainakaan ristiriitaa ei ole), mutta omistajan kannattaa vahvistaa toimiiko tämä osoite oikeasti ennen kuin sitä pidetään luotettavana yhteydenottokanavana.

## Esiasetusten (pohjatuotteiden) kolme löydöstä 2026-09-02 — testattu ensi kertaa

Vahvistettu koodista (`backend/prisma/schema.prisma`, `model ProductPreset`; `frontend/app/dashboard/esiasetukset/page.tsx`; `frontend/app/lahetys/page.tsx`; `backend/src/routes/presets.ts`):

1. **✅ Bugi vahvistettu: `ProductPreset`-mallista puuttuu hintakenttä kokonaan.** Nykyiset kentät: `name`, `condition`, `category`, `alakategoria`, `tyyppi`, `imageUrl`, `description`, `favorite`, `lastUsedAt` — ei mitään hintaan liittyvää. Lisää esim. `startPrice Float?` (valinnainen, koska osa esiasetuksista voi olla tarkoituksella ilman kiinteää oletushintaa) sekä esiasetusten hallintasivulle (`/dashboard/esiasetukset`) syöttökenttä sille. Kun esiasetusta käytetään livessä pikalisäyksessä, `startPrice` esitäyttää lähtöhinnan (myyjä voi silti muuttaa sitä, ei lukittu).

2. **⬜ Puuttuu: "Tallenna esiasetukseksi" -toiminto normaalista tuotteen lisäyslomakkeesta.** Vahvistettu koodista: `frontend/app/dashboard/tuotteet/page.tsx` ei sisällä mitään esiasetus-viittausta. Lisää lomakkeeseen valinnainen valintaruutu ("Tallenna tämä esiasetukseksi") joka luo `ProductPreset`-rivin samoilla arvoilla tuotteen tallennuksen yhteydessä — säästää myöhemmän manuaalisen kategoria/alakategoria/tyyppi-klikkailun kokonaan uudelleen tehtynä.

3. **✅ VÄÄRINYMMÄRRYS KORJATTU 2026-09-02 — omistaja tarkoitti eri asiaa, ja löytyi todellinen, isompi bugi.** Ei puhuttu esiasetusten suosikeista, vaan **ostajan Shop-paneelin tuotejärjestyksestä livessä** (`frontend/app/live/[showId]/page.tsx`): myyjä haluaa pystyä määräämään mikä tuote näkyy ostajille ensimmäisenä Shop-listassa, ja pystyä vaihtamaan tuotteiden järjestystä siellä.
   - **Löydös 1:** Shop-paneelin "Järjestys"-oletusvalinta (`sort === 'default'`) ei oikeasti järjestä mitään — näyttää tuotteet siinä järjestyksessä kuin backend palauttaa (todennäköisesti luontijärjestys), ei mitään myyjän hallitsemaa kenttää.
   - **Löydös 2, ISOMPI: myyjän oma jonon raahaus-järjestely (`/lahetys`-sivun "Jono"-paneeli) EI TALLENNU PALVELIMELLE OLLENKAAN.** Vahvistettu koodista — `dragIndex`/`splice`-logiikka on puhtaasti paikallista React-tilaa, ei mitään backend-kutsua tallentamaan järjestystä. Sivun päivitys menettää järjestelyn, eikä ostajan Shop-paneeli voisi koskaan lukea sitä koska sitä ei ole tietokannassa.
   - **Korjaus:** lisää `Product`-malliin `displayOrder Int? @default(0)` -kenttä. Muuta myyjän Jono-paneelin raahaus tallentamaan uusi järjestys backendiin (uusi endpoint, esim. `PATCH /shows/:id/reorder` joka ottaa tuote-ID-listan järjestyksessä ja päivittää `displayOrder`-arvot). Ostajan Shop-paneelin "Järjestys"-oletus käyttää `displayOrder`-kenttää nousevassa järjestyksessä. Tämä korjaa sekä myyjän oman järjestelyn pysyvyyden että antaa ostajalle näkyville juuri sen järjestyksen jonka myyjä on tarkoituksella asettanut.

## Admin-käyttäjälistan kaksi puutetta 2026-09-02 — ✅ KAIKKI KOLME KOHTAA TEHTY JA DEPLOYATTU 2026-09-04

Vahvistettu koodista (`backend/src/routes/admin.ts`, `GET /users`):

1. **✅ TEHTY — käyttäjälista näytti aiemmin TYHJÄN listan ilman hakua.** `if (!search...) return res.json([])` poistettu — `where` on nyt tyhjä objekti `{}` kun hakua ei ole (= kaikki käyttäjät), search-ehto rakentaa `OR`-suodattimen vain kun annettu ja ≥2 merkkiä. Frontend (`AdminUserManagement.tsx`) lataa listan nyt heti mountissa, ei enää vasta 2 merkin jälkeen.
2. **✅ TEHTY — sivutus lisätty.** `page`/`pageSize`-query-parametrit (oletus `page=1`, `pageSize=30`, katto 100 ettei yksi pyyntö voi pyytää kaikkea kerralla). Vastauksen muoto muuttui paljaasta taulukosta `{users, total, page, pageSize}`:ksi — frontend näyttää nyt Edellinen/Seuraava-napit + "Sivu X / Y" kun tuloksia on enemmän kuin yksi sivu, sekä "N käyttäjää yhteensä" -rivin.
3. **✅ TEHTY — `createdAt` ja `verified` lisätty** sekä backendin `select`iin että käyttäjäkortin näyttöön (liittymispäivä + vahvistettu/ei-vahvistettu-badge nimen/käyttäjänimen alle). Myydyt/ostetut-laskurit jätetty tekemättä kuten alun perin päätetty ("harkitse myöhemmin, ei nyt").

**Sivuhuomio, ei korjattu, EI omistajan pyytämä mutta löytyi testauksessa 2026-09-04:** `habacardsoy`, `michaelbacklund` ja `danielbacklund` (kaikki kolme real-myyjätiliä) näyttävät tuotannon datassa `customCommissionRate: 0` ja `customCommissionCap: 1` — eli 0 % komissio, 1 € katto, käytännössä lähes ilmainen kauppa Habahubille näiltä kolmelta myyjältä. En tiedä onko tämä tarkoituksellinen (esim. sovittu tarjous 200k€ inventaarion myyjille) vai jäänyt vahingossa väärästä testiarvosta kesken admin-paneelin testauksen — arvot eivät täsmää mihinkään aiemmin dokumentoituun sopimukseen. **Ei muutettu mihinkään, koska en tiedä kumpi selitys pitää paikkansa** — tarkista `/admin`-käyttäjähallinnasta ja korjaa jos tämä ei ole tarkoituksellinen.

**Testattu tuotannossa suoraan API:a vasten** (kertakäyttöinen JWT mint -skripti admin-käyttäjän ID:llä + JWT_SECRET, poistettu käytön jälkeen): haku ilman search-parametria palautti 7 käyttäjää sivutettuna (`pageSize=5` → 5 riviä + `total:7`), haku `search=larz` palautti oikein vain Larzmoin, molemmat vastaukset sisälsivät `createdAt`/`verified`.

## Neljä sähköpostimallia — ✅ INTEGROITU JA DEPLOYATTU 2026-09-03

ChatGPT teki pyydetyt neljä transaktionaalista sähköpostimallia (tervetulo/tilausvahvistus/lähetys/voitto), toimitettu ladattavana pakettina (`resend.additions.ts` + `MANUAL_PATCH.md` + `INTEGRATION.md` + `send-email-test.ts`), **ei koskenut GitHub-repoon**. Tiedostot päätyivät repon juureen nimillä `INTEGRATION2.md`/`MANUAL_PATCH.md` (`INTEGRATION.md` oli jo varattu aiemmalle admin-usermgmt-dokumentille) + `backend/src/lib/{resend.additions.ts,send-email-test.ts}`.

**Tärkeä korjaus jonka se teki itsenäisesti tarkistamalla koodin (vahvistettu oikeaksi tässä integraatiossa):**
- **Tilausvahvistus EI kuulu `POST /orders/:id/pay` -reittiin** (tämä vain käynnistää Paytrail-maksun, ei vahvista sitä) — **oikea paikka on `webhooks.ts`:n Paytrail-callback**, jossa maksu oikeasti vahvistuu.
- **Huutokaupan voitto jakautuu kahteen eri tiedostoon eri maksuajoilla:** `closeAuctions.ts` (perinteinen/passiivinen huutokaupan päättyminen, 24h maksuaika) ja `auctions.ts` (Osta heti, 2h maksuaika) — molemmat pitää käsitellä erikseen.

**Integroitu 2026-09-03 — jokainen väite tarkistettu suoraan nykyisestä koodista ennen kytkentää (toisella kanavalla ei ollut suoraa reposyy):**
- `resend.additions.ts`:n neljä funktiota (`sendWelcomeEmail`/`sendOrderConfirmationEmail`/`sendShippingNotificationEmail`/`sendAuctionWonEmail`) liitetty `backend/src/lib/resend.ts`:n loppuun, itse `resend.additions.ts` poistettu (oli vain väliaikainen siirtotiedosto — jätettynä paikoilleen se olisi rikkonut buildin, koska se viittasi `sendEmail`/`wrapper`-funktioihin ilman importteja).
- `auth.ts`: `sendWelcomeEmail` onnistuneen `prisma.user.create()`:n jälkeen — idempotentti koska sähköposti/käyttäjänimi on uniikki (P2002 hoitaa duplikaatit).
- `webhooks.ts`: `sendOrderConfirmationEmail` täsmälleen `if (status === 'ok' && order.status === 'PENDING_PAYMENT')` -haarassa (sama haara joka jo päivittää tilauksen `PENDING_SHIPPING`:ksi) — sama ehto toimii idempotenssivahtina jo ilman lisätyötä, koska toistokutsu näkee tilan jo vaihtuneeksi. Order-kysely laajennettu hakemaan `buyer`+`items.product`, koska alkuperäinen kysely haki vain paljaan Order-rivin.
- `orders.ts`: `sendShippingNotificationEmail` `POST /:id/tracking`:ssä, sama kyselynlaajennus. Idempotentti koska reitti hylkää jo-`SHIPPED`-tilauksen `order.status !== 'PENDING_SHIPPING'`-tarkistuksella ennen kuin pääsee lähetyskohtaan asti.
- `closeAuctions.ts` (24h): `sendAuctionWonEmail` heti `createOrderForAuctionWin()`-kutsun jälkeen, voittajan sähköposti/nimi haettu erikseen (`product.currentBidderId` on vain ID). Idempotentti koska `closeExpiredAuctions()` poimii vain `status:'PENDING'`-tuotteita — tuote on jo `SOLD` siinä vaiheessa, ei koskaan poimita uudestaan.
- `auctions.ts` (2h, osta heti): sama, ostajan tiedot haettu `req.userId!`:llä. Idempotentti koska toinen `/buy-now`-kutsu samalle tuotteelle kaatuu `auctionEndsAt`-tarkistukseen (asetettu juuri nyt-hetkeen) ennen kuin pääsee sähköpostikohtaan.
- Kaikki neljä lähetystä `void`-kutsuina (ei `await`), sama periaate kuin olemassa olevilla `sendPasswordResetEmail`/`sendBanNotificationEmail`-kutsuilla — Resend-virhe ei koskaan kaada API-pyyntöä.
- **Löydetty ja korjattu erikseen: `send-email-test.ts` ei ladannut `.env`:ää itse.** Ajettuna suoraan `node`:lla (ei `index.ts`:n kautta, joka on ainoa paikka joka kutsuu `dotenv.config()`:ia) `resend.ts`:n moduulitason API-avain-tarkistus näki aina `undefined`:in ja jokainen lähetys vain lokittui konsoliin oikeasti lähtemättä — vahvistettu ajamalla ennen korjausta (kaikki neljä lokittivat "RESEND_API_KEY ei asetettu"). Lisätty `import 'dotenv/config'` tiedoston alkuun, korjaus vahvistettu ajamalla uudestaan (ei enää samaa virhettä).
- **✅ Testattu tuotannossa `TEST_EMAIL=johan.risberg@outlook.com node dist/lib/send-email-test.js`:llä ja vahvistettu perillemeno 2026-09-03** (omistajan eksplisiittisesti antama testiosoite). Kaikki neljä saapuivat — aluksi roskapostiin, mutta raakaotsikoista (`Authentication-Results`) vahvistettiin `spf=pass`/`dkim=pass` (x2)/`dmarc=pass`/Microsoftin `compauth=pass reason=100` — tekninen autentikointi on siis täydellinen, roskapostisijoittelu oli Microsoftin oma uuden lähettäjädomeenin mainepisteytys (`X-MS-Exchange-Organization-SCL: 5`, `dest:J`), ei konfiguraatiovirhe. Ei vaadi DNS/koodimuutoksia, korjaantuu lähetyshistorian kertyessä.

## Uutiskirjetilaus (Resend Contacts) — ✅ TEHTY JA DEPLOYATTU 2026-09-03

Omistajan kysymyksestä ("connect the footer subscribe newsletter, also profile-sivulle nappi") — footerin uutiskirjelaatikko osoittautui täysin toimimattomaksi UI:ksi (ei `value`/`onChange`/`onClick` ollenkaan, ei backendiä missään — vahvistettu grepillä koko backendistä, nolla osumaa "newsletter"/"audience"/"subscriber"). Kaksi päätöstä kysytty ja vahvistettu ennen koodausta:
1. **Footerin anonyymi liittyminen poistetaan kokonaan, ei toteuteta erikseen** — tilaajat ovat aina jo rekisteröityneitä käyttäjiä, ei ole syytä kerätä sähköposteja ilman tiliä (välttää GDPR-kaksoisopt-in/unsubscribe-token-monimutkaisuuden anonyymille liittymiselle).
2. **Tallennus: Resendin Contacts-API**, ei pelkkä oma tietokantataulu. Omistaja antoi suoraan Resendin `resend.contacts.create/update`-koodiesimerkin ja totesi "there is no audience id" — **vahvistettu asennetun SDK:n (resend 6.18.1) tyyppimäärityksistä että `audienceId` ei ole enää pakollinen** uudemmassa Contacts-API:ssa (vanhemmat Resend-esimerkit/dokumentaatio saattavat yhä näyttää sen pakollisena) — kontaktit voivat elää ilman erillistä Audiencea.

**Toteutus:**
- `User.newsletterOptIn Boolean @default(false)` — paikallinen nopea kopio näyttöä varten, Resendin puoli on totuuden lähde varsinaista lähetystä (Resend Broadcasts) varten.
- `backend/src/lib/resend.ts`: uusi `syncNewsletterContact(email, name, subscribed)` — `resend.contacts.update()` ensin, `resend.contacts.create()` varalla. Sama epäonnistu-hiljaa-periaate kuin `sendEmail()`:llä, ei koskaan kaada profiilipäivitystä.
- `PATCH /users/me` hyväksyy nyt `newsletterOptIn`-kentän, kutsuu `syncNewsletterContact`:ia taustalla (`void`, ei blokkaa vastausta) jos arvo muuttui.
- `frontend/app/dashboard/profiili/page.tsx`: uusi "Uutiskirje"-kortti, sama visuaalinen kaava kuin olemassa olevalla lomamoodi-kytkimellä. Sivu on kokonaan hardkoodattua suomea (ei käytä `t.xxx`:ää missään kohtaa) — uusi kortti noudattaa samaa tiedoston omaa konventiota tarkoituksella, ei tuoda i18n:ää vain tähän yhteen kohtaan.
- `POST /auth/login` ja `POST /auth/register` palauttavat nyt myös `newsletterOptIn`:in käyttäjäobjektissa — muuten tuore, juuri sisäänkirjautunut sessio (frontendin `user` on `localStorage`-tallennettu tilannekuva login-vastauksesta, ei haeta uudelleen joka sivulatauksella) olisi näyttänyt kytkimen väärässä tilassa kunnes käyttäjä koskisi sitä kerran.
- `frontend/components/layout/Footer.tsx`: uutiskirjelaatikko poistettu kokonaan, orvoksi jääneet i18n-avaimet (`t.footer.newsletter`/`newsletterDesc`/`emailPlaceholder`/`subscribe`) poistettu kaikista kolmesta kielitiedostosta (vahvistettu grepillä ettei niitä käytetty muualla ennen poistoa).
- **Bugi löytyi ja korjattiin heti tuotantotestissä:** `resend.contacts.update()` EI palauta virhettä olemattomalle sähköpostille — se luo kontaktin hiljaa itse (dokumentoimaton upsert-käytös). Alkuperäinen koodi antoi `firstName`:n vain `create()`-varapolussa, joka ei koskaan lauennut tämän vuoksi — ensimmäinen tilaaja olisi aina syntynyt Resendiin ilman nimeä. Korjattu antamalla `firstName` myös `update()`-kutsussa. Vahvistettu ennen/jälkeen: ensimmäinen testi tuotti `first_name: null`, korjauksen jälkeen `first_name: "Larzmoi"`.
- **Testattu tuotannossa päästä-päähän oikealla `PATCH /users/me`-kutsulla ja `resend.contacts.get()`-tarkistuksella:** tilaus → Resend `unsubscribed:false` + oikea `first_name`; perutus → Resend `unsubscribed:true`. Omistajan oma tili palautettu testin jälkeen alkuperäiseen `false`-tilaan.

## Tilauksen yhdistämisen näkyvyys kassalla 2026-09-04 — vaatii tarkistuksen, ei vielä bugi

Omistaja testasi kassaa (checkout) ja huomasi: kun ostaa tuotteen esim. livestä ja mahdollisesti ostaa toisen tuotteen samalta myyjältä, kassalla ei näy mitään merkkiä siitä että olemassa oleva 6h-yhdistämisikkuna (ks. "Kaksi UX-löydöstä 2026-09-02", jo toteutettu ja testattu `cart.ts`:ssä + `createOrderForAuctionWin()`:ssa) tunnistaisi/yhdistäisi tilauksen aiempaan maksamattomaan tilaukseen samalta myyjältä.

**Kaksi asiaa selvitettävä, järjestyksessä:**
1. **Toimiiko yhdistäminen oikeasti tässä konkreettisessa skenaariossa** (osta livestä, osta sitten toinen tuote samalta myyjältä 6h sisällä) — testaa uudelleen tarkasti tuotannossa, tarkista tietokannasta syntyykö yksi `Order`-rivi kahdella tuotteella vai kaksi erillistä. Jos ei yhdisty, tämä on todellinen bugi jonka juurisyy pitää löytää (esim. live-ostopolku ei kutsu samaa merge-logiikkaa kuin tavallinen kori).
2. **Jos yhdistäminen TOIMII backendissä mutta ei näy käyttäjälle mitenkään** — lisää selkeä UI-viesti kassalle/ostoskoriin, esim. "Tämä tilaus yhdistetään aiempaan maksamattomaan tilaukseesi myyjältä [nimi] — yksi postikulut" kun yhdistäminen tapahtuu. Ostajan pitää voida NÄHDÄ ja luottaa siihen että yhdistäminen tapahtuu, ei vain toivoa että se toimii taustalla huomaamatta.

## Sending Code API -roolit lisätty olemassa olevaan tiliin 2026-09-04 — ✅ TESTATTU, KYTKETTY, mutta epäselvyys jäljellä

Omistaja löysi `developer.posti.com`:sta uuden vaihtoehdon "Application Account Users" -näkymässä ja lisäsi kaksi uutta API-roolia OLEMASSA OLEVAAN "Habahub"-tiliin: **"2026-04"** (Sending Code API) ja **"2025-04"** (osoittautui Pickup Point API:ksi, ks. alla). Sama `clientId`/`clientSecret` joka oli jo `.env`:issä kattaa nyt kumpaankin — ei tarvinnut uutta tunnusparia.

**✅ Rooli-/403-ongelma on ratkaistu, vahvistettu suoraan API:a vasten:** token-vastauksen `posti_fi.targets` sisältää nyt `"2026-04"`- ja `"2025-04"`-kohteet (aiemmin vain `"shippingapi"`). Sekä `x-test-environment: true` -mock-kutsu että ilman sitä tehty kutsu palauttivat `200`:n ja kelvollisen `sendingCode`:n samalla, aiemmin demo-ympäristössä luodulla `trackingNumber`:lla.

**✅ Kytketty `POST /orders/:id/create-shipment`:iin samana päivänä** (`getSendingCode()` heti `createShippingOrder()`:n jälkeen, sama `trackingNumber`). Kun koodi saadaan: `Order.sendingCode` täyttyy, `labelUrl`/`postiLabelHref` jäävät `null`:iksi (koodi ensisijainen, alkuperäinen labelless-tavoite). Kun koodia EI saada: PDF pysyy fallbackina, reitti ei koskaan kaadu — lähetys on jo oikeasti luotu riippumatta kummasta.

**⚠️ TÄRKEÄ VARAUS löytyi live-reitin omassa testauksessa, EI vain onnistunut aiempi manuaalinen testi:** kun reitti kutsuu `getSendingCode()`:ia OMALLA, juuri luodulla `trackingNumber`:llaan (ilman `noEdiCheck`-ohitusta, joka aiemmassa manuaalisessa testissä oli päällä), Posti palautti **`404 "Shipment not allowed for helposti code generation, Additional service 3196 is missing"`** — koodia EI saatu, reitti putosi oikein PDF-fallbackiin (turvallinen, suunniteltu käytös). Kokeiltiin lisätä `additionalServices:[{id:"3196"}]` lähetyksen luontipyyntöön kolmella eri kentän muodolla (`shipment.additionalServices`/`shipment.services`/`parcels[].additionalServices`) — kaikki kolme hyväksyttiin `200`:lla ILMAN validointivirhettä, mutta tämä ei todista että mikään niistä oikeasti toimi, koska Postin API ei validoi tuntemattomia kenttiä tiukasti. Seurantatesti uudella, `additionalServices`-kentällä luodulla lähetyksellä palautti Sending Code API:sta **eri virheen, `404 "Shipment not found"`** saman `noEdiCheck`-vapaan kutsun kanssa — **epäselvää onko tämä merkki siitä että kenttä toimi eri tavalla (edistyi pidemmälle validoinnissa, kompastui eri kohtaan) vai täysin irrallinen, ehkä ajoitukseen liittyvä ilmiö.** Ei jatkettu arvaamista pidemmälle useamman epäkonsistentin tuloksen jälkeen.

**Todennäköisin selitys, ei vahvistettu:** Sending Code API on dokumentoidusti "Production only" (ei omaa demo-hostia), kun taas testauksessa käytetyt lähetykset on luotu OPP v2:n DEMO-ympäristössä (`gateway.demo.posti.fi`, testisopimus 677503) — nämä kaksi saattavat olla täysin erilliset backendit joiden välillä demo-lähetys ei koskaan näy tuotannon Sending Code -haulle riippumatta mistään lisäkentästä. Tämä selittäisi sekä "missing service" - että "shipment not found" -virheet yhtä hyvin (molemmat ovat vain eri tapoja sanoa "en tunnista tätä lähetystä"), ja selittäisi myös miksi ensimmäinen "onnistunut" manuaalinen testi (ks. yllä, `noEdiCheck:true`) tuotti koodin — se ohitti sekä olemassaolo- että EDI-tarkistuksen kokonaan, joten se ei todista että Sending Code API oikeasti "tunsi" kyseisen lähetyksen, vain että se generoi jonkin koodin kysytyn trackingNumberin perusteella validoimatta mitään.

**⚠️ Korjaa aiempaa ylivarmaa muotoilua:** edellisessä päivityksessä ("✅ VAHVISTETTU TOIMIVAKSI") sanottiin liian suoraan että "todellinen kutsu... molemmat palauttivat 200:n ja kelvollisen koodin" — tekninen fakta pitää paikkansa (200 palautui), mutta `noEdiCheck:true`-ohituksen merkitys jäi silloin huomiotta: se EI ollut todiste aidosta, validoidusta toiminnasta, vain todiste että 403-rooliongelma oli poistunut. Live-reitin oma, ohittamaton testi paljasti tarkemman totuuden.

**Käytännön tila juuri nyt:** myyminen/lähettäminen EI ole rikki — `create-shipment`-reitti toimii turvallisesti, tuottaa aina joko koodin TAI PDF:n, ei koskaan virhettä käyttäjälle asti. Mutta koodi-polku on todennäköisesti käytännössä aina PDF-fallbackin varassa niin kauan kuin ollaan demo-ympäristössä (`POSTI_TEST_MODE=true`) — **ei tiedetä toimiiko aito Sending Code -haku oikeiden, tuotannossa luotujen lähetysten kanssa**, koska sitä ei ole eikä pidä testata ilman erillistä, harkittua tuotantotestiä (ks. alkuperäinen varovaisuusperiaate, ei muutu).

**⬜ Seuraava askel, jos Sending Code halutaan aidosti varmistaa ennen tuotantoa:** kysy Postilta suoraan: (1) mikä täsmällinen JSON-kenttä/muoto merkitsee lähetyksen "Additional service 3196" (Helposti/Sending Code) -kelpoiseksi `shipping/order`-pyynnössä, ja (2) toimiiko Sending Code API ylipäätään OPP v2:n DEMO-ympäristössä luoduille lähetyksille, vai vaatiiko se aina tuotannossa luodun lähetyksen riippumatta muista kentistä. Kunnes vastaus saadaan, PDF-fallback on odotettu, ei virhetila.

### Pickup Point API ("2025-04") — ✅ GET toimii, POST vaatii vielä oikean kenttämuodon

Sama uusi rooli kattoi myös Pickup Point -haun, joka oli aiemmin 403 (ks. "PÄIVITYS 2026-09-02" -osio):
- **`GET https://gateway.posti.fi/2025-04/pickuppoints/FI`** → **200**, palautti 250 oikeaa suomalaista Postin noutopistettä (nimi, osoite, aukioloajat, `parcelLocker`-tieto ym.) — aidosti käyttökelpoista dataa, ei rajattu postinumeron mukaan (koko maa kerralla).
- **`POST https://gateway.posti.fi/2025-04/pickuppoints`** → **400 VALIDATION_ERROR** kahdella eri kokeillulla body-muodolla (`{postalCode,countryCode}` suoraan JA `{searchCriteria:{postalCode,countryCode}}`) — molemmat hylättiin "Extra inputs are not permitted" -virheellä, oikea kenttänimi postinumerolle ei ole kumpikaan näistä. Ei arvattu pidemmälle.
- **Ei kytketty mihinkään** — omistajan pyyntö oli vain testata, ei kytkeä. `frontend/lib/postiPickupPoints.ts`:n 5 mock-noutopistettä ovat yhä käytössä checkoutissa. GET-reitti riittäisi jo sellaisenaan (250 oikeaa pistettä koko maalle, suodatettavissa omalla koodilla postinumeron/kaupungin perusteella ilman että POST:in tarkkaa hakumuotoa tarvitsee ratkaista ensin) jos/kun tämä halutaan kytkeä — oma erillinen tehtävänsä, ei tehty nyt.

## ⏰ 48H JULKAISUPAINE 2026-09-04 — ensimmäinen teststriimi tavoitteena, priorisointi lukittu

Omistaja ilmoitti kovan aikarajan: **48 tunnin sisällä pitäisi pystyä pitämään ensimmäinen teststriimi.** Ei enää lykätä/siirretä mitään — vain kriittinen polku etenee, loput odottavat tietoisesti.

**✅ Vahvistettu: Paytrail-sopimus EI ole vielä valmis, pysytään testitilassa (`PAYTRAIL_TEST_MODE=true`) tälle ensimmäiselle striimille — ei oikeaa rahaa, ei tuotantopainetta Paytrailin osalta.**

**Kriittinen polku ennen striimiä:**
1. **✅ Tarkistettu 2026-09-04: `canStream=true` kaikilla kolmella** (michaelbacklund, danielbacklund, Larzmoi) — vahvistettu suoraan tietokannasta, ei muuttunut tänään tehdyissä admin-paneelin muutoksissa.
2. Live-striimaus/chat/huutokauppa/osta heti — jo vahvistettu toimivaksi, ei koskettu tänään.
3. **✅ Maksu testitilassa vahvistettu uudelleen 2026-09-04 täydellä päästä-päähän-testillä** (ks. kohta 3 alla, "Iso testauskierros") — mukaan lukien tänään lisätty 14 vrk:n komissiopromo-logiikka, ei rikkonut maksun aloitusta.
4. Postitus PDF-tarralla (turvallinen fallback) — riittää, Sending Code -koodi EI ole este.
5. Tuotteiden lisäys (manuaalinen + bulkki) — jo toimii, vahvistettu myös tämän testikierroksen tuotteenluontiaskeleessa.
6. **✅ TEHTY 2026-09-04 — salasanan palautus -bugi LÖYDETTY JA KORJATTU, ks. oma osio alla.** Ei ollut varsinaista "vanhentunut"-bugia token-logiikassa itsessään (kolme oikeaa tiliä onnistui tänään, yksi 21 sekunnissa) — todellinen syy oli että uuden palautuslinkin pyytäminen mitätöi hiljaa KAIKKI käyttäjän aiemmat käyttämättömät linkit. Korjattu, testattu uudelleen tuotannossa.
7. **✅ TEHTY 2026-09-04 — checkoutin 5 mock-noutopistettä korvattu oikealla Pickup Point API GET -haulla.** Uusi `GET /posti/pickup-points` (backend, 6h muistivälimuisti) palauttaa 250 oikeaa suomalaista noutopistettä, kytketty sekä `/kori`- että `/ostot`-sivun toimitustapavalintaan. Vahvistettu tuotannossa curlilla: palauttaa oikeaa dataa (nimi/osoite/kaupunki). `lib/postiPickupPoints.ts`-mock poistettu kokonaan, ei enää käytössä missään.

### ✅ Iso testauskierros 2026-09-04 — kohdat 1-3 käyty läpi, ei löytynyt muita esteitä

**1. Salasanan palautus — juurisyy löydetty ja korjattu.** `backend/src/lib/passwordReset.ts`:n `createAndSendPasswordResetToken()` teki `deleteMany({userId, usedAt:null})` ENNEN uuden tokenin luontia — eli JOKAINEN uusi palautuspyyntö mitätöi hiljaa kaikki käyttäjän aiemmat, käyttämättömät linkit. Vahvistettu kahdella tavalla: (a) tuotannon tietokannasta — kolme oikeaa tiliä (michaelbacklund, danielbacklund, Larzmoi) käytti palautuslinkkiään onnistuneesti tänään, Larzmoi vain 21 sekunnissa luonnista, eli itse token/expiry-mekanismi EI ollut rikki; (b) suoralla toistotestillä — pyydettiin sama käyttäjä palautuslinkkiä kahdesti peräkkäin, ensimmäinen token katosi tietokannasta heti toisen pyynnön jälkeen. **Tämä täsmää täsmälleen kuvattuun oireeseen:** testimyyjä joka klikkaa "Unohditko salasanan" kahdesti (esim. luullen ettei ensimmäinen sähköposti saapunut) ja avaa sitten VANHEMMAN sähköpostin, näkee "linkki on vanhentunut tai jo käytetty" vaikka linkki on hänen näkökulmastaan tuore. **Korjaus:** `deleteMany`-kutsu poistettu — useampi token voi nyt olla samanaikaisesti voimassa, kukin edelleen itsenäisesti 1h ja kertakäyttöinen. Testattu uudelleen tuotannossa: toinen pyyntö EI enää mitätöi ensimmäistä, molemmat pysyvät käyttökelpoisina.

**2. Checkoutin noutopisteet — korvattu oikealla API:lla.** Ks. kohta 7 yllä, ei toisteta.

**3. Täysi päästä-päähän-ostotesti oikeiden reittien kautta** (ei UI:n läpi — video/OBS-osuutta ei voi automatisoida tästä ympäristöstä, mutta koko taustalogiikka kylläkin): kertakäyttöinen testi loi tuotteen (testiuser=myyjä), lisäsi ostoskoriin (testi2user=ostaja, `POST /cart/add`), teki checkoutin (`POST /cart/checkout` → Order syntyi oikein, `productTotal:9.5`), valitsi toimitustavan (`POST /orders/:id/select-shipping` → `shippingPrice:6.9`/`shippingSize:"postitus"` laskettu oikein), aloitti maksun (`POST /orders/:id/pay` → 200, `redirectUrl` palautui — **vahvistaa ettei tänään lisätty 14 vrk:n komissiopromo-logiikka (`getEffectiveCommissionOverride`) rikkonut maksun aloitusta**), ja vahvisti tilauksen näkyvän oikein sekä `GET /orders/mine`:ssä (ostaja) että `GET /orders/selling`:ssä (myyjä), molemmissa oikea `status:"PENDING_PAYMENT"`. Kaikki 7 askelta onnistuivat. Testidata (tuote/tilaus/tilausrivi) siivottu pois, vahvistettu tyhjällä hakutuloksella jälkikäteen. **Ei testattu: Paytrailin oman maksusivun klikkaus-läpi-testipankin -osuus** (sama, jo aiemmin dokumentoitu rajoitus — ei automatisoitavissa tästä ympäristöstä) eikä itse live-striimauksen video/chat-osuus (CLAUDE.md:n oma ohje: "jo vahvistettu toimivaksi, ei koskea").

**Ei löytynyt muita esteitä ensimmäiselle teststriimille tämän tutkinnan aikana.**

**Tietoisesti jätetty myöhemmäksi, EI kosketa seuraavan 48h aikana:**
- Visuaalinen tyylipäivitys (lime-väripaletti, fontit, koko sivuston restailointi)
- Footerin siivous
- SV-käännösten viimeistely
- Sending Code API:n hienosäätö (PDF-fallback riittää)
- Pickup Point API:n POST-korjaus (postinumerosuodatus) — GET-pohjainen koko listaus riittää nyt, ks. kohta 7 yllä
- Admin-paneelin lisäominaisuudet striimausoikeuden hallinnan ulkopuolella
- Kaikki tulevaisuuden ominaisuudet (Tarjoa hintaa, Settilistaus, live-esiasetukset, tilausten yhdistämisen näkyvyys kassalla, jne.)

## Viisi myöhemmin tarkistettavaa asiaa 2026-09-04 (ChatGPT-muistio) — käyty läpi, EI 48H-KRIITTISIÄ

Omistaja kävi näitä läpi ChatGPT:n kanssa muistin pidentämiseksi. Tarkistin koodista mitä pystyin — mikään näistä ei estä lähestyvää teststriimiä (Paytrail on yhä testitilassa), kaikki voidaan käsitellä striimin jälkeen.

**1. ✅ Paytrail/provisiot — VAHVISTETTU KOODISTA, EI VAADI MUUTOSTA.** Provisio VÄLITETÄÄN oikeasti Paytrailille Shop-in-Shop-mallin mukaisesti (`backend/src/lib/paytrail.ts`) — jokaisen tuoterivin `items[].merchant`-kenttä osoittaa myyjän sub-merchantiin, ja `commission`-kenttä kertoo Paytrailille kuinka paljon menee Habahubin omalle tilille. Tämä EI ole pelkkä sovelluksen sisäinen laskenta — Paytrail itse hoitaa jaon, ei vaadi omaa "pidätetty saldo" -kirjanpitoa. **Ainoa aidosti kesken oleva asia on tuotanto-onboarding**, ei koodi: testivaiheessa kaikki myyjät jaetaan samaan testisopimuksen submerchant-ID:hen (695874), oikeat per-myyjä submerchant-ID:t vaativat erillisen sopimusprosessin Paytrailin kanssa tuotantoon siirryttäessä — tämä on jo tiedostettu ja dokumentoitu koodin kommenteissa.
   - **UUSI TIETO 2026-09-04: syy miksi Paytrail-tuotantotunnuksia ei ole vielä saatu** — emoyhtiön/toisen yhtiön nimissä oli avattu duplikaattitunnukset, tämä pitää selvittää Paytrailin kanssa ennen kuin oikeat tuotantotunnukset voidaan ottaa käyttöön. Ei koodinäkökulmaa, puhtaasti sopimusasia.
   - Myös komissiotilin (eri kuin submerchant-tili) tarkka ID pitää vielä varmistaa Paytraililta tuotantovaiheessa (ks. koodin kommentti `PAYTRAIL_COMMISSION_MERCHANT_ID`).

**2. ⚠️ ALV yritysmyyjille — PRIORISOINTI NOSTETTU 2026-09-04, OSA KRIITTINEN.** Omistaja korosti: tämä on lain vaatima, ei kosmeettinen — yritysmyyjän (Y-tunnus) hintojen PITÄÄ näyttäytyä ALV sisältäen. Vahvistettu koodista: `User`-mallissa on jo `businessId`-kenttä (Y-tunnus, tyhjä yksityismyyjille) — tätä voidaan käyttää suoraan erottamaan kenelle sääntö pätee, ei tarvitse rakentaa uutta erottelua.
   - **Jaettu kahteen osaan eri kiireellisyydellä:**
     - **✅ TEHTY JA DEPLOYATTU 2026-09-04.** ALV-kanta vahvistettu suoraan vero.fi:stä ennen koodiin kirjoittamista (WebSearch + WebFetch virallisesta englanninkielisestä sivusta) — **25,5%, voimassa 1.9.2024 alkaen, yhä ajantasainen** (täsmää aiempaan viimeisimpään tietoon, ei muuttunut). Lisätty `t.product.vatIncluded`-i18n-avain kaikkiin kolmeen kieleen, oikein lokalisoidulla desimaalierottimella (pilkku fi/sv, piste en — sama käytäntö kuin sivuston muut prosenttiluvut kuten "3,5%"/"3.5%"). `backend/src/routes/products.ts` + `auctions.ts`: `businessId` lisätty seller-select-lohkoihin (ei ollut mukana ennen, frontend ei olisi voinut nähdä sitä). `ProductCard.tsx` (jaettu /selaa, /huutokaupat, etusivu) sai uuden `sellerBusinessId`-propin, sekä tuote- että huutokauppasivun hintalohkoon lisätty sama merkintä suoraan. **Ei muutettu hintaa, laskentaa tai checkout-logiikkaa mihinkään** — puhdas tekstilisäys, totuudenmukainen truthy-tarkistus (`businessId &&`, ei pelkkä `!== null`) koska tuotannon oikeassa datassa "ei asetettu" näkyy tyhjänä stringinä `""`, ei `null`:ina (vahvistettu kahdelta oikealta tililtä).
       - **Testattu suoraan tuotannon reittejä vasten** (kertakäyttöinen skripti, poistettu käytön jälkeen): asetettiin testitilille (testi3user) väliaikaisesti oikean muotoinen `businessId` ("1234567-8"), luotiin testituote, vahvistettiin että sekä `GET /products` (lista) että `GET /products/:id` palauttavat `seller.businessId`:n oikein — **ensimmäinen ajo epäonnistui koska unohdin deployata palvelimelle ennen testausta** (paikallinen build oli vihreä mutta palvelin ajoi yhä vanhaa koodia, `businessId` tuli `undefined`:ina) — korjattu tekemällä täysi commit→push→pull→build→restart-kierros ennen uudelleentestausta, jonka jälkeen molemmat reitit palauttivat oikean arvon. Testidata siivottu, tilin `businessId` palautettu alkuperäiseen tyhjään arvoon.
       - **Ei kytketty:** ostoskori/checkout/tilausnäkymät (`/kori`, `/ostot`, `/dashboard/tilaukset`) — omistajan rajaus koski nimenomaan tuotekortteja/-sivuja, ei tilausvaihetta. Voidaan lisätä myöhemmin jos tarpeen, sama periaate (truthy `businessId`-tarkistus, sama i18n-avain).
     - **⬜ EI kriittinen, odottaa striimin jälkeen:** ALV:n erittely tilaustiedoissa kirjanpitoa varten (ALV-kanta, ALV-määrä per tilausrivi tallennettuna) — tämä kytkeytyy kohdan 3 export-ominaisuuteen, isompi ja vaatii kunnollisen kartoituksen ensin.

**3. ⬜ Myynti-/ostokirjanpidon export — EI SUUNNITELTU VIELÄ.** Tarvitaan kirjanpitäjän oikeasti käyttökelpoinen export (ei pelkkä raakadata), vähintään kentät: tilausnumero, päivämäärä, ostaja, myyjä, tuote, myyntihinta, ALV/ALV-kanta, Habahubin provisio, myyjälle tilitettävä summa, maksutapa, mahdolliset palautukset/hyvitykset. Uusi, hyvin määritelty tuleva ominaisuus — ei aikataulutettu.
   - **Tarkennus 2026-09-04, muistiin tulevaa exportia varten — EI vaadi hintamuutosta nyt:** Postin oma hinnasto Habahubille on ALV 0% (postipalvelut usein ALV-vapaita B2B-laskutuksessa), MUTTA se 6,90€ postitusmaksu jonka Habahub veloittaa OSTAJALTA sisältää 25,5% ALV:n — koska Habahub itse on se joka "myy" toimituspalvelun ostajalle (Posti on vain Habahubin oma alihankkija/kuluerä, ei näy ostajalle suoraan). **Tämä koskee KAIKKIA paketteja riippumatta myyjän tyypistä** (yksityis- vai yritysmyyjä) — eri asia kuin kohdan 2 tuotehinnan ALV-sääntö joka koskee vain yritysmyyjiä. Habahubin pitää siis tilittää ALV tästä 6,90€:n toimitusmaksusta erikseen kirjanpidossaan/verottajalle. **Muista sisällyttää tämä export-ominaisuuden suunnitteluun** kun sitä aletaan rakentaa — ei vaadi mitään toimenpidettä nyt.

**4. ✅ "19 Kauppaa" -profiilibugi — JO KORJATTU TÄNÄÄN, ENNEN TÄTÄ MUISTIOTA.** Ks. edellinen korjausohje samana päivänä: `trades: 'Kauppaa'` → `'Tuotetta'`, koska laskee `products.length`, ei toteutuneita kauppoja. ChatGPT-keskustelu ei vielä tiennyt tästä korjauksesta.

**5. Myyntimäärä ja myyjästatukset — TIETOISESTI TULEVAISUUTEEN, EI NYT.** Ideoita roadmapille: näytä myyntimäärä profiilissa, mahdollinen taso/status-järjestelmä ("Tehomyyjä" tms.) myyntimäärän perusteella. Ei päätöksiä siitä lasketaanko kappaleita/kauppoja/euroja, vaikuttavatko palautukset, näytetäänkö julkisesti — kaikki avoinna, ei kiireellinen.

## Iso testauskierros 2026-09-04 (mobiili — checkout, profiili, etusivu, esiasetukset)

Omistaja testasi laajasti mobiililla, kokosi seitsemän löydöstä yhteen erään.

1. **✅ TEHTY JA DEPLOYATTU 2026-09-05 — sivutuote kohdan 2 korjauksesta.** `frontend/app/kori/page.tsx`:n noutopiste-`<select>` ja sen yläpuolella oleva postitus/nouto-valintalaatikko ovat molemmat `flex:1`-lapsia, mutta noutopisteen `<option>`-tekstit (pitkät nimi+kaupunki-yhdistelmät) ovat paljon pidempiä kuin postitus/nouto-vaihtoehtojen lyhyet tekstit — ilman eksplisiittistä `minWidth:0`:aa flexbox-lapsi ei koskaan kutistu sisältönsä luontaista leveyttä pienemmäksi (selaimen oletus `min-width:auto`), joten laatikko työntyi näytön ulkopuolelle riippumatta `flex:1`-asetuksesta. Lisätty `minWidth:0, boxSizing:'border-box'` sekä noutopiste-selectiin että sen yläpuolella olevaan pakettikoko-selectiin (`frontend/app/kori/page.tsx` ja `frontend/app/ostot/page.tsx`, molemmat samat kaksi kohtaa).

2. **✅ TEHTY JA DEPLOYATTU 2026-09-05 — juurisyy löytyi backendistä, ei frontendin suodatuksesta.** Vahvistettu suoraan Postin API:a vasten: `GET https://gateway.posti.fi/2025-04/pickuppoints/{countryCode}` palauttaa dataa SIVUTETTUNA (`pagingContinuationToken`-kenttä vastauksessa kun lisää sivuja on jäljellä), postinumerojärjestyksessä nousevasti — `backend/src/lib/postiClient.ts`:n `getPickupPoints()` haki alun perin vain ensimmäisen sivun eikä koskaan lukenut/seurannut tätä tokenia, joten se palautti järjestelmällisesti vain alimman postinumeroalueen (Helsinki/Uusimaa, 00104-10305) riippumatta mistään frontendin suodatuksesta — frontend ei koskaan nähnyt muuta dataa, koska sitä ei koskaan haettu palvelimelta asti. **Korjaus:** `getPickupPoints()` kirjoitettu `do...while`-silmukaksi joka seuraa `pagingContinuationToken`:ia kunnes se puuttuu (katto 30 kierrosta turvaksi, oikea data päättyy 14 sivuun). `PickupPoint`-tyyppiin lisätty `postalCode`-kenttä (oli aiemmin hukattu tiedosto, ei koskaan välitetty eteenpäin). Uusi `frontend/lib/api.ts`:n `sortPickupPointsByProximity(points, buyerPostalCode)` — järjestää pisteet ostajan oman postinumeron kanssa jaetun alkumerkkijonon pituuden mukaan (esim. `00xxx` vs `90xxx`, sama periaate kuin Suomen postinumeroiden alueellinen rakenne) — ei vaadi geokoodausta/etäisyyslaskentaa, riittävä "sama kaupunki/alue ensin" -heuristiikka. Molemmat checkout-sivut (`kori/page.tsx`, `ostot/page.tsx`) käyttävät tätä + uutta hakukenttää (`pickupSearch`-tila, suodattaa nimi/kaupunki/osoite/postinumero-kentistä) listan 3285 pisteen tekemiseksi käytännössä selattavaksi tavallisessa `<select>`:ssä.
   - **Testattu tuotannossa suoraan API-vastauksesta:** deployn jälkeinen `GET /posti/pickup-points`-kutsu palautti **3285 pistettä** (aiemmin vain sivun 1 verran, Helsinki-painotteinen osajoukko) — vahvistettu sisältävän mm. Rovaniemen, Ivalon, Oulun, Turun ja Kuopion pisteitä ympäri Suomea, jokainen piste sisältää nyt `postalCode`-kentän jota proximity-sort tarvitsee. 12,4 sekunnin vastausaika täsmää 14 peräkkäisen Posti-API-kutsun kanssa (yksi per sivu).

3. **✅ TEHTY JA DEPLOYATTU 2026-09-05.** `POST /orders/:id/confirm-delivery` (`backend/src/routes/orders.ts`) siirtää nyt tilauksen suoraan `SHIPPED` → `DELIVERED` samassa pyynnössä, ei enää vain aseta `deliveryConfirmedAt`:tä ja jää odottamaan. `backend/src/jobs/deliveryTimeline.ts`:n cron-jobista poistettu koko `deliveryConfirmedAt`-pohjainen 24h-haara — se oli muuttunut kuolleeksi koodiksi, koska tilaus ei koskaan enää ehdi olla `SHIPPED`-tilassa `deliveryConfirmedAt` asetettuna (molemmat tapahtuvat aina yhdessä, samassa transaktiossa). Jäljelle jäi vain shippedAt-pohjainen päivä 5/10/14-eskalaatio passiiviselle "ostaja ei reagoi ollenkaan" -tapaukselle, joka on aina ollut ennallaan. Jätetty kommentti muistuttamaan että kun Postin oikea Tracking API joskus integroidaan, "Posti sanoo toimitettu, ostaja ei ole vielä reagoinut" -tapaukselle pitää lisätä OMA 24h-ikkunansa tuonne — sitä ei ole vielä olemassa ollenkaan (Postin tracking on yhä `getTrackingStatus()`:n aikapohjainen simulaatio, ei oikea webhook).
   - `frontend/app/ostot/page.tsx`: poistettu SHIPPED-osion "maksu vapautuu Xh kuluttua" -laskuri kokonaan (käytti muuten vanhentunutta `2 * DAY_MS` eli 48h-pohjaa — sama bugikuvio kuin aiemmin `deliveryTimeline.ts`:ssä) — kuollutta UI:ta, koska kuitattu tilaus ei enää koskaan jää SHIPPED-osioon näkymään, se siirtyy suoraan olemassa olevaan DELIVERED-osioon.
   - **Testattu tuotannossa oikealla HTTP-reitillä** (kertakäyttöinen testitilaus, SHIPPED-tilassa): ensimmäinen `confirm-delivery`-kutsu → `200`, `status:"DELIVERED"` heti samassa vastauksessa. Toinen kutsu samalle tilaukselle → `400 "Tilaus ei odota vastaanottokuittausta"` (tilaus ei enää SHIPPED-tilassa, esti tuplakuittauksen luonnostaan ilman erillistä tarkistusta). Testidata siivottu.
   - **Sivulöydös:** `frontend/components/layout/Navbar.tsx`:ssä oli kaksi peräkkäistä JSX-kommenttia jotka olivat sulautuneet virheellisesti yhteen (`{/* a */ {/* b */}}`), TypeScript tulkitsi tämän tyhjäksi objektiksi jota yritettiin renderöidä JSX-lapsena (TS2322, esti puhtaan typecheckin). Ei liity tämän tehtävän varsinaiseen sisältöön, korjattu koska esti buildin.

4. **✅ TARKISTETTU 2026-09-05 — koodi luettu + palvelinpuoli testattu oikealla pushilla, ei löytynyt bugia.** Kolme osaa käytiin läpi:
   - **Selaimen lupakysely:** `frontend/lib/push.ts`:n `subscribeToPush()` kutsuu `Notification.requestPermission()`:ia oikein vain kun `Notification.permission === 'default'`, ja on kytketty käyttäjän eleen sisään kahdessa paikassa — `/ilmoitukset`-sivun "Ota ilmoitukset käyttöön" -napin klikkauskäsittelijässä JA `/u/[username]`:n "Seuraa"-napin klikkauskäsittelijässä (vain kun seuraaminen ALOITETTIIN, ei lopetettu) — molemmat oikeita käyttäjän eleitä, selain ei voi jättää lupapyyntöä huomiotta.
   - **Palaute onnistumisesta on JO OLEMASSA, toisin kuin aiemmin epäiltiin:** `ilmoitukset/page.tsx`:ssä `pushEnabled`-tila päivittyy `subscribeToPush()`:n valmistuttua (`Notification.permission === 'granted'`), jolloin nappi korvautuu tekstillä "Ilmoitukset käytössä" — ei siis puuttuva palaute, aiempi epäily koski luultavasti vanhempaa versiota ("Ota selainilmoitukset käyttöön" -löydös 2026-08-25, jo korjattu nimeltä eri asia).
   - **Palvelinpuolen lähetys testattu OIKEALLA pushilla tuotannossa:** `sendPushToUser()`-funktio (`backend/src/lib/push.ts`) ajettu suoraan testiuser-tilin olemassa olevaa, oikean selaimen aikanaan luomaa Push-tilausta vasten (`testi@testi.com`, kaksi tallennettua selainta) — molemmat lähetykset hyväksyttiin onnistuneesti push-palvelun toimesta (Mozillan autopush) ilman 410/404/muita virheitä, mikä vahvistaa VAPID-avainten (backend `VAPID_PRIVATE_KEY` + frontendin build-aikainen `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) täsmäävän oikein tuotannossa — väärä pari olisi hylätty 401/403:lla heti.
   - **Ainoa asia jota EI voitu vahvistaa tästä ympäristöstä:** ilmestyikö ilmoitus oikeasti näytölle/lukitusnäytölle — vaatisi fyysisen pääsyn siihen laitteeseen jolla tilaus alun perin luotiin, sama rajoitus kuin muillakin "vaatii oikean selaimen" -testeillä tässä projektissa (Paytrail-maksusivu, OBS-video). Palvelinpuolen hyväksytty toimitus on vahva signaali että koko ketju toimii — ei kuitenkaan sama kuin nähty ruudulla.

5. **✅ TEHTY JA DEPLOYATTU 2026-09-05.** `frontend/app/u/[username]/page.tsx`: nappirivin ulompi `<div>` (sisälsi Viesti/Seuraa/Ilmianna-napit) muutettu `flexDirection:'column'`-asetteluksi — Viesti+Seuraa jäivät omaan sisempään flex-riviinsä, "Ilmianna käyttäjä" siirtyi omalle rivilleen niiden alle (`alignItems:'flex-end'` pitää molemmat rivit oikeassa reunassa profiilikortin sisällä). Ei vaadi breakpoint-logiikkaa — sama pinottu asettelu toimii sekä mobiilissa (ratkaisee ylivuodon) että desktopilla (näyttää siistiltä myös leveällä näytöllä).

6. **✅ TEHTY JA DEPLOYATTU 2026-09-05 — molemmat osat.**
   - **Sijoitus:** `frontend/app/page.tsx`:n `AdBanner`-renderöinti siirretty pois pääsisältösarakkeen sisältä (jossa se oli `PromoBanner`:n jälkeen, sivupalkki+tuotelistan rinnalla) suoraan `<Navbar />`:n jälkeen, ennen hero-osiota — nyt aidosti AINA sivun ylin elementti riippumatta onko hero näkyvissä/piilotettu, kirjautunut/anonyymi, jne. Oma `maxWidth:1440`-kääre yhtenäistää leveyden muun sisällön kanssa.
   - **Hallinta ilman koodimuutosta:** uusi `AdSlot`-Prisma-malli (yksi rivi, `id:"main"`, kentät `enabled`/`eyebrow`/`title`/`body`/`ctaText`/`ctaHref`/`imageUrl`). `GET /ad` (julkinen, palauttaa `null` jos `enabled:false` tai riviä ei ole — `AdBanner` ei renderöi mitään silloin) + `GET/PATCH /admin/ad` (admin-suojattu, `GET` luo oletusrivin upsertilla jos puuttuu). Uusi `/admin`-välilehti "Mainos" (`frontend/app/admin/AdminAdManagement.tsx`) — päälle/pois-kytkin, yläteksti/otsikko/kuvaus/napin teksti+linkki -tekstikentät, kuvan lataus (`resizeImage()`, sama base64-konventio kuin muuallakin sivustolla), tallennus-nappi + onnistumisvahvistus. `t.home.adEyebrow`/`adTitle`/`adBody` poistettu kaikista kolmesta kielitiedostosta orpoina (korvautuivat AdSlotin dynaamisella sisällöllä) — `adLabel`/`adCta` säilytetty (kiinteä UI-kehys/fallback, ei omistajan muokattavaa mainossisältöä).
   - **Turvallisuuskorjaus deployn aikana:** `AdSlot.enabled`-oletusarvo oli aluksi `true` — tämä olisi tarkoittanut että pelkkä admin-paneelin "Mainos"-välilehden ensimmäinen avaus (joka kutsuu `GET /admin/ad`:tä, upsertaa rivin) olisi julkaissut TYHJÄN mainoslaatikon etusivulle heti, ennen kuin omistaja on ehtinyt kirjoittaa mitään sisältöä. Korjattu `@default(false)`:ksi ennen kuin riviä oli vielä olemassa tuotannossa (vahvistettu tyhjällä hakutuloksella ennen korjausta) — banneri pysyy piilossa kunnes omistaja oikeasti täyttää ja tallentaa sisällön.
   - **Testattu tuotannossa päästä-päähän oikealla admin-JWT:llä:** `GET /admin/ad` loi oletusrivin `enabled:false`:na, julkinen `GET /ad` palautti `null` samaan aikaan; `PATCH` testisisällöllä + `enabled:true` → julkinen `GET /ad` palautti heti saman sisällön; `PATCH enabled:false` palautti julkisen puolen takaisin `null`:iin. Kaikki kuusi askelta täsmäsivät odotukseen, testidata jätetty `enabled:false`-tilaan (harmiton, omistaja täyttää oikean sisällön admin-lomakkeesta).

7. **✅ TEHTY JA DEPLOYATTU 2026-09-05.** `frontend/app/dashboard/tuotteet/page.tsx` sai saman esiasetuspoiminnan kuin `/lahetys`-live-konsolin pikalisäys: "⌗ Esiasetuksista" -nappi tuotelomakkeen yläreunassa (näkyy vain UUTTA tuotetta lisättäessä, ei olemassa olevaa muokattaessa), avaa hakupaneelin (debounced haku `presetApi.list()`:lla, suosikit tähdellä), valinta esitäyttää nimi/kunto/kategoria/alakategoria/tyyppi/kuvaus/kuva-kentät — hinta jätetään aina tyhjäksi täytettäväksi (sama rajaus kuin live-konsolissa, `ProductPreset`-mallissa ei ole vielä hintakenttää, ks. "Esiasetusten kolme löydöstä" kohta 1). Onnistunut tallennus kutsuu `presetApi.markUsed()`:ia taustalla (ei blokkaa, ei kaada tallennusta jos epäonnistuu) nostaakseen pohjan listan kärkeen seuraavalla haulla.

## 📋 MITÄ ON VIELÄ TEKEMÄTTÄ (päivitetty 2026-09-02) — katso tästä ensin ennen kuin etsit muualta

**Odottaa omistajan toimintaa (ei koodia):**
- Cloudflare: aseta Minimum TLS Version → 1.2, kytke HSTS päälle (ks. "Turvallisuusauditointi"-osio, kohta A)
- Sähköposti (Zoho tms.) rekisteröitävä uudelleen uudelle domainille (`support@habahub.com`), vanha `skrm.fi`-rekisteröinti ei siirry
- Posti: odotetaan Tomin vastausta testiyhteyspyyntöön ennen kuin edetään Vaiheeseen 2 (lähetyksen luonti API v2:lla) — ks. "Lähetysintegraatio"-osio
- Päätös: "Hyvitä"-napin liiketoimintalogiikka toimitetulle/vastaanotetulle tuotteelle — ks. "Iso testauskierros" kohta 14, liittyy myös luottamuspaneelin "ei peruutuksia" -tekstiin

**✅ Footerin siivous — TEHTY (kahdessa osassa, ks. "Neljä uutta löydöstä 2026-09-02" kohta 1):** palkkio/kielletyt-rivi + brändinimi/badge-rivi poistettu (toisen kanavan committi 2026-09-03), uutiskirje-osio poistettu ja korvattu oikeasti toimivalla profiilisivun kytkimellä 2026-09-03 (ks. "Uutiskirjetilaus" -osio) — jäljellä vain 4-kolumnin linkkiruudukko + copyright, kuten alun perin päätettiin.

**Koodattavaa, ei vielä tehty (tarkistettu suoraan koodista 2026-09-02, lista päivitetty samana päivänä tehdyn työn jälkeen):**
- Käännökset (fi/en/sv) yhä osittain keskeneräiset, erityisesti tuotesivulla — EI kosketettu 2026-09-04 (48h-lukituksen SV-kohta viereinen alue, jätetty tietoisesti rauhaan)
- Sending Code API (labelless-lähetys) -integraatio — TEHTY suurelta osin (ks. "Sending Code API -roolit" -osio), 48h-lukituksen alla oleva hienosäätö (Additional service 3196 -kysymys) jäljellä

**✅ TEHTY 2026-09-04 (omistajan pyynnöstä, yleislistalta — 48h-lukitus ei koskenut näitä kahta, vahvistettu erikseen ennen aloitusta):**
- **Etusivun hero-osion turha "Ryhdy myyjäksi" -nappi poistettu.** `frontend/app/page.tsx`: hero-osion nappirivillä oli aiemmin sekä "Selaa tuotteita" että "Ryhdy myyjäksi" — jälkimmäinen toisti saman viestin kuin heti alempana oleva korostettu promo-kortti omalla CTA:llaan. Poistettu, jätetty vain "Selaa tuotteita". `heroBecomeSeller`-i18n-avain poistettu kaikista kolmesta kielestä (jäi käyttämättömäksi).
- **Kuntosuodattimen kaksi puutetta korjattu** (ks. "Kuntosuodattimen kaksi puutetta 2026-09-02" -osio): (1) **löydettävyys** — lisätty "jaettu tyyppisetti" -pikavalitsin (slabit/sealed/irtokortit/tarvikkeet, identtinen joka pelillä paitsi pelikohtainen "Muu {peli}" joka jätetty pois pikavalitsimesta) joka näkyy HETI Keräilykortit-kategorian alla, ei vaadi enää pelin valintaa ensin — `CategorySidebar.tsx`:n uusi `getSharedTyypit()`-apufunktio, sekä mobiili- että desktop-layoutiin. Syvempi peli-kohtainen tyyppivalitsin säilyi ennallaan niille jotka haluavat rajata tietyn pelin mukaan. (2) **monivalinta** — `activeCondition` muutettu `string`:stä `string[]`:ksi sekä komponentissa että molemmissa kutsujissa (`selaa/page.tsx`, `huutokaupat/page.tsx`), suodatuslogiikka `===`:sta `.includes()`:iin, desktop-listaan lisätty rastimerkit valintojen selkeyttämiseksi. Kohta 3 (muiden kategorioiden geneerinen kuntoasteikko) jätettiin tekemättä — koskee vain kategorioita jotka eivät ole tällä hetkellä edes näkyvissä kategoriafokuksen takia, ei ajankohtainen.
- **Ei visuaalisesti testattu selaimessa** (ei selpaintyökalua tässä ympäristössä) — typecheck+build vihreä, koodi luettu huolella läpi, mutta ei sama kuin nähty toiminnassa. Kannattaa pikaisesti silmäillä `/selaa`- ja `/huutokaupat`-sivut kun ollaan seuraavan kerran selaimessa.

**✅ Tarkistettu koodista 2026-09-02 ja todettu jo TEHDYKSI — poistettu tästä listasta (oli aiemmin merkitty tekemättömäksi, mutta työ oli jo tehty aiemmin samana päivänä eikä listaa oltu päivitetty sen mukana):**
- "←"-paluunappi poistettu `/lahetys`-live-konsolin live-näkymästä (säilytetty esikatselu-/asetusnäkymässä, ks. "Kaksi UX-löydöstä 2026-09-02" kohta 1 — TEHTY-merkintä siellä selittää rajauksen)
- Nouto/postitus-valinta tuotelomakkeessa muutettu pakollisesta valinnaiseksi lisäasetukseksi, `Product.allowPickup`/`allowShipping` (ks. "Kaksi UX-löydöstä 2026-09-02" kohta 2 — TEHTY-merkintä siellä)
- Etusivun "Habahub suosittelee" -mainosbanneri — `AdBanner` kirjoitettu kokonaan uusiksi, renderöityy nyt normaalissa dokumenttivirtauksessa `PromoBanner`:n alapuolella, ei enää `position:absolute`-päällekkäisyyttä minkään viereisen osion kanssa
- Kielenvalitsin (SV) — `lib/i18n/index.ts`: `Lang`-tyyppi ja `LANGUAGES`-taulukko sisältävät nyt `sv`:n
- OBS-asetukset-modaalia ei saanut suljettua — `lahetys/page.tsx`: sekä ✕-nappi (`aria-label="Sulje"`) että koko ruudun tausta joka sulkee klikkaamalla (rivi ~1279)
- Banni-varoitus maksuajastimen yhteydessä — `ostot/page.tsx` näyttää nyt "Jos maksuaika ehtii loppua, tilisi estetään automaattisesti 30 päiväksi — myös ensimmäisellä kerralla."
- Ajastettu lähetys ei käynnistynyt klikkaamalla — `dashboard/page.tsx`: koko tulevan lähetyksen rivi on nyt linkki suoraan `/lahetys`:aan
- Bulkkilistauksen sijoittelu/ohjeistus — bulkkituonti on nyt vähemmän hallitseva tekstilinkki (ei omaa taustaväriä) päänapin ("Lisää tuote") vieressä, sisältää selittävän tekstin muodosta
- Selkeä virheviesti liven aloitukselle ilman tuotteita — sekä esikatseluvaihe (`products.length === 0` → "Ei tuotteita — lisää tuotteita ensin" + linkki) että käynnissä olevan lähetyksen tyhjä jono ("Jono on tyhjä" -näkymä) käsitelty selkeästi, ei enää tyhjä/kaatuneen näköinen ruutu

**Isommat, ei aikataulutetut:**
- Visuaalinen tyylipäivitys (lime-väripaletti + Outfit/Plus Jakarta Sans + koko sivuston restailointi) — päätetty, ei aloitettu
- Slabien (gradatut kortit) oma kuntojärjestelmä (PSA/BGS-numeroarvosana) — tietoisesti rajattu pois aiemmasta korjauksesta, **priorisointi nousi 2026-09-02 WhatsApp-palautteen myötä, ks. alla oleva osio**
- "Tarjoa hintaa" -toiminto, Settilistaus/Variantit — molemmat suunniteltu, ei aikataulutettu

Kaikki muu tässä tiedostossa alempana on joko ✅ valmista (historiallinen referenssi/konteksti) tai LUKITTU-sääntöjä jotka eivät muutu.

## WhatsApp-palaute 2026-09-02 (koottu Geminillä, myyjien kommentteja) — priorisointi tekemättä, katso kolme tasoa alta

Kommenttirivin parserikorjaus (osa kohdasta 1) on jo tehty — ei toisteta tässä. Kaikki muu alla on uutta.

### 1. Cardmarket-tuonti — loput ongelmat
- ~~**Määräkentän tuplaantuminen**~~ — **RATKAISTU 2026-09-02, ei koodikorjaus.** Syy löytyi: Chrome-selain kopioi ylimääräisen numeron Cardmarketin tuotteen muokkauskentästä, Firefox ei tee tätä. Ei ole meidän puolen bugi — omistaja suositteli myyjille Firefoxin käyttöä, ratkaisee asian kokonaan. Ei vaadi mitään toimenpiteitä.
- **Kuvien tuonti ei ole mahdollista** — CM-kuvalinkkien suora kopiointi voi johtaa CM:n omaan bannnin, joten kuvat lisätään aina manuaalisesti. Ei koodikorjaus, hyväksyttävä rajoitus. Pitkän tähtäimen idea: automaattinen korttitietokanta joka hakisi setin peruskuvan jos myyjä ei lisää omaa.
- **Kommenttikentästä pitäisi poimia enemmän kuin pelkkä vapaateksti** (nyt koko kommentti menee sellaisenaan `description`-kenttään, mikä on hyvä perusta mutta ei riitä rakenteelliseen hakuun/näyttöön):
  - Fyysinen säilytyspaikka (esim. "Map W1") — pitäisi näkyä myös liven aikaisessa haussa (ks. kohta 2)
  - **Gradattujen korttien tiedot (luokitusyhtiö, sertifikaattinumero, arvosana, subgradet)** — **tämä liittyy suoraan aiemmin tietoisesti sivuun jätettyyn "slabit"-kuntojärjestelmään** (ks. "Kuntoluokitus Cardmarket-muotoon"-osio, kohta 3: "EI kosketeta tässä korjauksessa... tarvitsisi oman gradingCompany+grade-kenttäparin"). Tämä palaute nostaa sen priorisointia — ei ole enää "joskus myöhemmin", vaan aidosti kysytty ominaisuus.
  - Tarkemmat "puolikunnot" (esim. "NM-"/"EX+") — nykyinen Cardmarket-asteikko (M/NM/EX/GD/LP/PL/PO) ei tue plus/miinus-tarkennuksia
  - Reverse Holo -tieto (ellei lisätä myöhemmin kuvan yhteydessä)

### 2. Live-lähetykset / "Live Shop" — uusia ongelmia ja ideoita

**✅ TEHTY 2026-09-03 — lähtöhinnan muokkaus + esiasetukset/suosikit/haku.** Omistajan valitsemat kaksi kohtaa neljästä (kysytty erikseen ennen toteutusta, ks. alla tarkat toteutuspäätökset). Loput kaksi (tuplamyyntiriski, automaattinen varastosaldon päivitys) ovat yhä auki, ks. niiden omat kohdat alempana — ei kosketettu.

- **✅ TEHTY — Suoramyyntituotteen lähtöhintaa voi nyt muokata kun se nostetaan liveen.** Aiemmin varastosta poimitun tuotteen tallennettu hinta lukkiutui automaattisesti huutokaupan lähtöhinnaksi. `frontend/app/lahetys/page.tsx`: uusi `startPriceOverride`-kenttä alapalkin "Lähtöhinta"-syötteessä juuri ennen "Aloita huutokauppa" -nappia — session-kohtainen ylikirjoitus, sama periaate kuin jo olemassa olevalla kesto-ylikirjoituksella (`durationOverride`, nollautuu kun `currentProductId` vaihtuu, ei muuta `Product.startPrice`-tietuetta pysyvästi). `backend/src/socket.ts`:n `start_auction`-käsittelijä validoi nyt syötteen (aiemmin luotti suoraan tuotteen omaan tallennettuun hintaan, nyt käyttäjän syöte — virheellinen/negatiivinen arvo putoaa takaisin tuotteen tallennettuun `startPrice`:en). Testattu tuotannossa oikealla socket-yhteydellä (`socket.io-client`): ylikirjoitettu hinta meni läpi oikein, virheellinen syöte (`'not-a-number'`) putosi oikein takaisin tallennettuun hintaan.

- **✅ TEHTY — Esiasetukset/suosikit/haku livessä.** Kolme design-päätöstä kysytty ja vahvistettu ennen toteutusta:
  1. **Pohjien lähde: manuaalinen hallintanäkymä** (ei automaattinen generointi aiemmista tuotteista).
  2. **Livesyöttö: otsikko + lähtöhinta täytetään joka kerta**, loput (kunto/kategoria/kuva/kuvaus) peräisin pohjasta — kesto tulee jo olemassa olevasta huutokaupan aloitusnäkymästä (ks. yllä), ei tarvinnut omaa kenttää.
  3. **Haku: vain esiasetusten sisällä** (ei laajennettu kattamaan kaikkia myyjän tuotteita).

  **Toteutus:**
  - Uusi `ProductPreset`-malli (`sellerId`, `name`, `condition`, `category`/`alakategoria`/`tyyppi`, `imageUrl`, `description` — kuvaus/sijainti kuten "Map T1", `favorite Boolean @default(false)`, `lastUsedAt DateTime?`). Puhdas lisäys tuotantoon, ei datamigraatiota (uusi taulu).
  - `backend/src/routes/presets.ts`: `GET /presets?search=` (hakee nimestä JA descriptionista — sijaintihaku toimii samalla haulla), `POST /presets`, `POST /presets/bulk` (oma tuontimuoto, EI sama kuin tuotteiden bulkkituonti: tyhjä rivi erottaa pohjat eksplisiittisesti, 1. rivi nimi/2. rivi kunto/loput kuvaus — ei tarvitse €-merkki-tunnistusta koska ei hintaa/määrää), `PUT /presets/:id` (myös suosikin vaihto), `POST /presets/:id/use` (merkitsee `lastUsedAt`, nostaa listan kärkeen), `DELETE /presets/:id`.
  - Lajittelu: `favorite DESC → lastUsedAt DESC NULLS LAST → name ASC` — suosikit aina kärjessä, sitten viimeksi käytetyt, muuten aakkosjärjestys.
  - Uusi hallintasivu `frontend/app/dashboard/esiasetukset/page.tsx` (linkki dashboard-sivupalkkiin) — manuaalinen lomake (samat kategoria/alakategoria/tyyppi/kunto-valitsimet kuin tuotelomakkeella, Cardmarket-asteikko kun tyyppi=irtokortit) + bulkkituontipaneeli, hakukenttä, suosikkitähti/muokkaa/poista per rivi.
  - `/lahetys`-integraatio: Jono-paneelin "+ Lisää tuote" -napin viereen uusi "⌗ Esiasetuksista" -nappi, avaa hakupaneelin (debounced haku, suosikit tähdellä merkitty). Pohjan valinta esitäyttää quick-add-lomakkeen näkymättömät kentät (kunto/kategoria/kuva/kuvaus) + näkyvän nimen, jättää hinnan tyhjäksi täytettäväksi. Onnistunut lisäys kutsuu `POST /presets/:id/use`:a taustalla (ei blokkaa tuotteen lisäystä jos epäonnistuu).
  - Testattu tuotannossa curlilla end-to-end: yksittäisluonti, bulkkituonti (3 pohjaa, kaikki kentät oikein parsittu — nimi/kunto/kuvaus-vain, kunto+kuvaus, pelkkä nimi), suosikin+käytön merkintä, lajittelujärjestys vahvistettu oikeaksi. Testidata siivottu pois.

### 3. Ohjeistus & kumppanuudet — EI koodia, omistajan omia tehtäviä
- Lyhyet opastusvideot myyjille (tuotteen lisäys, CM-varaston tuonti)
- Yhteydenotto isompiin toimijoihin (esim. Korttistoppi, TCG Kauppa) kilpailukykyisellä 3,5%-provisiolla

## Kaksi UX-löydöstä 2026-09-02 (paluunuoli livessä + nouto/postitus-valinnan tarpeellisuus)

1. **✅ TEHTY 2026-09-02 — "←"-paluunappi poistettu `/lahetys`-live-näkymästä.** `BackButton`-komponentin `overlay`-käyttö (`<BackButton overlay />`, live-näkymän video-alueen kulmassa) poistettu kokonaan — "Lopeta"-nappi yläpalkissa hoitaa tarkoituksellisen poistumisen. **Rajaus, tietoinen päätös:** esikatselu-/asetusnäkymän (`isLive === false`) oma `<BackButton />` SÄILYTETTY — kaksi syytä: (a) siellä ei ole vielä käynnissä olevaa streamia jota vahingossa katkaista, raportoitu ongelma ei koske sitä; (b) LUKITTU "Stream-konsolin uudelleenrakennus" -sääntö vaatii jonkin paluureitin täysnäkymä-layoutissa koska dashboard-kehys on piilotettu — nappi poistettuna kokonaan olisi jättänyt esikatselunäkymän ilman mitään tapaa palata dashboardiin. Jos tämä rajaus ei vastaa tarkoitusta, kerro niin — poisto laajenee helposti myös esikatseluun.
   - Yläpalkin vasen padding (54px/60px) kavennettu 10px/16px:ksi live-näkymässä, koska mikään ei enää ankkuroidu siihen kulmaan.
   - **Sivuhuomio, ei pakollinen nyt:** "Jono"-nimi/-nappi saattaisi olla selkeämpi nimettynä "Kauppa"/"Shop":ksi — ei tehty, ei kiireellinen.

2. **✅ TEHTY 2026-09-02 — nouto/postitus muutettu pakollisesta valinnaisiksi rajoituksiksi.** `Product.pakettikoko` (String, `'postitus'`/`'nouto'` joko-tai) korvattu kahdella boolean-kentällä: `allowPickup`/`allowShipping`, oletus `true` molemmille. Tuotelomakkeessa "Toimitus"-kortti on nyt kiinni oletuksena ("Rajaa toimitustapoja" -linkki avaa sen) — myyjän ei tarvitse ottaa kantaa mitenkään ellei halua rajata. Noutokoodi-mekanismin selitys+hyväksyntächeckbox näkyy vain jos osio avataan JA nouto on päällä (ei enää joka ikiselle noudon-salliville listaukselle automaattisesti, koska nouto on nyt oletus kaikille).
   - **Ryhmätason laskenta (`cart.ts`):** yksi Order/yksi `shippingSize` per myyjäryhmä (6h-yhdistämisikkuna) — jos yksikin ryhmän tuote rajaa tavan pois, koko ryhmä ei voi tarjota sitä. `GET /cart` palauttaa nyt `allowShipping`/`allowPickup`-booleanit `suggestedPakettikoko`:n lisäksi, `/kori`-sivu suodattaa `<select>`-vaihtoehdot niiden mukaan. Sama suodatus lisätty `/ostot`-sivulle (huutokauppavoitot/osta-heti, jolla ei ollut aiemmin MITÄÄN ehdotusta/rajausta) — `orderInclude`-select laajennettu `allowPickup`/`allowShipping`:llä.
   - **Reunatapaus, harvinainen mutta käsitelty:** jos sama myyjäryhmä sisältää sekä postitus-only että nouto-only-tuotteen (ristiriita), UI näyttää selkeän virheviestin tyhjän pudotusvalikon sijaan eikä salli maksamista — backend ei validoi tätä erikseen (tarkoituksella, ks. alla).
   - **Tietoinen rajaus, pyydetyn spesifikaation mukaan: `Order`-mallin tallennuslogiikka (`POST /orders/:id/select-shipping`) EI muutu** — rajaus tapahtuu vain näyttämällä sallitut vaihtoehdot frontendissä, ei uudella backend-validoinnilla. Tämä oli jo ennestäänkin näin (backend ei koskaan validoinut ostajan valintaa tuotteen `pakettikoko`-arvoa vasten) — sama käytös jatkuu.
   - **Datamigraatio, tuotannossa oli oikeaa dataa:** 1 tuote `nouto`, 5 `postitus`, 4 vanhentunutta `xxs`-jäännettä poistetusta kokoportaikosta. Kaksivaiheinen `prisma db push` (lisää uudet kentät rinnalle → backfill-skripti muuntaa vanhat arvot → poista `pakettikoko`-sarake) jotta olemassa olevien myyjien rajaukset eivät kadonneet hiljaisesti oletusarvoon. Vahvistettu `groupBy`:lla ennen JA jälkeen `--accept-data-loss`-pudotuksen, tulos täsmäsi.
   - Testattu tuotannossa curlilla end-to-end: luotiin nouto-only-testituote, toisen tunnuksen korissa `GET /cart` palautti oikein `allowShipping:false, allowPickup:true, suggestedPakettikoko:"nouto"` — testidata siivottu pois.

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

## Sisältövirheet 2026-08-25 — hinnat + FAQ-ristiriita (koko sivuston oikoluku käynnissä)

Omistaja aloitti koko sivuston sisällön (hinnat, FAQ, käyttöehdot) läpikäynnin. Ensimmäiset löydökset:

1. **Välityspalkkio korjattu** (ks. yllä "Liiketoimintasäännöt" ja "Välityspalkkiotaulukko") — 3% oli väärin, oikea on 3,5%. 35€ oli jo oikein useimmissa paikoissa, mutta `valityspalkkiot`-sivun esimerkkitaulukossa oli ristiriitaisesti "20,00€ (max)" yhdellä rivillä — nyt korjattu koko taulukko 3,5%:lla laskettuna.

2. **Postihinta muutettu** 9,90€ → 6,90€, JA pakettikoon valinta poistetaan kokonaan (ks. yllä "Postihinnat").

3. **FAQ-ristiriita löydetty:** "Miten huutokauppa toimii?" -kysymys (sekä `yleista`/`ostaja`-osiossa) vastaa **vain live-huutokauppaa** kuvaavalla tekstillä ("Myyjä avaa videolähetyksen ja esittelee tuotteet livenä...") — mutta kysymys on muotoiltu yleiseksi "huutokauppa"-termillä, joka voi sekoittua **perinteiseen (ajastettuun) huutokauppaan**, joka on eri, oma myyntitapansa ilman videota. **Korjaus: erottele nämä selvästi** — joko (a) nimeä kysymys eksplisiittisesti "Miten live-huutokauppa toimii?" ja lisää erillinen kysymys "Miten perinteinen (ajastettu) huutokauppa toimii?", tai (b) yhdistä yksi vastaus joka kattaa molemmat tavat selvästi eroteltuna.

4. **Koko sivusto käydään läpi järjestelmällisesti** — FAQ, käyttöehdot, tietosuoja, välityspalkkiot, etusivu, kaikki tekstisisältö. Lisää löydökset kirjataan tähän osioon sitä mukaa kun niitä tulee.

## Bulkkiparserin kommenttirivi-puute 2026-09-02 — ✅ TEHTY JA DEPLOYATTU

**Korjattu täsmälleen alla kuvatun suunnitelman mukaan.** `parseBulkText()` (`frontend/app/dashboard/tuotteet/page.tsx`) käyttää nyt dynaamista `while`-silmukkaa kiinteän `i += 4` sijaan — kunto-rivin jälkeinen rivi tulkitaan kommentiksi jos siinä EI ole €-merkkiä, muuten suoraan hintariviksi. Kommentti tallennetaan `description`-kenttään sellaisenaan. Testattu kaikilla kolmella annetulla esimerkillä (kaksi kommenttimuotoa + yksi ilman) erillisellä Node-skriptillä ennen deployta — kaikki kolme tuottivat oikean name/condition/startPrice/quantity/description-yhdistelmän.

**Koko ketju kytketty description-kentälle, ei vain parseri:**
- `saveBulk()` välittää nyt `description`-kentän `api.bulkCreateProducts()`-kutsussa (aiemmin pudotettiin pois vaikka parseri olisi sen tuottanutkin)
- `frontend/lib/api.ts`: `bulkCreateProducts`-signatuuriin lisätty `description?: string`
- `backend/src/routes/products.ts` `POST /products/bulk`: tarkistettu ettei siellä ollut erillistä kiinteän rivimäärän oletusta (ei ollut — reitti vain iteroi jo-jäsennettyä `products`-taulukkoa), mutta se ei ottanut `description`-kenttää vastaan ollenkaan — lisätty
- Esikatselu-UI:hin lisätty kommenttirivin näyttö (kursivoituna, tuotekortin alla) jotta myyjä näkee heti mitä `description`-kenttään on tallentumassa

**Sivuhuomio, ei korjausta vaatinut:** kaksi riviä näytti tarkistuksessa käyttävän `\`-merkkiä `//`:n sijaan (yksi tässä tiedostossa viitatussa `products.ts`:ssä, yksi `api.ts`:n `bulkCreateProducts`-polussa) — tarkistettu `sed`/`cat -A`:lla suoraan levyltä, molemmat osoittautuivat vain Read-työkalun näyttövirheeksi, ei todellinen ongelma tiedostossa.

Typecheck + build vihreä molemmilla puolilla ennen deployta.

**Lisäys 2026-09-02, sama päivä — erän myyntitapa valittavaksi kerralla.** Omistajan huomio: jos bulkkituonnilla listaa kerralla 1000 tuotetta, olisi työlästä karsia/muokata livetuotteet erikseen jälkikäteen yksi kerrallaan. Bulkkipaneeliin lisätty erän tasoinen myyntitapa-valitsin ("Suoramyynti" / "Molemmat" — sama koodaus ja samat käännösavaimet kuin manuaalisen lomakkeen `saleTypeOptions`), oletus `buy_now` (vastaa aiempaa kovakoodattua käytöstä). `POST /products/bulk` lukee nyt `saleType`-kentän pyynnöstä hardkoodatun `'buy_now'`:n sijaan, validoi arvoksi vain `'buy_now'`/`'both'` (mikä tahansa muu/puuttuva → `'buy_now'`-fallback, ei kaadu). Testattu tuotannossa neljällä skenaariolla (puuttuva, `buy_now`, `both`, virheellinen arvo) — kaikki neljä tallensivat oikean `saleType`-arvon, testituotteet siivottu pois.

Alkuperäinen bulkkiparserin tehtäväkuvaus ja kaksi vanhentunutta "ei vielä toteutettu" -otsikkoa admin-käyttäjähallinnasta poistettu siivouksessa 2026-09-02 — molemmat ovat valmiita, ks. yksityiskohdat: bulkkiparseri edellä, admin-käyttäjähallinta kokonaisuudessaan alempana (hae "Laajennus 2026-09-02 — Käyttäjähallinta").

## Kuntoluokitus Cardmarket-muotoon irtokorteille 2026-09-01 — ✅ TEHTY JA DEPLOYATTU

**⚠️ Palautettu tähän 2026-09-02: tämä koko osio katosi vahingossa aiemmasta siivouksesta (uncommitted-muutos toisesta kanavasta, joka lakaistiin mukaan erään git-committiin ilman että sisältöä oli tarkistettu ensin) — palautettu sanatarkasti aiemmasta keskustelukontekstista, ei uudelleenkirjoitettu muistista.**

**Kaikki kohdat 1-5 valmiit, myyjät voivat listata.** Toteutus:
- `frontend/lib/conditions.ts` (uusi) — `CARDMARKET_KUNTOLUOKAT` jaettu lähde, käyttää sekä manuaalinen lomake (`dashboard/tuotteet/page.tsx`) että Selaa/Huutokaupat-suodattimet (`CategorySidebar.tsx`) — ei kahta eri koodausta.
- Manuaalinen lomake: kuntokenttä vaihtuu Cardmarket-asteikkoon kun `tyyppi === 'irtokortit'`, piilotetaan kokonaan kun `tyyppi === 'sealed'`, geneerinen 5-portainen pysyy fallbackina kaikelle muulle (mm. `slabit`, koskematon kuten pyydetty).
- **Bulkkituonti sai kokonaan puuttuneen kategoria/peli/tyyppi-valitsimen** (ei ollut ennen — bulkkituodut tuotteet eivät koskaan saaneet `tyyppi`-kenttää asetetuksi, mikä olisi tehnyt koko Cardmarket-erottelusta merkityksettömän niille). `parseBulkText()` normalisoi (trim+isot kirjaimet) ja validoi liitetyn kunto-rivin samoja seitsemää lyhennettä vasten kun erän tyyppi on irtokortit, merkitsee tuntemattoman arvon riville virheeksi esikatselussa. `POST /products/bulk` hyväksyy nyt `category`/`alakategoria`/`tyyppi` koko erälle.
- Selaa/Huutokaupat: uusi kuntosuodatin `CategorySidebar`:ssa (ei ollut ennen ollenkaan), näkyy vain kun aktiivinen tyyppi-suodatin on 'irtokortit'.
- Typecheck + build vihreä joka välivaiheen jälkeen, deployattu tuotantoon 2026-09-01.

Alkuperäinen tehtäväkuvaus säilytetty alla:

## Kuntoluokitus Cardmarket-muotoon irtokorteille 2026-09-01 — päätetty, kiireellinen (200k€ inventaario tulossa)

Nykyinen `KUNTOLUOKAT` (`dashboard/tuotteet/page.tsx`) on geneerinen 5-portainen (uusi/erinomainen/hyvä/tyydyttävä/käytetty) — ei sovi kortteihin, koska ostajat/myyjät ajattelevat kuntoa Cardmarket-asteikolla. Vahvistettu koodista: `Product.condition` on pelkkä `String?`, ei enum — joustava, ei vaadi migraatiota, vain sovelluslogiikan muutosta.

**Ratkaisu käyttää jo olemassa olevaa `Product.tyyppi`-kenttää** ("slabit"/"sealed"/"irtokortit", kolmas kategoriataso Keräilykortit-kategorian sisällä) erottamaan mikä kuntojärjestelmä pätee:

1. **`tyyppi === 'irtokortit'` → Cardmarket-asteikko käyttöön, sekä manuaalisessa lomakkeessa että suodattimissa:**
   - `Mint (M)`, `Near Mint (NM)`, `Excellent (EX)`, `Good (GD)`, `Light Played (LP)`, `Played (PL)`, `Poor (PO)`
   - Tallennettava arvo = lyhenne (`M`/`NM`/`EX`/`GD`/`LP`/`PL`/`PO`), näytettävä teksti = täysi nimi
   - **Bulkkilistauksen (CSV/TXT) parseri** (jo toteutettu aiemmin) käyttää jo näitä samoja lyhenteitä Cardmarket-liimauksesta — varmista että manuaalinen lomake ja bulkkituonti tallentavat IDENTTISET arvot samaan kenttään, ei kahta eri koodausta samalle asialle
2. **`tyyppi === 'sealed'`** (esim. boosterirasiat) → **kuntokenttä piilotetaan kokonaan lomakkeesta ja suodattimista** tälle tyypille — sinetöity tuote ei tarvitse kuntoarviota, se on aina uusi/sinetöity oletuksena
3. **`tyyppi === 'slabit'`** (gradatut kortit) → **EI kosketeta tässä korjauksessa.** Näillä on eri, oma järjestelmänsä (gradauspalvelu + numeroarvosana, esim. "PSA 9", "BGS 9.5") — tämä on rakenteellisesti eri ongelma kuin kuntoluokitus (tarvitsisi oman `gradingCompany`+`grade`-kenttäparin, ei yhtä `condition`-merkkijonoa). **Merkitään erilliseksi, myöhemmäksi tehtäväksi**, ei sekoiteta tähän kiireelliseen korjaukseen.
4. **Muut tyypit/kategoriat** (jos kategoriafokus joskus laajenee Keräilykorttien ulkopuolelle) → vanha geneerinen 5-portainen asteikko säilyy fallbackina.

**Suodattimet (Selaa/Huutokaupat-sivujen sivupaneeli):** kuntosuodatin näyttää Cardmarket-asteikon vaihtoehdot kun käyttäjä on suodattanut/selaa "irtokortit"-tyyppiä, ei geneeristä asteikkoa.

**Kiireellisyys:** kaksi myyjää (veljekset) valmistautuvat listaamaan yli 200 000€ arvosta tavaraa heti kun sivu on valmis — väärä kuntojärjestelmä nyt tarkoittaisi kaiken datan uudelleenkäsittelyä myöhemmin, joten tämä kannattaa korjata ennen kuin he aloittavat.

## Kuntosuodattimen kaksi puutetta 2026-09-02 (löydettävyys + monivalinta)

Vahvistettu koodista (`frontend/components/CategorySidebar.tsx`):

1. **Kuntosuodatin näkyy vain kun `activeTyyppi === 'irtokortit'` on jo valittuna** (`showConditionFilter`-ehto, rivi 29). Selaa-sivun "Kaikki"-välilehdellä (ei syvemmällä tyyppi-tasolla) suodatinta ei näy ollenkaan — käyttäjä ei löydä sitä, koska ei tiedä että pitää ensin valita irtokortit-tyyppi jostain muualta. **Korjaus: paranna löydettävyyttä** — esim. näytä tyyppi-valitsin (slabit/sealed/irtokortit) selvästi Keräilykortit-kategorian alla aina kun kategoria on valittu, ei vasta kun on jo syvällä navigoinut sinne, jotta kuntosuodatin on helposti tavoitettavissa.

2. **Kuntosuodatin sallii vain yhden valinnan kerrallaan** (rivi 75/132: `setActiveCondition!(activeCondition === k.id ? '' : k.id)` — yksittäinen string, ei taulukko). **Muutos: monivalinta** — käyttäjän pitää voida valita esim. M+NM+EX samaan aikaan (OR-suodatus, näytä tuotteet jotka täsmäävät MIHIN TAHANSA valituista kunnoista). Vaatii `activeCondition`-tilan muuttamisen taulukoksi (`string[]`) yksittäisen stringin sijaan, ja suodatuslogiikan (`selaa/page.tsx` rivi 85) päivittämisen `includes()`-tyyliseksi tarkistukseksi tasan-vertailun sijaan.

3. **"Muiden tuotteiden" (ei-irtokortit) kuntoa ei voi suodattaa ollenkaan tällä hetkellä.** Tämä on tarkoituksenmukaista `sealed`-tyypille (ei kuntoa, ks. aiempi päätös), mutta jos on muita kategorioita/tyyppejä jotka käyttävät geneeristä 5-portaista asteikkoa (uusi/erinomainen/hyvä/tyydyttävä/käytetty), niillekin pitäisi näyttää OMA kuntosuodattimensa samalla periaatteella kuin irtokorteille — vain eri asteikolla. Laajenna `showConditionFilter`-logiikka kattamaan myös nämä, näyttäen oikean asteikon (`CARDMARKET_KUNTOLUOKAT` vs. geneerinen) sen mukaan mikä tyyppi/kategoria on kyseessä.

## Neljä uutta löydöstä 2026-09-02 (footer, luottamuspaneeli, mainosbanneri, etusivun CTA)

1. **Footer yhä liian täynnä — rajaa vain neljään kolumniin + copyright.** Vahvistettu koodista (`components/layout/Footer.tsx`): nykyinen footer sisältää 4-kolumnin linkkiruudukon (Yritys/Ohjeet/Lakitekstit/Seuraa) LISÄKSI uutiskirje-tilauslomakkeen, palkkio/sitovuus/kielletyt-tavarat-rivin, JA erillisen brändinimi+luottamusbadge-rivin (Habahub-ympyrä + "Turvallinen"/"Sitovat huudot"/"Todennetut käyttäjät"). **Päätös: jätä vain 4-kolumnin linkkiruudukko + copyright-rivi (`© 2026 Habahub · Y-tunnus...`).** Kommentoi pois (älä poista kokonaan koodista, kommentoi selvästi merkiten miksi): uutiskirje-osio, palkkio/sitovuus/kielletyt-rivi, brändinimi+badge-rivi.

2. **Luottamuspaneelin "ei peruutuksia" -teksti poistetaan/muokataan.** Vahvistettu koodista (`frontend/lib/i18n/fi.ts` rivi 126, avain `binding`): "Kaikki kaupat sitovia — ei peruutuksia". **Muokkaa/poista "ei peruutuksia" -osa** — todennäköisesti ristiriidassa sen kanssa että "Hyvitä"-toiminto on oikeasti olemassa ja toimii (ks. aiempi kohta 14, "Iso testauskierros"-osiosta, joka on yhä auki omistajan päätöstä odottamassa). Jos hyvitys on mahdollinen tietyissä tilanteissa, "ei peruutuksia" on harhaanjohtava lupaus. **Odottaa samaa omistajan päätöstä kuin kohta 14** ("Hyvitä"-napin liiketoimintalogiikka) — käsittele nämä kaksi yhdessä, koska ne liittyvät samaan kysymykseen.

3. **Etusivun mainosbanneri ("Habahub suosittelee") menee päällekkäin "Viikon kohokohta" -osion kanssa.** Vahvistettu koodista: `AdBanner`-komponentti (`frontend/app/page.tsx`, `t.home.adLabel`-badge oikeassa yläkulmassa, `position:absolute`) on äskettäin lisätty (commit 5a54451). Tarkista layoutin järjestys/marginaalit `AdBanner`:n ja "Viikon kohokohta" -elementin välillä, korjaa päällekkäisyys.
   - **Lisätoive: helppo tapa asettaa/vaihtaa mainossisältöä ilman koodin kirjoittamista.** Nykyinen `AdBanner` on kovakoodattu (`t.home.ad*`-tekstit i18n-tiedostossa). Harkitse kevyttä ratkaisua — esim. yksinkertainen admin-lomake joka tallentaa mainoksen otsikon/tekstin/linkin tietokantaan (uusi pieni `Promo`/`AdSlot`-taulu), jota `AdBanner` lukee sen sijaan että teksti olisi kiinni i18n-tiedostoissa. Ei tarvitse rakentaa täyttä mainosmyyntijärjestelmää, riittää että omistaja voi itse vaihtaa sisällön ilman VS Coden Claudea joka kerta.

4. **Etusivun hero-osion "Ryhdy myyjäksi" -nappi (`t.home.heroBecomeSeller`, rivi 240) on turha, poista.** Sama viesti toistuu heti alempana omana korostettuna korttinaan ("Ei listaus- eikä kuukausimaksuja... Ryhdy myyjäksi →"). Poista hero-osion nappi, jätä vain "Selaa tuotteita" hero-osioon — alempi kortti hoitaa myyjäksi-ryhtymisen kutsun paremmin, omalla kontekstillaan (3,5%/max35€, ei kuukausimaksuja).

## Iso testauskierros 2026-09-01 (mobiili, tuotanto) — ✅ kohdat 1,2,3,6,7,8,9,10,11,12,13 TEHTY, 15 aloitettu, 4/5/14 odottaa omistajaa

**Tehty ja deployattu 2026-09-01:**
- **1 (SV piilossa):** juurisyy oli ettei `sv` ollut koskaan lisätty `LANGUAGES`-listaan/`Lang`-tyyppiin (`lib/i18n/index.ts`) vaikka käännös oli jo täysin valmis — lisätty, kielenvalitsin näyttää nyt Suomi/English/Svenska.
- **2 (OBS-modaali ei sulkeudu):** paneelilla ei ollut X-nappia eikä klikkaus-ulkopuolelle-sulkemista, ainoa tapa oli sama pilinappi jonka paneeli saattoi peittää kapealla näytöllä. Lisätty X-nappi + koko ruudun tausta joka sulkee klikkaamalla.
- **3 (Footer allekkain):** linkkisarakkeiden `minmax(150px,...)` -ruudukko romahti yhdeksi sarakkeeksi kapeilla puhelimilla. Eriytetty omaksi `minmax(110px,...)` -ruudukoksi (mahtuu 2 sarakkeeseen luotettavasti), Habahub-nimi/badget siirretty footerin viimeiseksi elementiksi.
- **6, 7, 8, 9 (yhteystiedot/FAQ/palkkiotaulukko/protectionDesc):** ks. yllä olevat LUKITTU-osiot, kaikki päivitetty.
- **10 (bannivaroitus puuttuu):** lisätty näkyvä varoitus `/ostot`-sivun "Odottaa maksua" -osioon.
- **11 (ajastettu lähetys ei käynnisty klikkaamalla):** dashboardin tuleva lähetys -rivi on nyt itse linkki suoraan `/lahetys`:aan.
- **12 (bulkkilistaus epäselvä):** kolme yhtä painavaa nappia (yksi niistä täysi duplikaatti) korvattu yhdellä pää­napilla + vähemmän hallitsevalla tekstilinkillä, bulkki-paneeli ja yksittäistuotelomake eivät enää renderöidy samaan aikaan.
- **13 (livekonsoli näyttää kaatuneelta):** `if (!show || !currentProduct) return null` korvattu selkeällä "Jono on tyhjä" -näkymällä (tapahtuu kun viimeinen tuote myydään/poistetaan kesken lähetyksen).
- **15 (i18n-läpikäynti):** aloitettu nimetystä esimerkkisivusta (`tuotteet/[id]`) — 3 kovakoodattua merkkijonoa siirretty `t.product.*`:iin. **Koko `frontend/lib/i18n/`-kansion kattava läpikäynti on oma, isompi erillinen tehtävänsä, ei tehty tässä.**

**Odottaa omistajan vastausta, EI korjattu (ks. alkuperäinen kuvaus alla):**
- **4** — Meistä-sivun 48h näytti jo oikein koodista, omistajan pitää testata kovapäivityksen jälkeen.
- **5** — "Ryhdy myyjäksi" linkittää jo oikein /register:iin koodista, omistajan pitää testata uudelleen.
- **14** — "Hyvitä"-napin liiketoimintalogiikka (pitäisikö toimia myös toimitetulle tuotteelle) vaatii omistajan päätöksen.

Alkuperäinen löydöslista säilytetty alla muuttumattomana:

## Iso testauskierros 2026-09-01 (mobiili, tuotanto) — koottu löydöslista, osa vahvistettu koodista

Omistaja kävi läpi sivustoa laajasti mobiililla. Merkitty ✅=vahvistettu koodista todeksi bugiksi, 🔍=tarkistettu koodista mutta EI toistunut (mahdollisesti selaimen välimuisti/vanha näkymä), ⬜=ei vielä tarkistettu koodista, luotetaan suoraan omistajan havaintoon.

1. **⬜ Kielenvaihto (SV) piilossa/rikki.** SV-käännös on jo olemassa jossain (i18n-tiedostoissa), mutta kielenvalitsin jää piiloon eikä sitä saa auki — voi valita vain suomen. Tutki `lang-context.tsx`/navbarin kielenvalitsin-komponentti.

2. **⬜ OBS-asetukset-valikkoa ei saa suljettua** live-konsolissa kun liven on aloittanut. Modaali/dropdown jää auki, ei sulkeutumismekanismia (klikkaus ulkopuolelle / X-nappi puuttuu tai ei toimi).

3. **⬜ Footer: linkit allekkain, pitäisi olla kahdella rivillä + yleinen siivous.** Tiivistä footer-linkit kahteen riviin yhden pitkän pystylistan sijaan. Siivoa turhat/toisteiset linkit, siirrä osa muualle jos ei ole pakollisia, ja **Habahub-brändinimi/copyright viimeiseksi elementiksi footerissa**.

4. **🔍 Meistä-sivun toimitusaika näyttää jo koodissa oikein "48h"** (`meista/page.tsx` rivi 35, `t.about.shipping`) — ei löytynyt mitään "24h"-mainintaa koodista. Todennäköisesti selaimen välimuisti/vanha lataus — pyydä omistajaa kovapäivittämään (hard refresh) ja tarkistamaan uudelleen ennen kuin tätä tutkitaan pidemmälle.

5. **🔍 "Ryhdy myyjäksi" -CTA linkittää jo oikein `/register`:iin** (`frontend/app/page.tsx` rivi 39, `ctaHref: '/register'`) — ei ohjaa etusivulle koodin mukaan. Jos omistaja näki sen ohjaavan etusivulle, testaa uudelleen — saattoi olla jo kirjautuneena jolloin `/register` uudelleenohjaa takaisin (tarkista `/register`-sivun oma logiikka kirjautuneelle käyttäjälle, ei bugi CTA:ssa itsessään jos näin on).

6. **✅ Yhteystiedot-sivulla sama sähköposti toistuu kolmesti turhaan.** Vahvistettu koodista (`meista/page.tsx` rivit 52-54): `email`, `support`, `sellerSupport` näyttävät kaikki saman `support@habahub.fi`:n kolmena erillisenä rivinä. **Korjaus: yhdistä yhdeksi riviksi (pelkkä sähköposti) + Y-tunnus, poista turha toisto.**

7. **✅ FAQ:n "Milloin saan rahani?" -vastaus vanhentunut, ristiriidassa LUKITTU-säännön kanssa.** Vahvistettu koodista (`faq/page.tsx` rivi 35): sanoo "Maksu vapautetaan myyjälle kun seurantakoodi on toimitettu Habahubille" — tämä on VANHA sääntö. **Oikea, päivitetty teksti: maksu vapautuu kun ostaja on vastaanottanut JA hyväksynyt tuotteen, tai kun 24 tuntia on kulunut toimituksen vahvistumisesta ilman reklamaatiota** (ks. päivitetty "Toimituksen aikataulu ja maksuturva" -osio, LUKITTU 24h).

8. **✅ Välityspalkkiotaulukko ei vastaa sovittua — käyttää yhä 333€:a, puuttuu 50€/250€/500€-rivit.** Vahvistettu koodista (`valityspalkkiot/page.tsx`): taulukko on nyt `10€→0,35€, 100€→3,50€, 333€→11,66€, 1000€+→35,00€`. **Sovittu (ja jo kertaalleen annettu) oikea taulukko on: 10€→0,35€, 50€→1,75€, 100€→3,50€, 250€→8,75€, 500€→17,50€, 1000€+→35,00€ (max).** Päivitä `ROWS`-taulukko täsmälleen tähän, poista 333€-rivi kokonaan.

9. **✅ i18n:n `protectionDesc` (maksuturvan kuvaus) vanhentunut, sama ongelma kuin FAQ:ssa.** Vahvistettu koodista (`frontend/lib/i18n/fi.ts` rivi 235): "Ostajan maksu pidätetään Habahubin tilillä kunnes myyjä on lähettänyt tuotteen ja toimittanut seurantakoodin" + "Maksu vapautetaan myyjälle kun seurantakoodi on toimitettu" — molemmat kuvaavat vanhaa (välitöntä lähetyksen jälkeistä) vapautusta. **Kirjoita uudelleen 24h-toimitusvahvistus+hyväksyntä-säännön mukaiseksi**, sama korjaus kuin kohdassa 7, tee molemmat yhdessä koska teksti on todennäköisesti osittain sama/jaettu.

10. **⬜ Puuttuu ilmoitus/tieto bannista jos ei maksa.** Käyttäjälle ei näytetä mitään tietoa siitä että maksamatta jättäminen johtaa automaattiseen 30 päivän banniin (ks. "Banni"-sääntö, LUKITTU: jo ensimmäisestä maksamattomasta tilauksesta). Lisää tämä näkyväksi joko maksuajastimen yhteyteen ("Odottaa maksua" -näkymä) tai käyttöehtoihin selkeästi viitattuna sieltä.

11. **⬜ Ajastettua (SCHEDULED) lähetystä ei voi klikata käynnistääkseen suoraan** — pitää mennä erillisen "Aloita live" -reitin kautta dashboardista, epäselvä käyttäjälle. Selvitä voisiko ajastetun lähetyksen kortista/riviltä klikata suoraan käynnistääkseen sen, sen sijaan että pitää etsiä erillinen nappi.

12. **⬜ Bulkkilistauksen (CSV/TXT) käyttöliittymä epäselvä, kaipaa ohjeita tai uudelleensuunnittelua, ja pitäisi olla alempana/vähemmän prominentti.** Nykyinen sijoittelu (näkyy heti "Tallenna monimuu" ensimmäisten nappien joukossa) nostaa sen liian näkyväksi verrattuna manuaaliseen lisäykseen. **Siirrä alemmas/vähemmän hallitsevaksi vaihtoehdoksi**, ja lisää selkeä ohjeteksti/esimerkki miten muoto toimii ennen kuin käyttäjä liimaa mitään.

13. **⬜ Livea ei voi aloittaa ennen kuin tuotteita on lisätty — näyttää siltä kuin sivu kaatuisi.** Tarvitaan selkeä, ei-pelottava virheviesti/ohje ("Lisää vähintään yksi tuote ennen kuin voit aloittaa lähetyksen") sen sijaan että käyttöliittymä vaikuttaa rikkoutuneelta.

14. **✅ "Hyvitä"-nappi ON toiminnallinen (kutsuu oikeaa Paytrail-hyvitys-APIa), mutta liiketoimintalogiikka epäselvä toimitetulle tuotteelle.** Vahvistettu koodista (`backend/src/routes/orders.ts`, `POST /:id/refund` → `refundFull`/`refundItem` Paytrailin kautta) — nappi ei ole tyhjä kuori, se palauttaa oikeasti rahaa. **Avoin kysymys omistajalle: pitäisikö "Hyvitä" olla käytettävissä vapaasti MYÖS jo toimitetulle/vastaanotetulle tilaukselle (jolloin myyjä palauttaa rahaa mutta ostaja pitää tuotteen), vai pitäisikö se rajata johonkin tiettyyn tilaan (esim. vain ennen lähetystä, tai vasta kun ostaja/HABAHUB on hyväksynyt palautuksen)?** Tämä on liiketoimintapäätös, ei tekninen bugi — päätä ennen kuin rajataan koodissa.

15. **⬜ Käännökset yhä keskeneräiset — puuttuu myös perus-UI-käännöksiä, ei vain ilmoitustekstejä.** Esim. tuotteen tarkastelusivulla puuttuu peruskäännöksiä. Vaatii kattavamman läpikäynnin koko `frontend/lib/i18n/`-kansiosta, ei vain yksittäisten sivujen pistokoetta.

## Visuaalinen tyylipäivitys 2026-09-01 — päätetty, ei vielä toteutettu (omistaja teki mock-HTML:n mallia varten)

Omistaja teki erillisen mock-HTML-tiedoston (`landing.html`) uudesta, sulavammasta tyylistä. **Tärkeä tarkennus: `landing.html` on PELKKÄ VISUAALINEN REFERENSSI, ei osa koodikantaa eikä koskaan itsessään päivitettävä/käytettävä sellaisenaan** — päivitys kohdistuu **varsinaisiin olemassa oleviin sovelluksen sivuihin** (Next.js/React-koodi), ei mihinkään mock-tiedostoon.

**⚠️ Laajuus: tämä on KOKO PROJEKTIN visuaalinen muodonmuutos, ei pelkkä väri-/fonttipäivitys.** Kaikki visuaaliset elementit — kortit, napit, efektit, asettelu, välit, varjot, kaikki — päivitetään mockin tyyliin **joka ikisellä sivulla**. **Ainoa mikä EI muutu on tekstisisältö** — jokainen sivu näyttää täsmälleen samat tekstit/otsikot/kuvaukset/nappitekstit kuin nyt, vain visuaalinen toteutustapa vaihtuu kauttaaltaan. **Ei erillistä landing-sivua** — sovellus näkyy edelleen suoraan `habahub.com`-juuriosoitteessa niin kuin nyt, ei mockin tarkkaa hero+preview-rakennetta väkisin sinne, vaan nykyinen sivu (mikä se ikinä onkin, esim. Selaa) saa saman tyylikielen.

**Päätökset:**
1. **Brand-väri vaihtuu limettiin/hapanvihreään `#84cc16`** — korvaa nykyisen metsänvihreän/smaragdin (`#1B6B3A`/`#2ECC71` tumma teema, `#2ECC71`/`#4ADE80` vaalea teema). Koko `theme-context.tsx`:n väripaletti päivitetään tämän ympärille (accent, accentBright/accentDark, accentLight jne. — sävytä johdonmukaisesti limen ympärille, ei vain korvata yhtä muuttujaa).
2. **Fontit:** Outfit (otsikot/hinnat/napit/badget) + Plus Jakarta Sans (leipäteksti) — `next/font/google`:n kautta, samaan tapaan kuin äskettäin lisätty Hanken Grotesk (ks. "Löydetty dokumentoimattomia committeja" -osio) — **tämä KORVAA Hanken Groteskin**, ei käytetä molempia yhtä aikaa.
3. **Kaikki muutkin visuaaliset elementit mockin tyyliin, kauttaaltaan:** korttien/nappien muotoilu (kohokuvio-reunatekniikka `doppelrand-core`, pyöristykset, varjot), lasipaneeli-tyyliset elementit (`backdrop-filter: blur`), hienovarainen kohinatekstuuri (`bg-noise`), scroll-reveal-animaatiot, tumman teeman "obsidian aura" -taustagradientti ja vaalean teeman "lämmin alabasteri" -ruudukkotausta, välit/marginaalit, pyöristyssäteet — periaatteessa koko `globals.css`/komponenttien tyyli tarkistetaan tätä referenssiä vasten.
4. **⚠️ EI KOSKETA:** mitään tekstisisältöä, nappien tekstiä, toiminnallisuutta, reittejä tai handler-logiikkaa millään sivulla — pelkkä visuaalinen kerros vaihtuu. Sama periaate kuin aiemmassa visuaalisessa uudistuksessa (kanban-tilauslauta-commit 067de19): "ei koskettu mihinkään handler-/datalogiikkaan".
5. **Korjaa mockista löytynyt tosiasiavirhe jos sen tekstiä käytetään missään:** footerissa lukee "Stripe / Paytrail -integraatio" — Stripe ei ole koskaan ollut käytössä (LUKITTU: vain Paytrail), poista Stripe-maininta kokonaan.

**Laajuus konkreettisesti:** joka ikinen sivu (Selaa, Huutokaupat, Live, Dashboard, Profiili, kaikki alasivut) käy läpi saman visuaalisen linjauksen. Iso urakka — kannattaa tehdä vaiheittain (ensin design-tokenit/perusteet, sitten sivu kerrallaan), ei kaikkea kerralla ilman testausta välissä.

## Löydetty dokumentoimattomia committeja GitHubista 2026-09-01 — lisätty jälkikäteen

Repon commit-historiasta löytyi neljä committia jotka eivät olleet päätyneet CLAUDE.md:hen (VS Coden Claude oli tehnyt työn mutta ei dokumentoinut sitä tänne asti):

### ✅ TEHTY — Visuaalinen uudistus: kanban-tilauslauta, tuotekortit, etusivun promo-paikka
Toteutettu hyväksytyn mockupin mukaisesti, ei koskettu mihinkään handler-/datalogiikkaan. Lisätty additiivisesti, ei poistettu mitään olemassa olevaa:
- **Hanken Grotesk** -fontti (`next/font/google`, `layout.tsx`) käyttöön otsikoihin/hintoihin/nappeihin/badgeihin `--font-hanken`-muuttujalla — leipäteksti pysyy vanhassa system-font-pinossa
- `theme-context.tsx`: uudet `warn`/`warnLight`-semanttiset väritokenit (keltainen/amber), korvaavat aiemmin sinne tänne hajautetut kovakoodatut `rgba(245,158,11,...)`-arvot
- `globals.css`: `.hb-card` (hover-nosto+varjo), `.hb-card-img` (kuvan zoomaus hoverissa), `.hb-btn` (paina/hover-palaute) — kiinteät `rgba(0,0,0,...)`-varjot toimivat identtisesti molemmissa teemoissa, ei tarvitse teemakohtaisia arvoja. Kaikki kunnioittavat `prefers-reduced-motion`-asetusta.

### ✅ TEHTY — Paytrail-paluu saattoi pompauttaa juuri maksaneen asiakkaan /loginiin
**Vahvistettu ettei backend/webhook-puoli ollut koskaan rikki** — tilaus meni tietokannassa oikein `SHIPPED`-tilaan, maksu onnistui normaalisti. **Bugi oli puhtaasti frontend-puolella:** Paytrailin `redirectUrls.success` osoittaa `/ostot`-sivulle, jonka `proxy.ts` suojaa `habahub_token`-evästeen taakse. Jos eväste puuttuu juuri sillä hetkellä kun selain palaa `habahub.com`:iin (esim. selaimen yksityisyyssuoja pudottaa sen risti-sivustoisen uudelleenohjauksen aikana `pay.paytrail.com`:n kautta), `proxy.ts` ohjasi `/loginiin` vaikka käyttäjä oli yhä aidosti kirjautuneena — oikea sessio elää `localStoragessa` (jota `api.ts`:n Authorization-header lukee), eikä risti-sivustoinen uudelleenohjaus koske sitä mitenkään.
- **Korjaus 1:** `proxy.ts` lisää nyt `?redirect=<alkuperäinen polku+query>`:n kun se ohjaa `/loginiin`, ei enää hylkää kohdetta kokonaan
- **Korjaus 2:** `auth-context.tsx`:n init-effekti tyhjensi ennen `localStoragen` aina kun eväste puuttui (oikein SKRM→Habahub-evästeen uudelleennimeämistapauksessa, jolloin vanha eväste oli aidosti pysyvästi poissa). Nyt: jos `localStoragessa` on sekä token että user, eväste PALAUTETAAN `localStoragesta` sen sijaan että sessio tyhjennettäisiin — `localStorage` on totuuden lähde, eväste on vain `proxy.ts`:n vihje. Tyhjennys tapahtuu enää vain kun nämä kaksi ovat aidosti epäjohdonmukaiset (toinen olemassa, toinen ei).
- **Lopputulos:** päätyminen `/loginiin` yhä voimassa olevalla `localStorage`-sessiolla palauttaa evästeen hiljaisesti ja jatkaa alkuperäiseen kohteeseen sen sijaan että näyttäisi kirjautumislomakkeen tai hukkaisi kohteen.

### ✅ TEHTY — Kaksi pientä bugia: "Osta heti" ei päivittänyt ostoskoria, katsojamäärä jäätyi sivun latauslukemaan
1. **`buyNow()`** `/live/[showId]`-sivulla lisäsi tuotteen ostoskoriin (`cartApi.add()`) mutta navigoi suoraan `/koriin` päivittämättä jaettua `CartContext`:ia ensin — `/kori` lukee samasta kontekstista ja hakee uudelleen vain reaktiivisesti (kun huomaa vanhentuneen tuotteen), ei koskaan mount-hetkellä. Juuri lisätty tuote oli siis näkymätön kunnes jokin muu pakotti uudelleenhaun. `/tuotteet/[id]` teki tämän jo oikein (kutsuu `refreshCart()`:ia ennen navigointia) — live-sivulta puuttui sama kutsu, lisätty nyt.
2. **"X katsojaa"**-luku myyjän nimen vieressä jäätyi siihen arvoon jonka ensimmäinen `GET /shows/:id` palautti sivun latautuessa (usein 0, juuri kun striimi alkaa) eikä koskaan päivittynyt sen jälkeen. Backend lähettää jo `viewer_count`-socket-tapahtuman jokaisella liittymisellä/poistumisella (`broadcastViewerCount`, `socket.ts`) — frontendiltä puuttui vain kuuntelija tälle, toisin kuin erilliselle `viewer_list`-tapahtumalle (Watching-välilehteä varten, joka siksi jo toimi oikein). Lisätty puuttuva `socket.on('viewer_count', ...)`-käsittelijä.

### ✅ TEHTY, TURVALLISUUS — Tuotteen pystyi liittämään toisen myyjän lähetykseen
Löydetty ennakkotarjous-korjauksen testauksen sivutuotteena: `POST /products` otti `showId`:n suoraan pyynnön bodystä ilman omistajuustarkistusta — **kuka tahansa kirjautunut käyttäjä pystyi liittämään oman tuotteensa toisen myyjän live-/ajastetun lähetyksen jonoon.** Korjattu: tarkistetaan nyt että show on olemassa JA kuuluu pyynnön tekijälle ennen kuin liittäminen sallitaan (403 muuten).

**Ennakkotarjous (pre-bid) -ominaisuus on siis myös valmis ja testattu** (tämän korjauksen konteksti paljastaa sen) — ei ollut vielä erikseen kirjattu tänne, ks. yllä oleva mainita "Ennakkotarjoukset (pre-bid) — TEHTY, vahvistettu omistajalta 2026-08-16" täsmää tähän.

## HUOMIO TYÖSKENTELYTAVASTA: CLAUDE.md ei aina päivity samaan tahtiin kuin koodi
2026-09-01 löydetty: neljä committia oli tehty ja pushattu GitHubiin ilman että CLAUDE.md päivittyi samalla — tämä tarkoittaa VS Coden Claude -session ja tämän Claude.ai-keskustelun välillä voi syntyä viive dokumentaation ja koodin välillä. **Suositus jatkoa varten: tarkista GitHubin commit-historia (`git log --oneline -10`) aina silloin tällöin CLAUDE.md:n rinnalla**, ei pelkästään luoteta siihen että CLAUDE.md kertoo koko totuuden koodin tilasta.

## Liiketoimintasäännöt (LUKITTU — ei muuteta)
- **Välityspalkkio — KORJATTU 2026-08-25: 3,5% max 35€** (aiempi "3%" oli kirjoitusvirhe joka oli levinnyt useaan tiedostoon — 3,5% on oikea prosentti, 35€ oli jo oikein useimmissa paikoissa) + Paytrail ~1,5% + 0,25€ (ei kattoa)
- Kaikki huudot **sitovia** — ei peruutuksia
- **Yhdistetty lähetys:** sama myyjä + 6h aikaikkuna = yksi tilaus, yksi postikulut (suurimman pakettikoon mukaan). 6h rajan jälkeen uusi erillinen tilaus.
- **Maksuaika:** voitettu huuto tai ostos → 2h aikaa maksaa → kaikki maksutavat (MobilePay, Google Pay, verkkopankki, kortti) → ei pakollista kortintallennusta
  - **Poikkeus:** perinteisen (ajastetun) huutokaupan **passiivinen voitto** (huutokauppa päättyy itsestään, esim. yöllä) → **24h** maksuaikaa, koska voittaja ei ole aktiivisesti läsnä silloin. "Osta heti" (buy-now) ja live-huuto pysyvät 2h:ssa, koska ostaja on aktiivisesti paikalla klikatessaan. Päätetty 2026-08-07.
- **Rekisteröityminen:** käyttäjän on hyväksyttävä käyttöehdot, tietosuoja ja kaupankäyntipolitiikka erillisillä checkboxeilla ennen kuin voi luoda tilin. Checkboxit pakollisia — ei oletuksena rastitettu.
- **Banni — TIUKENNETTU 2026-08-13:** JO ENSIMMÄINEN maksamaton tilaus → automaattinen 30 päivän banni heti. Jokainen seuraava rike → uusi 30 päivän banni. Ei poikkeuksia, ei kolmen kerran varoitusrajaa enää. ("Oppivat olemaan" — omistajan perustelu, tarkoituksella tiukka.)
- Maksuturva: maksu pidätetään kunnes myyjä toimittaa seurantakoodin
- Myyjällä **4 vuorokautta** aikaa lähettää (lomamoodi: 7 päivää) — **MUUTETTU 2026-09-03, oli aiemmin 48h.** Muutettu omistajan pyynnöstä (kritiikkiä liian tiukasta aikataulusta). Päivitetty kaikkiin mainintoihin: `kayttoehdot/content.ts` (FI+EN), `faq/page.tsx` (FI+EN, kolme kohtaa/kieli), `lib/i18n/{fi,en,sv}.ts` `shipIn24`-avain, `dashboard/profiili/page.tsx` (lomamoodi-selite), `meista/page.tsx` (tilastokortti, tehty kielikohtaiseksi koska "vrk" ei ollut kielineutraali kuten "48h" oli). **Ei koske** ostajan erillistä 24h toimituksen hyväksymis-/reklamaatioikkunaa (eri sääntö, ks. "Toimituksen aikataulu ja maksuturva" -osio) — näitä kahta ei pidä sekoittaa, molemmat käyttivät sattumalta samaa "48"-lukua ennen tätä muutosta mutta ovat aina olleet eri sääntöjä.
- SKRM **ei ole osapuoli** kaupassa — marketplace-malli
- Pankkitunnistautuminen (Signicat) pakollinen ennen huutamista/myymistä (tulossa)
- **Ikäraja: 15+** (huoltajan suostumuksella)

## Välityspalkkiotaulukko — KORJATTU 2026-09-01 (poistettu 333€-rivi, lisätty 50/250/500€)
| Myyntihinta | HABAHUB-palkkio |
|-------------|-------------|
| 10€ | 0,35€ |
| 50€ | 1,75€ |
| 100€ | 3,50€ |
| 250€ | 8,75€ |
| 500€ | 17,50€ |
| 1000€+ | 35,00€ (max) |

## Postihinnat (ostaja maksaa) — PÄIVITETTY 2026-08-26, LUKITTU (korvaa 2026-08-25-version)
**Yksi kiinteä hinta ostajalle: 6,90€, ei koskaan muutu.** Postin todellinen kulu vaihtelee pakettikoon mukaan (~4,50€ pieni / ~5,70€ iso) — kate siis vaihtelee 1,20€-2,40€ välillä riippuen paketista, mutta pysyy aina positiivisena isoimmallakin paketilla. **Ei kokovalintaa ostajalle eikä tuotteen lisäyslomakkeessa** — tämä osa pysyy ennallaan 2026-08-25:n päätöksestä.

**UUSI: pakettikoko valitaan lähetysvaiheessa, myyjän toimesta, ei osta/lista-vaiheessa (päätetty 2026-08-26).** Myyjä ei tiedä tarkkaa pakettikokoa ennen kuin oikeasti pakkaa tuotteen — siksi kokovalinta ei kuulu tuotteen listaukseen eikä ostajan checkoutiin, vaan **lähetyksen luontivaiheeseen** (kun myyjä merkitsee tilauksen lähetetyksi / luo Posti-lähetyksen OmaPosti Pro API:n kautta):
- Myyjälle esitetään yksinkertainen valinta (esim. "Pieni" / "Iso") juuri ennen kuin Posti-lähetys luodaan
- Tämä valinta **ei vaikuta ostajalta jo veloitettuun 6,90€:oon mitenkään** — puhtaasti tekninen/sisäinen tieto
- Valinta määrää suoraan minkä `packageCode`-arvon lähetetään Postin OmaPosti Pro API:lle kyseiselle lähetykselle (Postin API vaatii `packageCode`-kentän pakollisena joka lähetyksessä, ks. "Lähetysintegraatio"-osio)
- Sivuvaikutuksena mahdollistaa todellisen katteen seurannan per lähetys jälkikäteen (valinnainen: tallenna `Order.pakettikoko`-kenttään data raportointia varten)

**Toimitusvaihtoehdot (ennallaan):**
1. **Postitus** — kiinteä 6,90€ ostajalle, pakettikoko valitaan lähetysvaiheessa yllä kuvatulla tavalla
2. **Nouto** — kuuluu maksuturvan piiriin noutokoodilla (ks. "Noutotuotteet"-sääntö)

**Tekninen huomio VS Coden Claudelle:** älä lisää pakettikoon valintaa takaisin tuotteen lisäyslomakkeeseen tai checkoutiin — se kuuluu myyjän lähetys-/tilaustenhallintanäkymään, aktivoituu vasta kun tilaus merkitään lähetetyksi. Kytke tämä samaan yhteyteen kun Posti-integraatio (OmaPosti Pro API) rakennetaan (ks. "Lähetysintegraatio"-osio) — mock-vaiheessa (ennen oikeaa API-yhteyttä) tämä voidaan jo rakentaa UI-tasolla, koska se ei riipu oikeasta Posti-vastauksesta.

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
5. **Resend** — sähköpostinotifikaatiot. **✅ TEHTY 2026-09-03 — `RESEND_API_KEY` asetettu tuotannon `.env`:iin ja vahvistettu toimivaksi.** `backend/src/lib/resend.ts` — yleiskäyttöinen `sendEmail()` + `sendPasswordResetEmail()`/`sendBanNotificationEmail()`/`sendWelcomeEmail()`/`sendOrderConfirmationEmail()`/`sendShippingNotificationEmail()`/`sendAuctionWonEmail()` (kolme viimeistä integroitu 2026-09-03, ks. "Neljä sähköpostimallia" -osio). Avain vahvistettu läsnäolevaksi ja oikeanmuotoiseksi (`re_`-etuliite) suoraan palvelimelta, ja `send-email-test.ts`-ajo ei enää tuottanut "RESEND_API_KEY ei asetettu" -konsolilokia (aiemmin tuotti, ennen avaimen lisäystä).
   - **✅ SPF/DKIM/DMARC vahvistettu OIKEISTA vastaanotetun viestin otsikoista 2026-09-03 (ei arvattu DNS:stä käsin) — kaikki läpäisevät täydellisesti.** `Authentication-Results`: `spf=pass` (envelope `smtp.mailfrom=send.habahub.com` — Resendin oma "custom return-path" -alidomeeni, eri kuin näkyvä From-domeeni), `dkim=pass` KAKSI kertaa (sekä `d=habahub.com` että alla oleva `d=amazonses.com`), `dmarc=pass action=none`, ja Microsoftin oma `compauth=pass reason=100` (korkein luottamustaso). Tekninen autentikointi ei siis ole ongelma eikä vaadi mitään DNS-muutosta.
   - **⚠️ TIEDOSSA, EI BUGI: testiviestit menivät silti Outlookin roskapostiin.** Syy löytyi samoista otsikoista: `X-MS-Exchange-Organization-SCL: 5` + `X-Microsoft-Antispam-Mailbox-Delivery: ...dest:J` (Junk) — Microsoftin oma sisältö-/mainepohjainen pisteytys, EI autentikointivirhe (autentikointi läpäisi kuten yllä). Klassinen oire täysin uudelle lähettäjädomeenille jolla ei ole vielä lähetyshistoriaa Microsoftin silmissä, riippumatta täydellisestä SPF/DKIM/DMARC:sta. **Ei vaadi koodi- tai DNS-toimenpiteitä nyt** — korjaantuu luontaisesti lähetysmäärän/-historian kertyessä, nopeutuu jos vastaanottaja merkitsee viestit "Ei roskapostia"-tilaan Outlookissa. DMARC-politiikka on tällä hetkellä `p=none` (ei pakota) — siirto `p=quarantine`:en on yleinen hyvä käytäntö kun luottamus asetuksiin on vahvistettu, mutta ei ole tämän ongelman syy eikä kiireellinen.
   - **Markkinointi- vs. transaktionaaliset sähköpostit — päätös 2026-08-26:** käytetään **yhtä ja samaa palvelua molempiin, Resend** (transaktionaaliset API + Broadcasts/Audiences-toiminnot markkinointiin) — yksinkertaisempi ylläpitää kuin kahta erillistä palvelua (esim. Resend + Mailchimp). Jos Resendin markkinointipuoli osoittautuu myöhemmin liian suppeaksi, erillinen työkalu voidaan lisätä sitten — ei monimutkaisteta etukäteen.
   - **Zoho Mail koettu huonoksi (11€/vuosi, hankala asentaa) — vaihtoehtoja harkittu tälle uudelle domainille (support@habahub.com):** Fastmail (~30-50€/v, siistimpi hallintapaneeli), Namecheap Private Email (usein halvempi), Google Workspace / Microsoft 365 (tutuin käyttöliittymä, kalliimpi), Hetznerin oma webhosting-sähköposti (eri tuote kuin nykyinen Cloud VPS, hinta/käyttökokemus ei vahvistettu), tai ilmainen Cloudflare Email Routing + oma Outlook (vain vastaanotto+uudelleenohjaus, ei voi lähettää `support@habahub.com`-osoitteesta). **Ei vielä valittu — omistaja päättää myöhemmin, tämä on erillinen valinta Resendin sähköpostilähetyksestä** (Resend hoitaa sovelluksen lähettämät automaattiset viestit, tämä valinta koskee ihmisten välistä sähköpostiliikennettä `support@`-osoitteeseen).

6. **✅ TEHTY 2026-09-01 — salasanan palautus.** `POST /auth/forgot-password` (sähköposti → SHA-256-tiivistetty kertakäyttöinen token, `PasswordResetToken`-malli, 1h voimassaolo, vanhat käyttämättömät tokenit mitätöityvät uudesta pyynnöstä, vastaus aina sama riippumatta löytyikö käyttäjä — ei paljasta rekisteröityneitä sähköposteja) + `POST /auth/reset-password` (validoi tokenin, päivittää salasanan bcryptillä). Frontend: `/unohtuiko-salasana` (sähköpostin syöttö) + `/nollaa-salasana?token=...` (uusi salasana), "Unohditko salasanan?" -linkki login-sivulla. **Sivuvaikutus/löydös:** molemmat uudet sivut piti myös lisätä `frontend/proxy.ts`:n `PUBLIC_PATHS`-listaan — ilman sitä koko sivuston auth-seinä (kaikki paitsi `/login`/`/register`/`/kayttoehdot`/`/tietosuoja` vaatii kirjautumisen, ks. proxy.ts) olisi ohjannut juuri ne käyttäjät jotka eivät pääse sisään takaisin `/login`:iin nähdäkseen palautuslomakkeen. Testattu tuotannossa curlilla: olematon sähköposti ja oikea sähköposti antavat molemmat saman `{"ok":true}`-vastauksen, virheellinen token `/reset-password`:ssä antaa 400:n, molemmat sivut palauttavat 200:n ilman kirjautumista.
- **✅ Sähköposti lähtee nyt oikeasti 2026-09-03 alkaen** (ks. yllä oleva Resend-kohta — `RESEND_API_KEY` asetettu ja vahvistettu). Päästä-päähän "käyttäjä saa oikean sähköpostin" -polkua ei ole silti erikseen todennettu juuri salasanan palautukselle tässä yhteydessä (testattu vain neljä uutta sähköpostityyppiä, ks. "Neljä sähköpostimallia" -osio) — todennäköisesti toimii samalla mekanismilla, mutta ei suoraan varmistettu.
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
- ✅ Kiinteä 9,90€ postihinta muuttunut 6,90€:oon (ks. "Postihinnat" -osio) — **vahvistettu koodista 2026-09-01: TEHTY** (`backend/src/lib/shipping.ts`, `faq.tsx`, `valityspalkkiot`-sivu)
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

### Hosting — PÄIVITETTY 2026-08-26: domain vaihdettu skrm.fi/app.skrm.fi:stä habahub.com/habahub.fi:hin
**skrm.fi ja app.skrm.fi POISTETTU KOKONAAN käytöstä** (nginx-konfiguraatio ja SSL-sertifikaatit poistettu Hetzneriltä, ks. aiempi domain-vaihtokeskustelu). Sivusto pyörii nyt kokonaan osoitteissa **habahub.com** ja **habahub.fi**, sama Hetzner-palvelin, sama tekninen kokoonpano (PM2, nginx, PostgreSQL) kuin ennen — vain domain-nimi vaihtui.

**✅ TEHTY 2026-09-01: `.fi`- ja `www`-osoitteet ohjautuvat (301) kanoniseen `habahub.com`:iin.** Kanoninen domain on **habahub.com**. Nginx (`/etc/nginx/sites-available/habahub`, ei git-repossa, varmuuskopioitu palvelimelle ennen muutosta `habahub.bak-20260901`) jaettu kolmeen server-lohkoon: (1) `server_name habahub.com;` — ainoa joka oikeasti proxy_passaa sovellukseen (portit 3000/4000), (2) `server_name www.habahub.com habahub.fi www.habahub.fi;` (sama sertifikaatti kattaa kaikki neljä nimeä SAN:eina) — `return 301 https://habahub.com$request_uri;`, (3) HTTP (portti 80, kaikki neljä hostnimeä) — `return 301 https://habahub.com$request_uri;` suoraan yhdellä hypyllä (ei enää oman hostin HTTPS:ään ensin sitten kanoniseen). Vahvistettu curlilla: `habahub.fi`/`www.habahub.fi`/`www.habahub.com` (sekä HTTP että HTTPS) → 301 → `https://habahub.com`, `habahub.com` itse toimii ennallaan (307 login-seinä, ei uudelleenohjauslooppia).

**⬜ TEKEMÄTTÄ: sähköposti (Zoho Mail) pitää rekisteröidä uudelleen uudelle domainille.** Aiempi työ tehtiin `skrm.fi`:lle (support@skrm.fi, MX/SPF/DKIM-tietueet Cloudflaressa) — tämä ei siirry automaattisesti, sama prosessi (Zoho-rekisteröinti + DNS-tietueet Cloudflaressa) pitää tehdä uudelleen `habahub.com`:lle (tai `.fi`:lle, riippuen kumpaa halutaan sähköpostiosoitteena — kanoninen `.com`-päätös yllä viittaisi siihen että `support@habahub.com` on looginen valinta, mutta molemmat voivat vastaanottaa jos halutaan).

- **skrm.fi + app.skrm.fi** → poistettu kokonaan, ei enää käytössä missään
- **habahub.com** (kanoninen) + **habahub.fi** (ohjautuu .com:iin) → **Hetzner**, sama tekninen kokoonpano
- **Backend** → **Hetzner**, PM2 `skrm-backend` (prosessin nimi ei ole vielä päivitetty vastaamaan uutta brändiä, kosmeettinen, ei kiireellinen)
- **Tietokanta** → **Hetzner**, paikallinen PostgreSQL
- Repot: GitLab (https://gitlab.com/lpjr86/skrm, private) ja GitHub (https://github.com/Larzmoi/skrm, **yksityinen** — muutettu takaisin 2026-08-25)

## Turvallisuusauditointi 2026-08-26 (Security Headers, ImmuniWeb, Qualys SSL Labs) — B ja C toteutettu 2026-09-01, A odottaa omistajaa

Ulkoinen tietoturva-auditointi paljasti puuttuvia HTTP-security-headereitä ja TLS-asetuksia. Osa korjataan koodissa (VS Coden Claude), osa on pelkkiä Cloudflare-dashboard-asetuksia (omistaja tekee itse, ei koodia).

### A) Cloudflare-dashboard-asetukset (omistaja tekee itse, ei koodia) — TEKEMÄTTÄ
1. **TLS 1.0/1.1 pois käytöstä** — SSL/TLS → Edge Certificates → Minimum TLS Version → **TLS 1.2**
2. **HSTS päälle** — samalla sivulla, Enable HSTS, Max Age 12kk (`preload`-vaihtoehto jätetään pois toistaiseksi — preload-listalle pääsy on käytännössä pysyvä sitoumus, ei kannata sitoutua siihen vielä)

### B) next.config.ts — ✅ TEHTY 2026-09-01
`frontend/next.config.ts`: `poweredByHeader: false` + `headers()` asettaa kaikki ehdotetut headerit
(HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) + CSP.

**CSP suunniteltiin oikean koodin perusteella, ei vain auditoinnin arvauksella:**
- `connect-src` sallii `wss:` (mikä tahansa host) — **vahvistettu aidosti tarpeelliseksi**: LiveKitin
  selainyhteys (`LIVEKIT_WS_URL`) menee ERI hostiin kuin sovellus itse (ks. alla oleva löydös —
  tuotannossa tämä on tätä kirjoitettaessa yhä `stream.skrm.fi`, vanha domain). Socket.io käyttää
  samaa originia mutta wss-skeemaa upgrade-yhteydelle.
- `connect-src`/`frame-src`/`form-action` sallivat `https://*.paytrail.com` ja Postin
  (`gateway.posti.fi`/`gateway-auth.posti.fi`) siitä huolimatta että **kooditarkistus paljasti
  etteivät nämä ole tällä hetkellä aidosti tarpeen**: Paytrail-maksu tehdään täydellä
  sivunavigoinnilla (`window.location.href`, `frontend/app/kori/page.tsx` + `ostot/page.tsx`), ei
  fetch/iframe-upotuksella, ja Posti-kutsut ovat tähän mennessä pelkkää backend-koodia
  (`postiService.ts`, mock). Pidetty silti mukana CSP:ssä valmiiksi tulevaa varten (esim. jos
  Posti-integraatio joskus rakennetaan selainpuolelle) — ei turvariskiä koska molemmat ovat jo
  tunnettuja, syvästi integroituja kolmannen osapuolen palveluita.
- Ei mitään external-viittauksia (fontit/skriptit/tyylit) löytynyt käännetystä HTML:stä paikallisella
  buildilla (`Hanken Grotesk` on `next/font/google`:n kautta itse-hostattu build-aikana, ei
  runtime-pyyntöä `fonts.googleapis.com`:iin) — `font-src`/`style-src`/`script-src` eivät siis
  tarvitse ylimääräisiä ulkoisia hosteja.
- **script-src sallii yhä `'unsafe-inline' 'unsafe-eval'`** (ei nonce-pohjainen) — tietoinen
  kompromissi: en pystynyt ajamaan interaktiivista selainta LiveKit-videon/Paytrail-testimaksun läpi
  (vain palvelinpuolinen curl-testaus + paikallinen build+headerien tarkistus mahdollista tässä
  ympäristössä), ja liian tiukka script-src olisi pahin mahdollinen epäonnistumistapa (koko sivu
  tyhjä, ei virheilmoitusta). Muu politiikka (frame-ancestors, object-src none, base-uri self,
  rajattu connect/frame/form-action) tuottaa silti merkittävän parannuksen ilman tätä riskiä.

**✅ Tehty (korvaa auditoinnin oman testausvaatimuksen sikäli kuin ilman selainta voi):**
paikallinen `next build` onnistui, headerit vahvistettu curlilla (`Strict-Transport-Security`,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Content-Security-Policy` kaikki läsnä vastauksessa, ei `X-Powered-By`-headeria), käännetyn HTML:n
läpikäynti ei paljastanut ulkoisia resurssiviittauksia jotka CSP olisi hiljaa estänyt.
**⚠️ EI vielä tehty, vaatii omistajan: interaktiivinen selaintesti tuotannossa** (kirjautuminen,
selaus, LiveKit-video/chat, Paytrail-testimaksu, Console-välilehti auki virheiden varalta) — sama
rajoitus kuin Paytrailin hostatun maksusivun läpivienti-testaus (ks. "Paytrail-maksuintegraatio"
-osio "Ei vielä testattu"), ei automatisoitavissa turvallisesti tästä ympäristöstä.

**Sivutuote-löydös (ei korjattu, vain kirjattu, koska ei ollut osa pyydettyä 4 kohdan listaa):**
`LIVEKIT_WS_URL` tuotannon backend `.env`:ssä on yhä `wss://stream.skrm.fi` — **vanha domain**,
vaikka CLAUDE.md:n "Hosting"-osio sanoo `skrm.fi`/`app.skrm.fi` olevan "POISTETTU KOKONAAN
käytöstä". Todellisuudessa `stream.skrm.fi` toimii yhä teknisesti (DNS resolvii, Let's Encrypt
-sertifikaatti olemassa `/etc/letsencrypt/live/stream.skrm.fi/`, oma nginx-sivusto `hls` on
enabloituna) — striimaus ei siis ole rikki, mutta domain-migraatio habahub.com:iin jäi kesken
juuri tämän yhden alidomainin osalta. Ei kosketettu tässä, koska muutos vaatisi joko uuden
`stream.habahub.com`-sertifikaatin+DNS-tietueen provisioinnin tai päätöksen pitää striimaus-
alidomain tarkoituksella erillään sovellusdomainista — omistajan päätettävä kumpi.

### C) GDPR/tietosuoja-linkki ei löytynyt auditoinnissa — ✅ TARKISTETTU 2026-09-01, ei koodivikaa
Footerin (`frontend/components/layout/Footer.tsx`) "Tietosuoja"-linkki on jo oikea Next.js `<Link
href="/tietosuoja">`, joka renderöityy aina oikeaksi `<a href>`-tagiksi — ei JS-only-navigointia.
**Todellinen syy löytyi:** koko sivusto (etusivu mukaan lukien) vaatii kirjautumisen anonyymiltä
kävijältä (`frontend/proxy.ts`:n `PUBLIC_PATHS`-allowlist kattaa vain `/login`, `/register`,
`/kayttoehdot`, `/tietosuoja` — ei edes `/`:ää). Ulkoinen auditointirobotti ei koskaan päässyt
kirjautumissivun ohi nähdäkseen footeria ollenkaan — linkki on siis olemassa ja toimiva, se vain ei
ollut crawlerin saavutettavissa. Ei koodimuutosta tehty tähän, koska koko-sivuston auth-seinä
vaikuttaa tarkoitukselliselta nykyiselle sulje-beta-vaiheelle (myös rekisteröityminen on
väliaikaisesti pois käytöstä login-sivulla) — ei minun päätettäväni avata sitä ilman erillistä pyyntöä.

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

### Kolme uutta testitiliä — 2026-08-17
Omistajan pyynnöstä luotu kolme testitiliä tuotantoon (`/register`-reitin kautta, ei kovakoodattu):
- `testi@testi.com` / `testi12345` (username: `testiuser`)
- `testi2@testi.com` / `testi12345` (username: `testi2user`)
- `testi3@testi.com` / `testi12345` (username: `testi3user`)

Kaikki kolme tavallisia `USER`-rooleja, ei admin-oikeuksia. Käytetty myös alla kuvatun
push-ilmoitusominaisuuden tuotantotestaukseen (seuraaminen + livelle meno), testidata
(seuraussuhde, ilmoitukset, testi-Show) siivottu pois jälkikäteen — itse tilit jätetty ennalleen
koska omistaja pyysi ne nimenomaisesti pysyväksi testikäyttöön.

## Push-ilmoitukset (Web Push) — TEHTY 2026-08-17

Omistajan pyyntö: ilmoitus kun (1) joku alkaa seurata profiilia, (2) seurattu myyjä menee liveen —
jälkimmäisen piti kantautua puhelimelle asti, ei vain in-app-kellokuvakkeeseen.

**Kaksi erillistä kanavaa nyt käytössä, tarkoituksella:**
1. **In-app-ilmoitus** (jo olemassa oleva `Notification`-malli + socket-push, ks. `lib/notify.ts`) —
   toimii vain kun sivusto on auki selaimessa.
2. **Web Push** (uusi) — käyttöjärjestelmätason ilmoitus, toimii myös kun sivusto EI ole auki.
   Tämä on se osa joka "kantautuu puhelimeen".

**Toteutus:**
- `web-push`-paketti + VAPID-avainpari (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`
  backendin `.env`:ssä, julkinen avain toistettuna `NEXT_PUBLIC_VAPID_PUBLIC_KEY`:na frontendin
  `.env.local`:ssa — julkinen avain ei ole salainen, se on tarkoitettu selaimelle).
- Uusi `PushSubscription`-malli (`userId`, `endpoint` uniikki, `p256dh`, `auth`) — yksi rivi per
  selain/laite, ei per käyttäjä (sama tili voi olla kirjautuneena useammalla laitteella).
- `backend/src/lib/push.ts`: `sendPushToUser(userId, {title, body, url})` — lähettää kaikkiin
  käyttäjän tunnettuihin laitteisiin rinnakkain, siivoaa vanhentuneet tilaukset (410/404) pois
  automaattisesti sen sijaan että yrittäisi niitä uudestaan.
- `frontend/public/sw.js`: minimaalinen service worker, näyttää push-tapahtuman ilmoituksena ja
  vie oikeaan osoitteeseen klikattaessa.
- `frontend/lib/push.ts`: `subscribeToPush()` — pyytää selainluvan ja rekisteröi tilauksen.
  **Kutsuttava käyttäjän eleen (esim. napin klikkaus) sisällä**, muuten selain voi jättää
  lupapyynnön huomiotta — siksi kutsu on `/u/[username]`:n "Seuraa"-napin klikkauskäsittelijässä,
  ei esim. sivun latautuessa automaattisesti.
- Uudet `NotificationType`-arvot: `NEW_FOLLOWER` (in-app, ei pushia — vain "goes live" kantautuu
  puhelimeen omistajan pyynnön mukaan), `SELLER_LIVE` (in-app + push).
- `POST /users/:username/follow`: uudesta seuraamisesta (ei seuraamisen lopettamisesta)
  `notifyUser(seller.id, 'NEW_FOLLOWER', ...)`.
- `PATCH /shows/:id/status` (status→LIVE): hakee kaikki myyjän seuraajat, lähettää jokaiselle
  sekä in-app- että push-ilmoituksen rinnakkain (`Promise.all`, ei blokkaa "Aloita julkinen
  lähetys" -painalluksen vastausta jos seuraajia on paljon).
- `/ilmoitukset`-sivulle lisätty myös manuaalinen "Ota selainilmoitukset käyttöön" -nappi niille
  jotka haluavat pushin ilman että täytyy ensin seurata jotakuta.

**Testattu tuotannossa curlilla** (testi/testi2/testi3-tileillä, ks. yllä): seuraaminen synnyttää
oikean `NEW_FOLLOWER`-ilmoituksen, `PATCH .../status LIVE` synnyttää `SELLER_LIVE`-ilmoituksen
kaikille seuraajille oikealla title/body/link-sisällöllä, `/push/subscribe` ja `/push/unsubscribe`
toimivat. **Ei testattu:** oikea push-ilmoitus laitteen lukitusnäytölle asti (vaatisi oikean
selaimen jolla on Notification-lupa myönnetty ja todellinen push-palvelun endpoint, ei
automatisoitavissa curlilla) — omistajan kannattaa kokeilla itse: seuraa jotakuta, hyväksy
selainlupa, mene toisella tilillä liveen.

**Sivuvaikutus/löydös deployn aikana:** GitHub-repo (`Larzmoi/skrm`) oli hetken yksityinen kesken
deployn, minkä takia Hetzner-palvelimen `git pull` alkoi vaatia kirjautumista eikä toiminut (repo
oli aiemmin dokumentoitu julkiseksi, palvelimella ei ole koskaan ollut tallennettuja git-
tunnuksia koska niitä ei aiemmin tarvittu). Omistaja palautti repon julkiseksi kesken istunnon,
minkä jälkeen deploy jatkui normaalisti. Ei koodimuutos, ei jää pysyväksi ongelmaksi, mutta hyvä
tietää jos `git pull` joskus alkaa yllättäen kysyä käyttäjätunnusta palvelimella.

## Toimituksen aikataulu ja maksuturva (LUKITTU — TÄSMENNETTY 2026-09-04: ostajan oma kuittaus vapauttaa HETI)

**Ydinsääntö, korjattu looginen virhe 2026-09-04:** aiempi sääntö kohteli kahta eri signaalia samalla tavalla (molemmat käynnistivät 24h-jakson). Nyt eroteltu selvästi:
- **Postin API sanoo toimitettu, ostaja EI ole vielä reagoinut** → **ostajalla 24 tuntia aikaa hyväksyä/reklamoida**, sitten automaattivapautus jos ei reagoi
- **Ostaja ITSE aktiivisesti kuittaa vastaanoton** (milloin tahansa, riippumatta Postin statuksesta) → **maksu vapautuu VÄLITTÖMÄSTI, ei mitään 24h-odotusta.** Perustelu: aktiivinen kuittaus ON jo se hyväksyntä, ei ole syytä odottaa lisää sen päälle.

- Myyjä lähettää + syöttää seurantakoodin → kello käynnistyy
- **Postin API sanoo toimitettu, ostaja ei reagoi** → 24h aikaa hyväksyä/reklamoida
  - Jos ostaja ei reagoi 24h sisällä → maksu vapautuu automaattisesti myyjälle
  - Jos ostaja reklamoi 24h sisällä → tilanne HABAHUB:n käsittelyyn, maksu jäädytykseen
- **Ostaja kuittaa itse milloin tahansa (ennen tai jälkeen Postin toimitusvahvistuksen)** → maksu vapautuu heti, ei 24h-jaksoa
- **Jos toimitus EI koskaan vahvistu eikä ostaja kuittaa** → alla oleva päivä 5/10/14-eskalaatio on yhä voimassa fallback-polkuna:
  - **Päivä 5** — paketti ei liikkunut → automaattinen ilmoitus myyjälle ja ostajalle
  - **Päivä 10** — ei toimitusta → muistutus ostajalle "kuittaa tai ilmoita ongelmasta"
  - **Päivä 14** — ostaja ei reagoinut eikä toimitus koskaan vahvistunut → maksu vapautuu automaattisesti myyjälle (viimeinen fallback)
- **Noutokoodi vahvistettu** (nouto-toimitustavan tilauksille) → vapauttaa heti, ei odota 24h eikä 14pv, koska molemmat osapuolet fyysisesti läsnä — tämä pysyy ennallaan, ei muutu
- Ei luoteta pelkästään Postin statukseen ilman tätä 24h-välivaihetta — ostajalle pitää aina jäädä oikea tarkastusikkuna
- **Erillinen, säilyvä sääntö (käyttöehdot 6.3):** ostajalla on 3 vuorokautta tuotteen vastaanottamisesta aikaa reklamoida tuotteen virheistä/puutteista — tämä on eri asia kuin yllä oleva 24h-maksunvapautusikkuna, koskee tuotevirheitä yleensä eikä vaikuta suoraan siihen onko maksu jo vapautunut. Ei muutu tässä päivityksessä.

**Käyttöehtojen kohta 7 (Maksuturva) JA FAQ:n "Milloin saan rahani" JA i18n:n `protectionDesc` (`fi.ts`) vaativat kaikki päivityksen tämän mukaiseksi** — nykyinen teksti kaikissa kolmessa paikassa ("Maksu vapautetaan Myyjälle toimituksen vahvistamisen jälkeen" / "kun seurantakoodi on toimitettu") on VANHENTUNUT ja suoraan ristiriidassa tämän säännön kanssa, vahvistettu koodista 2026-09-01 (`frontend/lib/i18n/fi.ts` rivi 235, `faq/page.tsx` rivi 35).

**✅ KOODI VIIMEIN TÄSMÄÄ SÄÄNTÖÖN 2026-09-03 — omistaja vahvisti 24h-säännön uudelleen, ja tarkistus paljasti että itse toteutus oli jäänyt jälkeen dokumentaatiosta.** `backend/src/jobs/deliveryTimeline.ts`:n `checkDeliveryTimeline()` käytti yhä kirjaimellisesti `2 * DAY_MS` (=48h) `deliveryConfirmedAt`-pohjaisen vapautuksen kynnyksenä, vaikka kommentit ja CLAUDE.md jo väittivät säännön olevan 24h — dokumentoitu 2026-09-01 "tiukennus" ei siis koskaan päätynyt itse koodiin, vain tekstiin. Korjattu `confirmedAge >= DAY_MS`:ksi (yksi vuorokausi, ei kaksi), ilmoitustekstit "48 tunnin"/"48 tuntia" → "24 tunnin"/"24 tuntia" samassa tiedostossa ja `backend/src/routes/orders.ts`:n `POST /:id/confirm-delivery` -reitin ilmoitusteksteissä. Myös `frontend/app/kayttoehdot/content.ts`:n §7 (FI, EN, ja äskettäin lisätty SV) korjattu 48h→24h — nämä oli tietoisesti jätetty koskematta 2026-09-03 aiemmin samana päivänä juuri tämän epävarmuuden takia (ei tiedetty oliko 2026-09-01-päätös viety koodiin), mutta omistaja vahvisti säännön suoraan joten korjattu nyt kaikkialla kerralla. `frontend/lib/i18n/{fi,en,sv}.ts`:n `protectionDesc`/`protectionPoints` ja FAQ:n "Milloin saan rahani" olivat jo entuudestaan oikein 24h:ssa kaikissa kolmessa kielessä — ei vaatinut muutosta.



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

### Testiympäristö saatu ja testattu 2026-09-03 — token toimii, itse kutsut estetty puuttuvan x-gateway-secretin takia

Omistaja toimitti kaksi tiedostoa repon juureen: `useradmin-dmz.tst.account.posticloud.fi_..._Muistikuva_Oy.json` (oikeat testiympäristön OAuth2-tunnukset — ERI `client_id`/`client_secret` kuin tuotannon, eri sopimusnumero **677503** paketeille vs. tuotannon 691317) ja `How to test OmaPosti Pro API v2.docx` (Postin oma virallinen testiohje, "UPDATED with Demo URLs"). **Näitä EI committoitu gittiin** (raaka client_secret ei kuulu versionhallintaan edes yksityisessä repossa) — arvot kopioitu suoraan palvelimen `.env`:iin.

**Ohjeesta vahvistetut, aiemmin avoimet kysymykset:**
- **Demo-ympäristön URL:t ovat ERI host kuin tuotanto:** token `https://gateway-auth.demo.posti.fi/api/v1/token` (ei `gateway-auth.posti.fi`), shipping-order `https://gateway.demo.posti.fi/shippingapi/api/v2/shipping/order`.
- **`x-gateway-secret`-otsikko vaaditaan JOKAISEEN kutsuun** (paitsi token-hakuun) — Postin tuen erikseen toimittama arvo, alkaa "KBs7...". **Ei sisältynyt kumpaankaan toimitettuun tiedostoon** (varmistettu grepillä docx:n koko sisällöstä + metadatasta) — pelkkä maininta ohjeen proosassa esimerkkinä muodosta, ei oikea arvo.
- **Palvelukoodi PO2103 vahvistettu oikeaksi** isommalle pakettikoolle suoraan Postin omasta curl-esimerkistä (aiempi hypoteesi osui oikeaan). `packageCode` on **"PKT"**, ei aiemmin arvattu "PIKKUPAKETTI"/"PAKETTI".
- **OmaPosti Pro API v2 ITSESSÄÄN ei ole labelless** — vastaus sisältää `prints[]`-taulukon jossa `pdf_type:"ADDRESSLABEL"`, `shipment.status:"PRINTED"`, API palauttaa aina tulostettavan PDF-osoitetarran tästä yhdestä kutsusta. **⚠️ TÄMÄ EI vielä ollut lopullinen johtopäätös "labelless ei ole mahdollista" — omistaja huomautti aiheellisesti 2026-09-03 että se perustui vain tähän yhteen OPP v2 -oppaaseen, ei erilliseen Sending Code API -dokumenttiin jonka Tom oli alun perin linkannut. Ks. alla oma osionsa — luettu ja tarkennettu samana päivänä.**
- **Vastauksen muoto on TAULUKKO** (`[{...}]`), ei yksittäinen objekti — `parcels[0].parcelNo` on trackingNumber, `prints[0].href` on suoraan käytettävä linkki tarran PDF:ään (ei rakenneta itse URLia, käytetään sellaisenaan vastauksesta).

**Tehty:**
- **Token-haku testattu ja vahvistettu toimivaksi** oikeaa demo-ympäristöä vasten (kertakäyttöinen skripti, poistettu käytön jälkeen) — HTTP 200, oikea `access_token`.
- **Itse lähetyksen luonti testattu Postin oman esimerkkipyynnön kanssa — torjuttu CloudFront-tasolla 403:lla**, koska `x-gateway-secret` puuttuu. Sama 403 toistui myös pickup-point-tyyppisillä poluilla samalla gatewaylla — vahvistaa että `x-gateway-secret` on koko `shippingapi`-perheen vaatimus, ei vain shipping/order-endpointin oma.
- **Uusi `backend/src/lib/postiClient.ts`** — OIKEA (ei mock) integraatio kirjoitettu Postin ohjeen tarkan muodon mukaan: token-haku (muistivarainen välimuisti, kunnioittaa `expires_in`:iä), `createShippingOrder()`/`fetchLabelPdf()` oikealla request/response-muodolla. **Ei vielä kytketty mihinkään reittiin** — jokainen funktio heittää selkeän virheen niin kauan kuin `POSTI_GATEWAY_SECRET` on tyhjä, ei koskaan hiljaa epäonnistu tai palauta mock-dataa livenä.
- **`backend/src/lib/postiService.ts`** (mock, yhä se mitä `POST /orders/:id/create-shipment` oikeasti käyttää) päivitetty vastaamaan nyt vahvistettuja faktoja: `packageCode` → "PKT", `POSTI_PROD_URL` → v2-muotoon, ja **`MOCK_OUTPUT_TYPE` vaihdettu `'code'`:sta `'label_pdf'`:ksi** — UI (`dashboard/tilaukset`, `ostot`) tukee jo molempia haarautumia (`labelUrl`/`sendingCode`) valmiiksi, joten tämä oli yksi rivi, ei UI-muutosta.
- **Palvelimen `.env`:iin lisätty:** `POSTI_TEST_MODE=true`, `POSTI_TEST_CLIENT_ID`, `POSTI_TEST_CLIENT_SECRET`, `POSTI_TEST_CONTRACT_NUMBER=677503`. **`POSTI_GATEWAY_SECRET` VASTAANOTETTU JA LISÄTTY 2026-09-04** (Tom lähetti arvon sähköpostitse, alkaa "KBs7..." — ei tallenneta tähän tiedostoon, sama turvallisuuskäytäntö kuin muidenkin salaisuuksien kanssa).

### ✅ PÄÄSTÄ-PÄÄHÄN TESTATTU JA VAHVISTETTU TOIMIVAKSI 2026-09-04 — koko demo-virta onnistui

Omistajan pyynnöstä ajettu täysi kolmivaiheinen testi demo-ympäristöä vasten kertakäyttöisellä skriptillä (poistettu käytön jälkeen), kaikki kolme onnistuivat:

1. **Token-haku** `https://gateway-auth.demo.posti.fi/api/v1/token` testitunnuksilla → **HTTP 200**, oikea `access_token` saatu.
2. **Lähetyksen luonti** `https://gateway.demo.posti.fi/shippingapi/api/v2/shipping/order`, `senderPartners.custNo: "677503"` (testisopimusnumero, ei tuotannon 691317), `x-gateway-secret`-otsikolla → **HTTP 200**. Oikea vastaus (taulukkomuoto, kuten aiemmin dokumentoitu): `status:"PRINTED"`, `shipmentNo`, `parcels[0].parcelNo: "JJFI67750398911973959"` (trackingNumber), `prints[0].href` osoitteeseen `.../shipments/677503/pdfs/6c4a6ffe-...`.
3. **PDF-haku** samalla `href`:llä, samoilla Bearer+`x-gateway-secret`-headereilla → **HTTP 200**, `Content-Type: application/pdf`, 88 778 tavua, tiedosto alkaa oikein `%PDF-1.7`:lla — aidosti kelvollinen PDF-tiedosto, ei tyhjä/virheellinen vastaus.

**Koko OmaPosti Pro API v2 -integraatio on siis nyt vahvistettu toimivaksi demo-ympäristössä päästä päähän** — `backend/src/lib/postiClient.ts`:n `createShippingOrder()`/`fetchLabelPdf()` on kirjoitettu täsmälleen tähän vahvistettuun muotoon, ei enää arvaus.

**Testi/tuotanto-erottelu vahvistettu jo olemassa olevaksi, ei vaatinut koodimuutosta:** `postiClient.ts`:n `POSTI_TEST_MODE`-kytkin (oletus `true`, sama periaate kuin `PAYTRAIL_TEST_MODE`) vaihtaa URL:t, tunnukset JA sopimusnumeron **yhtenä yhtenäisenä parina** — ei ole mahdollista että testi-URL yhdistyisi tuotannon sopimusnumeroon tai päinvastoin, koska kaikki kolme luetaan saman `if`-haaran sisältä. Tuotantoon siirryttäessä ainoa tarvittava muutos on `POSTI_TEST_MODE=false` palvelimen `.env`:ssä (+ oikeat tuotanto-arvot `POSTI_CLIENT_ID`/`SECRET`/`CONTRACT_NUMBER`-muuttujiin, jotka ovat jo paikoillaan `.env`:ssä production-tarkoitukseen) — ei koodimuutosta.

**⬜ Ei vielä tehty, tietoinen rajaus:** `getSendingCode()` (Sending Code API) on YHÄ oma, erillinen 403 — tämä EI liittynyt puuttuvaan gateway secretiin ollenkaan (eri este: puuttuva tuote-/roolirekisteröinti `developer.posti.com`:ssa, ks. edellinen osio) eikä testattu uudestaan nyt, koska mikään ei muuttunut sen suhteen. Kysy Postilta samassa yhteydessä kun/jos vielä tarpeen.
### ✅ KYTKETTY LIVE-REITTIIN 2026-09-04 — koko flow toimii oikealla POST/GET-kutsulla, ei vain erillisellä testiskriptillä

Omistaja pyysi eksplisiittisesti kytkemään heti kun päästä-päähän-testi onnistui. Tehty samana päivänä:

- **`POST /orders/:id/create-shipment`** (`backend/src/routes/orders.ts`) käyttää nyt `postiClient.createShippingOrder()`:ia `postiService.ts`-mockin sijaan. `Pakettikoko`-hakutaulukot (`SERVICE_ID_BY_PAKETTIKOKO`/`PACKAGE_CODE_BY_PAKETTIKOKO`/`WEIGHT_KG_BY_PAKETTIKOKO`) siirretty `postiClient.ts`:ään, koska se on nyt tiedosto joka oikeasti luo lähetyksiä. `postiService.ts` typistetty jäljelle jäävään osaan (`getTrackingStatus()` — Tracking API ei ollut osa tätä työtä, on yhä oma mockinsa).
- **KRIITTINEN HUOMIO joka löytyi kytkennän aikana:** Postin oma `prints[].href` VAATII `Authorization: Bearer` + `x-gateway-secret` -headerit toimiakseen — plain `<a href={url}>` selaimessa EI voi lähettää näitä, joten suora linkitys Postin URLiin ei olisi koskaan toiminut oikeasti loppukäyttäjälle vaikka data näytti oikealta. Ratkaisu: uusi `Order.postiLabelHref`-kenttä (raaka Postin href, EI KOSKAAN näytetä frontendille sellaisenaan) + uusi **`GET /orders/:id/label-pdf`** -proxy-reitti (autentikoitu, ostaja TAI myyjä) joka hakee PDF:n palvelinpuolella (`fetchLabelPdf()`) ja striimaa sen takaisin. `order.labelUrl` on nyt meidän oma proxy-polku (`/orders/:id/label-pdf`), ei koskaan Postin raaka URL. Frontend (`ostot/page.tsx`, `dashboard/tilaukset/page.tsx`) vaihdettu `<a href>`:sta nappiin joka tekee autentikoidun `fetch()`+blob-haun ja avaa PDF:n `window.open(URL.createObjectURL(blob))`:lla (`orderApi.openLabelPdf()`, `frontend/lib/api.ts`) — pelkkä linkin klikkaus ei voisi koskaan liittää JWT:tä pyyntöön.
- **Testattu OIKEALLA HTTP-reitillä, ei enää vain erillisellä skriptillä:** kertakäyttöinen testi loi väliaikaisen tilauksen (Larzmoi=myyjä, testiuser=ostaja, `PENDING_SHIPPING`/`postitus`), kutsui `POST /orders/:id/create-shipment` oikealla seller-JWT:llä palvelimen omaan `localhost:4000`:iin → **200**, oikea `trackingNumber` (`JJFI67750398911973966`), `labelUrl:"/orders/.../label-pdf"`, `postiLabelHref` Postin oikealla demo-URL:lla. Sitten `GET /orders/:id/label-pdf` samalla JWT:llä → **200**, `Content-Type: application/pdf`, 88 720 tavua, alkaa `%PDF-1.7`:lla. **Koko flow vahvistettu toimivaksi omien reittien kautta, ei vain suoraan Postia vasten.**
- **Siivous, huomioitava jatkossa:** testitilauksen poisto kaatui ensin `OrderItem`-FK-rajoitteeseen (`RESTRICT`, ei `CASCADE`) — sama tunnettu kuvio kuin aiemmin dokumentoitu tuotteen-poisto-bugi ("Tunnettuja bugeja" -osio), OrderItem pitää poistaa ensin erikseen ennen Orderia/Productia. Korjattu siivousskriptissä, ei koodimuutosta tarvittu itse sovellukseen. Kaikki testidata (Order/OrderItem/Product) ja myyjän/ostajan osoitekenttien tilapäiset placeholder-arvot (vain jos ne olivat tyhjiä alun perin — kummallakaan testitilillä ei ollut, joten ei todellista muutosta) palautettu/poistettu, vahvistettu jälkikäteen tyhjällä hakutuloksella.

**Yhä auki:** `sendingCode` pysyy aina `null`:na, PDF-tarra on ainoa toimiva tulos toistaiseksi — Sending Code API on oma, erillinen 403 (ks. edellinen osio), ei liity gateway secretiin. `POSTI_TEST_MODE=true` (oletus) — tuotantoon siirtyminen vaatii vain tämän `false`:ksi kääntämisen `.env`:ssä, ei koodimuutosta.

### Sending Code API luettu ja tarkennettu 2026-09-03 — labelless ON mahdollinen, mutta kahdessa kutsussa, ei yhdessä

Omistaja pyysi eksplisiittisesti lukemaan erillisen `Sending Code API.txt` -dokumentin (Tomin alun perin linkkaama, lisätty repon juureen — **ei sisällä oikeita salaisuuksia, vain paikkamerkkejä kuten `<USER_ID>`, jätetty repoon viitteeksi**) ennen kuin "labelless ei onnistu" -johtopäätöstä vahvistettaisiin lopulliseksi. Aiheellinen huomautus — johtopäätös perustui aiemmin vain OmaPosti Pro API v2 -oppaaseen.

**Dokumentti vahvistaa täsmälleen omistajan hypoteesin:** Sending Code API on Postin OMA, ERILLINEN tuote OPP v2:sta. Se ei koskaan itse LUO lähetystä — se ottaa vastaan OLEMASSA OLEVAN `trackingNumber`:n (esim. OPP v2:n `parcels[0].parcelNo`) ja palauttaa lyhyen 6-10-merkkisen aakkosnumeerisen `sendingCode`:n, täysin riippumatta siitä että sama lähetys tuotti myös PDF-tarran. **Johtopäätös siis korjattu: labelless ON saavutettavissa, mutta KAHDELLA erillisellä API-kutsulla peräkkäin (1. luo lähetys OPP v2:lla → 2. hae koodi Sending Code API:lla samalle trackingNumberille), ei yhdellä niin kuin alun perin toivottiin.** PDF:ää ei tarvitse koskaan näyttää käyttäjälle jos toinen kutsu onnistuu — se vain syntyy sivutuotteena ensimmäisestä kutsusta.

**Muut dokumentista vahvistetut yksityiskohdat:**
- **Endpointit:** `POST /2026-04/labelless` (luo/hae koodi), `GET /2026-04/labelless/{trackingNumber}`, `GET /2026-04/labelless/shipment/{sendingCode}` (käänteishaku).
- **Ei omaa demo-hostia** — dokumentti sanoo eksplisiittisesti "Environments: Production only". Sen sijaan omalla, dokumentoidulla `x-test-environment: true` -otsikolla tuotanto-hostia (`gateway.posti.fi`) vasten saa mockattua dataa oikeiden kutsujen sijaan — API tunnistaa `trackingNumber`:n viimeisen numeron ja palauttaa sen mukaan joko onnistuneen mock-koodin, "ei löydy" -virheen tai EDI-tarkistusvirheen, dokumentoitu turvallinen tapa testata ilman oikeaa dataa.
- **Token-host on sama kuin tuotannon OPP v2:n** (`gateway-auth.posti.fi`) — EI sama kuin OPP v2:n demo-host.

**Testattu suoraan (kertakäyttöinen skripti, poistettu käytön jälkeen):** token-haku onnistui olemassa olevilla TUOTANNON `POSTI_CLIENT_ID`/`SECRET`-tunnuksilla (HTTP 200) — mutta itse `POST /2026-04/labelless`-kutsu `x-test-environment: true` -otsikon kanssa palautti **`403 Unauthorized` suoraan Postin omalta API-tasolta** (ei CloudFront-tason estoa kuten OPP v2:n gateway-secret-ongelmassa — pyyntö siis tunnistettiin mutta hylättiin). Token-vastauksen oma `posti_fi.targets`-kenttä listasi vain `"shippingapi"`-kohteen, ei `"2026-04"`-kohdetta jota Postin oma dokumentaatioesimerkki näyttää onnistuneessa tapauksessa — **sama tilannekuvio kuin Pickup Point -API:lla: vaatii oman, erillisen tuote-/roolirekisteröinnin `developer.posti.com`:ssa, ei sisälly automaattisesti nykyiseen `shippingapi`-rooliin.**

**Tehty:** `backend/src/lib/postiClient.ts`:ään lisätty `getSendingCode(trackingNumber, opts)` — oikea (ei mock) funktio Postin dokumentoidun muodon mukaan, oma token-käsittely (aina tuotanto-host, ei `POSTI_TEST_MODE`-kytkintä koska API:lla ei ole demo-varianttia), `testEnvironment`/`noEdiCheck`-optiot valmiina. **Ei vielä kytketty mihinkään reittiin** — heittää selkeän virheen, ei mockaa mitään livenä.

**⬜ TEKEMÄTTÄ, seuraava askel — sama pyyntö Postille kattaa todennäköisesti molemmat:** kun pyydät `x-gateway-secret`-arvoa OPP v2:lle, kysy SAMALLA onko Sending Code API -tuote (rooli/kohde `"2026-04"`) mahdollista lisätä samaan `shippingapi`-OAuth-sovellukseen vai tarvitseeko se oman erillisen rekisteröinnin `developer.posti.com`:ssa. Kun pääsy on kunnossa, testaa ensin `x-test-environment: true`:lla (turvallinen, ei oikeaa dataa) ennen kuin kokeillaan ilman sitä.

**Siivous:** molemmat alkuperäiset Posti-dokumenttitiedostot (JSON-tunnukset + docx-ohje) poistettu kokonaan repon juuresta omistajan pyynnöstä — sisälsivät raakoja salaisuuksia, eivät koskaan olleet git-seurannassa, arvot jo talteen palvelimen `.env`:issä. `Sending Code API.txt` jätetty paikoilleen (ei salaisuuksia, pelkkiä paikkamerkkejä).

**⬜ TEKEMÄTTÄ, seuraava askel:** pyydä Postin tueltä `x-gateway-secret`-arvo (sama kanava josta testitunnuksetkin tulivat). Kun se saadaan: (1) testaa `postiClient.createShippingOrder()` suoraan demo-ympäristöä vasten kertakäyttöisellä skriptillä samaan tapaan kuin token-haku, (2) vasta kun se on vahvistettu toimivaksi päästä päähän, kytke `POST /orders/:id/create-shipment` käyttämään sitä `postiService`-mockin sijaan. **Älä kytke ennen vahvistusta** — nykyinen mock-pohjainen virta (`sendingCode`/`labelUrl`/`trackingNumber` UI:ssa) toimii ja on turvallinen, ei kannata rikkoa sitä kesken todentamattoman API-kutsun.

**⬜ Erikseen, oma avoin kysymyksensä:** Pickup Point -haku (checkoutin mock-noutopistelista, `frontend/lib/postiPickupPoints.ts`) sai saman 403:n samalla gatewaylla — ei tiedetä onko tämä eri tuote joka vaatisi oman rekisteröinnin, vai avautuuko se automaattisesti kun `x-gateway-secret` saadaan samalle `shippingapi`-roolille. Selviää kun secret saadaan ja kutsu testataan uudelleen.

### Tarkistus 2026-09-03 — omistaja luuli testiympäristön jo vahvistetuksi, EI löytynyt mistään, Pickup Point -haku myös vahvistettu estetyksi (403)

Omistaja kysyi suoraan onko testiympäristö "nyt käytössä" ja pyysi viimeistelemään postitusjärjestelmän, koska checkoutissa näkyy yhä pelkkä mock-noutopistelista (`frontend/lib/postiPickupPoints.ts`, 5 kovakoodattua esimerkkipistettä). **Tarkistettu ennen mihinkään koskemista:** koko CLAUDE.md ja git-historia käyty läpi (`git log --oneline -- CLAUDE.md`) — mitään uutta ei löytynyt 2026-09-02 jälkeen, Vaihe 2 on yhä samassa JÄÄDYTETTY-tilassa kuin silloin kirjattiin. **Ei siis löytynyt vahvistusta jota omistaja luuli olevan olemassa** — joko omistajalla on tuoretta tietoa (esim. sähköposti Postin Tomilta) jota ei ole vielä kirjoitettu tänne, tai kyseessä on muistivirhe. Ei arvattu kumpi, kysytty suoraan.

**Samalla testattu turvallisesti se osa joka EI kanna taloudellista/fyysistä riskiä:** Pickup Point -haku (`GET/POST .../2025-04/pickuppoints`) on puhdas hakukysely, ei koskaan luo mitään Postin puolella — testattiin suoraan oikeaa API:a vasten olemassa olevilla OAuth2-tunnuksilla (kertakäyttöinen skripti palvelimella, poistettu käytön jälkeen). **Tulos: `403 Unauthorized`** sekä `GET /pickuppoints/FI`:llä että `POST /pickuppoints`:lla, molemmilla token-haku itsessään onnistui normaalisti (sama toimiva OAuth2-virta kuin Vaihe 1:ssä). **Tämä vahvistaa aiemman avoimen kysymyksen vastauksen:** nykyiset `POSTI_CLIENT_ID`/`SECRET` (rekisteröity roolilla `shippingapi`, ks. "PÄIVITYS 2026-09-02") EIVÄT kata Pickup Point -API:a — se vaatii oman, erillisen tuotteen/rekisteröinnin `developer.posti.fi`:ssä, ei ole automaattisesti mukana `shippingapi`-roolissa. `403`+selkeä `"Unauthorized"`-viesti (ei `404`) viittaa vahvasti siihen että pyyntö tavoitti oikean palvelun mutta tililtä puuttuu oikeus, ei että URL/muoto olisi väärin.

**Tila juuri nyt, ei koodimuutosta tehty koska ei ole turvallista arvata:**
- **Pickup Point -haku:** tekninen syy nyt tiedossa (puuttuva API-tuote-rekisteröinti) — omistajan pitää joko rekisteröidä Pickup Point -API `developer.posti.fi`:ssä (samalla tavalla kuin `shippingapi`-rooli aikanaan) tai vahvistaa löytyykö se jo jostain muualta organisaation asetuksista. Kun oikeus on kunnossa, koodimuutos on pieni — `postiPickupPoints.ts`:n mock-lista korvataan backend-reitillä joka kutsuu samaa OAuth2-tokenia käyttäen tätä endpointia.
- **Lähetyksen luonti (Vaihe 2, `postiService.ts`:n mock):** yhä LUKITTU-jäädytyksen alla, ei kosketettu — vaatii omistajan eksplisiittisen vahvistuksen testiympäristöstä/näytelähettäjä-lähestymistavasta ennen kuin tätä aletaan viedä oikeaan API:in, koska väärä testikutsu voi luoda oikean, laskutettavan lähetyksen jos joku veisi sen fyysisesti Postiin.
- **Sivuhuomio:** `postiService.ts` on rakennettu VANHAN v1-API-muodon mukaan (`POSTI_PROD_URL` osoittaa `.../api/v1/shipping/order`:iin, `senderPartners`/`agent.quickId`-rakenne) — kun Vaihe 2:een joskus edetään, koko mock pitää kirjoittaa uudelleen v2:n OAuth2+`/api/v2/`-muotoon (ks. "PÄIVITYS 2026-09-02"), ei vain kytkeä olemassa olevaa mockia oikeaan URLiin.

### Eteneminen 2026-09-02 — Vaihe 1 (token-haku) testattu ja toimii, Vaihe 2 JÄÄDYTETTY odottamaan Postin vastausta testiympäristöstä

**⚠️ Palautettu tähän 2026-09-02, sama päivä: tämä osio katosi vahingossa väliaikaisesti (uncommitted-muutos toisesta kanavasta lakaistiin mukaan erään git-committiin ilman tarkistusta) — palautettu heti kun huomattiin, sisältö sama kuin alun perin kirjoitettu.**

**✅ OAuth2-tunnukset lisätty tuotannon `.env`:iin** (`POSTI_CLIENT_ID`/`POSTI_CLIENT_SECRET`), tili `enabled`, logistiikkasopimus 691317 valittuna organisaatioattribuuteista — kaikki kolme aiemmin listattua estettä (ks. alla "Päivitetty tarkistuslista") poistettu.

**✅ Vaihe 1 testattu erillisellä, sovelluksen ulkopuolisella skriptillä palvelimella 2026-09-02** (ei koskettu `postiService.ts`:ään eikä muuhun koodiin, skripti poistettu testin jälkeen): `POST https://gateway-auth.posti.fi/api/v1/token` → HTTP 200, `token_type: Bearer`, `expires_in: 3600` (1h, täsmää dokumentoituun), `access_token` 2350 merkkiä pitkä opaakki token (alkaa `PostiExt.1.F...`, ei JWT-muotoinen). Token-haku siis toimii oikeilla tunnuksilla.

**⏸️ Vaihe 2 (lähetyksen luonti, `POST /shippingapi/api/v2/shipping/order`) JÄÄDYTETTY omistajan päätöksellä 2026-09-02.** Syy: ei ole vahvistettua testiympäristöä v2:lle (ks. alla kohta 4, "EI TESTIYMPÄRISTÖÄ vielä ollenkaan v2:lle") — kaikki testaus tapahtuisi suoraan tuotannossa "näytelähettäjillä", ja riski on että jokin testikutsu loisi vahingossa oikean lähetyksen jonka joku sitten veisi fyysisesti Postiin (→ laskutus). **Omistaja odottaa Postin vastausta siitä onko/milloin testiympäristö saatavilla ennen kuin lähetyksen luontia testataan.** Älä etene Vaiheeseen 2 ilman omistajan eksplisiittistä lupaa, vaikka tunnukset ja koodi olisivat muuten valmiit. Kun lupa tulee, testaa edelleen selvästi merkityllä testidatalla ("TESTI" nimissä), pieni määrä kerrallaan, älä koskaan vie fyysistä pakettia Postiin testin aikana.

### ⚠️ PÄIVITYS 2026-09-02 — Postin oma tuki vahvisti: käytetään API v2:ta, ei v1:tä (ohje saatu suoraan Tomilta, Postin LogEDI-tiimistä)

Tom kysyi sähköpostitse suoraan "Olihan kyseessä OmaPosti Pro API versio 2?" — vahvistettu omalla erillisellä ohjedokumentilla. **Tämä muuttaa useita asioita yllä olevasta v1-tutkimuksesta:**

1. **Autentikointi muuttuu OAuth2:ksi, EI enää yksinkertainen API-avain kuten v1:ssä.** Se `pro.posti.fi`:stä luotu API-avain (ks. "Eteneminen 2026-08-26" alla) oli v1:tä varten — **v2 vaatii uuden `clientId`/`clientSecret`-parin**, haetaan **`developer.posti.fi`:stä**, ei `pro.posti.fi`:stä:
   - Kirjaudu kehittäjäportaaliin → "Application Account Users" → "Add new application account user"
   - Ota "Enabled" käyttöön, anna kuvaava nimi
   - **Valitse API-rooli `shippingapi`** (tärkeä, väärä rooli = ei toimi)
   - Valitse organisaation attribuutit (kontrolloi mitä sopimuksia — todennäköisesti 691317/Muistikuva Oy)
   - Tallenna `clientId`+`clientSecret` heti, näytetään vain kerran
2. **Token-haku:** `POST https://gateway-auth.posti.fi/api/v1/token` (`grant_type=client_credentials`+`client_id`+`client_secret`, `x-www-form-urlencoded`) → `access_token` (Bearer, vanhenee 3600s/1h, hae uusi tarvittaessa)
3. **Endpoint muuttuu v2:ksi:** `POST https://gateway.posti.fi/shippingapi/api/v2/shipping/order` (huomaa `/v2/` eikä `/v1/`), `Authorization: Bearer <access_token>` (ei enää suoraan API-avainta headerissa)
4. **⚠️ TÄRKEÄ, KRIITTINEN LÖYDÖS: EI TESTIYMPÄRISTÖÄ vielä ollenkaan v2:lle.** Sama tilanne kuin aiemmin epäiltiin Sending Code API:sta, mutta nyt vahvistettu myös itse shipping-order-API:lle: *"Testiympäristö ei ole vielä saatavilla."* **Ratkaisu Postin oman ohjeen mukaan: testataan suoraan TUOTANNOSSA "näytelähettäjillä"** (demo senders) — nämä eivät aiheuta laskutusta ellei niitä fyysisesti viedä Postiin lähetettäväksi. **Vaatii erityistä varovaisuutta:** käytä oikeita sopimusnumeroita mutta selvästi merkittyjä testidata-arvoja (esim. sender/receiver-nimissä "TESTI"), tee ensin pieniä määriä, älä vahingossa käynnistä oikeaa fyysistä lähetystä ennen kuin ollaan varmoja että kaikki toimii.
5. **Return Shipment -ero (tärkeä muistaa myöhemmin, ei kiireellinen nyt):** v1 pitää lähettäjän/vastaanottajan samana, **v2 VAIHTAA ne automaattisesti** SmartShip-tyyliin. Jos joskus rakennetaan palautuslähetys (esim. service-koodi PO2108), pitää asettaa lähettäjä=vastaanottaja=alkuperäisen lähetyksen mukaisesti, koska v2 kääntää ne itse.
6. **Rajoitukset:** rate limit 50 pyyntöä/s per IP, PDF saatavilla 1h luomisesta, merkistötuki vain länsimainen+kyrillinen (ei aasialaisia merkkejä osoitetarroissa).
7. **Hyödylliset palvelukoodit listattu suoraan:** `PO2103` (Postipaketti), `PO2102` (Express-paketti), `PO2104` (kotiinkuljetus), `PO2108` (palautuslähetys), `POF1` (rahti). Tämä nopeuttaa aiemmin auki ollutta "valitse palvelukoodi palvelumatriisista" -tehtävää — **PO2103 on todennäköisesti oikea valinta** tavalliselle pakettilähetykselle noutopisteeseen (vahvistaa myös PDF-esimerkki dokumentissa).
8. **Sending Code API ei edelleenkään mainita tässäkään v2-dokumentissa** — vahvistaa aiemman epäilyn että se on täysin erillinen, oma dokumenttinsa (Tomin linkkaama `sending-code-api-2026-04`), käytetään v2-shipping-order-API:n `parcelNo`:n päällä erikseen. Kysymys Postille pysyy samana kuin aiemmin.

**Päivitetty tarkistuslista ennen koodausta:**
- ✅ **OAuth2 clientId/clientSecret luotu `developer.posti.fi`:ssä 2026-09-02** (rooli `shippingapi`, tallennettu tuotannon `.env`:iin `POSTI_CLIENT_ID`/`POSTI_CLIENT_SECRET`, EI tähän tiedostoon) — **KÄYTTÖVALMIS 2026-09-02, kaikki kolme aiempaa estettä poistettu:**
  1. ✅ Käyttäjätili kytketty `enabled: true`:ksi
  2. ✅ Organisaatioattribuutit valittu (mm. logistiikkasopimus 691317)
  3. Vahvistettu `businessId`-muoto Postin järjestelmässä: `FI34973476` (Y-tunnus FI-etuliitteellä, ei väliviivaa) — käytä tätä täsmällistä muotoa jos jokin kenttä vaatii sen
  - **Token-haku testattu ja vahvistettu toimivaksi, ks. yllä "Eteneminen 2026-09-02"-osio.**
- ✅ Logistiikkasopimusnumero 691317 on jo tiedossa, käytetään samaa
- ✅ Palvelukoodi todennäköisesti `PO2103` (vahvista silti Postilta lopullisesti)
- ⬜ Lue Sending Code API v2:n oma dokumentaatio (`developer.posti.com/api-catalogue/2026-04/document/sending-code-api-2026-04`) ennen koodausta
- ⬜ Suunnittele testausstrategia "näytelähettäjillä" tuotannossa, koska erillistä sandboxia ei ole

### ✅ VAHVISTUS 2026-08-26 — löytyi oikea API suoraan Postin virallisesta PDF-dokumentaatiosta ("OmaPosti Pro API", v1.0, 28.3.2024)

**⚠️ HUOM: alla oleva koskee API v1:tä, joka EI OLE se versio jota käytetään — ks. yllä oleva "PÄIVITYS 2026-09-02" -osio v2:sta, joka on oikea. Säilytetty alla vain historiallisena referenssinä/vertailuna, älä koodaa tämän osion mukaan.**

Tämä on todennäköisesti vastaus siihen avoimeen kysymykseen #1 (mikä API luo yksittäisen C2C-lähetyksen) — **OmaPosti Pro API**, uusi Postin tilauskanava paketti-/kirje-/rahtituotteille, EI GLUE/dropshipping-järjestelmä. Tallentaa tiedot suoraan Postin lähetysrekisteriin, palauttaa osoitetarrat PDF-muodossa.

**Autentikointi — YKSINKERTAISEMPI kuin aiemmin oletettiin, EI OAuth2:** pelkkä API-avain lähetetään `Authorization`-otsikossa (esim. `Authorization: a12bc34d-ef56-78a9-b123-cd45efab6789`). Avain generoidaan/hallitaan OmaPosti Pro -sovelluksen (`https://pro.posti.fi`) "Integration"-valikosta pääkäyttäjän toimesta.

**Testiympäristö vahvistettu olemassa olevaksi:** "saatavilla erillisellä pyynnöllä Postin onboarding-tuelta kun asiakas/integraatiokumppani on valmis testaamaan" — ei itsepalvelullinen, mutta olemassa.

**Tuotanto-URL:** `https://gateway.posti.fi/shippingapi/api/v1/shipping/order` (POST, JSON-body, `Content-Type: application/json`)

**Keskeiset JSON-kentät:**
- `shipment.sender` / `shipment.receiver` — nimi, osoite, postinumero, kaupunki, maa (pakollisia), puhelin/sähköposti (lisäpalveluiden ilmoituksiin)
- `shipment.senderPartners` — `[{id: "POSTI", custNo: "<logistiikkasopimusnumero>"}]` pakettituotteille (`ITELLALOG` rahdille) — **custNo saadaan OmaPosti Pro -tililtä**: Käyttäjäasetukset → Omat organisaatiot → "Logistiikkasopimukset"-osio "Asiakasnumerot ja sopimukset" -kohdasta
- `shipment.agent.quickId` — **noutopisteen valinta**, arvona Location API:sta saatu `pupCode`
- `shipment.service.id` — valittu palvelukoodi (esim. "PO2103"), koodit löytyvät Postin palvelumatriisista (`posti.fi/en/for-businesses/service-channels/service-matrix`)
- `parcels[]` — `copies`, `weight`, `packageCode`, `contents` pakollisia
- `pdfConfig` — määrittää tarran tulostusmuodon (`laser-a5`, `laser-a4`, `thermo-se`, `thermo-225`)

**Noutopisteiden haku: Location API v3** (uusin virallinen versio, korvaa vanhemman `locationservice.posti.com`:n) — dokumentaatio: `https://developer.posti.fi/devportal/apis/0cb54ae8-8a0b-4049-88fe-a6b62bab00fc/overview`. Palauttaa `pupCode`-arvon jota käytetään yllä olevassa `quickId`-kentässä.

**Paluuviesti sisältää:** lähetyksen tiedot, `parcels[].parcelNo` (esim. `"JJFI654321989055198766"` — tämä on todennäköisesti sama kuin aiemmin puhuttu `trackingNumber`), ja `pdfs[]`-taulukon jossa linkki tulostettavaan osoitetarraan (linkki vaatii saman API-avaimen autentikoinnin, voimassa 1h).

**⚠️ AVOIN KYSYMYS, selvitettävä Postilta ennen koodausta:** Tämä dokumentti kuvaa **PDF-osoitetarran tulostamista**, ei mainitse "Sending Code"/labelless-koodia ollenkaan. Kaksi mahdollisuutta:
1. Sending Code API toimii tämän PÄÄLLÄ — OmaPosti Pro API luo lähetyksen ja palauttaa `parcelNo`:n (= trackingNumber), jolla sitten kutsutaan erikseen Sending Code APIa koodin hakemiseksi
2. OmaPosti Pro API on puhtaasti tarrapohjainen, eikä "ei tulostettavaa tarraa" -tavoite ole toteutettavissa tällä API:lla — pitää silloin harkita hyväksytäänkö tulostettava tarra osana myyjän lähetysvirtaa (poikkeaisi Vinted-tyylisestä alkuperäisestä tavoitteesta)

**Lisää tämä kysymys Postin sähköpostiin:** "Voiko OmaPosti Pro API:lla luotua lähetystä (parcelNo/trackingNumber) käyttää Sending Code API:n kanssa labelless-koodin hakemiseen, vai ovatko nämä kaksi erillistä, yhteensopimatonta järjestelmää?"

### Eteneminen 2026-08-26: API-avain luotu, seuraavat vaiheet ennen koodausta
- ✅ Rekisteröidytty `pro.posti.fi`:hin, API-avain luotu Integration-valikosta
- ✅ **Logistiikkasopimusnumero (custNo): `691317`** — vahvistettu `pro.posti.fi`:n Organisaatiot-sivulta ("Logistiikan sopimustunnukset: 691317 Muistikuva Oy")
- ℹ️ **Yrityksen rekisteröity toiminimi Postin järjestelmässä on "Muistikuva Oy"** (asiakasnumero 956632), ei "Habahub" — brändi ja virallinen toiminimi ovat eri asioita, tämä on hyvä tietää muuta paperityötä (esim. Paytrail-sopimus) varten. Y-tunnus 3497347-6 pysyy samana riippumatta kummasta nimestä käytetään.
- ⬜ Valitse **palvelukoodi** Postin palvelumatriisista (`posti.fi/en/for-businesses/service-channels/service-matrix`), suodata pakettikoon/reitin mukaan
- ⬜ Pyydä **testiympäristö** Postin onboarding-tukitiimiltä (ei itsepalvelullinen dokumentin mukaan) — tarkista onko `pro.posti.fi`:ssä suora yhteydenottokanava tähän
- ⬜ Vahvista käyttääkö **Location API v3** (noutopisteet) samaa API-avainta vai vaatiiko erillisen rekisteröinnin `developer.posti.fi`:ssä
- ⬜ Selvitä yhä avoin **labelless/Sending Code -yhteensopivuus** -kysymys (ks. yllä)

### Autentikointi — OAuth 2.0 Client Credentials (koskee alla kuvattua Orders/Shipments V3 -GLUE-järjestelmää, EI OmaPosti Pro API:a yllä)
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

## Ilmoitukset-sivun UI-löydökset 2026-08-25 (mobiili, kuvakaappaus) — päätökset tehty, ei vielä toimeksiantoa

1. **"Ota selainilmoitukset käyttöön" -nappi menee päällekkäin/huonosti aseteltuna otsikon kanssa mobiilissa**, eikä anna selvää palautetta onnistumisesta lupapyynnön jälkeen (esim. tila "Ilmoitukset käytössä ✓" napin painamisen jälkeen). **Napin teksti lyhennetään: "Ota ilmoitukset käyttöön"** (poistetaan "selain"-sana).
2. **"Hallintapaneeli"-nappi leikkautuu näytön ulkopuolelle mobiilissa navbarissa.** Päätös: vaihda mobiilissa pelkäksi kuvakkeeksi (esim. paneeli-/hampurilaisikoni) tekstin sijaan, säästää tilaa.
3. **Alaotsikko päivitetty:** "Pysy ajan tasalla huudoista ja tilauksista" → **"Kaikki tärkeät päivitykset yhdessä paikassa"** — geneerisempi, kattaa kaikki ilmoitustyypit (viestit, seuraajat, huudot, tilaukset) ilman että tarvitsee päivittää tekstiä joka kerta kun uusi ilmoitustyyppi lisätään.

## SEURAAVAKSI TEHTÄVÄT — prioriteettijärjestys (päivitetty 2026-08-13)

1. ✅ **LiveKit-migraatio** — TEHTY, vahvistettu 2-3s viive tuotannossa, ylitti tavoitteen
2. ✅ **Kriittiset live/chat-bugit (13 kpl + bannisääntö)** — TEHTY 2026-08-13, deployattu
3. **Mux vs. jatka itse -päätös** — käytännössä ratkennut itsestään: LiveKit toimii nyt 2-3s viiveellä eikä ole toistanut aiempaa "korjattu 3-5 kertaa, edelleen rikki" -kuviota. Ei akuuttia syytä vaihtaa managed-palveluun juuri nyt — pidetään avoimena jos luotettavuusongelmia ilmenee isommassa mittakaavassa, mutta ei enää kiireellinen päätös.
4. **Visuaalisen jäädytyksen lopullinen silmämääräinen hyväksyntä** — tekninen työ tehty useissa kierroksissa, odottaa vain omistajan katsomista kokonaisuutena läpi ja vahvistusta
5. ✅ **OY-rekisteröinti — VALMIS 2026-08-25, Y-tunnus julkaistu 2026-08-25.** Y-tunnus **3497347-6** lisätty ja deployattu neljään paikkaan: footer (joka sivulla), `/meista#yhteystiedot`, käyttöehdot (molemmat kielet), tietosuoja (molemmat kielet, REKISTERINPITÄJÄ-kohta). Vahvistettu ettei tilinumeroa/IBAN:ia ole missään koodissa. Avaa nyt: (a) Paytrailin tuotantotunnukset (testivaihe jo tehty ja testattu), (b) Posti-integraatio (LogEDI@posti.com-yhteydenotto, kysymyslista jo valmiina).
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

### Laajennus 2026-09-02 — Käyttäjähallinta (canStream, mukautettu komissio, bannin poisto, salasanan palautus admin-toimesta)

Frontend-pohja (`AdminUserManagement.tsx` + `INTEGRATION.md`) tuli valmiiksi rakennettuna toisesta kanavasta (ks. "Työskentelytapa"-osio) — kytketty oikeaan backendiin 8-vaiheisen INTEGRATION.md-suunnitelman mukaan, jokainen backend-reitti curl-testattu erikseen ennen frontend-kytkentää.

**Tehty:**
- `User`-malliin kolme uutta kenttää: `canStream Boolean @default(false)`, `customCommissionRate Float?`, `customCommissionCap Float?`
- `GET /admin/users` laajennettu palauttamaan nämä + `activeBan` (uusin Ban jossa `endsAt > now`)
- `PATCH /admin/users/:id` — osittainen päivitys (canStream/customCommissionRate/customCommissionCap), validoi numerot ei-negatiivisiksi/äärellisiksi tai null
- `DELETE /admin/users/:id/ban` — asettaa aktiivisimman bannin `endsAt`:n menneisyyteen (poistaa bannin ennenaikaisesti)
- `POST /admin/users/:id/send-password-reset` — käyttää samaa `createAndSendPasswordResetToken()`-apufunktiota (`backend/src/lib/passwordReset.ts`, eriytetty jaettavaksi) kuin käyttäjän oma `/auth/forgot-password`
- **`POST /shows` tarkistaa nyt `User.canStream === true` ennen Show-luontia (403 muuten)** — striimausoikeus on siis oletuksena POIS PÄÄLTÄ kaikilta, admin myöntää sen käyttäjähallintapaneelista
- `computeCommissionCents()` (`backend/src/lib/paytrail.ts`) ottaa valinnaiset `customRatePercent`/`customCapEuros`-parametrit — `POST /orders/:id/pay` hakee nämä myyjän `User`-riviltä juuri ennen Paytrail-maksupyynnön muodostamista (ei koskaan luoteta frontendiltä tulevaan arvoon), null → oletus 3,5%/35€
- **Tietoinen rajaus: hyvitysreitti (`POST /orders/:id/refund`) EI käytä mukautettua komissiota** — alkuperäistä maksuhetken komissioprosenttia ei tallenneta per-tilaus, joten jos myyjän mukautettu komissio muuttuu maksun ja hyvityksen välissä, hyvitys laskisi eri komission kuin mitä oikeasti veloitettiin. Jätetty tietoisesti korjaamatta, ei arvattu — vaatisi `Order`-riville tallennetun toteutuneen komissioprosentin jos halutaan korjata oikein.
- Frontend: `frontend/app/admin/page.tsx` — vanha `UsersTab` (pelkkä haku+bannaus) korvattu `AdminUserManagement`-komponentilla kokonaan (ei rinnakkain, ei kahta eri käyttäjähallintanäkymää)
- ~19 uutta i18n-avainta `admin`-nimiavaruuteen kaikissa kolmessa kielessä (fi/en/sv)
- Kaikki backend-reitit curl-testattu yksitellen ennen frontend-kytkentää, sitten typecheck+build+deploy molemmille puolille, `/admin` vahvistettu (307-auth-redirect, sama kuin muutkin suojatut sivut), `/api/products` vahvistettu ettei julkinen puoli rikkoutunut

**⚠️ Migraation sivuvaikutus, korjattu heti käyttöönotossa 2026-09-02:** `canStream @default(false)` vei striimausoikeuden KAIKILTA olemassa olevilta käyttäjiltä, myös niiltä jotka jo striimasivat aktiivisesti. Tarkistettu tuotannosta migraation jälkeen: **michaelbacklund** (yksi CLAUDE.md:n "kaksi myyjää, 200k€ inventaario" -myyjistä, ks. Cardmarket-kuntoluokitus-osio) oli pitänyt kaksi lähetystä samana päivänä (2026-09-02, viimeisin klo 09:14) ennen migraatiota — ilman korjausta hän ei olisi voinut aloittaa seuraavaa lähetystä. **Korjattu heti:** `danielbacklund` + `michaelbacklund` (molemmat Wasadredging-sähköpostilla) myönnetty `canStream=true` oikean `PATCH /admin/users/:id`-reitin kautta (ei suoraa tietokantamuokkausta — testattiin samalla reittiä jota omistaja tulee käyttämään). Larzmoi (omistajan oma ADMIN-tili) oli jo `canStream=true` osana migraatiota, ei itselukitusriskiä. **Kaikki muut käyttäjät (testitilit) pysyvät `canStream=false`:na — oikea oletus, ei aktiivisia myyjiä.**

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
