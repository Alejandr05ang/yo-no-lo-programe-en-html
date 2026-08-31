import { useEffect, useState } from 'react'
import { BetaTag } from '../../components/Beta'
import { API_DOCS } from '../../lib/apiDocs'
import type { Encargo } from '../../lib/tipos'
import { FichaHerramienta } from './FichaHerramienta'

interface Props {
  encargo: Encargo
  abierto: boolean
  onToggle: () => void
  onPedirPista?: () => void
}

function formatoMinutos(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Columna izquierda de la pantalla 1a: el encargo como nota del cliente, en prosa,
// sin vocabulario técnico. La incógnita ("cuántos hobbies") es lo que fuerza el bucle
// (brief §2.2). Aquí no se dice "usa un for".
// Es colapsable: la vista previa del portafolio es la pieza protagonista y el encargo
// no debe robarle ancho de forma permanente.
export function PanelEncargo({ encargo, abierto, onToggle, onPedirPista }: Props) {
  const [restante, setRestante] = useState(encargo.pistaDisponibleEn ?? 0)
  const [ficha, setFicha] = useState<{ nombre: string; anclaEl: HTMLElement } | null>(null)

  useEffect(() => {
    setRestante(encargo.pistaDisponibleEn ?? 0)
    if (!encargo.pistaDisponibleEn) return
    const t = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [encargo.pistaDisponibleEn])

  const pistaBloqueada = restante > 0
  const numero = String(encargo.numero).padStart(2, '0')

  if (!abierto) {
    return (
      <div className="enc-rail">
        <button
          className="enc-toggle"
          onClick={onToggle}
          aria-expanded={false}
          aria-label="Abrir el encargo"
          title="Abrir el encargo"
        >
          ›
        </button>
        <span className="enc-rail-label">Encargo {numero} · {encargo.titulo}</span>
      </div>
    )
  }

  return (
    <section className="ve-col-encargo">
      <div className="enc-cab">
        <div className="card-kicker">
          Encargo {numero} · {encargo.desbloqueadoTexto}
        </div>
        <button
          className="enc-toggle"
          onClick={onToggle}
          aria-expanded
          aria-label="Colapsar el encargo"
          title="Colapsar el encargo"
        >
          ‹
        </button>
      </div>
      <h3 style={{ margin: 0 }}>
        {encargo.titulo}
        {encargo.esBorrador && (
          <>
            {' '}
            <BetaTag>encargo de ejemplo</BetaTag>
          </>
        )}
      </h3>
      <hr className="hr" style={{ margin: 'var(--space-1) 0 var(--space-2)' }} />

      {encargo.parrafos.map((p, i) => (
        <p key={i} className="enc-parrafo">
          {p}
        </p>
      ))}

      <div className="enc-herramientas">
        <div className="kicker">Herramientas disponibles</div>
        <div className="enc-tags">
          {encargo.herramientas.map((h) => {
            const tieneDoc = !!API_DOCS[h.nombre]
            const activa = ficha?.nombre === h.nombre
            return (
              <button
                key={h.nombre}
                type="button"
                className={`tag mono enc-tag ${h.nuevaHoy ? 'tag-accent' : 'tag-neutral'}`}
                aria-pressed={activa}
                disabled={!tieneDoc}
                title={tieneDoc ? 'Ver cómo se usa' : undefined}
                onClick={(e) =>
                  setFicha(activa ? null : { nombre: h.nombre, anclaEl: e.currentTarget })
                }
              >
                {h.nuevaHoy ? `nuevo hoy: ${h.nombre}` : h.nombre}
              </button>
            )
          })}
        </div>
      </div>

      {ficha && (
        <FichaHerramienta
          nombre={ficha.nombre}
          anclaEl={ficha.anclaEl}
          onCerrar={() => setFicha(null)}
          onIrA={(n) => setFicha((f) => (f ? { ...f, nombre: n } : f))}
        />
      )}

      <div className="enc-pie">
        <span className="mono enc-pista-contador">
          {pistaBloqueada ? `Pista disponible en ${formatoMinutos(restante)}` : 'Pista disponible'}
        </span>
        <button
          className="btn btn-secondary"
          style={{ marginLeft: 'auto' }}
          disabled={pistaBloqueada}
          onClick={onPedirPista}
        >
          Pedir pista
        </button>
      </div>
    </section>
  )
}
