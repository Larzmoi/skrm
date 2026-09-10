import { AKTIIVISET_KATEGORIAT } from './config'

// Keräilykortit-kategorian pelien yhteinen tyyppisetti (kolmas kategoriataso) — sama viisi tyyppiä joka pelillä.
// "Muu {peli}" -id rakennetaan pelin id:stä, jotta se pysyy uniikkina pelien välillä.
// "Släbit" (fi) on tarkoituksellinen, vakiintunut termi tässä yhteisössä — ei kirjoitusvirhe, ei muutettu.
function keraiLykorttiTyypit(peliId: string, peliNimi: { fi: string; en: string; sv: string }) {
  return [
    { id: 'slabit', nimi: { fi: 'Släbit', en: 'Slabs', sv: 'Slabbade kort' } },
    { id: 'sealed', nimi: { fi: 'Sealed', en: 'Sealed', sv: 'Sealed' } },
    { id: 'irtokortit', nimi: { fi: 'Irtokortit', en: 'Loose Cards', sv: 'Lösa kort' } },
    { id: 'tarvikkeet', nimi: { fi: 'Tarvikkeet', en: 'Supplies', sv: 'Tillbehör' } },
    { id: `muu-${peliId}`, nimi: { fi: `Muu ${peliNimi.fi}`, en: `Other ${peliNimi.en}`, sv: `Övrigt ${peliNimi.sv}` } },
  ]
}

const KERAILYKORTIT_PELIT = [
  { id: 'pokemon', nimi: { fi: 'Pokémon', en: 'Pokémon', sv: 'Pokémon' } },
  { id: 'magic', nimi: { fi: 'Magic: The Gathering', en: 'Magic: The Gathering', sv: 'Magic: The Gathering' } },
  { id: 'yugioh', nimi: { fi: 'Yu-Gi-Oh!', en: 'Yu-Gi-Oh!', sv: 'Yu-Gi-Oh!' } },
  { id: 'lorcana', nimi: { fi: 'Lorcana', en: 'Lorcana', sv: 'Lorcana' } },
  { id: 'one-piece', nimi: { fi: 'One Piece', en: 'One Piece', sv: 'One Piece' } },
  { id: 'sports-cards', nimi: { fi: 'Urheilukortit', en: 'Sports Cards', sv: 'Sportkort' } },
  { id: 'muut-kerailytuotteet', nimi: { fi: 'Muut keräilytuotteet', en: 'Other Collectibles', sv: 'Övriga samlarobjekt' } },
].map(peli => ({ ...peli, tyypit: keraiLykorttiTyypit(peli.id, peli.nimi) }))

