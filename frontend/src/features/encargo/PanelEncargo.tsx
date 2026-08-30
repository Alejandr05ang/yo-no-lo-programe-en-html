import { useEffect, useState } from 'react'
import type { Encargo } from '../../lib/tipos'

interface Props {
  encargo: Encargo
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
export function PanelEncargo({ encargo, onPedirPista }: Props) {
  const [restante, setRestante] = useState(encargo.pistaDisponibleEn ?? 0)

  useEffect(() => {
    setRestante(encargo.pistaDisponibleEn ?? 0)
    if (!encargo.pistaDisponibleEn) return
    const t = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [encargo.pistaDisponibleEn])

  const pistaBloqueada = restante > 0

  return (
    <section className="ve-col-encargo">
      <div className="card-kicker">
        Encargo {String(encargo.numero).padStart(2, '0')} · {encargo.desbloqueadoTexto}
      </div>
      <h3 style={{ margin: 0 }}>{encargo.titulo}</h3>
      <hr className="hr" style={{ margin: 'var(--space-1) 0 var(--space-2)' }} />

      {encargo.parrafos.map((p, i) => (
        <p key={i} className="enc-parrafo">
          {p}
        </p>
      ))}

      <div className="enc-herramientas">
        <div className="kicker">Herramientas disponibles</div>
        <div className="enc-tags">
          {encargo.herramientas.map((h) => (
            <span
              key={h.nombre}
              className={`tag mono ${h.nuevaHoy ? 'tag-accent' : 'tag-neutral'}`}
            >
              {h.nuevaHoy ? `nuevo hoy: ${h.nombre}` : h.nombre}
            </span>
          ))}
        </div>
      </div>

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
