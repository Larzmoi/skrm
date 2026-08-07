// Kevyt hälytys admin-puhelimeen kun jotain kiireellistä ilmiannetaan (esim. käynnissä oleva live).
// Vaatii TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID env-muuttujat (ks. https://core.telegram.org/bots#how-do-i-create-a-bot).
// Jos näitä ei ole asetettu, hälytys kirjautuu vain konsoliin — ei kaadu, ei estä ilmiannon tallennusta.
export async function alertAdmin(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.log(`[admin-hälytys, Telegram ei konfiguroitu] ${message}`)
    return
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    })
  } catch (e) {
    console.error('Telegram-hälytys epäonnistui:', e)
  }
}
