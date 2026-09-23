import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import {
  confirmacion,
  ETIQUETA_ESTADO_ADMIN,
  filaDia,
  type AccionDiaAdmin,
  type PausaAdmin,
  type SesionAdmin,
} from '../../lib/controlDias'
import { rutaDia } from '../../lib/navegacionActividades'
import './admin.css'

interface Cohorte { id: string; name: string; slug: string; description: string; is_active: boolean }
interface Sesion extends SesionAdmin {
  teaser_summary: string; is_published: boolean
}
interface EstadoTaller {
  cohort_id: string; cohort_name: string
  active_session_id: string | null
  active_session_code: string | null
  active_session_title: string | null
  active_order_index: number
  students_count: number
  updated_at: string | null
  paused_sessions?: PausaAdmin[]
}
interface Alumno { id: string; email: string; full_name: string; display_name: string; joined_at: string }

function Aviso({ error, exito }: { error?: string | null; exito?: string | null }) {
  return <>
    {error && <p className="auth-message" role="alert">{error}</p>}
    {exito && <p className="auth-message" role="status">{exito}</p>}
  </>
}

/**
 * Confirmación dentro de la página: nada de window.confirm. El foco entra en
 * "Cancelar" —la opción que no cambia nada—, Tab no sale del diálogo y al cerrar
 * vuelve al botón que lo abrió.
 */
function Dialogo({ titulo, parrafos, boton, onCancelar, onConfirmar, pendiente }: {
  titulo: string; parrafos: string[]; boton: string
  onCancelar: () => void; onConfirmar: () => void; pendiente: boolean
}) {
  const caja = useRef<HTMLDivElement>(null)
  const cancelar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelar.current?.focus()
    return () => previo?.focus()
  }, [])
  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pendiente) onCancelar()
      if (e.key !== 'Tab' || !caja.current) return
      const botones = [...caja.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
      if (botones.length === 0) return
      const primero = botones[0]
      const ultimo = botones[botones.length - 1]
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
    }
    document.addEventListener('keydown', teclas)
    return () => document.removeEventListener('keydown', teclas)
  }, [onCancelar, pendiente])
  return (
    <div className="dialog-backdrop" onClick={() => { if (!pendiente) onCancelar() }}>
      <div ref={caja} className="dialog" role="dialog" aria-modal="true" aria-labelledby="adm-dialogo-titulo"
        aria-describedby="adm-dialogo-cuerpo" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title" id="adm-dialogo-titulo">{titulo}</h2>
        <div className="dialog-body" id="adm-dialogo-cuerpo">
          {parrafos.map((texto) => <p key={texto}>{texto}</p>)}
        </div>
        <div className="dialog-actions">
          <button ref={cancelar} type="button" className="btn btn-secondary" onClick={onCancelar} disabled={pendiente}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={onConfirmar} disabled={pendiente}>
            {pendiente ? 'Aplicando…' : boton}
          </button>
        </div>
      </div>
    </div>
  )
}

const TEXTO_ACCION: Record<AccionDiaAdmin, string> = {
  activar: 'Activar como día actual',
  pausar: 'Pausar acceso',
  reabrir: 'Reabrir acceso',
}

