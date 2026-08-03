export const KATEGORIAT = [
  {
    id: 'kerailykortit',
    nimi: { fi: 'Keräilykortit', en: 'Trading Cards' },
    kuvaus: 'Pokémon, Magic, Sports Cards',
    alakategoriat: [
      { id: 'pokemon', nimi: { fi: 'Pokémon', en: 'Pokémon' } },
      { id: 'magic', nimi: { fi: 'Magic: The Gathering', en: 'Magic: The Gathering' } },
      { id: 'yugioh', nimi: { fi: 'Yu-Gi-Oh!', en: 'Yu-Gi-Oh!' } },
      { id: 'lorcana', nimi: { fi: 'Lorcana', en: 'Lorcana' } },
      { id: 'one-piece', nimi: { fi: 'One Piece', en: 'One Piece' } },
      { id: 'sports-cards', nimi: { fi: 'Urheilukortit', en: 'Sports Cards' } },
      { id: 'muut-kortit', nimi: { fi: 'Muut kortit', en: 'Other Cards' } },
    ],
  },
  {
    id: 'elektroniikka',
    nimi: { fi: 'Elektroniikka', en: 'Electronics' },
    kuvaus: 'Puhelimet, tietokoneet, kodinkoneet',
    alakategoriat: [
      { id: 'puhelimet', nimi: { fi: 'Puhelimet', en: 'Phones' } },
      { id: 'tietokoneet', nimi: { fi: 'Tietokoneet', en: 'Computers' } },
      { id: 'tabletit', nimi: { fi: 'Tabletit', en: 'Tablets' } },
      { id: 'audio', nimi: { fi: 'Audio & kuulokkeet', en: 'Audio & Headphones' } },
      { id: 'kamerat', nimi: { fi: 'Kamerat', en: 'Cameras' } },
      { id: 'kodinkoneet', nimi: { fi: 'Kodinkoneet', en: 'Home Appliances' } },
      { id: 'muut-elektroniikka', nimi: { fi: 'Muut', en: 'Other' } },
    ],
  },
  {
    id: 'vaatteet',
    nimi: { fi: 'Vaatteet & asusteet', en: 'Clothing & Accessories' },
    kuvaus: 'Kaikki vaatteet ja tekstiilit',
    alakategoriat: [
      { id: 'miesten-vaatteet', nimi: { fi: 'Miesten vaatteet', en: "Men's Clothing" } },
      { id: 'naisten-vaatteet', nimi: { fi: 'Naisten vaatteet', en: "Women's Clothing" } },
      { id: 'lasten-vaatteet', nimi: { fi: 'Lasten vaatteet', en: "Children's Clothing" } },
      { id: 'merkkivaatteet', nimi: { fi: 'Merkkivaatteet', en: 'Designer Clothing' } },
      { id: 'vintage-vaatteet', nimi: { fi: 'Vintage', en: 'Vintage' } },
      { id: 'asusteet', nimi: { fi: 'Asusteet & hatut', en: 'Accessories & Hats' } },
    ],
  },
  {
    id: 'kengat-laukut',
    nimi: { fi: 'Kengät & laukut', en: 'Shoes & Bags' },
    kuvaus: 'Kengät, käsilaukut, reput',
    alakategoriat: [
      { id: 'sneakerit', nimi: { fi: 'Sneakerit', en: 'Sneakers' } },
      { id: 'miesten-kengat', nimi: { fi: "Miesten kengät", en: "Men's Shoes" } },
      { id: 'naisten-kengat', nimi: { fi: "Naisten kengät", en: "Women's Shoes" } },
      { id: 'laukut', nimi: { fi: 'Käsilaukut', en: 'Handbags' } },
      { id: 'reput', nimi: { fi: 'Reput & laukut', en: 'Backpacks & Bags' } },
    ],
  },
  {
    id: 'kellot-korut',
    nimi: { fi: 'Kellot & korut', en: 'Watches & Jewelry' },
    kuvaus: 'Kellot, korut, arvoesineet',
    alakategoriat: [
      { id: 'luksuskellot', nimi: { fi: 'Luksuskellot', en: 'Luxury Watches' } },
      { id: 'kellot', nimi: { fi: 'Kellot', en: 'Watches' } },
      { id: 'korut', nimi: { fi: 'Korut', en: 'Jewelry' } },
      { id: 'sormukset', nimi: { fi: 'Sormukset', en: 'Rings' } },
      { id: 'ketjut', nimi: { fi: 'Ketjut & rannekorut', en: 'Chains & Bracelets' } },
    ],
  },
  {
    id: 'antiikki',
    nimi: { fi: 'Antiikki & keräily', en: 'Antiques & Collectibles' },
    kuvaus: 'Vanhat esineet, keräilytavarat',
    alakategoriat: [
      { id: 'antiikki-huonekalut', nimi: { fi: 'Huonekalut', en: 'Furniture' } },
      { id: 'posliini', nimi: { fi: 'Posliini & astiat', en: 'Porcelain & Dishes' } },
      { id: 'taide', nimi: { fi: 'Taide & maalaukset', en: 'Art & Paintings' } },
      { id: 'keralily-figuriinit', nimi: { fi: 'Figuurit & patsaat', en: 'Figurines & Statues' } },
      { id: 'vintage-lelut', nimi: { fi: 'Vintage-lelut', en: 'Vintage Toys' } },
      { id: 'muut-antiikki', nimi: { fi: 'Muut', en: 'Other' } },
    ],
  },
  {
    id: 'kirjat-media',
    nimi: { fi: 'Kirjat, elokuvat & musiikki', en: 'Books, Movies & Music' },
    kuvaus: 'Kirjat, DVD, vinyylit, CD',
    alakategoriat: [
      { id: 'kirjat', nimi: { fi: 'Kirjat', en: 'Books' } },
      { id: 'vinyylit', nimi: { fi: 'Vinyylit', en: 'Vinyl Records' } },
      { id: 'cd', nimi: { fi: 'CD-levyt', en: 'CDs' } },
      { id: 'dvd-bluray', nimi: { fi: 'DVD & Blu-ray', en: 'DVD & Blu-ray' } },
      { id: 'sarjakuvat', nimi: { fi: 'Sarjakuvat & manga', en: 'Comics & Manga' } },
    ],
  },
  {
    id: 'lelut',
    nimi: { fi: 'Lelut & harrastukset', en: 'Toys & Hobbies' },
    kuvaus: 'Lelut, pelit, harrastustarvikkeet',
    alakategoriat: [
      { id: 'lego', nimi: { fi: 'LEGO', en: 'LEGO' } },
      { id: 'figuurit', nimi: { fi: 'Figuurit & lelut', en: 'Figures & Toys' } },
      { id: 'lautapelit', nimi: { fi: 'Lautapelit', en: 'Board Games' } },
      { id: 'harrastukset', nimi: { fi: 'Harrastustarvikkeet', en: 'Hobby Supplies' } },
    ],
  },
  {
    id: 'urheilu',
    nimi: { fi: 'Urheilu & ulkoilu', en: 'Sports & Outdoors' },
    kuvaus: 'Urheiluvälineet, ulkoiluvarusteet',
    alakategoriat: [
      { id: 'pyorat', nimi: { fi: 'Pyörät', en: 'Bicycles' } },
      { id: 'kuntosali', nimi: { fi: 'Kuntosalivarusteet', en: 'Gym Equipment' } },
      { id: 'ulkoilu', nimi: { fi: 'Ulkoilu & retkeily', en: 'Outdoor & Hiking' } },
      { id: 'palloilu', nimi: { fi: 'Palloilu', en: 'Ball Sports' } },
      { id: 'golf', nimi: { fi: 'Golf', en: 'Golf' } },
      { id: 'muut-urheilu', nimi: { fi: 'Muut', en: 'Other' } },
    ],
  },
  {
    id: 'koti',
    nimi: { fi: 'Koti & sisustus', en: 'Home & Decor' },
    kuvaus: 'Huonekalut, sisustustavarat',
    alakategoriat: [
      { id: 'huonekalut', nimi: { fi: 'Huonekalut', en: 'Furniture' } },
      { id: 'sisustus', nimi: { fi: 'Sisustustavarat', en: 'Decor' } },
      { id: 'keittion-varusteet', nimi: { fi: 'Keittiö', en: 'Kitchen' } },
      { id: 'valaistus', nimi: { fi: 'Valaistus', en: 'Lighting' } },
      { id: 'tekstiilit', nimi: { fi: 'Tekstiilit', en: 'Textiles' } },
    ],
  },
  {
    id: 'tyokalut',
    nimi: { fi: 'Työkalut & remontointi', en: 'Tools & DIY' },
    kuvaus: 'Käsi- ja sähkötyökalut',
    alakategoriat: [
      { id: 'sahkotyokalut', nimi: { fi: 'Sähkötyökalut', en: 'Power Tools' } },
      { id: 'kaasityokalut', nimi: { fi: 'Käsityökalut', en: 'Hand Tools' } },
      { id: 'puutarha', nimi: { fi: 'Puutarhatyökalut', en: 'Garden Tools' } },
      { id: 'mittalaitteet', nimi: { fi: 'Mittalaitteet', en: 'Measuring Tools' } },
    ],
  },
  {
    id: 'auto-moto',
    nimi: { fi: 'Auto & moottoripyörä', en: 'Cars & Motorcycles' },
    kuvaus: 'Varaosat, tarvikkeet, varusteet',
    alakategoriat: [
      { id: 'varaosat', nimi: { fi: 'Varaosat', en: 'Spare Parts' } },
      { id: 'renkaat', nimi: { fi: 'Renkaat & vanteet', en: 'Tires & Rims' } },
      { id: 'lisavarusteet', nimi: { fi: 'Lisävarusteet', en: 'Accessories' } },
      { id: 'moottoripyora', nimi: { fi: 'Moottoripyörätarvikkeet', en: 'Motorcycle Gear' } },
    ],
  },
  {
    id: 'taide',
    nimi: { fi: 'Taide & käsityöt', en: 'Art & Crafts' },
    kuvaus: 'Taulut, veistokset, käsityöt',
    alakategoriat: [
      { id: 'maalaukset', nimi: { fi: 'Maalaukset', en: 'Paintings' } },
      { id: 'valokuvat', nimi: { fi: 'Valokuvat', en: 'Photography' } },
      { id: 'veistokset', nimi: { fi: 'Veistokset', en: 'Sculptures' } },
      { id: 'kasityot', nimi: { fi: 'Käsityöt', en: 'Handmade' } },
    ],
  },
  {
    id: 'pelit',
    nimi: { fi: 'Pelit & konsolit', en: 'Games & Consoles' },
    kuvaus: 'Videopelit, konsolit, lautapelit',
    alakategoriat: [
      { id: 'playstation', nimi: { fi: 'PlayStation', en: 'PlayStation' } },
      { id: 'xbox', nimi: { fi: 'Xbox', en: 'Xbox' } },
      { id: 'nintendo', nimi: { fi: 'Nintendo', en: 'Nintendo' } },
      { id: 'pc-pelit', nimi: { fi: 'PC-pelit', en: 'PC Games' } },
      { id: 'retro-pelit', nimi: { fi: 'Retro-pelit', en: 'Retro Games' } },
      { id: 'lautapelit-konsolit', nimi: { fi: 'Lautapelit', en: 'Board Games' } },
    ],
  },
  {
    id: 'instrumentit',
    nimi: { fi: 'Musiikki-instrumentit', en: 'Musical Instruments' },
    kuvaus: 'Soittimet ja musiikkivarusteet',
    alakategoriat: [
      { id: 'kitarat', nimi: { fi: 'Kitarat', en: 'Guitars' } },
      { id: 'pianot', nimi: { fi: 'Pianot & koskettimet', en: 'Pianos & Keys' } },
      { id: 'rummut', nimi: { fi: 'Rummut', en: 'Drums' } },
      { id: 'puhaltimet', nimi: { fi: 'Puhaltimet', en: 'Wind Instruments' } },
      { id: 'musiikki-varusteet', nimi: { fi: 'Varusteet & efektit', en: 'Gear & Effects' } },
    ],
  },
  {
    id: 'muu',
    nimi: { fi: 'Muut', en: 'Other' },
    kuvaus: 'Kaikki muu',
    alakategoriat: [],
  },
]

export type Lang = 'fi' | 'en'

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
