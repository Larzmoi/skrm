"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyEndingSoonAuctions = notifyEndingSoonAuctions;
const prisma_1 = require("../db/prisma");
const notify_1 = require("../lib/notify");
// "Huutokauppa päättymässä" -ilmoitus (in-app + push) 15min ennen perinteisen (ajastetun)
// huutokaupan päättymistä — omistajan pyyntö 2026-09-12. Vastaanottajat: kaikki jotka ovat
// huutaneet tuotteesta TAI seuraavat sitä (ProductWatch, ks. "Seuraa"-nappi huutokauppasivulla).
// Koskee VAIN perinteistä huutokauppaa (saleType "auction") — ainoa myyntitapa jolla on
// pysyvä, valvomaton, tarkkaan ajastettu päättymishetki. Live-huudolla myyjä on itse aina
// läsnä hallitsemassa ajastinta eikä sillä ole vastaavaa "unohtunutta" 15min-ikkunaa, ja
// suoramyynti ei koskaan pääty ollenkaan.
const ENDING_SOON_WINDOW_MS = 15 * 60 * 1000;
// endingSoonNotifiedAt estää saman ilmoituksen lähettämisen uudestaan joka ajokerralla
// ennen kuin huutokauppa oikeasti päättyy (sama periaate kuin Order.stalledNotifiedAt/
// reminderNotifiedAt, ks. deliveryTimeline.ts) — ajetaan minuutin välein index.ts:ssä.
async function notifyEndingSoonAuctions() {
    const now = new Date();
    const soon = new Date(now.getTime() + ENDING_SOON_WINDOW_MS);
    const ending = await prisma_1.prisma.product.findMany({
        where: {
            saleType: 'auction',
            status: 'PENDING',
            auctionEndsAt: { gt: now, lte: soon },
            endingSoonNotifiedAt: null,
        },
        include: {
            bids: { select: { userId: true } },
            watchers: { select: { userId: true } },
        },
    });
    for (const product of ending) {
        const recipientIds = new Set();
        product.bids.forEach(b => recipientIds.add(b.userId));
        product.watchers.forEach(w => recipientIds.add(w.userId));
        recipientIds.delete(product.sellerId); // puolustava tarkistus — myyjä ei koskaan huuda/seuraa omaansa normaalisti
        const minutesLeft = Math.max(1, Math.round((product.auctionEndsAt.getTime() - now.getTime()) / 60000));
        const title = 'Huutokauppa päättymässä!';
        const body = `${product.name} päättyy ${minutesLeft} minuutin kuluttua.`;
        const link = `/huutokauppa/${product.id}`;
        await Promise.all(Array.from(recipientIds).map(async (userId) => {
            await (0, notify_1.notifyUser)(userId, 'AUCTION_ENDING_SOON', title, body, link).catch(() => { });
        }));
        // Merkitään ilmoitetuksi VAIKKA vastaanottajia ei olisi yhtään (esim. kukaan ei ole
        // huutanut/seurannut) — ei kuulu yrittää uudestaan, tuote ei saa uusia huutajia/seuraajia
        // enää tässä 15min-ikkunassa millään tavalla joka muuttaisi vastausta.
        await prisma_1.prisma.product.update({ where: { id: product.id }, data: { endingSoonNotifiedAt: now } });
    }
    return ending.length;
}
