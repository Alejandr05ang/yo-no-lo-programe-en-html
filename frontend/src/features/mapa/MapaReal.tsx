import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import { JoinClassForm } from '../auth/OnboardingForms'
import { ApiError } from '../../lib/http'
import { numeroFromChallengeKey } from '../../lib/challengeIdentity'
import './mapa.css'

interface ChallengeTeaser { id: string; key: string; title: string; teaser_summary: string; kind: 'core' | 'platinum' | 'manual'; unlocked: boolean }
interface SessionTeaser { id: string; code: string; day_number: number; order_index: number; title: string; teaser_summary: string; state: 'done' | 'active' | 'future'; challenges: ChallengeTeaser[] }
interface MapView { cohort_id: string; cohort_name: string; sessions: SessionTeaser[] }

function isMap(value: unknown): value is MapView {
  if (!value || typeof value !== 'object' || !('sessions' in value) || !Array.isArray(value.sessions)) return false
  return value.sessions.every((session) => session && typeof session === 'object' && 'code' in session && 'state' in session && 'challenges' in session && Array.isArray(session.challenges))
}

const ETIQUETA: Record<SessionTeaser['state'], string> = {
  done: 'completado',
  active: 'hoy',
  future: 'próximo',
}

/**
 * Una tarjeta de reto. Si está abierto es un enlace al encargo; si no, texto
 * inerte que dice por qué. Antes todas eran texto plano, así que /portafolio no
 * tenía ninguna entrada desde la aplicación.
 */
function Reto({ reto }: { reto: ChallengeTeaser }) {
  const numero = numeroFromChallengeKey(reto.key)
  const cuerpo = <>
    <strong>{reto.title}</strong>
    <small>{reto.teaser_summary}</small>
  </>

  if (reto.unlocked && numero !== null) {
    return <Link className="mapa-reto mapa-reto--abierto" to={`/portafolio?e=${numero}`}>
      {cuerpo}
      <span className="tag tag-outline mono">abrir</span>
    </Link>
  }
  return <div className="mapa-reto" aria-disabled="true">
    {cuerpo}
    <span className="tag tag-neutral mono">{reto.unlocked ? 'sin encargo' : 'bloqueado'}</span>
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

  const hoy = map?.sessions.find((s) => s.state === 'active')

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

  return <AccountFrame>
    <div className="kicker">Mapa del taller</div>
    <h1>{map?.cohort_name ?? 'Tu recorrido'}</h1>
    {error && <p className="auth-message" role="alert">{error}</p>}
    {!map && !error && <p role="status">Cargando el mapa…</p>}
    {map && !hoy && <p className="text-muted">
      Tu docente todavía no ha abierto ningún día. Mientras tanto puedes practicar en <Link to="/demo">la demo</Link>.
    </p>}
    {map && <div className="mapa-calendario mapa-real">
      {map.sessions.map((session) => <section
        className="mapa-celda"
        data-estado={session.state === 'active' ? 'hoy' : session.state === 'done' ? 'hecho' : 'cerrado'}
        key={session.id}
        aria-current={session.state === 'active' ? 'step' : undefined}
      >
        <div className="mapa-celda-cod mono">Día {session.day_number} · {session.code}</div>
        <div className="mapa-celda-tema">{session.title}</div>
        <p className="mapa-celda-pieza">{session.teaser_summary}</p>
        <div className="mapa-celda-tag">
          {/* El estado se dice con palabras, no solo con el color de la celda. */}
          <span className={session.state === 'active' ? 'tag tag-accent mono' : 'tag tag-outline mono'}>{ETIQUETA[session.state]}</span>
        </div>
        {/* Entrar en la sesión no depende de que tenga encargos: el día de
            diagnóstico no tiene ninguno y aun así hay que poder abrirlo. */}
        {session.state === 'future'
          ? <span className="mapa-entrar mapa-entrar--bloqueado">Se abrirá más adelante</span>
          : <Link className="btn btn-primary mapa-entrar" to={`/sesiones/${encodeURIComponent(session.code)}`}>
              Entrar<span className="sr-only"> a Día {session.day_number} · {session.title}</span>
            </Link>}
        {session.challenges.map((challenge) => <Reto key={challenge.id} reto={challenge} />)}
      </section>)}
    </div>}
  </AccountFrame>
}