function fechaCorta(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function AdminDashboard() {
  const { api } = useAuth()
  const [cohortes, setCohortes] = useState<Cohorte[]>([])
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [metricas, setMetricas] = useState({ cohorts_count: 0, students_count: 0 })
  const [cohorteId, setCohorteId] = useState<string | null>(null)
  const [estado, setEstado] = useState<EstadoTaller | null>(null)
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState(false)
  const [porConfirmar, setPorConfirmar] = useState<{ accion: AccionDiaAdmin; objetivo: Sesion | null } | null>(null)
  const [codigoNuevo, setCodigoNuevo] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  const cargarBase = useCallback(async () => {
    if (!api) return
    setCargando(true)
    setError(null)
    try {
      const [m, c, s] = await Promise.all([
        api.request<typeof metricas>('/admin/dashboard'),
        api.request<Cohorte[]>('/admin/cohorts'),
        api.request<Sesion[]>('/admin/sessions'),
      ])
      setMetricas(m)
      setCohortes(c)
      setSesiones(s)
      setCohorteId((previo) => previo ?? c.find((x) => x.is_active)?.id ?? c[0]?.id ?? null)
    } catch (e) {
      setError(friendlyAuthError(e))
    } finally {
      setCargando(false)
    }
  }, [api])

  useEffect(() => { void cargarBase() }, [cargarBase])

  const cargarCohorte = useCallback(async (id: string) => {
    if (!api) return
    try {
      const [e, a] = await Promise.all([
        api.request<EstadoTaller>(`/admin/cohorts/${id}/state`),
        api.request<Alumno[]>(`/admin/cohorts/${id}/students`),
      ])
      setEstado(e)
      setAlumnos(a)
    } catch (err) {
      setError(friendlyAuthError(err))
    }
  }, [api])

  useEffect(() => { if (cohorteId) void cargarCohorte(cohorteId) }, [cohorteId, cargarCohorte])

  const aplicar = async () => {
    if (!api || !cohorteId || porConfirmar === null) return
    const { accion, objetivo } = porConfirmar
    setPendiente(true)
    setError(null)
    setExito(null)
    try {
      const nuevo = accion === 'activar'
        ? await api.request<EstadoTaller>(`/admin/cohorts/${cohorteId}/active-session`, {
            method: 'PATCH',
            json: { active_session_id: objetivo?.id ?? null },
          })
        : await api.request<EstadoTaller>(`/admin/cohorts/${cohorteId}/sessions/${objetivo?.id}/access`, {
            method: 'PUT',
            json: { paused: accion === 'pausar' },
          })
      setEstado(nuevo)
      const dia = objetivo ? `Día ${objetivo.day_number} · ${objetivo.title}` : 'solo la demo'
      setExito(accion === 'activar'
        ? `Día actual: ${dia}.`
        : accion === 'pausar' ? `${dia}: acceso pausado. El progreso sigue guardado.` : `${dia}: acceso reabierto.`)
      setPorConfirmar(null)
    } catch (e) {
      setError(friendlyAuthError(e))
    } finally {
      setPendiente(false)
    }
  }

  const regenerarCodigo = async () => {
    if (!api || !cohorteId) return
    setPendiente(true)
    setError(null)
    try {
      const r = await api.request<{ join_code_plaintext: string }>(`/admin/cohorts/${cohorteId}/regenerate-code`, { method: 'POST' })
      setCodigoNuevo(r.join_code_plaintext)
      setExito('Código nuevo generado. El anterior ya no sirve.')
    } catch (e) {
      setError(friendlyAuthError(e))
    } finally {
      setPendiente(false)
    }
  }

  if (cargando) return <AccountFrame><p role="status">Cargando el panel…</p></AccountFrame>

  const cohorte = cohortes.find((c) => c.id === cohorteId) ?? null
  const activo = { id: estado?.active_session_id ?? null, orden: estado?.active_order_index ?? 0 }
  const pausas = estado?.paused_sessions ?? []
  const dialogo = porConfirmar
    ? confirmacion(porConfirmar.accion, porConfirmar.objetivo, sesiones, activo, pausas)
    : null

  return <AccountFrame>
    <div className="kicker">Administración</div>
    <h1>Estado del taller</h1>
    <Aviso error={error} exito={exito} />

    <div className="adm-metricas">
      <div className="card adm-metrica">
        <div className="adm-metrica-cifra">{metricas.cohorts_count}</div>
        <p className="card-body">Clases</p>
      </div>
      <div className="card adm-metrica">
        <div className="adm-metrica-cifra">{metricas.students_count}</div>
        <p className="card-body">Estudiantes</p>
      </div>
      <div className="card adm-metrica">
        <div className="adm-metrica-cifra">{estado?.active_session_code ?? 'Demo'}</div>
        <p className="card-body">{estado?.active_session_title ?? 'Ningún día abierto'}</p>
      </div>
    </div>

    {cohortes.length > 1 && (
      <div className="field" style={{ maxWidth: 320 }}>
        <label htmlFor="adm-cohorte">Clase</label>
        <select id="adm-cohorte" className="input" value={cohorteId ?? ''} onChange={(e) => { setCohorteId(e.target.value); setCodigoNuevo(null) }}>
          {cohortes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    )}

    {cohortes.length === 0 && (
      <section className="card adm-seccion">
        <h2 className="card-title">Todavía no hay ninguna clase</h2>
        <p className="card-body">Crea una para poder abrir días y repartir el código de acceso.</p>
        <button className="btn btn-primary" onClick={() => setCreando(true)}>Crear clase</button>
      </section>
    )}

    {cohorte && <>
      <section className="adm-seccion" aria-labelledby="adm-dias-titulo">
        <div className="adm-seccion-cabecera">
          <div>
            <h2 id="adm-dias-titulo">Días del taller</h2>
            <p className="text-muted">
              {estado?.active_session_code
                ? `Día actual: ${estado.active_session_title}. Tus estudiantes tienen abierto todo hasta ese día, salvo lo que pauses.`
                : 'Ahora mismo: solo la demo. Ningún día está abierto.'}
            </p>
          </div>
          <div className="adm-acciones">
            <Link to="/demo" className="btn btn-secondary">Ver la demo</Link>
            {activo.orden !== 0 && (
              <button className="btn btn-secondary" onClick={() => setPorConfirmar({ accion: 'activar', objetivo: null })}>
                Volver a solo la demo
              </button>
            )}
          </div>
        </div>

        <ol className="adm-dias">
          {sesiones.map((s) => {
            const fila = filaDia(s, activo, pausas)
            const pausa = pausas.find((p) => p.session_id === s.id)
            return <li key={s.id} className="adm-dia" data-estado={fila.estado} data-pausado={fila.pausado || undefined}
              aria-current={fila.esActual ? 'step' : undefined}>
              <div className="adm-dia-cabeza">
                <span className="adm-dia-cod mono">Día {s.day_number} · {s.code}</span>
                <h3 className="adm-dia-titulo">{s.title}</h3>
                <div className="adm-dia-estado">
                  <span className={fila.estado === 'actual' ? 'tag tag-accent' : fila.estado === 'pausado' ? 'tag tag-neutral' : 'tag tag-outline'}>
                    {fila.estado === 'pausado' && <span aria-hidden="true">⏸ </span>}
                    {ETIQUETA_ESTADO_ADMIN[fila.estado]}
                  </span>
                  {fila.esActual && fila.estado !== 'actual' && <span className="tag tag-accent">Actual</span>}
                  {fila.pausado && fila.estado === 'futuro' && <span className="tag tag-neutral">Pausado</span>}
                  <span className="text-muted">
                    {s.challenges_count === 0 ? 'Sin actividades en la plataforma' : `${s.challenges_count} ${s.challenges_count === 1 ? 'actividad' : 'actividades'}`}
                  </span>
                </div>
                {pausa && <p className="adm-dia-nota">
                  Pausado{pausa.updated_by_name ? ` por ${pausa.updated_by_name}` : ''}{pausa.updated_at ? ` · ${fechaCorta(pausa.updated_at)}` : ''}.
                  {' '}Sus estudiantes no pueden entrar; su progreso sigue guardado.
                </p>}
              </div>
              <div className="adm-dia-acciones">
                {fila.acciones.map((accion) => <button key={accion} type="button"
                  className={accion === 'activar' && fila.estado === 'futuro' ? 'btn btn-primary' : 'btn btn-secondary'}
                  onClick={() => setPorConfirmar({ accion, objetivo: s })}>
                  {TEXTO_ACCION[accion]}<span className="sr-only">: Día {s.day_number}</span>
                </button>)}
                <Link className="btn btn-ghost" to={rutaDia(s.code)}>
                  Previsualizar<span className="sr-only">: Día {s.day_number}</span>
                </Link>
              </div>
            </li>
          })}
        </ol>
      </section>

      <section className="card adm-seccion">
        <div className="adm-seccion-cabecera">
          <h2 className="card-title">{cohorte.name}</h2>
          <div className="adm-acciones">
            <button className="btn btn-secondary" onClick={() => void regenerarCodigo()} disabled={pendiente}>
              Generar código de acceso
            </button>
            <button className="btn btn-secondary" onClick={() => setCreando(true)}>Crear otra clase</button>
          </div>
        </div>
        <p className="card-body">{alumnos.length} estudiante{alumnos.length === 1 ? '' : 's'} en esta clase.</p>

        {codigoNuevo && <div className="adm-codigo" role="status">
          <code className="mono">{codigoNuevo}</code>
          <span className="text-muted">Cópialo ahora: no se vuelve a mostrar.</span>
          <button className="btn btn-secondary" onClick={() => void navigator.clipboard?.writeText(codigoNuevo)}>Copiar</button>
        </div>}

        {alumnos.length === 0
          ? <p className="text-muted">
              Nadie se ha unido todavía. Genera el código y compártelo: tus alumnos lo escriben
              al terminar de crear su cuenta.
            </p>
          : <div className="adm-tabla-scroll">
              <table className="table">
                <thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Se unió</th></tr></thead>
                <tbody>
                  {alumnos.map((a) => <tr key={a.id}>
                    <td>{a.display_name || a.full_name || '—'}</td>
                    <td className="mono">{a.email}</td>
                    <td>{new Date(a.joined_at).toLocaleDateString('es')}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>}
      </section>
    </>}

    {creando && <CrearClase
      onCerrar={() => setCreando(false)}
      onCreada={(codigo) => { setCreando(false); setCodigoNuevo(codigo); void cargarBase() }}
    />}

    {dialogo && <Dialogo
      titulo={dialogo.titulo}
      parrafos={dialogo.parrafos}
      boton={dialogo.boton}
      pendiente={pendiente}
      onCancelar={() => setPorConfirmar(null)}
      onConfirmar={() => void aplicar()}
    />}
  </AccountFrame>
}

function CrearClase({ onCerrar, onCreada }: { onCerrar: () => void; onCreada: (codigo: string) => void }) {
  const { api } = useAuth()
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!api || pendiente) return
    setPendiente(true)
    setError(null)
    try {
      // Solo los campos que el backend acepta: CohortCreateBody rechaza cualquier
      // extra, e is_active hacía que el alta fallara siempre con 422.
      const r = await api.request<{ join_code_plaintext: string }>('/admin/cohorts', {
        method: 'POST',
        json: { name: nombre, slug },
      })
      onCreada(r.join_code_plaintext)
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setPendiente(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onCerrar}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Crear clase" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Crear clase</h2>
        <form className="adm-form" onSubmit={enviar}>
          {error && <p className="auth-message" role="alert">{error}</p>}
          <div className="field">
            <label htmlFor="adm-nombre">Nombre</label>
            <input id="adm-nombre" className="input" required minLength={2} value={nombre}
              onChange={(e) => setNombre(e.target.value)} disabled={pendiente} />
          </div>
          <div className="field">
            <label htmlFor="adm-slug">Identificador</label>
            <input id="adm-slug" className="input" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              aria-describedby="adm-slug-ayuda" value={slug}
              onChange={(e) => setSlug(e.target.value)} disabled={pendiente} />
            <p id="adm-slug-ayuda" className="auth-help">Minúsculas y guiones, por ejemplo <code className="mono">taller-2026</code>.</p>
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onCerrar} disabled={pendiente}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={pendiente}>{pendiente ? 'Creando…' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
