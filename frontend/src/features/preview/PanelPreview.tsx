import { useEffect, useMemo, useRef, useState } from 'react'

type Viewport = 'movil' | 'tablet' | 'escritorio' | 'completo'

const OPCIONES: { id: Viewport; etiqueta: string; ancho: number | null }[] = [
  { id: 'movil', etiqueta: 'Móvil', ancho: 375 },
  { id: 'tablet', etiqueta: 'Tablet', ancho: 768 },
  { id: 'escritorio', etiqueta: 'Escritorio', ancho: null }, // = ancho del panel
  { id: 'completo', etiqueta: 'Completo', ancho: 1280 },
]

interface Props {
  url: string
  /** HTML generado por el código del estudiante (viene de sandbox.ejecutarPreview). */
  html: string
  enVivo?: boolean
  expandido: boolean
  onToggleExpandir: () => void
}

// Columna derecha, arriba: barra de URL + selector de ancho + vista previa del portafolio.
// El portafolio se exporta y publica (brief §5.9): es un sitio responsive de verdad, así que
// el preview debe poder verse a ancho de móvil y a ancho completo, no solo al ancho del panel.
// El ancho del panel NO limita el ancho al que se renderiza: si el objetivo no cabe, se escala.
export function PanelPreview({ url, html, enVivo = true, expandido, onToggleExpandir }: Props) {
  const [vp, setVp] = useState<Viewport>('escritorio')
  const zonaRef = useRef<HTMLDivElement>(null)
  const [zona, setZona] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = zonaRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      setZona({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const anchoOpcion = OPCIONES.find((o) => o.id === vp)!.ancho
  const anchoObjetivo = anchoOpcion ?? (Math.round(zona.w) || 0)
  const escala = zona.w > 0 && anchoObjetivo > 0 ? Math.min(1, zona.w / anchoObjetivo) : 1

  const doc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;padding:18px;font:15px/1.6 "Lora",Georgia,serif;color:#201f1d;background:#fff}</style>
</head><body>${html}</body></html>`,
    [html],
  )

  return (
    <>
      <div className="pv-url">
        <span className="mono pv-url-campo">{url}</span>
        {enVivo && <span className="tag tag-accent mono">en vivo</span>}
        <button
          className="btn btn-secondary pv-expandir"
          onClick={onToggleExpandir}
          aria-pressed={expandido}
        >
          {expandido ? 'Salir' : 'Pantalla completa'}
        </button>
      </div>

      <div className="pv-controles">
        <div className="seg" role="radiogroup" aria-label="Ancho de la vista previa">
          {OPCIONES.map((o) => (
            <label className="seg-opt" key={o.id}>
              <input
                type="radio"
                name="pv-viewport"
                checked={vp === o.id}
                onChange={() => setVp(o.id)}
              />
              {o.etiqueta}
            </label>
          ))}
        </div>
        <span className="mono pv-medida">
          {anchoObjetivo ? `${anchoObjetivo} px` : ''}
          {escala < 1 && ` · ${Math.round(escala * 100)}%`}
        </span>
      </div>

      <div className="pv-zona" ref={zonaRef}>
        <iframe
          className="pv-marco"
          title="Vista previa del portafolio"
          sandbox="allow-scripts"
          srcDoc={doc}
          style={{
            width: `${anchoObjetivo || '100'}${anchoObjetivo ? 'px' : '%'}`,
            height: escala < 1 ? `${100 / escala}%` : '100%',
            transform: escala < 1 ? `scale(${escala})` : undefined,
            transformOrigin: 'top center',
          }}
        />
      </div>
    </>
  )
}
