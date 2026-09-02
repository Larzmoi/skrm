"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushToUser = sendPushToUser;
const web_push_1 = __importDefault(require("web-push"));
const prisma_1 = require("../db/prisma");
// Web Push -infrastruktuuri (ks. CLAUDE.md "Push-ilmoitukset") - erillinen kanava jo
// olemassa olevasta in-app-Notification-järjestelmästä (notify.ts). Tämä lähettää
// oikean käyttöjärjestelmätason ilmoituksen selaimen/puhelimen kautta, toimii myös kun
// sivusto ei ole auki - notify.ts:n socket-pohjainen ilmoitus vaatii avoimen välilehden.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@habahub.fi';
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    web_push_1.default.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
// Lähettää pushin käyttäjän KAIKKIIN tunnettuihin selaimiin/laitteisiin rinnakkain.
// Vanhentuneet/peruutetut tilaukset (410 Gone, 404 Not Found - selain on poistanut
// tilauksen, esim. käyttäjä tyhjensi selaindatan) siivotaan pois automaattisesti eikä
// niitä yritetä enää uudestaan.
async function sendPushToUser(userId, payload) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY)
        return; // ei konfiguroitu - ei kaadeta kutsujaa
    const subs = await prisma_1.prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0)
        return;
    await Promise.all(subs.map(async (sub) => {
        try {
            await web_push_1.default.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
        }
        catch (e) {
            if (e?.statusCode === 410 || e?.statusCode === 404) {
                await prisma_1.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => { });
            }
            else {
                console.error('Pushin lähetys epäonnistui:', e?.message ?? e);
            }
        }
    }));
}
