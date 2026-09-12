"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSocketServer = setSocketServer;
exports.emitToUser = emitToUser;
exports.emitToShow = emitToShow;
exports.notifyUser = notifyUser;
const prisma_1 = require("../db/prisma");
const push_1 = require("./push");
let io = null;
function setSocketServer(server) {
    io = server;
}
function emitToUser(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
}
function emitToShow(showId, event, payload) {
    io?.to(`show:${showId}`).emit(event, payload);
}
// Ilmoitustyypit joille EI koskaan lähetetä puhelimen/selaimen omaa push-ilmoitusta —
// vain in-app (ks. CLAUDE.md "Push-ilmoitukset" 2026-08-17): NEW_FOLLOWER on tarkoituksella
// vain in-app, koska omistajan pyynnöstä ainoastaan "myyjä meni liveen" (SELLER_LIVE) piti
// kantautua puhelimeen asti uuden seuraajan saamisesta.
const NO_PUSH_TYPES = ['NEW_FOLLOWER'];
// Keskitetty push-lähetys 2026-09-12: aiemmin vain kaksi (SELLER_LIVE, AUCTION_ENDING_SOON)
// kahdesta kolmestakymmenestä ilmoitustyypistä laukaisivat oikean käyttöjärjestelmätason
// push-ilmoituksen — loput (mm. uusi myynti, uusi viesti, tarjous, huudon ohitus) loivat vain
// in-app-Notification-rivin joka vaatii avoimen selainvälilehden näkyäkseen. Nyt notifyUser()
// lähettää pushin automaattisesti JOKAISELLE kutsupaikalle ilman että jokaiseen ~35 kutsuun
// pitäisi erikseen lisätä oma sendPushToUser()-kutsu — pienempi, keskitetympi muutos jolla ei
// voi vahingossa unohtaa yhtäkään kutsupaikkaa. Ei odoteta valmiiksi ennen notifyUser():n
// paluuta (sendPushToUser hoitaa omat virheensä sisäisesti) - sama "ei blokkaa" -periaate
// kuin push.ts:n omalla dokumentoidulla käytöksellä.
async function notifyUser(userId, type, title, body, link) {
    const notification = await prisma_1.prisma.notification.create({ data: { userId, type, title, body, link } });
    emitToUser(userId, 'notification', notification);
    if (!NO_PUSH_TYPES.includes(type)) {
        (0, push_1.sendPushToUser)(userId, { title, body, url: link }).catch(() => { });
    }
    return notification;
}
