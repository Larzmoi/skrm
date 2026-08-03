import fi from './fi'
import en from './en'
import sv from './sv'

export type Lang = 'fi' | 'en'
export type Translations = typeof fi

export const translations: Record<string, typeof fi> = { fi, en, sv }

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

export default fi
