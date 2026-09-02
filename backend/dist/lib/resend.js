"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendBanNotificationEmail = sendBanNotificationEmail;
const resend_1 = require("resend");
// RESEND_API_KEY puuttuu kunnes omistaja antaa oikean avaimen (ks. CLAUDE.md "Resend"-osio) —
// tässä välissä sähköpostit vain lokitetaan konsoliin, ei kaadu palvelinta.
const resend = process.env.RESEND_API_KEY ? new resend_1.Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || 'Habahub <no-reply@habahub.com>';
async function sendEmail(params) {
    if (!resend) {
        console.log(`[email] RESEND_API_KEY ei asetettu — sähköposti EI lähtenyt oikeasti. to=${params.to} subject="${params.subject}"`);
        return;
    }
    try {
        const { error } = await resend.emails.send({ from: FROM, to: params.to, subject: params.subject, html: params.html });
        if (error)
            console.error('[email] Resend palautti virheen:', error);
    }
    catch (e) {
        console.error('[email] Lähetys epäonnistui:', e);
    }
}
function wrapper(bodyHtml) {
    return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
    <div style="font-weight:900;font-size:22px;letter-spacing:-0.5px;margin-bottom:24px">Habahub</div>
    ${bodyHtml}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;color:#888;font-size:12px">Habahub · habahub.com</div>
  </div>`;
}
async function sendPasswordResetEmail(to, name, resetUrl) {
    await sendEmail({
        to,
        subject: 'Salasanan palautus — Habahub',
        html: wrapper(`
      <p style="font-size:15px;line-height:1.5">Hei ${name},</p>
      <p style="font-size:15px;line-height:1.5">Pyysit salasanan palautusta Habahub-tilillesi. Klikkaa alta asettaaksesi uuden salasanan. Linkki on voimassa 1 tunnin.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:8px;margin:16px 0">Aseta uusi salasana</a>
      <p style="font-size:13px;line-height:1.5;color:#666">Jos et pyytänyt tätä, voit jättää tämän viestin huomiotta — salasanasi ei muutu.</p>
    `),
    });
}
async function sendBanNotificationEmail(to, name, endsAtIso, reason) {
    const endsAt = new Date(endsAtIso);
    const formatted = endsAt.toLocaleDateString('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' });
    await sendEmail({
        to,
        subject: 'Tilisi on estetty — Habahub',
        html: wrapper(`
      <p style="font-size:15px;line-height:1.5">Hei ${name},</p>
      <p style="font-size:15px;line-height:1.5">Tilisi on estetty Habahubissa syyllä: <strong>${reason}</strong>.</p>
      <p style="font-size:15px;line-height:1.5">Esto päättyy ${formatted}.</p>
      <p style="font-size:13px;line-height:1.5;color:#666">Jos koet tämän virheelliseksi, ota yhteyttä support@habahub.com.</p>
    `),
    });
}
