// MOCK-esimerkkidata, ks. CLAUDE.md "Mikä voidaan rakentaa NYT ilman Postin sopimusta/
// tunnuksia" — kovakoodattu lista kunnes Pickup Point API on käytettävissä. Kun oikea API
// on saatavilla, tämä korvataan haulla postinumeron/kaupungin perusteella.
export interface PostiPickupPoint {
  id: string
  name: string
  address: string
  city: string
}

export const POSTI_PICKUP_POINTS: PostiPickupPoint[] = [
  { id: 'HEL001', name: 'Posti Pakettiautomaatti Kamppi', address: 'Urho Kekkosen katu 1', city: 'Helsinki' },
  { id: 'TRE001', name: 'Posti Pakettiautomaatti Keskustori', address: 'Hämeenkatu 10', city: 'Tampere' },
  { id: 'TUR001', name: 'Posti Pakettiautomaatti Kauppatori', address: 'Aurakatu 8', city: 'Turku' },
  { id: 'OUL001', name: 'Posti Pakettiautomaatti Rotuaari', address: 'Rotuaari 5', city: 'Oulu' },
  { id: 'JKL001', name: 'Posti Pakettiautomaatti Kauppakatu', address: 'Kauppakatu 25', city: 'Jyväskylä' },
]
