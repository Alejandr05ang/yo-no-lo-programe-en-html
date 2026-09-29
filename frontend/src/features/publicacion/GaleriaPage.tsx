import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import type { SitioDeGaleria } from '../../lib/publicacion'
import { AvatarPublicado } from './AvatarPublicado'
import './publicacion.css'

export function GaleriaPage() {
  const { user } = useAuth()
  return <Galeria key={user?.uid ?? 'sin-cuenta'} />
}

function Galeria() {
  const { api } = useAuth()
  const [items, setItems] = useState<SitioDeGaleria[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    if (api) void api.request<{ items: SitioDeGaleria[] }>('/cohort/gallery', { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setItems(result.items)
    }).catch((failure) => { if (!controller.signal.aborted) setError(friendlyAuthError(failure)) })
    return () => controller.abort()
  }, [api, reload])
  return <AccountFrame>
    <div className="kicker">Hecho en el taller</div>
    <h1>Galería de mi cohorte</h1>
    <p>Explora las versiones que tus compañeros eligieron compartir. Esta galería está disponible para tu cohorte con sesión iniciada.</p>
    <div className="sitio-acciones"><Link className="btn btn-primary" to="/mi-sitio">Mi sitio</Link><button className="btn btn-secondary" onClick={() => { setItems(null); setError(null); setReload((n) => n + 1) }}>Actualizar galería</button></div>
    {error && <p role="alert" className="auth-message">{error}</p>}
    {!items && !error && <p role="status">Cargando la galería…</p>}
    {items?.length === 0 && <p>Todavía no hay sitios publicados en tu cohorte. Cuando alguien comparta su versión, aparecerá aquí.</p>}
    {!!items?.length && <ul className="sitio-galeria">{items.map((item) => <li className="card" key={item.slug}>
      <AvatarPublicado slug={item.slug} nombre={item.display_name} disponible={item.has_avatar} />
      <p>{item.display_name}</p>
      <h2>{item.title}</h2>
      <Link className="btn btn-secondary" to={`/p/${item.slug}`}>Ver sitio<span className="sr-only">: {item.title}</span></Link>
    </li>)}</ul>}
  </AccountFrame>
}
