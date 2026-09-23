import { useState } from 'react'
import type { Perfil } from '../../lib/perfil'
import { friendlyAuthError } from '../auth/session'

interface Props {
  perfil: Perfil
  onGuardar: (p: Perfil) => Promise<void>
  onCerrar: () => void
}

// Formulario "Mis datos": lo que el estudiante escribe acá alimenta `datos` en la vista
// previa, para que su portafolio se sienta propio desde el primer encargo (docs/encargos.md §5.5).
export function MisDatos({ perfil, onGuardar, onCerrar }: Props) {
  const [p, setP] = useState<Perfil>(perfil)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) => setP((x) => ({ ...x, [k]: v }))

  const guardar = async () => {
    setError(null)
    setGuardando(true)
    try {
      await onGuardar(p)
      onCerrar()
    } catch (e) {
      setError(friendlyAuthError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onCerrar}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Mis datos</div>
        <div className="dialog-body">
          Esto es tuyo. Reemplazá los datos de ejemplo por los tuyos y tu portafolio se va a
          construir con ellos.
        </div>

        <div className="field">
          <label htmlFor="md-nombre">Nombre</label>
          <input
            id="md-nombre"
            className="input"
            value={p.nombre}
            onChange={(e) => set('nombre', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="md-bio">Sobre mí</label>
          <textarea
            id="md-bio"
            className="input"
            value={p.sobreMi}
            onChange={(e) => set('sobreMi', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="md-github">GitHub (URL, opcional)</label>
          <input
            id="md-github"
            className="input"
            placeholder="https://github.com/tu-usuario"
            value={p.redes.github}
            onChange={(e) => set('redes', { ...p.redes, github: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="md-linkedin">LinkedIn (URL, opcional)</label>
          <input
            id="md-linkedin"
            className="input"
            placeholder="https://www.linkedin.com/in/tu-usuario"
            value={p.redes.linkedin}
            onChange={(e) => set('redes', { ...p.redes, linkedin: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="md-correo">Correo</label>
          <input id="md-correo" className="input" value={p.redes.correo} readOnly disabled />
          <span className="text-muted">Es el correo de tu cuenta — no se puede cambiar acá.</span>
        </div>

        <div className="field">
          <label htmlFor="md-hobbies">Hobbies (uno por línea)</label>
          <textarea
            id="md-hobbies"
            className="input"
            value={p.hobbies.join('\n')}
            onChange={(e) =>
              set(
                'hobbies',
                e.target.value.split('\n').map((h) => h.trim()).filter(Boolean),
              )
            }
          />
        </div>

        {error && <div className="dialog-error" role="alert">{error}</div>}

        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
