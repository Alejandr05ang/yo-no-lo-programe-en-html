import type { ResultadoRevision } from '../../lib/tipos'

interface Props {
  resultado: ResultadoRevision | null
  /** true cuando el encargo pasó todos los casos. */
  aceptado: boolean
  /** Texto bajo el sello de aceptado (p. ej. "Pasando al siguiente encargo…"). */
  mensajeAceptado: string
}

// Columna derecha, abajo: revisión automática. Muestra pasa/falla por caso y el
// conteo agregado. El texto recuerda que los casos ocultos cambian de tamaño en
// cada corrida y que no se entrega la solución (brief §2.3, §5.4).
// Al aceptar (todos los casos en verde), la transición al siguiente encargo es
// automática — sin botón (docs/encargos.md §5.2).
export function PanelRevision({ resultado, aceptado, mensajeAceptado }: Props) {
  if (!resultado) {
    return (
      <div className="rev">
        <div className="rev-cab">
          <h5 style={{ margin: 0 }}>Revisión automática</h5>
        </div>
        <p className="rev-nota">Aún no has entregado este encargo a revisión.</p>
      </div>
    )
  }

  return (
    <div className="rev">
      <div className="rev-cab">
        <h5 style={{ margin: 0 }}>Revisión automática</h5>
        <span className="mono rev-contador">
          {resultado.casosPasados} / {resultado.casosTotales} casos
        </span>
      </div>
      <table className="table" style={{ fontSize: 13 }}>
        <tbody>
          {resultado.casos.map((c) => (
            <tr key={c.descripcion}>
              <td>{c.descripcion}</td>
              <td className="rev-celda-estado">
                <span
                  className={`tag mono ${c.estado === 'pasa' ? 'tag-accent' : 'tag-outline'}`}
                >
                  {c.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {aceptado ? (
        <div className="rev-aceptado">
          <span className="tag tag-accent mono">encargo aceptado</span>
          {mensajeAceptado && (
            <span className="rev-nota" style={{ margin: 0 }}>
              {mensajeAceptado}
            </span>
          )}
        </div>
      ) : (
        <p className="rev-nota">{resultado.nota}</p>
      )}
    </div>
  )
}
