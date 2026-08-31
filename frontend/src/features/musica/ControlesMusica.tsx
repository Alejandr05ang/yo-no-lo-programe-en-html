import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  alternarMute,
  alternarPausa,
  detener,
  estado,
  siguiente,
  suscribir,
} from '../../lib/musica'
import './controles-musica.css'

function NotaMusical() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

// Control de la música de fondo — un ícono de nota, dentro de la barra superior.
// Clic: si quedó pausada por una recarga, la reanuda; si no, abre/cierra el popup.
// El popup se cierra con clic afuera (backdrop transparente) o Escape.
export function ControlesMusica() {
  const e = useSyncExternalStore(suscribir, estado, estado)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!abierto) return
    const esc = (ev: KeyboardEvent) => ev.key === 'Escape' && setAbierto(false)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [abierto])

  if (!e.activa) return null

  // Tras un F5 la música retoma en el primer clic/tecla en cualquier parte (musica.ts).
  // El ícono siempre abre/cierra el popup.
  return (
    <>
      {abierto && <div className="mus-backdrop" onClick={() => setAbierto(false)} />}
      <div className="mus">
        <button
          className="mus-nota"
          data-sonando={e.sonando}
          onClick={() => setAbierto((v) => !v)}
          aria-label="Música de fondo"
          aria-expanded={abierto}
          title="Música de fondo"
        >
          <NotaMusical />
          {e.pausadoPorRecarga && (
            <span className="mus-reanudar" aria-hidden>
              ▶
            </span>
          )}
        </button>

        {abierto && (
          <div className="mus-pop" role="dialog" aria-label="Música de fondo">
            <div className="mus-pop-titulo mono">{e.titulo || 'Música de fondo'}</div>
            <div className="mus-pop-fila">
              <button className="mus-pbtn" onClick={alternarPausa}>
                {e.sonando ? 'Pausar' : 'Reanudar'}
              </button>
              <button className="mus-pbtn" onClick={siguiente}>
                Siguiente
              </button>
            </div>
            <div className="mus-pop-fila">
              <button className="mus-pbtn" onClick={alternarMute} data-activo={e.muteada}>
                {e.muteada ? 'Con sonido' : 'Silenciar'}
              </button>
              <button className="mus-pbtn mus-pbtn-apagar" onClick={detener}>
                Apagar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
