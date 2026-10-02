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
import {
  MAX_PROYECTOS,
  MAX_SEGUNDOS,
  prepararDatosExtra,
  type ErroresExtra,
  type ProyectoDato,
} from '../../lib/datosExtra'
import { friendlyAuthError } from '../auth/session'

interface Props {
  perfil: Perfil
  /** Los proyectos que hay ahora en `datos` (propios o de ejemplo), para editarlos. */
  proyectos?: ProyectoDato[]
  /** Cada cuántos segundos corre cadaSegundo(); null = el valor por defecto (1). */
  segundos?: number | null
  onGuardar: (p: Perfil) => Promise<void>
  /** `proyectos` undefined = no los tocó: se conserva lo que había. */
  onGuardarExtra?: (d: { proyectos?: ProyectoDato[]; segundos: number | null }) => void
  onCerrar: () => void
}

const PROYECTO_NUEVO: ProyectoDato = { nombre: '', imagenUrl: '', destacado: true, terminado: true, tipo: 'texto' }

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
const SIN_PROYECTOS: ProyectoDato[] = []

export function MisDatos({ perfil, proyectos: proyectosIniciales = SIN_PROYECTOS, segundos: segundosIniciales = null, onGuardar, onGuardarExtra, onCerrar }: Props) {
  const [b, setB] = useState<BorradorPerfil>(() => borradorDesdePerfil(perfil))
  const [errores, setErrores] = useState<ErroresPerfil>({})
  const [proyectos, setProyectos] = useState<ProyectoDato[]>(proyectosIniciales)
  const [segundosTexto, setSegundosTexto] = useState(segundosIniciales ? String(segundosIniciales) : '')
  const [erroresExtra, setErroresExtra] = useState<ErroresExtra>({ proyectos: {} })
  const cambiarProyecto = (i: number, cambio: Partial<ProyectoDato>) =>
    setProyectos((lista) => lista.map((p, j) => (j === i ? { ...p, ...cambio } : p)))
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
    const x = prepararDatosExtra(proyectos, segundosTexto)
    setErroresExtra(x.errores ?? { proyectos: {} })
    if (r.errores || x.errores) {
      setErrores(r.errores ?? {})
      const primero = r.errores ? ORDEN.find((c) => r.errores[c]) : undefined
      if (primero) document.getElementById(ID[primero])?.focus()
      else if (x.errores) {
        const fila = Object.keys(x.errores.proyectos)[0]
        document.getElementById(fila !== undefined ? `md-proyecto-${fila}-nombre` : 'md-segundos')?.focus()
      }
      return
    }
    setErrores({})
    setGuardando(true)
    try {
      await onGuardar(r.perfil)
      const tocoProyectos = JSON.stringify(x.datos.proyectos) !== JSON.stringify(proyectosIniciales)
      onGuardarExtra?.({ proyectos: tocoProyectos ? x.datos.proyectos ?? [] : undefined, segundos: x.datos.segundos })
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

        <div className="field">
          <label>Proyectos ({proyectos.length})</label>
          <span className="text-muted">Pon los que quieras: uno solo o veinte. Se leen en datos.proyectos.</span>
          {proyectos.map((p, i) => (
            <fieldset key={i} className="md-proyecto" style={{ border: '1px solid var(--color-divider, #ccc)', borderRadius: 8, padding: 10, margin: '8px 0', display: 'grid', gap: 6 }}>
              <input id={`md-proyecto-${i}-nombre`} className="input" placeholder="Nombre del proyecto" aria-label={`Proyecto ${i + 1}: nombre`}
                value={p.nombre} aria-invalid={!!erroresExtra.proyectos[i]}
                onChange={(e) => cambiarProyecto(i, { nombre: e.target.value })} />
              {erroresExtra.proyectos[i] && <span className="dialog-error" role="alert">{erroresExtra.proyectos[i]}</span>}
              <input className="input" placeholder="Dirección de la imagen (https://…, obligatoria para verla en el carrusel)" aria-label={`Proyecto ${i + 1}: imagen`}
                value={p.imagenUrl} onChange={(e) => cambiarProyecto(i, { imagenUrl: e.target.value })} />
              <input className="input" list="md-tipos" placeholder="Tipo (demo, texto, video…)" aria-label={`Proyecto ${i + 1}: tipo`}
                value={p.tipo} onChange={(e) => cambiarProyecto(i, { tipo: e.target.value })} />
              <input className="input" placeholder="Enlace (opcional)" aria-label={`Proyecto ${i + 1}: enlace`}
                value={p.url ?? ''} onChange={(e) => cambiarProyecto(i, { url: e.target.value })} />
              <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <label><input type="checkbox" checked={p.destacado} onChange={(e) => cambiarProyecto(i, { destacado: e.target.checked })} /> Destacado</label>
                <label><input type="checkbox" checked={p.terminado} onChange={(e) => cambiarProyecto(i, { terminado: e.target.checked })} /> Terminado</label>
                <button type="button" className="btn btn-ghost" onClick={() => setProyectos((l) => l.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              </span>
            </fieldset>
          ))}
          <datalist id="md-tipos"><option value="demo" /><option value="texto" /><option value="video" /></datalist>
          <div>
            <button type="button" className="btn btn-ghost" disabled={proyectos.length >= MAX_PROYECTOS}
              onClick={() => setProyectos((l) => [...l, { ...PROYECTO_NUEVO }])}>
              + Agregar proyecto
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="md-segundos">Segundos de cadaSegundo() (opcional)</label>
          <input id="md-segundos" className="input" inputMode="decimal" placeholder="1" value={segundosTexto}
            aria-invalid={!!erroresExtra.segundos} onChange={(e) => setSegundosTexto(e.target.value)} />
          {erroresExtra.segundos
            ? <span className="dialog-error" role="alert">{erroresExtra.segundos}</span>
            : <span className="text-muted">Cada cuántos segundos cambia el carrusel. Vacío = 1. Hasta {MAX_SEGUNDOS}.</span>}
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