export const KATEGORIAT = [
  {
    id: 'kerailykortit',
    nimi: { fi: 'Keräilykortit', en: 'Trading Cards', sv: 'Samlarkort' },
    kuvaus: 'Pokémon, Magic, Sports Cards',
    // Kolmitasoinen rakenne (Kategoria → Peli → Tyyppi), päätetty 2026-08-07 — korvaa aiemman tasaisen listan
    // jossa "Tarvikkeet"/"Muut kortit" olivat samalla tasolla pelien kanssa. Jokainen peli saa nyt oman tyypit-listansa.
    alakategoriat: KERAILYKORTIT_PELIT,
  },
  {
    id: 'elektroniikka',
    nimi: { fi: 'Elektroniikka', en: 'Electronics', sv: 'Elektronik' },
    kuvaus: 'Puhelimet, tietokoneet, kodinkoneet',
    alakategoriat: [
      { id: 'puhelimet', nimi: { fi: 'Puhelimet', en: 'Phones', sv: 'Telefoner' } },
      { id: 'tietokoneet', nimi: { fi: 'Tietokoneet', en: 'Computers', sv: 'Datorer' } },
      { id: 'tabletit', nimi: { fi: 'Tabletit', en: 'Tablets', sv: 'Surfplattor' } },
      { id: 'audio', nimi: { fi: 'Audio & kuulokkeet', en: 'Audio & Headphones', sv: 'Ljud & hörlurar' } },
      { id: 'kamerat', nimi: { fi: 'Kamerat', en: 'Cameras', sv: 'Kameror' } },
      { id: 'kodinkoneet', nimi: { fi: 'Kodinkoneet', en: 'Home Appliances', sv: 'Hushållsapparater' } },
      { id: 'muut-elektroniikka', nimi: { fi: 'Muut', en: 'Other', sv: 'Övrigt' } },
    ],
  },
  {
    id: 'vaatteet',
    nimi: { fi: 'Vaatteet & asusteet', en: 'Clothing & Accessories', sv: 'Kläder & accessoarer' },
    kuvaus: 'Kaikki vaatteet ja tekstiilit',
    alakategoriat: [
      { id: 'miesten-vaatteet', nimi: { fi: 'Miesten vaatteet', en: "Men's Clothing", sv: 'Herrkläder' } },
      { id: 'naisten-vaatteet', nimi: { fi: 'Naisten vaatteet', en: "Women's Clothing", sv: 'Damkläder' } },
      { id: 'lasten-vaatteet', nimi: { fi: 'Lasten vaatteet', en: "Children's Clothing", sv: 'Barnkläder' } },
      { id: 'merkkivaatteet', nimi: { fi: 'Merkkivaatteet', en: 'Designer Clothing', sv: 'Märkeskläder' } },
      { id: 'vintage-vaatteet', nimi: { fi: 'Vintage', en: 'Vintage', sv: 'Vintage' } },
      { id: 'asusteet', nimi: { fi: 'Asusteet & hatut', en: 'Accessories & Hats', sv: 'Accessoarer & hattar' } },
    ],
  },
  {
    id: 'kengat-laukut',
    nimi: { fi: 'Kengät & laukut', en: 'Shoes & Bags', sv: 'Skor & väskor' },
    kuvaus: 'Kengät, käsilaukut, reput',
    alakategoriat: [
      { id: 'sneakerit', nimi: { fi: 'Sneakerit', en: 'Sneakers', sv: 'Sneakers' } },
      { id: 'miesten-kengat', nimi: { fi: "Miesten kengät", en: "Men's Shoes", sv: 'Herrskor' } },
      { id: 'naisten-kengat', nimi: { fi: "Naisten kengät", en: "Women's Shoes", sv: 'Damskor' } },
      { id: 'laukut', nimi: { fi: 'Käsilaukut', en: 'Handbags', sv: 'Handväskor' } },
      { id: 'reput', nimi: { fi: 'Reput & laukut', en: 'Backpacks & Bags', sv: 'Ryggsäckar & väskor' } },
    ],
  },
  {
    id: 'kellot-korut',
    nimi: { fi: 'Kellot & korut', en: 'Watches & Jewelry', sv: 'Klockor & smycken' },
    kuvaus: 'Kellot, korut, arvoesineet',
    alakategoriat: [
      { id: 'luksuskellot', nimi: { fi: 'Luksuskellot', en: 'Luxury Watches', sv: 'Lyxklockor' } },
      { id: 'kellot', nimi: { fi: 'Kellot', en: 'Watches', sv: 'Klockor' } },
      { id: 'korut', nimi: { fi: 'Korut', en: 'Jewelry', sv: 'Smycken' } },
      { id: 'sormukset', nimi: { fi: 'Sormukset', en: 'Rings', sv: 'Ringar' } },
      { id: 'ketjut', nimi: { fi: 'Ketjut & rannekorut', en: 'Chains & Bracelets', sv: 'Kedjor & armband' } },
    ],
  },
  {
    id: 'antiikki',
    nimi: { fi: 'Antiikki & keräily', en: 'Antiques & Collectibles', sv: 'Antikviteter & samlarobjekt' },
    kuvaus: 'Vanhat esineet, keräilytavarat',
    alakategoriat: [
      { id: 'antiikki-huonekalut', nimi: { fi: 'Huonekalut', en: 'Furniture', sv: 'Möbler' } },
      { id: 'posliini', nimi: { fi: 'Posliini & astiat', en: 'Porcelain & Dishes', sv: 'Porslin & servis' } },
      { id: 'taide', nimi: { fi: 'Taide & maalaukset', en: 'Art & Paintings', sv: 'Konst & tavlor' } },
      { id: 'keralily-figuriinit', nimi: { fi: 'Figuurit & patsaat', en: 'Figurines & Statues', sv: 'Figurer & statyer' } },
      { id: 'vintage-lelut', nimi: { fi: 'Vintage-lelut', en: 'Vintage Toys', sv: 'Vintageleksaker' } },
      { id: 'muut-antiikki', nimi: { fi: 'Muut', en: 'Other', sv: 'Övrigt' } },
    ],
  },
  {
    id: 'kirjat-media',
    nimi: { fi: 'Kirjat, elokuvat & musiikki', en: 'Books, Movies & Music', sv: 'Böcker, filmer & musik' },
    kuvaus: 'Kirjat, DVD, vinyylit, CD',
    alakategoriat: [
      { id: 'kirjat', nimi: { fi: 'Kirjat', en: 'Books', sv: 'Böcker' } },
      { id: 'vinyylit', nimi: { fi: 'Vinyylit', en: 'Vinyl Records', sv: 'Vinylskivor' } },
      { id: 'cd', nimi: { fi: 'CD-levyt', en: 'CDs', sv: 'CD-skivor' } },
      { id: 'dvd-bluray', nimi: { fi: 'DVD & Blu-ray', en: 'DVD & Blu-ray', sv: 'DVD & Blu-ray' } },
      { id: 'sarjakuvat', nimi: { fi: 'Sarjakuvat & manga', en: 'Comics & Manga', sv: 'Serier & manga' } },
    ],
  },
  {
    id: 'lelut',
    nimi: { fi: 'Lelut & harrastukset', en: 'Toys & Hobbies', sv: 'Leksaker & hobby' },
    kuvaus: 'Lelut, pelit, harrastustarvikkeet',
    alakategoriat: [
      { id: 'lego', nimi: { fi: 'LEGO', en: 'LEGO', sv: 'LEGO' } },
      { id: 'figuurit', nimi: { fi: 'Figuurit & lelut', en: 'Figures & Toys', sv: 'Figurer & leksaker' } },
      { id: 'lautapelit', nimi: { fi: 'Lautapelit', en: 'Board Games', sv: 'Brädspel' } },
      { id: 'harrastukset', nimi: { fi: 'Harrastustarvikkeet', en: 'Hobby Supplies', sv: 'Hobbyartiklar' } },
    ],
  },
  {
    id: 'urheilu',
    nimi: { fi: 'Urheilu & ulkoilu', en: 'Sports & Outdoors', sv: 'Sport & friluftsliv' },
    kuvaus: 'Urheiluvälineet, ulkoiluvarusteet',
    alakategoriat: [
      { id: 'pyorat', nimi: { fi: 'Pyörät', en: 'Bicycles', sv: 'Cyklar' } },
      { id: 'kuntosali', nimi: { fi: 'Kuntosalivarusteet', en: 'Gym Equipment', sv: 'Gymutrustning' } },
      { id: 'ulkoilu', nimi: { fi: 'Ulkoilu & retkeily', en: 'Outdoor & Hiking', sv: 'Friluftsliv & vandring' } },
      { id: 'palloilu', nimi: { fi: 'Palloilu', en: 'Ball Sports', sv: 'Bollsport' } },
      { id: 'golf', nimi: { fi: 'Golf', en: 'Golf', sv: 'Golf' } },
      { id: 'muut-urheilu', nimi: { fi: 'Muut', en: 'Other', sv: 'Övrigt' } },
    ],
  },
  {
    id: 'koti',
    nimi: { fi: 'Koti & sisustus', en: 'Home & Decor', sv: 'Hem & inredning' },
    kuvaus: 'Huonekalut, sisustustavarat',
    alakategoriat: [
      { id: 'huonekalut', nimi: { fi: 'Huonekalut', en: 'Furniture', sv: 'Möbler' } },
      { id: 'sisustus', nimi: { fi: 'Sisustustavarat', en: 'Decor', sv: 'Inredningsdetaljer' } },
      { id: 'keittion-varusteet', nimi: { fi: 'Keittiö', en: 'Kitchen', sv: 'Kök' } },
      { id: 'valaistus', nimi: { fi: 'Valaistus', en: 'Lighting', sv: 'Belysning' } },
      { id: 'tekstiilit', nimi: { fi: 'Tekstiilit', en: 'Textiles', sv: 'Textilier' } },
    ],
  },
  {
    id: 'taide',
    nimi: { fi: 'Taide & käsityöt', en: 'Art & Crafts', sv: 'Konst & hantverk' },
    kuvaus: 'Taulut, veistokset, käsityöt',
    alakategoriat: [
      { id: 'maalaukset', nimi: { fi: 'Maalaukset', en: 'Paintings', sv: 'Tavlor' } },
      { id: 'valokuvat', nimi: { fi: 'Valokuvat', en: 'Photography', sv: 'Fotografi' } },
      { id: 'veistokset', nimi: { fi: 'Veistokset', en: 'Sculptures', sv: 'Skulpturer' } },
      { id: 'kasityot', nimi: { fi: 'Käsityöt', en: 'Handmade', sv: 'Hantverk' } },
    ],
  },
  {
    id: 'pelit',
    nimi: { fi: 'Pelit & konsolit', en: 'Games & Consoles', sv: 'Spel & konsoler' },
    kuvaus: 'Videopelit, konsolit, lautapelit',
    alakategoriat: [
      { id: 'playstation', nimi: { fi: 'PlayStation', en: 'PlayStation', sv: 'PlayStation' } },
      { id: 'xbox', nimi: { fi: 'Xbox', en: 'Xbox', sv: 'Xbox' } },
      { id: 'nintendo', nimi: { fi: 'Nintendo', en: 'Nintendo', sv: 'Nintendo' } },
      { id: 'pc-pelit', nimi: { fi: 'PC-pelit', en: 'PC Games', sv: 'PC-spel' } },
      { id: 'retro-pelit', nimi: { fi: 'Retro-pelit', en: 'Retro Games', sv: 'Retrospel' } },
      { id: 'lautapelit-konsolit', nimi: { fi: 'Lautapelit', en: 'Board Games', sv: 'Brädspel' } },
    ],
  },
  {
    id: 'instrumentit',
    nimi: { fi: 'Musiikki-instrumentit', en: 'Musical Instruments', sv: 'Musikinstrument' },
    kuvaus: 'Soittimet ja musiikkivarusteet',
    alakategoriat: [
      { id: 'kitarat', nimi: { fi: 'Kitarat', en: 'Guitars', sv: 'Gitarrer' } },
      { id: 'pianot', nimi: { fi: 'Pianot & koskettimet', en: 'Pianos & Keys', sv: 'Pianon & klaviatur' } },
      { id: 'rummut', nimi: { fi: 'Rummut', en: 'Drums', sv: 'Trummor' } },
      { id: 'puhaltimet', nimi: { fi: 'Puhaltimet', en: 'Wind Instruments', sv: 'Blåsinstrument' } },
      { id: 'musiikki-varusteet', nimi: { fi: 'Varusteet & efektit', en: 'Gear & Effects', sv: 'Utrustning & effekter' } },
    ],
  },
  {
    id: 'muu',
    nimi: { fi: 'Muut', en: 'Other', sv: 'Övrigt' },
    kuvaus: 'Kaikki muu',
    alakategoriat: [],
  },
]

