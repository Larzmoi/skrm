export interface PakettikokoOption {
  id: string
  nimi: string
  hinta: number
}

// Sama taulukko kuin backend/src/lib/shipping.ts:ssä — staattinen viitetieto,
// ei riipu verkkopyynnöstä (esim. korin haku voi epäonnistua ilman että pakettikoot katoavat).
export const PAKETTIKOOT: PakettikokoOption[] = [
  { id: 'xxs', nimi: 'Pikkupaketti (XXS)', hinta: 9.90 },
  { id: 's', nimi: 'S-paketti', hinta: 11.90 },
  { id: 'm', nimi: 'M-paketti', hinta: 13.90 },
  { id: 'l', nimi: 'L-paketti', hinta: 18.90 },
  { id: 'xl', nimi: 'XL-paketti', hinta: 24.90 },
  { id: 'xxl', nimi: 'XXL-paketti', hinta: 46.90 },
  { id: 'nouto', nimi: 'Nouto myyjältä', hinta: 0 },
]
