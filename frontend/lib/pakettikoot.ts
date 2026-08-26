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
