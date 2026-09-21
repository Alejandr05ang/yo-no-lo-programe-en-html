import { useEffect } from 'react'
import { alternarPausa, estado as estadoMusica, iniciar } from '../../lib/musica'
import { ControlesMusica } from '../musica/ControlesMusica'
import './demo-nivel.css'

// Demo de arranque — Día 1. Enganche interactivo, no un encargo evaluado:
// sin autograder ni "Entregar a revisión". El nivel vive en un HTML
// autocontenido (public/nivel-demo.html) montado en iframe sandboxeado,
// igual que se aísla el código del estudiante en el resto del taller.
// No pasa por <Nav>, así que la música (si venía sonando desde /inicio)
// se controla con este botón flotante en vez de la barra superior.
export function DemoNivel() {
  useEffect(() => {
    // musica.ts retoma la música tras un F5 con el primer clic/tecla en
    // cualquier parte de la página, pero ese listener vive en este documento
    // y nunca ve los gestos que ocurren dentro del iframe (sandbox, sin
    // allow-same-origin). El iframe nos avisa por postMessage; acá cubrimos
    // tres casos:
    //   1. Primera vez (música no activa): iniciar()
    //   2. Pausada por recarga (F5): alternarPausa() la reanuda
    //   3. Ya sonando: no hacer nada
    const onMessage = (e: MessageEvent) => {
      if (e.data?.source !== 'nivel-demo') return
      const s = estadoMusica()
      if (!s.activa) {
        iniciar()             // primer gesto del usuario — activa el audio
      } else if (s.pausadoPorRecarga) {
        alternarPausa()       // reanudar tras F5
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
        className="demo-nivel__frame"
        src="/nivel-demo.html"
        title="Constructor de niveles — Demo Día 1"
        sandbox="allow-scripts"
      />
    </div>
  )
}
