import { NavLink } from 'react-router-dom'

interface Props {
  /** Etiqueta del día, p. ej. "Día 4 — Ju1". */
  dia: string
  /** Iniciales para el avatar. */
  iniciales: string
}

// Barra superior de la vista del estudiante (handoff §1a).
// Marca "Taller · Portafolio" con el · en acento; tag outline del día; enlaces; avatar.
export function Nav({ dia, iniciales }: Props) {
  return (
    <nav className="nav ve-nav">
      <span className="nav-brand">
        Taller<span style={{ color: 'var(--color-accent)' }}> · </span>Portafolio
      </span>
      <span className="tag tag-outline mono">{dia}</span>
      <span className="ve-nav-sep" />
      <NavLink to="/portafolio" aria-current="page">
        Mi portafolio
      </NavLink>
      <NavLink to="/mapa">Mapa</NavLink>
      <NavLink to="/retos">Retos platino</NavLink>
      <NavLink to="/bitacora">Bitácora</NavLink>
      <div className="ve-avatar" aria-hidden>
        {iniciales}
      </div>
    </nav>
  )
}
