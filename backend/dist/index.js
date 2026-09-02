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
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv = __importStar(require("dotenv"));
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
const socket_1 = require("./socket");
const notify_1 = require("./lib/notify");
const deliveryTimeline_1 = require("./jobs/deliveryTimeline");
const closeAuctions_1 = require("./jobs/closeAuctions");
dotenv.config();
const app = (0, express_1.default)();
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
app.use(express_1.default.json({ limit: '10mb' }));
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
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`SKRM backend käynnissä portilla ${PORT}`));
