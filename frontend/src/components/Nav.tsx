import { NavLink } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import { ControlesMusica } from '../features/musica/ControlesMusica'
import { BetaTag } from './Beta'

type Seccion = 'portafolio' | 'mapa'

interface Props {
  /** Sufijo de la marca: "Portafolio", "Mapa"… */
  seccion: string
  /** Texto del tag del día, p. ej. "Día 4 — Ju1" o "Hoy: Día 4 — Ju1". */
  dia: string
  /** Iniciales para el avatar. */
  iniciales: string
  /** Enlace activo. */
  activo: Seccion
  /** El editor espera su cola de guardado antes de leer la fuente de Mi sitio. */
  onAbrirSitio?: () => void
}

// Barra superior (handoff §1a / §1e). Marca "Taller · <sección>" con el · en acento;
// tag outline del día; enlaces; avatar.
export function Nav({ seccion, dia, iniciales, activo, onAbrirSitio }: Props) {
  // El rol llega de la sesión que verifica el backend, nunca de una preferencia del
  // cliente: la bitácora vive tras RequireRole(['instructor','admin']), así que al
  // alumno solo le mostraría una pantalla de acceso denegado.
  const { session } = useAuth()
  const esAlumno = session?.user.role === 'student'
  const nombre = session?.user.display_name || session?.user.full_name
  const avatar = nombre ? nombre.trim().split(/\s+/).slice(0, 2).map((parte) => [...parte][0]).join('').toLocaleUpperCase('es') : iniciales
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
      {esAlumno && (onAbrirSitio ? <button className="btn btn-secondary" onClick={onAbrirSitio}>Mi sitio</button> : <NavLink to="/mi-sitio">Mi sitio</NavLink>)}
      {esAlumno && <NavLink to="/galeria">Galería</NavLink>}
      {!esAlumno && <NavLink to="/bitacora">Bitácora</NavLink>}
      <ControlesMusica />
      <div className="ve-avatar" aria-hidden>
        {avatar}
      </div>
    </nav>
  )
}
