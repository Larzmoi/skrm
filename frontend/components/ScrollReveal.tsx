'use client'
import { useEffect, useRef, useState } from 'react'

// Uudelleenkäytettävä scroll-reveal-kääre (ks. CLAUDE.md "Visuaalinen tyylipäivitys").
// Kertakäyttöinen IntersectionObserver per instanssi - kun elementti on kerran tullut
// näkyviin, se pysyy näkyvänä (ei häivytä uudelleen pois kun scrollataan ohi), samaan
// tapaan kuin mockin oma "is-visible" jää päälle observerin havaittua sen kerran.
export default function ScrollReveal({ children, delay = 0, className = '', style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`reveal-on-scroll ${visible ? 'is-visible' : ''} ${className}`} style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}>
      {children}
    </div>
  )
}
