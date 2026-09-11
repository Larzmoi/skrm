"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv = __importStar(require("dotenv"));
const clientIp_1 = require("./lib/clientIp");
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const shows_1 = __importDefault(require("./routes/shows"));
const users_1 = __importDefault(require("./routes/users"));
const cart_1 = __importDefault(require("./routes/cart"));
const orders_1 = __importDefault(require("./routes/orders"));
const webhooks_1 = __importStar(require("./routes/webhooks"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const messages_1 = __importDefault(require("./routes/messages"));
const auctions_1 = __importDefault(require("./routes/auctions"));
const reports_1 = __importDefault(require("./routes/reports"));
const admin_1 = __importDefault(require("./routes/admin"));
const push_1 = __importDefault(require("./routes/push"));
const presets_1 = __importDefault(require("./routes/presets"));
const posti_1 = __importDefault(require("./routes/posti"));
const ad_1 = __importDefault(require("./routes/ad"));
const offers_1 = __importDefault(require("./routes/offers"));
const socket_1 = require("./socket");
const notify_1 = require("./lib/notify");
const deliveryTimeline_1 = require("./jobs/deliveryTimeline");
const closeAuctions_1 = require("./jobs/closeAuctions");
const expireOffers_1 = require("./jobs/expireOffers");
dotenv.config();
const app = (0, express_1.default)();
// Tuotannossa Cloudflare -> nginx (localhost proxy_pass) -> tämä sovellus - kaksi väliin
// jäävää hyppyä, ei yksi. "1" pitää silti asettaa jotta Express-ominaisuudet jotka
// luottavat req.ip:hen/req.secureen toimivat järkevästi nginxin takana yleisesti.
// EI kuitenkaan riitä alla olevan rate limitingin IP-tunnistukseen sellaisenaan - testattu
// suoraan tuotannossa 2026-09-08: trust proxy=1 palautti req.ip:ksi Cloudflaren OMAN,
// pyynnöstä toiseen VAIHTUVAN reunapalvelimen osoitteen (X-Forwarded-For-ketjun toiseksi
// oikeanpuoleisin merkintä), ei koskaan samaa kävijän oikeaa IP:tä kahdesti - rate limiter
// ei koskaan täyttynyt yhdenkään yksittäisen kävijän kohdalla riippumatta pyyntömäärästä.
// Korjaus alla: rate limiterit käyttävät Cloudflaren omaa, asiakkaan väärentämätöntä
// CF-Connecting-IP-otsikkoa suoraan sen sijaan että laskisivat proxy-hyppyjä XFF:stä.
app.set('trust proxy', 1);
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: true, credentials: true }, // salli kaikki originit kehityksessä
    // Oletus (pingInterval 25s + pingTimeout 20s) kestäisi jopa ~45s ennen kuin palvelin
    // huomaa kuolleen yhteyden ja pakottaa uudelleenyhdistämisen. Osa mobiilioperaattoreista
    // suodattaa/pudottaa vain palvelin->asiakas-suunnan liikenteen NAT/middlebox-verkossaan
    // (asiakas näyttää silti "yhdistettynä" ja pystyy lähettämään, muttei koskaan vastaanota
    // mitään) — havaittu 2026-08-09 Android-puhelimella mobiilidatalla, toistui sekä Chromella
    // että Firefoxilla, ei toistunut WiFillä/tietokoneella. Tiukempi ping-aikaraja saa
    // socket.io:n huomaamaan ja korjaamaan tämän nopeammin sen sijaan että katsoja jäisi
    // "yhdistettynä mutta mykkänä" -tilaan pitkäksi aikaa.
    pingInterval: 10000,
    pingTimeout: 8000,
});
app.use((0, cors_1.default)({
    origin: true, // salli kaikki originit kehityksessä
    credentials: true
}));
// Stripe webhook TÄYTYY montata ENNEN app.use(express.json())-riviä alla. Stripen
// allekirjoituksen varmistus (stripe.webhooks.constructEvent, ks. lib/stripe.ts) vaatii
// pyynnön RAA'AN, jäsentämättömän rungon tavuina - jos globaali express.json() ehtisi
// jäsentää sen ensin JS-olioksi, allekirjoitus ei koskaan täsmäisi. express.raw() tälle
// yhdelle polulle "varastaa" pyynnön ennen globaalia jäsentäjää (sama kikka jota
// /webhooks/livekit käyttää reitin omalla middlewarellaan, mutta sen polku ei osu
// express.json():n oletus-content-type-suodattimeen niin varmasti kuin Stripen aina
// "application/json"-tyyppisenä lähettämä pyyntö osuisi).
app.post('/webhooks/stripe', express_1.default.raw({ type: 'application/json' }), webhooks_1.handleStripeWebhook);
// v2 "thin event" -ilmoitukset myyjien Connect-tilien kapasiteettimuutoksista (ks.
// CLAUDE.md "PÄÄTÖS 2026-09-09: SIGNICAT/CRIIPTO HYLÄTTY") - sama raaka-runko-vaatimus
// kuin yllä, ERI Event Destination -rekisteröinti/signing secret (ks. lib/stripe.ts).
app.post('/webhooks/stripe-accounts', express_1.default.raw({ type: 'application/json' }), webhooks_1.handleStripeAccountWebhook);
// 10mb -> 20mb 2026-09-10: mainosbannerin loop-video/GIF (ks. AdSlot.videoUrl) on selvästi
// isompi kuin yksittäinen resizeImage()-käsitelty kuva - base64-koodaus lisää vielä ~33%
// tiedoston raakakokoon. Ei koskenut mihinkään olemassa olevaan reittiin, joilla tyypilliset
// payloadit ovat aina olleet paljon tätä pienempiä.
app.use(express_1.default.json({ limit: '20mb' }));
// Rate limiting — CodeQL löysi 64 "Missing rate limiting" -varoitusta backend-reiteiltä
// (ks. CLAUDE.md "Rate limiting puuttuu kokonaan"). Kaksi tasoa: yleinen raja koko API:lle
// (nginx poistaa /api/-etuliitteen ennen tätä sovellusta, joten tämä KOSKEE koko julkista
// API:a vaikka polut eivät ala /api:lla täällä) + tiukempi raja login/register/forgot-
// password-reiteille erikseen, koska pelkkä yleinen raja yksin sallisi silti kymmeniä/satoja
// bruteforce-yrityksiä ennen rajoittumista.
//
// ⚠️ 2026-09-08: alkuperäinen yleinen raja (100/15min) oli LIIAN TIUKKA oikealle liikenteelle,
// aiheutti aidon tuotanto-oireen ("tietokanta katosi" - kaikki tuotteet/käyttäjät näyttivät
// tyhjiltä yhdelle oikealle kävijälle). Juurisyy vahvistettu nginx-lokeista: etusivun yksi
// lataus ampuu jo ~7 rinnakkaista API-kutsua (ad/notifications/products/shows/auctions/cart/
// messages), JA `/shows`-listaus pollataan 20s välein koko ajan kun etusivu on auki (45
// kutsua/15min pelkästään siitä) - normaali selailu muutamalla sivulla ylitti 100:n rajan
// helposti ILMAN mitään väärinkäyttöä. Nostettu 1000:aan - riittää reilusti yhden kävijän
// (tai saman IP:n takana olevan kotitalouden/toimiston) normaaliin käyttöön, rajoittaa silti
// selvästi poikkeavan, jatkuvan automaattisen raapimisen/skannauksen.
//
// Molemmat käyttävät samaa keyGeneratoria (clientKey, eriytetty lib/clientIp.ts:ään 2026-09-11
// jotta rekisteröitymisen IP-duplikaattitunnistus voi käyttää samaa logiikkaa, ks. routes/auth.ts):
// Cloudflaren CF-Connecting-IP-otsikkoa (asiakas ei voi väärentää sitä - Cloudflare kirjoittaa
// sen aina itse yhteyden perusteella), req.ip vain varapolkuna niille harvoille pyynnöille jotka
// eivät kulje Cloudflaren kautta (esim. palvelimen omat sisäiset kutsut). Katso yllä oleva
// kommentti miksi pelkkä trust proxy -hyppylaskenta EI riittänyt tässä pino ssa. ipKeyGenerator
// normalisoi IPv6-osoitteet /56-aliverkkoon niin ettei sama kävijä pääse kiertämään rajaa
// vaihtamalla IPv6-osoitetta.
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIp_1.clientKey,
    message: { error: 'Liian monta pyyntöä, yritä myöhemmin uudelleen' },
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIp_1.clientKey,
    message: { error: 'Liian monta yritystä, yritä myöhemmin uudelleen' },
});
app.use(globalLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/auth/forgot-password', authLimiter);
app.use('/auth', auth_1.default);
app.use('/products', products_1.default);
app.use('/shows', shows_1.default);
app.use('/users', users_1.default);
app.use('/cart', cart_1.default);
app.use('/orders', orders_1.default);
app.use('/webhooks', webhooks_1.default);
app.use('/notifications', notifications_1.default);
app.use('/messages', messages_1.default);
app.use('/auctions', auctions_1.default);
app.use('/reports', reports_1.default);
app.use('/admin', admin_1.default);
app.use('/push', push_1.default);
app.use('/presets', presets_1.default);
app.use('/posti', posti_1.default);
app.use('/ad', ad_1.default);
app.use('/offers', offers_1.default);
app.get('/health', (_, res) => res.json({ ok: true }));
(0, notify_1.setSocketServer)(io);
(0, socket_1.setupSocket)(io);
// Tuotannossa tämä ajetaan ulkoisella cronilla (POST /webhooks/payment-expired).
// Kehityksessä/ilman erillistä cron-palvelua ajetaan sama tarkistus 5min välein täällä.
setInterval(() => {
    (0, webhooks_1.checkExpiredPayments)().catch(e => console.error('checkExpiredPayments virhe:', e));
}, 5 * 60 * 1000);
// Toimitusaikataulun tarkistus (5/10/14pv ilmoitukset) — kerran tunnissa riittää "kerran päivässä tai useammin" -vaatimukseen
setInterval(() => {
    (0, deliveryTimeline_1.checkDeliveryTimeline)().catch(e => console.error('checkDeliveryTimeline virhe:', e));
}, 60 * 60 * 1000);
// Perinteisten huutokauppojen sulkeminen — minuutin välein tarkkuuden vuoksi
setInterval(() => {
    (0, closeAuctions_1.closeExpiredAuctions)().catch(e => console.error('closeExpiredAuctions virhe:', e));
}, 60 * 1000);
// Tarjousten (Offer) 48h-vanheneminen — kerran tunnissa riittää, sama periaate kuin deliveryTimeline
setInterval(() => {
    (0, expireOffers_1.checkExpiredOffers)().catch(e => console.error('checkExpiredOffers virhe:', e));
}, 60 * 60 * 1000);
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`SKRM backend käynnissä portilla ${PORT}`));
