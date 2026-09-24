import { useEffect, useRef, useState } from 'react'
import {
  borradorDesdePerfil,
  GuardadoSinRefrescar,
  MAX_HOBBIES,
  MAX_LARGO_HOBBY,
  prepararPerfil,
  type BorradorPerfil,
  type CampoPerfil,
  type ErroresPerfil,
  type Perfil,
} from '../../lib/perfil'
import { friendlyAuthError } from '../auth/session'

interface Props {
  perfil: Perfil
  onGuardar: (p: Perfil) => Promise<void>
  onCerrar: () => void
}

const ORDEN: CampoPerfil[] = ['nombre', 'sobreMi', 'github', 'linkedin', 'hobbies']
const ID: Record<CampoPerfil, string> = {
  nombre: 'md-nombre',
  sobreMi: 'md-bio',
  github: 'md-github',
  linkedin: 'md-linkedin',
  hobbies: 'md-hobbies',
}

// Formulario "Mis datos": lo que el estudiante escribe acá alimenta `datos` en la vista
// previa, para que su portafolio se sienta propio desde el primer encargo (docs/encargos.md §5.5).
//
// Cada campo guarda EXACTAMENTE lo que se escribe mientras se escribe. En particular los
// hobbies son texto libre hasta pulsar Guardar: antes se convertían a lista en cada tecla y
// el Enter recién pulsado (una línea vacía) desaparecía, así que no se podía pasar al
// segundo hobby.
export function MisDatos({ perfil, onGuardar, onCerrar }: Props) {
  const [b, setB] = useState<BorradorPerfil>(() => borradorDesdePerfil(perfil))
  const [errores, setErrores] = useState<ErroresPerfil>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof BorradorPerfil>(k: K, v: BorradorPerfil[K]) => setB((x) => ({ ...x, [k]: v }))

  const caja = useRef<HTMLDivElement>(null)
  const primerCampo = useRef<HTMLInputElement>(null)
  // El foco entra UNA vez, al abrir, y vuelve a donde estaba al cerrar. Si dependiera de las
  // props, cada re-render del editor de fondo (autoguardado, el mapa que se refresca) lo
  // devolvía a "Nombre" en mitad de lo que el estudiante estaba escribiendo.
  useEffect(() => {
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    primerCampo.current?.focus()
    return () => previo?.focus()
  }, [])
  const guardandoRef = useRef(guardando)
  const onCerrarRef = useRef(onCerrar)
  useEffect(() => {
    guardandoRef.current = guardando
    onCerrarRef.current = onCerrar
  })
  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardandoRef.current) onCerrarRef.current()
      // Tab no sale del diálogo.
      if (e.key !== 'Tab' || !caja.current) return
      const enfocables = [...caja.current.querySelectorAll<HTMLElement>('input:not(:disabled), textarea:not(:disabled), button:not(:disabled)')]
      if (enfocables.length === 0) return
      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
    }
    document.addEventListener('keydown', teclas)
    return () => document.removeEventListener('keydown', teclas)
  }, [])

  const guardar = async () => {
    setError(null)
    const r = prepararPerfil(b)
    if (r.errores) {
      setErrores(r.errores)
      const primero = ORDEN.find((c) => r.errores[c])
      if (primero) document.getElementById(ID[primero])?.focus()
      return
    }
    setErrores({})
    setGuardando(true)
    try {
      await onGuardar(r.perfil)
      onCerrar()
    } catch (e) {
      setError(e instanceof GuardadoSinRefrescar ? e.message : friendlyAuthError(e))
    } finally {
      setGuardando(false)
    }
  }

  const ayuda = (campo: CampoPerfil, texto?: string) => {
    const mensaje = errores[campo]
    return <>
      {texto && !mensaje && <span id={`${ID[campo]}-ayuda`} className="text-muted">{texto}</span>}
      {mensaje && <span id={`${ID[campo]}-error`} className="dialog-error" role="alert">{mensaje}</span>}
    </>
  }
  const describe = (campo: CampoPerfil, conAyuda = false) =>
    errores[campo] ? `${ID[campo]}-error` : conAyuda ? `${ID[campo]}-ayuda` : undefined

  return (
    <div className="dialog-backdrop" onClick={() => { if (!guardando) onCerrar() }}>
      <div ref={caja} className="dialog" role="dialog" aria-modal="true" aria-labelledby="md-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title" id="md-titulo">Mis datos</div>
        <div className="dialog-body">
          Esto es tuyo. Reemplaza los datos de ejemplo por los tuyos y tu portafolio se va a
          construir con ellos.
        </div>

        <div className="field">
          <label htmlFor={ID.nombre}>Nombre</label>
          <input ref={primerCampo} id={ID.nombre} className="input" value={b.nombre}
            aria-invalid={!!errores.nombre} aria-describedby={describe('nombre')}
            onChange={(e) => set('nombre', e.target.value)} />
          {ayuda('nombre')}
        </div>

        <div className="field">
          <label htmlFor={ID.sobreMi}>Sobre mí</label>
          <textarea id={ID.sobreMi} className="input" value={b.sobreMi}
            aria-invalid={!!errores.sobreMi} aria-describedby={describe('sobreMi')}
            onChange={(e) => set('sobreMi', e.target.value)} />
          {ayuda('sobreMi')}
        </div>

        <div className="field">
          <label htmlFor={ID.github}>GitHub (opcional)</label>
          <input id={ID.github} className="input" inputMode="url" autoComplete="url"
            placeholder="github.com/tu-usuario" value={b.github}
            aria-invalid={!!errores.github} aria-describedby={describe('github', true)}
            onChange={(e) => set('github', e.target.value)} />
          {ayuda('github', 'Puedes escribirlo con o sin https://.')}
        </div>
        <div className="field">
          <label htmlFor={ID.linkedin}>LinkedIn (opcional)</label>
          <input id={ID.linkedin} className="input" inputMode="url" autoComplete="url"
            placeholder="linkedin.com/in/tu-usuario" value={b.linkedin}
            aria-invalid={!!errores.linkedin} aria-describedby={describe('linkedin', true)}
            onChange={(e) => set('linkedin', e.target.value)} />
          {ayuda('linkedin', 'Puedes escribirlo con o sin https://.')}
        </div>
        <div className="field">
          <label htmlFor="md-correo">Correo</label>
          <input id="md-correo" className="input" value={b.correo} readOnly disabled aria-describedby="md-correo-ayuda" />
          <span id="md-correo-ayuda" className="text-muted">Es el correo de tu cuenta: no se puede cambiar aquí.</span>
        </div>

        <div className="field">
          <label htmlFor={ID.hobbies}>Hobbies (uno por línea)</label>
          <textarea id={ID.hobbies} className="input" value={b.hobbiesTexto}
            aria-invalid={!!errores.hobbies} aria-describedby={describe('hobbies', true)}
            onChange={(e) => set('hobbiesTexto', e.target.value)} />
          {ayuda('hobbies', `Pulsa Enter para pasar al siguiente. Hasta ${MAX_HOBBIES}, de ${MAX_LARGO_HOBBY} caracteres como máximo cada uno.`)}
        </div>

        {error && <div className="dialog-error" role="alert">{error}</div>}

        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
