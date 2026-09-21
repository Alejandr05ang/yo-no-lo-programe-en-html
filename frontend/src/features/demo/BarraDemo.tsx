import { Link } from 'react-router-dom'
import { ControlesMusica } from '../musica/ControlesMusica'
import { BetaTag } from '../../components/Beta'
import { useAuth } from '../auth/authContext'

export type ModoDemo = 'build' | 'play'

interface Props {
  /** Modo que el iframe confirmó por postMessage. */
  modo: ModoDemo
  /** Pide el cambio de modo; el iframe es el que manda y luego lo confirma. */
  onModo: (modo: ModoDemo) => void
  /** Texto corto del autoguardado, o null mientras no haya nada que decir. */
  guardado: string | null
  onSalir: () => void
}

// Barra superior de /demo. Es el único chrome de la pantalla: el iframe ya no
// trae header propio, así que aquí viven marca, día, cuenta, música y el
// selector de modo (handoff §1a, mismo ritmo que components/Nav.tsx).
export function BarraDemo({ modo, onModo, guardado, onSalir }: Props) {
  const auth = useAuth()

  return (
    <header className="nav demo-barra">
      <span className="nav-brand demo-barra__marca">
        Taller<span className="demo-barra__punto"> · </span>Portafolio
      </span>
      <BetaTag>beta</BetaTag>
      <span className="tag tag-outline mono">Demo · Día 1</span>

      <div className="demo-barra__acciones">
        {guardado && (
          <span className="demo-barra__guardado text-muted" role="status" aria-live="polite">
            {guardado}
          </span>
        )}

        {/* Hasta que Firebase resuelva no se muestra ninguna de las dos caras:
            enseñar "Iniciar sesión" y cambiarlo un instante después parpadea. */}
        {auth.initialized && (auth.user
          ? <>
            <Link to="/cuenta" className="btn btn-secondary">Mi cuenta</Link>
            <button type="button" className="btn btn-ghost" onClick={onSalir}>Cerrar sesión</button>
          </>
          : <Link to="/login" className="btn btn-secondary">Iniciar sesión</Link>
        )}

        <ControlesMusica />

        <div className="seg demo-barra__modo" role="group" aria-label="Modo de la demo">
          <label className="seg-opt">
            <input
              type="radio"
              name="demo-modo"
              checked={modo === 'build'}
              onChange={() => onModo('build')}
            />
            ✎ Constructor
          </label>
          <label className="seg-opt">
            <input
              type="radio"
              name="demo-modo"
              checked={modo === 'play'}
              onChange={() => onModo('play')}
            />
            ▶ Jugar
          </label>
        </div>
      </div>
    </header>
  )
}
