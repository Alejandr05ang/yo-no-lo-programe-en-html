import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BetaBanner } from '../../components/Beta'
import { ControlesMusica } from '../musica/ControlesMusica'
import { COHORTE } from '../../lib/cohorte'
import './bitacora.css'

const COMPRENSION = [
  'Explica y generaliza',
  'Explica con ayuda',
  'No puede explicar su propio código',
]

// Pantalla 1d — Dashboard del instructor. Avance de la cohorte, señales de riesgo
// (derivadas, no notas — brief §2.5, §5.7) y registro de checkpoints orales.
//
// EXCLUSIVA PARA INSTRUCTORES. Sin control de rol todavía: en producción esta ruta
// va detrás de un rol `instructor`. Los datos son de ejemplo (no hay cohorte en dev).
export function Bitacora() {
  const [comprension, setComprension] = useState(1)
  const [nota, setNota] = useState(COHORTE.checkpointEnCurso.nota)
  const [registrado, setRegistrado] = useState(false)

  return (
    <div className="bit">
      <nav className="nav bit-nav">
        <span className="nav-brand">
          Taller<span style={{ color: 'var(--color-accent)' }}> · </span>Instructor
        </span>
        <span className="tag tag-outline mono">
          {COHORTE.nombre} · {COHORTE.estudiantes} estudiantes
        </span>
        <span className="bit-nav-sep" />
        <a href="#" aria-current="page">Avance</a>
        <a href="#">Checkpoints</a>
        <NavLink to="/mapa">Calendario</NavLink>
        <a href="#">Parejas</a>
        <ControlesMusica />
      </nav>

      <BetaBanner>
        La cohorte, los estudiantes, los intentos y las señales son ficticios. Con el backend,
        esta pantalla mostrará la cohorte real.
      </BetaBanner>

      <div className="bit-grid">
        <div className="bit-main">
          <div className="bit-cab">
            <h3>{COHORTE.encargoTitulo}</h3>
            <span className="mono bit-actualizado">actualizado {COHORTE.actualizado}</span>
          </div>

          <div className="bit-metricas">
            {COHORTE.metricas.map((m) => (
              <div key={m.kicker} className={`card bit-metrica ${m.alerta ? 'bit-metrica-alerta' : ''}`}>
                <div className="card-kicker">{m.kicker}</div>
                <div className="bit-metrica-valor">{m.valor}</div>
                <div className="card-meta">{m.meta}</div>
              </div>
            ))}
          </div>

          <div className="bit-tabla-scroll">
            <table className="table bit-tabla">
              <thead>
                <tr>
                  <th>Pareja</th>
                  <th>Estudiante</th>
                  <th>Base previa</th>
                  <th>Casos ocultos</th>
                  <th>Intentos</th>
                  <th>Checkpoint oral</th>
                  <th>Señal</th>
                </tr>
              </thead>
              <tbody>
                {COHORTE.filas.map((f, i) => (
                  <tr key={i}>
                    <td className="mono">{f.pareja}</td>
                    <td>{f.estudiante}</td>
                    <td className="text-muted">{f.basePrevia}</td>
                    <td className="mono">{f.casosOcultos}</td>
                    <td className="mono">{f.intentos}</td>
                    <td>
                      <span className={`tag mono ${f.checkpoint.ok ? 'tag-accent' : 'tag-outline'}`}>
                        {f.checkpoint.texto}
                      </span>
                    </td>
                    <td>
                      {f.senal ? (
                        <span className={`tag mono ${f.senal.alerta ? 'tag-outline' : 'tag-accent'}`}>
                          {f.senal.texto}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="bit-lateral">
          <div className="card-kicker">Checkpoint oral · 3 min</div>
          <h4 style={{ margin: 0 }}>{COHORTE.checkpointEnCurso.estudiante}</h4>

          <div className="field">
            <label htmlFor="bit-nota">¿Qué hace tu código y por qué?</label>
            <textarea
              id="bit-nota"
              className="input"
              style={{ minHeight: 74 }}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          <div>
            <div className="field" style={{ marginBottom: 'var(--space-2)' }}>
              <label>Comprensión</label>
            </div>
            <div className="bit-radios">
              {COMPRENSION.map((c, i) => (
                <label className="radio" key={c}>
                  <input
                    type="radio"
                    name="ck"
                    checked={comprension === i}
                    onChange={() => setComprension(i)}
                  />
                  <span className="dot" />
                  {c}
                </label>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={() => setRegistrado(true)}
            disabled={registrado}
          >
            {registrado ? 'Checkpoint registrado' : 'Registrar checkpoint'}
          </button>

          <hr className="hr" />

          <div className="card-kicker">Sugerido por el sistema</div>
          <p className="bit-sugerencia">{COHORTE.sugerencia.texto}</p>
          <button className="btn btn-secondary btn-block">{COHORTE.sugerencia.accion}</button>
        </aside>
      </div>
    </div>
  )
}
