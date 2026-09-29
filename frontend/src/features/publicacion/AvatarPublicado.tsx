import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'

export function AvatarPublicado({ slug, nombre, disponible }: { slug: string; nombre: string; disponible: boolean }) {
  return <Avatar key={`${slug}:${disponible}`} slug={slug} nombre={nombre} disponible={disponible} />
}

function Avatar({ slug, nombre, disponible }: { slug: string; nombre: string; disponible: boolean }) {
  const { api } = useAuth()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | null = null
    if (api && disponible) void (async () => {
      try {
        const blob = await api.requestBlob(`/cohort/portfolios/${encodeURIComponent(slug)}/avatar`, { signal: controller.signal })
        if (controller.signal.aborted || blob.type !== 'image/webp') return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch { /* sin avatar disponible, se conservan las iniciales */ }
    })()
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [api, slug, disponible])
  return url ? <img className="sitio-avatar" src={url} alt={`Avatar de ${nombre}`} /> : <span className="sitio-avatar" aria-hidden="true">{nombre.trim().split(/\s+/).slice(0, 2).map((word) => [...word][0]).join('')}</span>
}
