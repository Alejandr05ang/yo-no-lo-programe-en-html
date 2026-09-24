import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import { JoinClassForm } from '../auth/OnboardingForms'
import { ApiError } from '../../lib/http'
import { numeroFromChallengeKey } from '../../lib/challengeIdentity'
import {
  accionDelDia,
  estadoDeActividad,
  estadoDelDia,
  ETIQUETA_DIA,
  motivoCerrado,
  textoProgreso,
  type Acceso,
  type EstadoProgreso,
  type ProgresoDia,
} from '../../lib/estadoTaller'
import { rutaActividad, rutaEntradaDia } from '../../lib/navegacionActividades'
import './mapa.css'

interface ChallengeTeaser {
  id: string; key: string; title: string; teaser_summary: string
  kind: 'core' | 'platinum' | 'manual'; unlocked: boolean
  required?: boolean; progress_status?: EstadoProgreso
}
interface SessionTeaser {
  id: string; code: string; day_number: number; order_index: number; title: string; teaser_summary: string
  state: 'done' | 'active' | 'future'
  // Campos nuevos del backend. Si faltan (backend anterior), se deducen de state.
  access?: Acceso; is_current?: boolean; progress?: ProgresoDia
  challenges: ChallengeTeaser[]
}
interface MapView { cohort_id: string; cohort_name: string; sessions: SessionTeaser[] }

function isMap(value: unknown): value is MapView {
  if (!value || typeof value !== 'object' || !('sessions' in value) || !Array.isArray(value.sessions)) return false
  return value.sessions.every((session) => session && typeof session === 'object' && 'code' in session && 'state' in session && 'challenges' in session && Array.isArray(session.challenges))
}

/** Normaliza un día: con un backend anterior no llegan access/is_current/progress. */
function comoDia(s: SessionTeaser) {
  const access: Acceso = s.access ?? (s.state === 'future' ? 'locked' : 'open')
  const is_current = s.is_current ?? s.state === 'active'
  const progress: ProgresoDia = s.progress ?? {
    required_total: s.challenges.filter((c) => c.required !== false).length,
    accepted: s.challenges.filter((c) => c.progress_status === 'accepted' && c.required !== false).length,
    started: s.challenges.filter((c) => (c.progress_status === 'draft' || c.progress_status === 'in_progress') && c.required !== false).length,
  }
  return { access, is_current, progress }
}

/**
 * Una actividad dentro de la celda del día. Solo es un enlace si el día está
 * abierto y el reto desbloqueado; si no, es texto con su estado escrito.
 */
function Actividad({ reto, diaAbierto }: { reto: ChallengeTeaser; diaAbierto: boolean }) {
  const numero = numeroFromChallengeKey(reto.key)
  const estado = estadoDeActividad(reto.progress_status)
  const cuerpo = <>
    <strong>{reto.title}</strong>
    <small>{estado.etiqueta}</small>
  </>
  if (diaAbierto && reto.unlocked && numero !== null) {
    return <Link className="mapa-reto mapa-reto--abierto" to={rutaActividad(numero)} data-progreso={reto.progress_status ?? 'not_started'}>
      {cuerpo}
      <span className="tag tag-outline mono">{estado.accion.toLowerCase()}</span>
    </Link>
  }
  return <div className="mapa-reto" aria-disabled="true" data-progreso={reto.progress_status ?? 'not_started'}>
    {cuerpo}
    <span className="tag tag-neutral mono">{diaAbierto ? 'bloqueada' : 'cerrada'}</span>
  </div>
}

