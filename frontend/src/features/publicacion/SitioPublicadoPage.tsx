import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import { ApiError } from '../../lib/http'
import type { SitioDeGaleria } from '../../lib/publicacion'
import { SnapshotFrame } from './SnapshotFrame'
import { AvatarPublicado } from './AvatarPublicado'
import './publicacion.css'

export function SitioPublicadoPage() {
  const { user } = useAuth()
  const { slug } = useParams()
  return <SitioPublicado key={`${user?.uid ?? 'sin-cuenta'}:${slug}`} slug={slug ?? ''} />
}

function SitioPublicado({ slug }: { slug: string }) {
  const { api } = useAuth()
  const [site, setSite] = useState<(SitioDeGaleria & { snapshot_html: string }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        if (!api) throw new ApiError('AUTH_REQUIRED')
        if (!/^[a-z0-9_-]{1,100}$/i.test(slug)) throw new ApiError('NOT_FOUND')
        const result = await api.request<SitioDeGaleria & { snapshot_html: string }>(`/cohort/portfolios/${slug}`, { signal: controller.signal })
        if (!controller.signal.aborted) setSite(result)
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof ApiError && failure.status === 404 ? 'Este sitio no está disponible para tu cohorte o su autor retiró la publicación.' : friendlyAuthError(failure))
      }
    })()
    return () => controller.abort()
  }, [api, slug])
  return <AccountFrame>
    <Link to="/galeria">← Volver a la galería</Link>
    {error && <p role="alert" className="auth-message">{error}</p>}
    {!site && !error && <p role="status">Cargando el sitio…</p>}
    {site && <>
      <header className="sitio-cabecera"><AvatarPublicado slug={site.slug} nombre={site.display_name} disponible={site.has_avatar} /><div><p>{site.display_name}</p><h1>{site.title}</h1></div></header>
      <p className="text-muted">Versión compartida con tu cohorte · Solo lectura. Los enlaces externos están debajo del sitio.</p>
      <SnapshotFrame html={site.snapshot_html} title={`Sitio de ${site.display_name}`} />
    </>}
  </AccountFrame>
}
