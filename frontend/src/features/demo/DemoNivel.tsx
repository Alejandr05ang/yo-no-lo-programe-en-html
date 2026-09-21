import { useEffect, useRef } from 'react'
import { alternarPausa, estado as estadoMusica, iniciar } from '../../lib/musica'
import { ControlesMusica } from '../musica/ControlesMusica'
import './demo-nivel.css'

export function DemoNivel() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return
      if (e.data?.source !== 'nivel-demo') return
      const s = estadoMusica()
      if (!s.activa) {
        iniciar()
      } else if (s.pausadoPorRecarga) {
        alternarPausa()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div className="demo-nivel">
      <div className="demo-nivel__musica">
        <ControlesMusica />
      </div>
      <iframe
        ref={iframeRef}
        className="demo-nivel__frame"
        src="/nivel-demo.html"
        title="Constructor de niveles — Demo Día 1"
        sandbox="allow-scripts"
      />
    </div>
  )
}
