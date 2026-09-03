// Ajettu standalonena (ei index.ts:n kautta), joten .env ei lataudu automaattisesti - ilman
// tätä resend.ts:n moduulitason `process.env.RESEND_API_KEY ? ... : null` -tarkistus näkee
// aina undefined ja jokainen lähetys vain lokittuu konsoliin oikeasti lähtemättä.
import 'dotenv/config'
import {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendAuctionWonEmail,
} from './resend'

const to = process.env.TEST_EMAIL
if (!to) throw new Error('Aseta TEST_EMAIL ympäristömuuttuja.')

async function main() {
  await sendWelcomeEmail(to, 'Testikäyttäjä', 'testika')
  await sendOrderConfirmationEmail(to, 'Testikäyttäjä', 'TEST-ORDER-001', 'Testikortti', 29.9)
  await sendShippingNotificationEmail(to, 'Testikäyttäjä', 'Testikortti', 'TEST123456789FI')
  await sendAuctionWonEmail(to, 'Testikäyttäjä', 'Testikortti', 24.5, 2)
  console.log(`Testikutsut suoritettu: ${to}`)
}

main().catch((error) => {
  console.error('Testilähetys epäonnistui:', error)
  process.exitCode = 1
})
