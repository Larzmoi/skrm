'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Lang, Translations, translations, LANGUAGES } from './i18n'

interface LangCtx {
  lang: Lang
  t: Translations
  setLang: (l: Lang) => void
  languages: typeof LANGUAGES
}

const LangContext = createContext<LangCtx>({
  lang: 'fi',
  t: translations.fi,
  setLang: () => {},
  languages: LANGUAGES,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fi')

  useEffect(() => {
    const saved = localStorage.getItem('habahub_lang')
    if (saved && translations[saved]) {
      setLangState(saved as Lang)
    } else {
      localStorage.removeItem('habahub_lang')
      setLangState('fi')
    }
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('habahub_lang', l)
  }

  const t = translations[lang] ?? translations.fi

  return (
    <LangContext.Provider value={{ lang, t, setLang, languages: LANGUAGES }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() { return useContext(LangContext) }
