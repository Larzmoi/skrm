'use client'
import { useTheme } from '@/lib/theme-context'

// Kiinteät taustagradientit koko sivustolle (ks. CLAUDE.md "Visuaalinen tyylipäivitys" ja
// landing.html-referenssi: "obsidian aura" tummalle teemalle, "lämmin alabasteri" -ruudukko
// vaalealle). Renderöidään kerran ClientLayoutissa, fixed+z-index:0 - sivujen oma sisältö ei
// enää tarvitse omaa täysin peittävää taustaväriä pysyäkseen luettavana, kunhan sen tausta ei
// ole eksplisiittisesti täysin peittävä (useimmat sivut käyttävät jo C.bg:tä joka on nyt lähes
// musta/lähes valkoinen, ei täysin peittävä este - gradientti jää näkyviin reunoihin/väleihin).
// Teemavalinta luetaan olemassa olevasta React-kontekstista (theme-context.tsx), ei erillistä
// CSS-ajettua [data-theme]-mekanismia - yksi totuuden lähde, ei hydraatioriskiä.
export default function BackgroundLayers() {
  const { theme } = useTheme()

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {theme === 'dark' ? (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #030303 0%, #111111 42%, #1c1c1c 72%, #090909 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 45% 55% at 68% 38%, rgba(161,161,170,0.16) 0%, transparent 65%)', mixBlendMode: 'multiply', filter: 'blur(18px)' }} />
          <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(132,204,22,0.1) 0%, rgba(3,3,3,0) 70%)' }} />
        </>
      ) : (
        <>
          <div style={{
            position: 'absolute', inset: 0, backgroundColor: '#F8FAFC',
            backgroundImage: 'radial-gradient(at 18% 12%, rgba(132,204,22,0.12) 0px, transparent 50%), radial-gradient(at 80% 20%, rgba(59,130,246,0.08) 0px, transparent 45%), radial-gradient(at 50% 80%, rgba(244,63,94,0.05) 0px, transparent 50%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, backgroundSize: '40px 40px',
            backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, #000 70%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, #000 70%, transparent 100%)',
          } as React.CSSProperties} />
        </>
      )}
    </div>
  )
}
