import type { ResultadoRevision } from '../../lib/tipos'

interface Props {
  resultado: ResultadoRevision | null
}

// Columna derecha, abajo: revisión automática. Muestra pasa/falla por caso y el
// conteo agregado. El texto recuerda que los casos ocultos cambian de tamaño en
// cada corrida y que no se entrega la solución (brief §2.3, §5.4).
export function PanelRevision({ resultado }: Props) {
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
      <p className="rev-nota">{resultado.nota}</p>
    </div>
  )
}
