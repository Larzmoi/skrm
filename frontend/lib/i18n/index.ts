import fi from './fi'
import en from './en'
import sv from './sv'

export type Lang = 'fi' | 'en' | 'sv'
export type Translations = typeof fi

export const translations: Record<string, typeof fi> = { fi, en, sv }

// SV oli täysin käännetty (ks. sv.ts) muttei koskaan lisätty tähän listaan, joten kielenvalitsin
// ei koskaan näyttänyt sitä valittavana vaihtoehtona — vahvistettu bugiksi mobiilitestauksessa
// 2026-09-01 ("kielenvaihto piilossa/rikki"). Käännöstyö oli jo tehty, vain aktivointi puuttui.
export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
]

export default fi
