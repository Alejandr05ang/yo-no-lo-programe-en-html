import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import { numeroFromChallengeKey } from '../../lib/challengeIdentity'
import { ApiError } from '../../lib/http'
import './mapa.css'

interface Encargo {
  id: string; key: string; title: string; teaser_summary: string
  kind: 'core' | 'platinum' | 'manual'; unlocked: boolean; instructions: string
}
interface Sesion {
  id: string; code: string; day_number: number; order_index: number
  title: string; description: string; teaser_summary: string
  challenges: Encargo[]; preview: boolean
}

/**
 * Una sesión del taller. Existe como página propia porque una sesión es una cosa
 * que se abre, no una lista de encargos: cuando no tiene ninguno —el día de
 * diagnóstico, por ejemplo— seguía siendo inalcanzable desde el mapa.
 */
export function SesionPage() {
  const { codigo } = useParams()
  const { api } = useAuth()
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bloqueada, setBloqueada] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        if (!api || !codigo) return
        const r = await api.request<Sesion>(`/map/sessions/${encodeURIComponent(codigo)}`, { signal: controller.signal })
        setSesion(r)
        setBloqueada(false)
        setError(null)
      } catch (failure) {
        if (controller.signal.aborted) return
        if (failure instanceof ApiError && failure.code === 'SESSION_LOCKED') {
          setBloqueada(true)
          setError(null)
          return
        }
        setError(friendlyAuthError(failure))
      }
    })()
    return () => controller.abort()
  }, [api, codigo])

  if (bloqueada) {
    return <AccountFrame>
      <div className="kicker">Taller</div>
      <h1>Todavía no está abierto</h1>
      <p>
        Tu docente aún no ha abierto este día. Cuando lo haga aparecerá en tu mapa y
        podrás entrar.
      </p>
      <Link className="btn btn-primary" to="/mapa">Volver al mapa</Link>
    </AccountFrame>
  }

  return <AccountFrame>
    <Link to="/mapa" className="ses-volver">← Volver al mapa</Link>
    {error && <p className="auth-message" role="alert">{error}</p>}
    {!sesion && !error && <p role="status">Cargando la sesión…</p>}
    {sesion && <>
      <div className="kicker">Día {sesion.day_number} · {sesion.code}</div>
      <h1>{sesion.title}</h1>
      {sesion.preview && <p className="tag tag-accent">Vista previa de docente</p>}
      <p>{sesion.description || sesion.teaser_summary}</p>

      <h2>Encargos</h2>
      {sesion.challenges.length === 0
        ? <p className="text-muted">
            No hay actividades asignadas todavía. Este día se trabaja en clase; cuando
            haya encargos aparecerán aquí.
          </p>
        : <div className="ses-encargos">
            {sesion.challenges.map((e) => {
              const numero = numeroFromChallengeKey(e.key)
              return <article className="card" key={e.id}>
                <div className="card-kicker">{e.kind === 'platinum' ? 'Platino' : 'Encargo'}</div>
                <h3 className="card-title">{e.title}</h3>
                <p className="card-body">{e.teaser_summary}</p>
                {numero !== null
                  ? <Link className="btn btn-primary" to={`/portafolio?e=${numero}`}>Abrir encargo</Link>
                  : <span className="text-muted">Se trabaja en clase.</span>}
              </article>
            })}
          </div>}
    </>}
  </AccountFrame>
}
