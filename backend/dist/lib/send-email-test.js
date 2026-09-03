"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resend_1 = require("./resend");
const to = process.env.TEST_EMAIL;
if (!to)
    throw new Error('Aseta TEST_EMAIL ympäristömuuttuja.');
async function main() {
    await (0, resend_1.sendWelcomeEmail)(to, 'Testikäyttäjä', 'testika');
    await (0, resend_1.sendOrderConfirmationEmail)(to, 'Testikäyttäjä', 'TEST-ORDER-001', 'Testikortti', 29.9);
    await (0, resend_1.sendShippingNotificationEmail)(to, 'Testikäyttäjä', 'Testikortti', 'TEST123456789FI');
    await (0, resend_1.sendAuctionWonEmail)(to, 'Testikäyttäjä', 'Testikortti', 24.5, 2);
    console.log(`Testikutsut suoritettu: ${to}`);
}
main().catch((error) => {
    console.error('Testilähetys epäonnistui:', error);
    process.exitCode = 1;
});
