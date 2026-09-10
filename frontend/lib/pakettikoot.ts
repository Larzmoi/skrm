export interface PakettikokoOption {
  id: string
  nimi: string
  hinta: number
}

// Sama taulukko kuin backend/src/lib/shipping.ts:ssä — staattinen viitetieto,
// ei riipu verkkopyynnöstä (esim. korin haku voi epäonnistua ilman että pakettikoot katoavat).
export const PAKETTIKOOT: PakettikokoOption[] = [
  { id: 'postitus', nimi: 'Postitus 6,9€', hinta: 6.90 },
  { id: 'nouto', nimi: 'Nouto myyjältä', hinta: 0 },
]

// Maksunkäsittelymaksu (Stripen oma EU-korttimaksu, ~1,5% + 0,25€) — LISÄTTY 2026-09-10,
// omistajan päätös: veloitetaan nyt ostajalta erillisenä rivinä checkoutissa sen sijaan että
// Habahub kattaisi sen omasta komissiostaan (ks. CLAUDE.md "Maksunkäsittelymaksu ostajalle").
// Sama kaava kuin backend/src/lib/stripe.ts:n computeProcessingFeeCents() — tämä on VAIN
// näyttöä varten (/kori, /ostot ennen maksua), palvelin laskee ja veloittaa lopullisen summan
// itse, ei koskaan luota tähän clientin laskemaan arvoon.
export function computeProcessingFeeEuros(totalEuros: number): number {
  return Math.round((totalEuros * 0.015 + 0.25) * 100) / 100
}
