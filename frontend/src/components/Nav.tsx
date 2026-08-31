import { NavLink } from 'react-router-dom'
import { BetaTag } from './Beta'

type Seccion = 'portafolio' | 'mapa' | 'retos' | 'bitacora'

interface Props {
  /** Sufijo de la marca: "Portafolio", "Mapa"… */
  seccion: string
  /** Texto del tag del día, p. ej. "Día 4 — Ju1" o "Hoy: Día 4 — Ju1". */
  dia: string
  /** Iniciales para el avatar. */
  iniciales: string
  /** Enlace activo. */
  activo: Seccion
}

// Barra superior (handoff §1a / §1e). Marca "Taller · <sección>" con el · en acento;
// tag outline del día; enlaces; avatar.
export function Nav({ seccion, dia, iniciales, activo }: Props) {
  return (
    <nav className="nav ve-nav">
      <span className="nav-brand">
        Taller<span style={{ color: 'var(--color-accent)' }}> · </span>
        {seccion}
      </span>
      <BetaTag>beta</BetaTag>
      <span className="tag tag-outline mono">{dia}</span>
      <span className="ve-nav-sep" />
      <NavLink to="/portafolio" aria-current={activo === 'portafolio' ? 'page' : undefined}>
        Mi portafolio
      </NavLink>
      <NavLink to="/mapa" aria-current={activo === 'mapa' ? 'page' : undefined}>
        Mapa
      </NavLink>
      <NavLink to="/retos" aria-current={activo === 'retos' ? 'page' : undefined}>
        Retos platino
      </NavLink>
      <NavLink to="/bitacora" aria-current={activo === 'bitacora' ? 'page' : undefined}>
        Bitácora
      </NavLink>
      <div className="ve-avatar" aria-hidden>
        {iniciales}
      </div>
    </nav>
  )
}
