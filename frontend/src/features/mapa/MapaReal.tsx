import { useEffect, useState } from 'react'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import './mapa.css'

interface ChallengeTeaser { id: string; key: string; title: string; teaser_summary: string; kind: 'core' | 'platinum' | 'manual'; unlocked: boolean }
interface SessionTeaser { id: string; code: string; day_number: number; order_index: number; title: string; teaser_summary: string; state: 'done' | 'active' | 'future'; challenges: ChallengeTeaser[] }
interface MapView { cohort_id: string; cohort_name: string; sessions: SessionTeaser[] }

function isMap(value: unknown): value is MapView {
  if (!value || typeof value !== 'object' || !('sessions' in value) || !Array.isArray(value.sessions)) return false
  return value.sessions.every((session) => session && typeof session === 'object' && 'code' in session && 'state' in session && 'challenges' in session && Array.isArray(session.challenges))
}

export function MapaReal() {
  const { api } = useAuth()
  const [map, setMap] = useState<MapView | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        if (!api) return
        const response = await api.request<unknown>('/map', { signal: controller.signal })
        if (!isMap(response)) throw new Error('invalid map')
        setMap(response)
      } catch (failure) {
        if (!controller.signal.aborted) setError(friendlyAuthError(failure))
      }
    })()
    return () => controller.abort()
  }, [api])

  return <AccountFrame>
    <div className="kicker">Mapa del taller</div>
    <h1>{map?.cohort_name ?? 'Tu recorrido'}</h1>
    {error && <p className="auth-message" role="alert">{error}</p>}
    {!map && !error && <p role="status">Cargando el mapa…</p>}
    {map && <div className="mapa-calendario mapa-real">
      {map.sessions.map((session) => <section className="mapa-celda" data-estado={session.state === 'active' ? 'hoy' : session.state === 'done' ? 'hecho' : 'cerrado'} key={session.id}>
        <div className="mapa-celda-cod mono">Día {session.day_number} · {session.code}</div>
        <div className="mapa-celda-tema">{session.title}</div>
        <p className="mapa-celda-pieza">{session.teaser_summary}</p>
        <div className="mapa-celda-tag"><span className={session.state === 'active' ? 'tag tag-accent mono' : 'tag tag-outline mono'}>{session.state === 'active' ? 'hoy' : session.state === 'done' ? 'hecho' : 'próximo'}</span></div>
        {session.challenges.map((challenge) => <div className="mapa-reto-txt" key={challenge.id}><strong>{challenge.title}</strong><small>{challenge.teaser_summary}</small><span className="mono">{challenge.unlocked ? ' abierto' : ' teaser'}</span></div>)}
      </section>)}
    </div>}
  </AccountFrame>
}
