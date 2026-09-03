# Manuaaliset muutokset

Repoa ei muutettu. Nämä ovat integraatiopohjat nykyiseen `Larzmoi/skrm`-koodiin.

## auth.ts

Lisää:
```ts
import { sendWelcomeEmail } from '../lib/resend'
```

Onnistuneen `prisma.user.create(...)` jälkeen:
```ts
void sendWelcomeEmail(user.email, user.name, user.username)
```

## webhooks.ts — maksun onnistuminen

Lisää:
```ts
import { sendOrderConfirmationEmail } from '../lib/resend'
```

Tärkeä havainto: nykyinen `POST /orders/:id/pay` vain aloittaa Paytrail-maksusession. Todellinen onnistunut maksu käsitellään `GET /webhooks/paytrail`-haarassa, jossa `status === 'ok'` ja Order on `PENDING_PAYMENT`.

Lähetä vahvistus vasta siinä haarassa, kun maksu on oikeasti hyväksytty:
```ts
void sendOrderConfirmationEmail(
  order.buyer.email,
  order.buyer.name,
  order.id,
  productName,
  order.productTotal + (order.shippingPrice ?? 0),
)
```

Nykyisessä skeemassa ei löytynyt erillistä `orderNumber`-kenttää, joten `order.id` toimii tilausnumerona, ellei projektissa ole lisätty muuta julkista tunnistetta.

## orders.ts — tracking

Lisää:
```ts
import { sendShippingNotificationEmail } from '../lib/resend'
```

Hae `buyer` sekä `items.product`, ja onnistuneen `SHIPPED`-päivityksen jälkeen:
```ts
void sendShippingNotificationEmail(
  order.buyer.email,
  order.buyer.name,
  productName,
  trackingCode,
)
```

Koska reitti hyväksyy vain `PENDING_SHIPPING`-tilauksen ja vaihtaa sen `SHIPPED`-tilaan, normaali toistokutsu ei lähetä toista viestiä.

## closeAuctions.ts — perinteinen huutokauppa, 24 h

Lisää:
```ts
import { sendAuctionWonEmail } from '../lib/resend'
```

Nykyinen lopullinen voittokohta on `closeExpiredAuctions()`: siinä tuote merkitään `SOLD` ja `createOrderForAuctionWin(...)` luo Orderin.

Sen jälkeen:
```ts
const winner = await prisma.user.findUnique({
  where: { id: product.currentBidderId },
  select: { email: true, name: true },
})

if (winner) {
  void sendAuctionWonEmail(
    winner.email,
    winner.name,
    product.name,
    product.currentBid,
    24,
  )
}
```

## auctions.ts — osta heti, 2 h

Nykyinen `POST /:id/buy-now` luo Orderin `createOrderForAuctionWin(...)`-kutsulla ja käyttää 2 tunnin maksuaikaa.

Lisää:
```ts
import { sendAuctionWonEmail } from '../lib/resend'
```

Orderin luonnin jälkeen:
```ts
const buyer = await prisma.user.findUnique({
  where: { id: req.userId! },
  select: { email: true, name: true },
})

if (buyer) {
  void sendAuctionWonEmail(
    buyer.email,
    buyer.name,
    product.name,
    product.buyNowPrice,
    2,
  )
}
```

## Ei-blokkaava lähetys

Käytä tarkoituksella:
```ts
void sendWelcomeEmail(...)
```
eikä:
```ts
await sendWelcomeEmail(...)
```

Nykyinen `sendEmail()` ottaa Resend-virheet kiinni ja loggaa ne, joten sähköpostivirhe ei kaada API-pyyntöä.

## Idempotenssi

- Welcome: käyttäjän luonti onnistuu vain kerran; duplicate-register ei luo uutta käyttäjää.
- Order confirmation: lähetä vain nykyisen `PENDING_PAYMENT -> PENDING_SHIPPING` onnistuneen webhook-käsittelyn yhteydessä.
- Shipping: `PENDING_SHIPPING -> SHIPPED` estää normaalin uudelleenlähetyksen.
- Auction: winner-logiikka ajetaan `closeAuctions`-jobissa; tuotteen `PENDING -> SOLD` -siirtymä on tapahtuman luonnollinen raja.
- Jos tuotantoympäristössä voi tulla aidosti samanaikaisia duplicate-webhookeja, exactly-once kannattaa varmistaa DB-tason unique idempotency keyllä/outboxilla.

## Push-ilmoitukset

Nykyiset `notifyUser()`-ilmoitukset säilytetään. Sähköposti on lisäkanava eikä korvaa pushia.

## Testaus

Tätä ympäristöä ei ole kytketty projektin `RESEND_API_KEY`-salaisuuteen eikä vastaanottajan sähköpostiin, joten en voi rehellisesti väittää lähettäneeni oikeita testiviestejä itse.

Katso `send-email-test.ts` ja aja se projektin backend-ympäristössä:
```bash
TEST_EMAIL=omaosoite@example.com npx tsx send-email-test.ts
```

Tämä lähettää yhden oikean viestin kustakin neljästä funktiosta.