export function MapaReal() {
  const { api } = useAuth()
  const [map, setMap] = useState<MapView | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Sin clase no hay mapa que enseñar, pero tampoco es un error del alumno: es el
  // paso que le falta. Se distingue para poder ofrecerle unirse aquí mismo.
  const [faltaClase, setFaltaClase] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        if (!api) return
        const response = await api.request<unknown>('/map', { signal: controller.signal })
        if (!isMap(response)) throw new Error('invalid map')
        setMap(response)
        setFaltaClase(false)
        setError(null)
      } catch (failure) {
        if (controller.signal.aborted) return
        if (failure instanceof ApiError && failure.code === 'NOT_COHORT_MEMBER') {
          setFaltaClase(true)
          setError(null)
          return
        }
        setError(friendlyAuthError(failure))
      }
    })()
    return () => controller.abort()
  }, [api, intento])

  if (faltaClase) {
    return <AccountFrame>
      <div className="kicker">Tu clase</div>
      <h1>Únete a tu clase</h1>
      <p>
        Escribe el código que te dio tu docente. Al hacerlo verás el mapa del taller y
        los encargos que ya estén abiertos.
      </p>
      <JoinClassForm onUnido={() => { setFaltaClase(false); setIntento((n) => n + 1) }} />
      <p className="text-muted">
        ¿Todavía no tienes código? Puedes practicar mientras tanto en <Link to="/demo">la demo</Link>.
      </p>
    </AccountFrame>
  }

  const hoy = map?.sessions.find((s) => comoDia(s).is_current)
  const hoyAbierto = hoy && comoDia(hoy).access === 'open'

  return <AccountFrame>
    <div className="kicker">Mapa del taller</div>
    <h1>{map?.cohort_name ?? 'Tu recorrido'}</h1>
    {error && <p className="auth-message" role="alert">{error}</p>}
    {!map && !error && <p role="status">Cargando el mapa…</p>}

    {map && !hoy && <p className="text-muted">
      Tu docente todavía no ha abierto ningún día. Mientras tanto puedes practicar en <Link to="/demo">la demo</Link>.
    </p>}
    {hoy && <div className="mapa-hoy">
      <p>
        <span className="tag tag-accent">Hoy</span>{' '}
        Día {hoy.day_number} · <strong>{hoy.title}</strong>
        {' — '}{textoProgreso(comoDia(hoy).progress)}
      </p>
      {hoyAbierto
        ? <Link className="btn btn-primary" to={rutaEntradaDia(hoy.code)}>
            {{ Entrar: 'Entrar al día de hoy', Continuar: 'Continuar con el día de hoy', Revisar: 'Revisar el día de hoy' }[accionDelDia(comoDia(hoy)) ?? 'Entrar']}
          </Link>
        : <p className="text-muted">{motivoCerrado(comoDia(hoy))}</p>}
    </div>}

    {map && <ol className="mapa-calendario mapa-real" aria-label="Días del taller">
      {map.sessions.map((session) => {
        const dia = comoDia(session)
        const estado = estadoDelDia(dia)
        const accion = accionDelDia(dia)
        const motivo = motivoCerrado(dia)
        const abierto = dia.access === 'open'
        return <li
          className="mapa-celda"
          data-estado={estado}
          key={session.id}
          aria-current={dia.is_current ? 'step' : undefined}
        >
          <div className="mapa-celda-cod mono">Día {session.day_number} · {session.code}</div>
          <h2 className="mapa-celda-tema">{session.title}</h2>
          <p className="mapa-celda-pieza">{session.teaser_summary}</p>
          <div className="mapa-celda-tag">
            {/* El estado se dice con palabras, no solo con el color de la celda. */}
            <span className={estado === 'hoy' ? 'tag tag-accent' : estado === 'pausado' || estado === 'bloqueado' ? 'tag tag-neutral' : 'tag tag-outline'}>
              {estado === 'pausado' && <span aria-hidden="true">⏸ </span>}
              {ETIQUETA_DIA[estado]}
            </span>
            {dia.is_current && estado !== 'hoy' && <span className="tag tag-accent">Hoy</span>}
          </div>
          {abierto && <div className="mapa-progreso">
            <span>{textoProgreso(dia.progress)}</span>
            {dia.progress.required_total > 0 && <span
              className="mapa-progreso-barra"
              aria-hidden="true"
              style={{ '--pct': `${Math.round((dia.progress.accepted / dia.progress.required_total) * 100)}%` } as CSSProperties}
            />}
          </div>}
          {accion
            ? <Link className="btn btn-primary mapa-entrar" to={rutaEntradaDia(session.code)}>
                {accion}<span className="sr-only"> · Día {session.day_number}, {session.title}</span>
              </Link>
            : <p className="mapa-entrar mapa-entrar--bloqueado">{motivo}</p>}
          {session.challenges.length > 0 && <div className="mapa-retos">
            {session.challenges.map((challenge) => <Actividad key={challenge.id} reto={challenge} diaAbierto={abierto} />)}
          </div>}
        </li>
      })}
    </ol>}
  </AccountFrame>
}
