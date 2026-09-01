'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const light = {
  bg: '#F8FAF8', surface: '#F0F4F0', surface2: '#E8EEE8',
  border: '#D4DDD4', text: '#0A1A0E', textSub: '#3D5442', muted: '#6B8070',
  accent: '#1B6B3A', accentBright: '#2ECC71', accentLight: '#E8F5EE',
  red: '#DC2626', cardBg: '#FFFFFF', navBg: '#FFFFFF', dim: '#C4D4C8',
  // Semanttinen "odottaa/varoitus"-väri - aiemmin kovakoodattu rgba(245,158,11,...) eri
  // kohdissa (esim. tilausten "stalled"-ilmoitus), nyt osa väriteemaa (ks. visuaalinen
  // uudistus 2026-08-31). warnLight on badge-/laatikkotausta samaan tapaan kuin accentLight.
  warn: '#B26B12', warnLight: '#FBF0DE',
}

const dark = {
  bg: '#070F09', surface: '#0D1A10', surface2: '#132018',
  border: '#1E3324', text: '#E8F5EE', textSub: '#9DBFA8', muted: '#5A7A65',
  accent: '#2ECC71', accentBright: '#4ADE80', accentLight: '#0D2818',
  red: '#EF4444', cardBg: '#0D1A10', navBg: '#070F09', dim: '#1E3324',
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
