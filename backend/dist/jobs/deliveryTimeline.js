"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDeliveryTimeline = checkDeliveryTimeline;
const prisma_1 = require("../db/prisma");
const notify_1 = require("../lib/notify");
const DAY_MS = 24 * 60 * 60 * 1000;
// Toimituksen aikataulu SHIPPED-tilauksille — kaksi erillistä polkua (LUKITTU, ks. CLAUDE.md
// "Toimituksen aikataulu ja maksuturva", täsmennetty 2026-08-25):
//
// 1. Ostaja kuittaa vastaanoton (deliveryConfirmedAt asetettu) → 48h tarkastusikkuna, sitten
//    automaattinen vapautus, ellei ostaja reklamoi sinä aikana (reklamointi siirtää tilauksen
//    DISPUTED-tilaan, jolloin se ei enää täsmää `status: 'SHIPPED'`-hakuun eikä tätä polkua
//    enää käydä sille läpi).
// 2. Ostaja EI koskaan kuittaa (deliveryConfirmedAt on null) → shippedAt-pohjainen fallback-
//    eskalaatio (päivä 5/10/14) samaan tapaan kuin ennenkin, viimeistään päivä 14 vapauttaa
//    automaattisesti riippumatta siitä onko ostaja reagoinut.
async function checkDeliveryTimeline() {
    const shipped = await prisma_1.prisma.order.findMany({ where: { status: 'SHIPPED', shippedAt: { not: null } } });
    const now = Date.now();
    for (const order of shipped) {
        if (order.deliveryConfirmedAt) {
            const confirmedAge = now - order.deliveryConfirmedAt.getTime();
            if (confirmedAge >= 2 * DAY_MS) {
                // TODO: Paytrail capture — vapauta maksu myyjälle kun oikea integraatio on käytössä
                await prisma_1.prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } });
                await (0, notify_1.notifyUser)(order.sellerId, 'PAYMENT_RELEASED', 'Maksu vapautettu', 'Ostaja kuittasi vastaanoton eikä reklamoinut 48 tunnin kuluessa — maksu on vapautettu sinulle.', '/dashboard/tilaukset');
                await (0, notify_1.notifyUser)(order.buyerId, 'ORDER_DELIVERED', 'Kauppa suoritettu', 'Reklamointiaikasi on päättynyt — kauppa on nyt suoritettu.', '/ostot');
            }
            continue;
        }
        const age = now - order.shippedAt.getTime();
        if (age >= 14 * DAY_MS) {
            // TODO: Paytrail capture — vapauta maksu myyjälle kun oikea integraatio on käytössä
            await prisma_1.prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } });
            await (0, notify_1.notifyUser)(order.sellerId, 'PAYMENT_RELEASED', 'Maksu vapautettu', 'Ostaja ei reagoinut 14 päivän kuluessa — tilaus suljettiin automaattisesti ja maksu on vapautettu sinulle.', '/dashboard/tilaukset');
            await (0, notify_1.notifyUser)(order.buyerId, 'ORDER_AUTO_COMPLETED', 'Tilaus suljettu automaattisesti', 'Et kuitannut tilausta 14 päivän kuluessa, joten se suljettiin automaattisesti.', '/ostot');
            continue;
        }
        if (age >= 10 * DAY_MS && !order.reminderNotifiedAt) {
            await prisma_1.prisma.order.update({ where: { id: order.id }, data: { reminderNotifiedAt: new Date() } });
            await (0, notify_1.notifyUser)(order.buyerId, 'DELIVERY_REMINDER', 'Muistutus: kuittaa tilaus', 'Kuittaa vastaanotto tai ilmoita ongelmasta — tilaus suljetaan automaattisesti 14 päivän kuluttua lähetyksestä.', '/ostot');
        }
        if (age >= 5 * DAY_MS && !order.stalledNotifiedAt) {
            // TODO: tarkista Postin API:sta onko paketti liikkunut ennen ilmoitusta — odottaa Postin tracking-integraatiota
            await prisma_1.prisma.order.update({ where: { id: order.id }, data: { stalledNotifiedAt: new Date() } });
            await (0, notify_1.notifyUser)(order.sellerId, 'SHIPPING_STALLED', 'Lähetys ei ole edennyt', 'Tilausta ei ole vielä kuitattu vastaanotetuksi 5 päivän kuluttua lähetyksestä.', '/dashboard/tilaukset');
            await (0, notify_1.notifyUser)(order.buyerId, 'SHIPPING_STALLED', 'Onko pakettisi saapunut?', 'Kuittaa vastaanotto tai ilmoita ongelmasta, jos pakettia ei ole näkynyt.', '/ostot');
        }
    }
    return shipped.length;
}
