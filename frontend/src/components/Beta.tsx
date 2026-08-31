import type { ReactNode } from 'react'
import './beta.css'

// Marcadores visibles de "esto es de prueba" — para no confundir datos y contenido de
// ejemplo con usuarios reales cuando exista el backend.

/** Franja bajo la barra: explica qué de esta pantalla es ficticio. */
export function BetaBanner({ children }: { children: ReactNode }) {
  return (
    <div className="beta-banner" role="note">
      <span className="beta-banner-chip mono">beta · datos de ejemplo</span>
      <span className="beta-banner-txt">{children}</span>
    </div>
  )
}

/** Chip corto en línea, junto a un título o un elemento de contenido. */
export function BetaTag({ children = 'ejemplo' }: { children?: ReactNode }) {
  return <span className="beta-tag mono">{children}</span>
}