export type Lang = 'fi' | 'en' | 'sv'

export function getKatNimi(kat: any, lang: Lang): string {
  if (!kat?.nimi) return ''
  if (typeof kat.nimi === 'string') return kat.nimi
  return kat.nimi[lang] ?? kat.nimi.fi ?? ''
}

export function getAlaNimi(ala: any, lang: Lang): string {
  if (!ala?.nimi) return ''
  if (typeof ala.nimi === 'string') return ala.nimi
  return ala.nimi[lang] ?? ala.nimi.fi ?? ''
}

export function getKategoria(id: string) {
  return KATEGORIAT.find(k => k.id === id)
}

export function getTyyppiNimi(tyyppi: any, lang: Lang): string {
  if (!tyyppi?.nimi) return ''
  if (typeof tyyppi.nimi === 'string') return tyyppi.nimi
  return tyyppi.nimi[lang] ?? tyyppi.nimi.fi ?? ''
}

// Selaus-/valintanäkymissä käytettävä kategorialista — rajattu AKTIIVISET_KATEGORIAT-asetuksella (ks. config.ts).
// KATEGORIAT itse pysyy aina täytenä (getKategoria/getKatNimi toimivat kaikilla 14:llä, jotta jo olemassa olevien
// tuotteiden kategorianimet näkyvät oikein vaikka kategoria olisi piilotettu uusilta valinnoilta).
export function getNakyvatKategoriat() {
  if (AKTIIVISET_KATEGORIAT.length === 0) return KATEGORIAT
  return KATEGORIAT.filter(k => AKTIIVISET_KATEGORIAT.includes(k.id))
}
