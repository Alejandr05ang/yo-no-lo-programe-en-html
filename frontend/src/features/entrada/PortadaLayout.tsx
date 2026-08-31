import type { ReactNode } from 'react'
import './portada.css'

interface Props {
  /** Cifras del pie del panel oscuro: [valor, etiqueta]. */
  cifras?: [string, string][]
  /** true = contenido del lado derecho centrado (bienvenidas). false = alineado (formulario). */
  centrado?: boolean
  /** Lado derecho (voz humana). */
  children: ReactNode
}

const CIFRAS_DEFECTO: [string, string][] = [
  ['10', 'sesiones'],
  ['11', 'encargos'],
  ['1', 'URL real'],
]

// Layout de portada (pantallas 1f y bienvenida diaria): panel oscuro "voz máquina" a
// la izquierda con la promesa del taller; contenido "voz humana" a la derecha.
export function PortadaLayout({ cifras = CIFRAS_DEFECTO, centrado = false, children }: Props) {
  return (
    <div className="portada">
      <div className="portada-hero">
        <div className="portada-kicker mono">Taller de desarrollo web · Cohorte 2026-B</div>
        <h1 className="portada-titulo">
          Dos semanas.
          <br />
          Un portafolio
          <br />
          publicado.
        </h1>
        <p className="portada-lead">
          No vas a escribir HTML a mano. Vas a escribir el código que lo construye, y al final va a
          estar en internet con tu nombre y una dirección que puedes compartir.
        </p>
        <div className="portada-cifras">
          {cifras.map(([valor, etiqueta]) => (
            <div key={etiqueta}>
              <div className="portada-cifra">{valor}</div>
              <div className="portada-cifra-etq mono">{etiqueta}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={`portada-panel${centrado ? ' portada-panel--centrado' : ''}`}>{children}</div>
    </div>
  )
}
