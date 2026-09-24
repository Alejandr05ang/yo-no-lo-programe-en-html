import { useEffect, useMemo, useRef, useState } from 'react'
import { analizarFlujo } from '../../lib/flujo'
import './flujo.css'

interface Props {
  /** El código actual del editor (portafolio.js) — nunca datos.js, que no tiene flujo propio. */
  codigo: string
  onCerrar: () => void
}

type Pestana = 'diagrama' | 'pseudocodigo'

let contadorInstancias = 0

// Vista de solo lectura del flujo de ejecución del código que el estudiante acaba de escribir
// (botón "Diagrama de flujo" en la consola del editor). Dos formas de la misma estructura,
// lado a lado con el código real como puente pedagógico: el diagrama (Mermaid, con rombos de
// decisión estilo PSeInt) y el pseudocódigo en español ("SI … ENTONCES", "PARA CADA … HACER").
// Nada acá es editable ni ejecuta nada — es una traducción sintáctica, ver lib/flujo.ts.
export function DiagramaFlujo({ codigo, onCerrar }: Props) {
  const [pestana, setPestana] = useState<Pestana>('diagrama')
  const [svg, setSvg] = useState<string | null>(null)
  const [errorRender, setErrorRender] = useState<string | null>(null)
  const idRef = useRef(`flujo-diagrama-${++contadorInstancias}`)

  const resultado = useMemo(() => analizarFlujo(codigo), [codigo])

  // Mermaid es pesado (SVG + parser propio): se carga solo cuando este panel se abre, no con
  // el bundle principal del editor.
  useEffect(() => {
    if (!resultado.ok) {
      setSvg(null)
      return
    }
    let cancelado = false
    setErrorRender(null)
    void (async () => {
      try {
        const { default: mermaid } = await import('mermaid')
        mermaid.initialize({
          startOnLoad: false,
          // Por defecto Mermaid deja de dibujar a las 500 flechas o 50 000 caracteres, con un
          // aviso en inglés; un portafolio largo pero normal no debe llegar a eso.
          maxEdges: 2000,
          maxTextSize: 200_000,
          theme: 'base',
          fontFamily: 'ui-monospace, Menlo, monospace',
          themeVariables: {
            background: '#191816',
            primaryColor: '#1f1d1b',
            primaryTextColor: '#d7d3d3',
            primaryBorderColor: '#e1ad66',
            lineColor: '#7d7979',
            secondaryColor: '#3a270d',
            tertiaryColor: '#151412',
            edgeLabelBackground: '#191816',
            fontSize: '13px',
          },
        })
        const { svg: salida } = await mermaid.render(idRef.current, resultado.mermaid)
        if (!cancelado) setSvg(salida)
      } catch {
        if (!cancelado) setErrorRender('No se pudo dibujar el diagrama de esta versión del código.')
      }
    })()
    return () => {
      cancelado = true
    }
  }, [resultado])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])

  return (
    <div className="dialog-backdrop flujo-backdrop" onClick={onCerrar}>
      <div
        className="flujo-dialog"
        role="dialog"
        aria-label="Diagrama de flujo de tu código"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flujo-cab">
          <div className="flujo-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={pestana === 'diagrama'}
              className="flujo-tab"
              onClick={() => setPestana('diagrama')}
            >
              Diagrama
            </button>
            <button
              role="tab"
              aria-selected={pestana === 'pseudocodigo'}
              className="flujo-tab"
              onClick={() => setPestana('pseudocodigo')}
            >
              Pseudocódigo
            </button>
          </div>
          <button className="flujo-x" onClick={onCerrar} aria-label="Cerrar el diagrama de flujo">
            ×
          </button>
        </div>

        <p className="flujo-nota">
          Así se lee el código que tienes escrito ahora mismo en portafolio.js: es solo para
          mirar, no se puede editar aquí.
        </p>

        <div className="flujo-cuerpo">
          {!resultado.ok && <p className="flujo-error">{resultado.error}</p>}

          {resultado.ok && pestana === 'pseudocodigo' && (
            <pre className="flujo-pseudo">{resultado.pseudocodigo}</pre>
          )}

          {resultado.ok && pestana === 'diagrama' && (
            <>
              {errorRender && <p className="flujo-error">{errorRender}</p>}
              {!errorRender && !svg && <p className="text-muted">Dibujando el diagrama…</p>}
              {!errorRender && svg && (
                <div className="flujo-svg" dangerouslySetInnerHTML={{ __html: svg }} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
