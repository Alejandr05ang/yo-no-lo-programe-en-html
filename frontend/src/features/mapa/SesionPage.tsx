import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import { numeroFromChallengeKey } from '../../lib/challengeIdentity'
import {
  estadoDeActividad,
  estadoDelDia,
  ETIQUETA_DIA,
  textoProgreso,
  type Acceso,
  type EstadoProgreso,
  type ProgresoDia,
} from '../../lib/estadoTaller'
import { ApiError } from '../../lib/http'
import { rutaActividad } from '../../lib/navegacionActividades'
import './mapa.css'

interface Encargo {
  id: string; key: string; title: string; teaser_summary: string
  kind: 'core' | 'platinum' | 'manual'; unlocked: boolean; instructions: string
  required?: boolean; progress_status?: EstadoProgreso
}
interface Sesion {
  id: string; code: string; day_number: number; order_index: number
  title: string; description: string; teaser_summary: string
  access?: Acceso; is_current?: boolean; progress?: ProgresoDia
  challenges: Encargo[]; preview: boolean
}

type Cierre = 'SESSION_LOCKED' | 'SESSION_PAUSED'

/**
 * Un día del taller. Existe como página propia porque un día es algo que se
 * abre, no una lista de encargos: cuando no tiene ninguno —el de diagnóstico,
 * por ejemplo— tiene que poder abrirse igual.
 */
export function SesionPage() {
  const { codigo } = useParams()
  const { api } = useAuth()
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cierre, setCierre] = useState<Cierre | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        if (!api || !codigo) return
        const r = await api.request<Sesion>(`/map/sessions/${encodeURIComponent(codigo)}`, { signal: controller.signal })
        setSesion(r)
        setCierre(null)
        setError(null)
      } catch (failure) {
        if (controller.signal.aborted) return
        if (failure instanceof ApiError && (failure.code === 'SESSION_LOCKED' || failure.code === 'SESSION_PAUSED')) {
          setCierre(failure.code)
          setError(null)
          return
        }
        setError(friendlyAuthError(failure))
      }
    })()
    return () => controller.abort()
  }, [api, codigo])

  if (cierre) {
    const pausado = cierre === 'SESSION_PAUSED'
    return <AccountFrame>
      <div className="kicker">Taller</div>
      <h1>{pausado ? 'Día pausado por tu docente' : 'Todavía no está abierto'}</h1>
      <p>
        {pausado
          ? 'Tu docente cerró este día por un momento. Tu progreso y tu código siguen guardados: cuando lo reabra, estarán exactamente como los dejaste.'
          : 'Tu docente aún no ha abierto este día. Cuando lo haga aparecerá en tu mapa y podrás entrar.'}
      </p>
      <Link className="btn btn-primary" to="/mapa">Volver al mapa</Link>
    </AccountFrame>
  }

  const progreso: ProgresoDia | null = sesion
    ? sesion.progress ?? { required_total: sesion.challenges.length, accepted: 0, started: 0 }
    : null
  const estado = sesion && progreso
    ? estadoDelDia({ access: sesion.access ?? 'open', is_current: !!sesion.is_current, progress: progreso })
    : null

  return <AccountFrame>
    <Link to="/mapa" className="ses-volver">← Volver al mapa</Link>
    {error && <p className="auth-message" role="alert">{error}</p>}
    {!sesion && !error && <p role="status">Cargando la sesión…</p>}
    {sesion && progreso && estado && <>
      <header className="ses-cabecera">
        <div className="kicker">Día {sesion.day_number} · {sesion.code}</div>
        <h1>{sesion.title}</h1>
        <div className="ses-estado">
          {sesion.preview
            ? <span className="tag tag-accent">Vista previa de docente</span>
            : <>
                <span className={estado === 'hoy' ? 'tag tag-accent' : 'tag tag-outline'}>{ETIQUETA_DIA[estado]}</span>
                {sesion.is_current && estado !== 'hoy' && <span className="tag tag-accent">Hoy</span>}
                <span>{textoProgreso(progreso)}</span>
              </>}
        </div>
        <p>{sesion.description || sesion.teaser_summary}</p>
      </header>

      <h2>Actividades</h2>
      {sesion.challenges.length === 0
        ? <p className="text-muted">
            No hay actividades asignadas en la plataforma. Este día se trabaja en clase;
            cuando haya encargos aparecerán aquí.
          </p>
        : <ol className="ses-lista">
            {sesion.challenges.map((e, i) => {
              const numero = numeroFromChallengeKey(e.key)
              const estadoActividad = estadoDeActividad(e.progress_status)
              return <li className="ses-actividad" key={e.id} data-progreso={e.progress_status ?? 'not_started'}>
                <span className="ses-actividad-num" aria-hidden="true">{i + 1}</span>
                <div className="ses-actividad-cuerpo">
                  <div className="card-kicker">
                    Actividad {i + 1} de {sesion.challenges.length}
                    {e.kind === 'platinum' ? ' · opcional' : ''}
                    {' · '}{sesion.preview ? 'vista previa' : estadoActividad.etiqueta}
                  </div>
                  <h3>{e.title}</h3>
                  <p>{e.teaser_summary}</p>
                </div>
                {e.unlocked && numero !== null
                  ? <Link className="btn btn-primary" to={rutaActividad(numero)}>
                      {sesion.preview ? 'Previsualizar' : estadoActividad.accion}
                      <span className="sr-only">: {e.title}</span>
                    </Link>
                  : <span className="text-muted ses-actividad-cerrada">
                      {e.unlocked ? 'Se trabaja en clase' : 'Aún no disponible'}
                    </span>}
              </li>
            })}
          </ol>}
    </>}
  </AccountFrame>
}
