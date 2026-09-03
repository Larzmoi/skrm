# Neljä transaktionaalista sähköpostia

Tämä paketti on valmis manuaaliseen integraatioon. Repoa ei ole muutettu.

Tutkitusta nykyisestä koodista tärkeimmät löydökset:

- `backend/src/lib/resend.ts` sisältää jo `sendEmail()` + `wrapper()`.
- `POST /orders/:id/pay` ei vahvista maksua, vaan käynnistää Paytrail-session.
- Maksun todellinen onnistuminen käsitellään `backend/src/routes/webhooks.ts` Paytrail-callbackissa.
- Perinteisen huutokaupan voittaja + Order syntyvät `backend/src/jobs/closeAuctions.ts`:ssä.
- Osta heti -voitto syntyy `backend/src/routes/auctions.ts`:n `POST /:id/buy-now`-reitillä.
- Tracking lisätään `backend/src/routes/orders.ts`:n `POST /:id/tracking`-reitillä.
- Nykyinen push-ilmoitus (`notifyUser`) säilytetään rinnalla.

## Tiedostot

- `resend.additions.ts` — neljä uutta sähköpostifunktiota.
- `MANUAL_PATCH.md` — tarkat integraatiokohdat.
- `send-email-test.ts` — oikeiden testiviestien lähetykseen projektin omassa ympäristössä.
