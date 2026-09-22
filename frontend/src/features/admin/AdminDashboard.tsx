import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import './admin.css'

interface Cohorte { id: string; name: string; slug: string; description: string; is_active: boolean }
interface Sesion {
  id: string; code: string; day_number: number; order_index: number
  title: string; teaser_summary: string; is_published: boolean; challenges_count: number
}
interface EstadoTaller {
  cohort_id: string; cohort_name: string
  active_session_id: string | null
  active_session_code: string | null
  active_session_title: string | null
  active_order_index: number
  students_count: number
  updated_at: string | null
}
interface Alumno { id: string; email: string; full_name: string; display_name: string; joined_at: string }

/** La demo no es una fila del catálogo: es el estado en el que no hay ningún día
 *  abierto. Se representa con active_session_id = null, que es lo que el backend
 *  ya traduce a "nada desbloqueado". */
const DEMO = { id: null as string | null, etiqueta: 'Demo', titulo: 'Solo la demo, ningún día abierto' }

function Aviso({ error, exito }: { error?: string | null; exito?: string | null }) {
  return <>
    {error && <p className="auth-message" role="alert">{error}</p>}
    {exito && <p className="auth-message" role="status">{exito}</p>}
  </>
}

function Dialogo({ titulo, children, onCancelar, onConfirmar, pendiente }: {
  titulo: string; children: ReactNode; onCancelar: () => void; onConfirmar: () => void; pendiente: boolean
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onCancelar])
  return (
    <div className="dialog-backdrop" onClick={onCancelar}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">{titulo}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancelar} disabled={pendiente}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={onConfirmar} disabled={pendiente}>
            {pendiente ? 'Aplicando…' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  )
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
  const [porActivar, setPorActivar] = useState<{ id: string | null; etiqueta: string } | null>(null)
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

  const activar = async () => {
    if (!api || !cohorteId || porActivar === null) return
    setPendiente(true)
    setError(null)
    try {
      const nuevo = await api.request<EstadoTaller>(`/admin/cohorts/${cohorteId}/active-session`, {
        method: 'PATCH',
        json: { active_session_id: porActivar.id },
      })
      setEstado(nuevo)
      setExito(`Ahora tus alumnos ven: ${porActivar.etiqueta}.`)
      setPorActivar(null)
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
  const activaOrden = estado?.active_order_index ?? 0

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
      <section className="adm-seccion">
        <div className="adm-seccion-cabecera">
          <div>
            <h2>Qué pueden abrir tus alumnos</h2>
            <p className="text-muted">
              {estado?.active_session_code
                ? `Ahora mismo: hasta ${estado.active_session_title}.`
                : 'Ahora mismo: solo la demo. Ningún día está abierto.'}
            </p>
          </div>
          <Link to="/demo" className="btn btn-secondary">Ver la demo</Link>
        </div>

        <div className="adm-tabla-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Sesión</th>
                <th scope="col">Título</th>
                <th scope="col">Encargos</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="sr-only">Acción</span></th>
              </tr>
            </thead>
            <tbody>
              <tr className={activaOrden === 0 ? 'adm-fila-activa' : undefined}>
                <th scope="row" className="mono">{DEMO.etiqueta}</th>
                <td>{DEMO.titulo}</td>
                <td>—</td>
                <td>{activaOrden === 0
                  ? <span className="tag tag-accent">Activa</span>
                  : <span className="tag tag-neutral">Abierta</span>}</td>
                <td>
                  {activaOrden !== 0 && (
                    <button className="btn btn-secondary" onClick={() => setPorActivar({ id: null, etiqueta: 'solo la demo' })}>
                      Volver a la demo
                    </button>
                  )}
                </td>
              </tr>
              {sesiones.map((s) => {
                const esActiva = s.id === estado?.active_session_id
                const abierta = s.order_index <= activaOrden
                return <tr key={s.id} className={esActiva ? 'adm-fila-activa' : undefined}>
                  <th scope="row" className="mono">Día {s.day_number} · {s.code}</th>
                  <td>{s.title}</td>
                  <td>{s.challenges_count}</td>
                  <td>
                    {esActiva
                      ? <span className="tag tag-accent">Activa</span>
                      : abierta
                        ? <span className="tag tag-neutral">Abierta</span>
                        : <span className="tag tag-outline">Bloqueada</span>}
                  </td>
                  <td>
                    {!esActiva && (
                      <button className="btn btn-secondary" onClick={() => setPorActivar({ id: s.id, etiqueta: `Día ${s.day_number} · ${s.title}` })}>
                        Activar
                      </button>
                    )}
                  </td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
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

    {porActivar && <Dialogo
      titulo="Cambiar lo que ven tus alumnos"
      pendiente={pendiente}
      onCancelar={() => setPorActivar(null)}
      onConfirmar={() => void activar()}
    >
      <p>
        {porActivar.id === null
          ? 'Tus alumnos volverán a tener solo la demo: ningún día quedará abierto.'
          : `Tus alumnos podrán abrir todo hasta ${porActivar.etiqueta}. Lo anterior sigue disponible; lo posterior queda bloqueado.`}
      </p>
      <p className="text-muted">El trabajo que ya hayan guardado no se pierde.</p>
    </Dialogo>}
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
