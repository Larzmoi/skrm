"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientKey = clientKey;
const express_rate_limit_1 = require("express-rate-limit");
// Luotettava asiakas-IP:n tunnistus, eriytetty index.ts:stä 2026-09-11 jotta samaa logiikkaa
// voi käyttää myös muualla (ks. routes/auth.ts:n rekisteröitymisen IP-duplikaattitunnistus)
// - ei enää vain rate limiterien oma sisäinen apufunktio.
//
// Cloudflaren CF-Connecting-IP-otsikko (asiakas ei voi väärentää sitä - Cloudflare kirjoittaa
// sen aina itse yhteyden perusteella), req.ip vain varapolkuna niille harvoille pyynnöille
// jotka eivät kulje Cloudflaren kautta (esim. palvelimen omat sisäiset kutsut). ipKeyGenerator
// normalisoi IPv6-osoitteet /56-aliverkkoon niin ettei sama kävijä pääse kiertämään IP-pohjaisia
// rajoja vaihtamalla IPv6-osoitetta saman aliverkon sisällä.
function clientKey(req) {
    const cf = req.headers['cf-connecting-ip'];
    const ip = (typeof cf === 'string' && cf) ? cf : (req.ip ?? req.socket.remoteAddress ?? 'unknown');
    return (0, express_rate_limit_1.ipKeyGenerator)(ip);
}
