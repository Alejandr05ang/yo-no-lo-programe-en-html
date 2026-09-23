import { useEffect, type RefObject } from 'react'
import { esEnlaceExterno, normalizarEnlace } from '../../lib/enlaces'

/**
 * Abre fuera de la plataforma los enlaces en los que se hace clic dentro de la vista previa.
 *
 * La vista previa es un iframe con sandbox="allow-scripts" exacto: sin allow-popups ni
 * allow-same-origin, un clic en un enlace navegaba el propio iframe (a un sitio que muchas
 * veces no se deja enmarcar, o a una ruta de la plataforma si el href era relativo). El
 * documento de la vista previa (documentoPortafolio) avisa del clic por postMessage y aquí,
 * en la ventana principal, se valida el origen del mensaje y la dirección antes de abrirla
 * en una pestaña nueva. Nunca se abre nada que no sea http(s) o mailto.
 */
export function useAbrirEnlaces(marco: RefObject<HTMLIFrameElement | null>) {
  useEffect(() => {
    const alRecibir = (ev: MessageEvent) => {
      if (!marco.current || ev.source !== marco.current.contentWindow) return
      const d = ev.data as { tipo?: unknown; href?: unknown } | null
      if (!d || d.tipo !== 'abrir-enlace') return
      const destino = normalizarEnlace(d.href)
      if (esEnlaceExterno(destino)) window.open(destino, '_blank', 'noopener,noreferrer')
    }
    window.addEventListener('message', alRecibir)
    return () => window.removeEventListener('message', alRecibir)
  }, [marco])
}
