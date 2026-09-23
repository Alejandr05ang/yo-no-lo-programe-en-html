import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { API_DOCS } from '../../lib/apiDocs'

interface Props {
  /** Clave del catálogo (= texto del tag). */
  nombre: string
  /** El tag que abrió la ficha, para posicionarla al lado. */
  anclaEl: HTMLElement
  onCerrar: () => void
  onIrA: (nombre: string) => void
}

const MARGEN = 12

// Ficha de documentación de una herramienta — popup flotante (position: fixed) que se
// abre al lado del tag, para no apretujarse en la columna estrecha del encargo.
// Estilo "voz máquina", como las fichas de The Farmer Was Replaced.
export function FichaHerramienta({ nombre, anclaEl, onCerrar, onIrA }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 })

  useLayoutEffect(() => {
    const colocar = () => {
      const el = ref.current
      if (!el) return
      const a = anclaEl.getBoundingClientRect()
      const w = el.offsetWidth
      const h = el.offsetHeight
      let left = a.right + 8
      if (left + w > window.innerWidth - MARGEN) {
        left = a.left - w - 8
        if (left < MARGEN) left = Math.max(MARGEN, window.innerWidth - w - MARGEN)
      }
      let top = a.top
      if (top + h > window.innerHeight - MARGEN) top = window.innerHeight - h - MARGEN
      if (top < MARGEN) top = MARGEN
      setPos({ left, top })
    }
    colocar()

    let raf = 0
    const reColocar = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(colocar)
    }
    window.addEventListener('scroll', reColocar, true)
    window.addEventListener('resize', reColocar)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', reColocar, true)
      window.removeEventListener('resize', reColocar)
    }
  }, [nombre, anclaEl])

  // Cerrar con Escape o clic afuera (no en la ficha ni en el tag ancla).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    const onFuera = (e: PointerEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anclaEl.contains(t)) return
      onCerrar()
    }
    const id = setTimeout(() => document.addEventListener('pointerdown', onFuera), 0)
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(id)
      document.removeEventListener('pointerdown', onFuera)
      window.removeEventListener('keydown', onKey)
    }
  }, [onCerrar, anclaEl])

  const doc = API_DOCS[nombre]
  if (!doc) return null

  return (
    <div
      ref={ref}
      className="enc-ficha"
      role="dialog"
      aria-label={`Ayuda: ${nombre}`}
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="enc-ficha-cab">
        <code className="enc-ficha-firma">{doc.firma}</code>
        <button className="enc-ficha-x" onClick={onCerrar} aria-label="Cerrar la ayuda">
          ×
        </button>
      </div>

      <p className="enc-ficha-desc">{doc.descripcion}</p>

      {doc.devuelve && (
        <p className="enc-ficha-devuelve">
          <span>devuelve</span> {doc.devuelve}
        </p>
      )}

      <div className="enc-ficha-ejemplo-titulo">ejemplo</div>
      <pre className="enc-ficha-ejemplo">{doc.ejemplo}</pre>

      {doc.relacionadas && doc.relacionadas.length > 0 && (
        <div className="enc-ficha-rel">
          relacionadas:{' '}
          {doc.relacionadas.map((r, i) => (
            <span key={r}>
              {i > 0 && ' · '}
              <button className="enc-ficha-rel-link" onClick={() => onIrA(r)}>
                {r}
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
