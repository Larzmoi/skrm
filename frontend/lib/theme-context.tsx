'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Visuaalinen tyylipäivitys 2026-09-01 (ks. CLAUDE.md "Visuaalinen tyylipäivitys" -osio):
// brand-väri vaihtui metsänvihreästä/smaragdista limeen (#84cc16). Kaksi eri accent-roolia
// koska sama vaalea/kirkas lime EI toimi molemmissa käyttötavoissa yhtä aikaa:
//   - accent/accentBright: väri sellaisenaan TEKSTINÄ/ikonina/reunana sivun taustan päällä
//     (täytyy olla luettava sekä tummalla että vaalealla taustalla, siksi eri sävy per teema —
//     sama periaate kuin vanhalla metsänvihreällä paletilla oli jo, ei uusi konsepti)
//   - accentSolid/accentText: KIINTEÄ nappi-/badge-tausta, aina sama kirkas #84cc16 kummassakin
//     teemassa (aito brand-väri), aina yhdessä tumman accentTextin kanssa koska valkoinen
//     teksti kirkkaan limen päällä ei ole luettavissa
const light = {
  bg: '#F8FAFC', surface: '#FFFFFF', surface2: '#F1F5F9',
  border: '#E2E8F0', text: '#0F172A', textSub: '#475569', muted: '#94A3B8',
  accent: '#4D7C0F', accentBright: '#65A30D', accentLight: '#ECFCCB',
  accentSolid: '#84CC16', accentText: '#0C1400',
  red: '#DC2626', cardBg: '#FFFFFF', navBg: '#FFFFFF', dim: '#CBD5E1',
  // Semanttinen "odottaa/varoitus"-väri - aiemmin kovakoodattu rgba(245,158,11,...) eri
  // kohdissa (esim. tilausten "stalled"-ilmoitus), nyt osa väriteemaa (ks. visuaalinen
  // uudistus 2026-08-31). warnLight on badge-/laatikkotausta samaan tapaan kuin accentLight.
  warn: '#B26B12', warnLight: '#FBF0DE',
}

const dark = {
  bg: '#030303', surface: '#0E1217', surface2: '#161B22',
  border: '#1F252D', text: '#F1F5F9', textSub: '#94A3B8', muted: '#64748B',
  accent: '#84CC16', accentBright: '#A3E635', accentLight: '#1A2410',
  accentSolid: '#84CC16', accentText: '#0C1400',
  red: '#EF4444', cardBg: '#0E1217', navBg: '#030303', dim: '#1F252D',
  warn: '#F2A93B', warnLight: '#2B2110',
}

type Theme = 'light' | 'dark'
type C = typeof light
interface ThemeCtx { theme: Theme; C: C; toggle: () => void }
const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', C: dark, toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('habahub_theme') as Theme
    if (saved === 'light' || saved === 'dark') setTheme(saved)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('habahub_theme', next)
  }

  const C = theme === 'dark' ? dark : light

  useEffect(() => {
    document.body.style.background = C.bg
    document.body.style.color = C.text
  }, [C])

  return <ThemeContext.Provider value={{ theme, C, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() { return useContext(ThemeContext) }
