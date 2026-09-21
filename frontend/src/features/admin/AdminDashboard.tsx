import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'

export function AdminDashboard() {
  const { api } = useAuth()
  const [metrics, setMetrics] = useState({ cohorts_count: 0, students_count: 0 })
  const [cohorts, setCohorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'dashboard' | 'create' | 'detail'>('dashboard')
  const [selectedCohort, setSelectedCohort] = useState<any>(null)

  const loadData = async () => {
    if (!api) return
    try {
      setLoading(true)
      const m = await api.request<any>('/admin/dashboard')
      setMetrics(m)
      const c = await api.request<any[]>('/admin/cohorts')
      setCohorts(c)
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [api])

  if (loading) return <div className="account-shell"><p>Cargando panel...</p></div>

  return (
    <div className="account-shell" style={{ maxWidth: 1000, margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Panel de AdministraciÃ³n</h1>
          <p style={{ margin: 0, color: '#666' }}>Gestiona cohortes, estudiantes y configuraciÃ³n.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/demo" className="btn btn-secondary">Ver demo</Link>
          {view === 'dashboard' && <button className="btn btn-primary" onClick={() => setView('create')}>Nueva cohorte</button>}
          {view !== 'dashboard' && <button className="btn btn-secondary" onClick={() => setView('dashboard')}>Volver al dashboard</button>}
        </div>
      </header>
      
      {error && <p className="auth-message" role="alert">{error}</p>}

      {view === 'dashboard' && <DashboardView metrics={metrics} cohorts={cohorts} onSelect={(c) => { setSelectedCohort(c); setView('detail'); }} onCreate={() => setView('create')} />}
      {view === 'create' && <CreateCohortView onCreated={() => { setView('dashboard'); void loadData(); }} />}
      {view === 'detail' && <CohortDetailView cohort={selectedCohort} onRefresh={() => { void loadData(); }} />}
    </div>
  )
}

function DashboardView({ metrics, cohorts, onSelect, onCreate }: { metrics: any, cohorts: any[], onSelect: (c: any) => void, onCreate: () => void }) {
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>{metrics.cohorts_count}</h2>
        <p style={{ margin: 0, color: '#666' }}>Cohortes activas</p>
      </div>
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>{metrics.students_count}</h2>
        <p style={{ margin: 0, color: '#666' }}>Estudiantes totales</p>
      </div>
    </div>

    <section className="card">
      <h2>Tus Cohortes</h2>
      {cohorts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p>No hay cohortes creadas todavÃ­a.</p>
          <button className="btn btn-primary" onClick={onCreate}>Crear primera cohorte</button>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.75rem' }}>Nombre</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.75rem' }}>Slug</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.75rem' }}>Estado</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'right', padding: '0.75rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map(c => (
              <tr key={c.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.75rem' }}>{c.name}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.75rem' }}><code className="mono">{c.slug}</code></td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.75rem' }}>{c.is_active ? 'âœ… Activa' : 'âŒ Inactiva'}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.75rem', textAlign: 'right' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={() => onSelect(c)}>Ver cohorte</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  </>
}

function CreateCohortView({ onCreated }: { onCreated: (c: any) => void }) {
  const { api } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', is_active: true })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!api || pending) return
    setPending(true)
    setError(null)
    try {
      const res = await api.request<any>('/admin/cohorts', { method: 'POST', json: formData })
      setJoinCode(res.join_code_plaintext)
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setPending(false)
    }
  }

  if (joinCode) {
    return <div className="card">
      <p className="auth-message" style={{ background: '#d4edda', color: '#155724', padding: '1rem', borderRadius: '4px' }}>
        <strong>Â¡Cohorte creada exitosamente!</strong>
      </p>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>CÃ³digo de acceso generado (solo se muestra una vez):</p>
        <h2 className="mono" style={{ fontSize: '2rem', letterSpacing: '0.1em' }}>{joinCode}</h2>
        <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(joinCode)}>Copiar cÃ³digo</button>
      </div>
      <button className="btn btn-primary" onClick={() => onCreated(null)}>Continuar</button>
    </div>
  }

  return <section className="card">
    <h2>Nueva cohorte</h2>
    <form className="auth-form" onSubmit={(e) => void submit(e)} aria-busy={pending}>
      {error && <p className="auth-message" role="alert">{error}</p>}
      <div className="field">
        <label htmlFor="c-name">Nombre</label>
        <input id="c-name" className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="c-slug">Slug (solo minÃºsculas y guiones)</label>
        <input id="c-slug" className="input mono" required pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="c-desc">DescripciÃ³n</label>
        <textarea id="c-desc" className="input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
      </div>
      <div className="field" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input type="checkbox" id="c-active" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
        <label htmlFor="c-active" style={{ margin: 0 }}>Cohorte activa</label>
      </div>
      <button className="btn btn-primary" disabled={pending}>{pending ? 'Guardando...' : 'Crear cohorte'}</button>
    </form>
  </section>
}

function CohortDetailView({ cohort, onRefresh }: { cohort: any, onRefresh: () => void }) {
  const { api } = useAuth()
  const [students, setStudents] = useState<any[]>([])
  const [pending, setPending] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)
  
  useEffect(() => {
    if (!api) return
    void api.request<any[]>(`/admin/cohorts/${cohort.id}/students`).then(setStudents)
  }, [api, cohort.id])

  const regenerateCode = async () => {
    if (!confirm('Â¿EstÃ¡s seguro de invalidar el cÃ³digo anterior y generar uno nuevo?')) return
    if (!api || pending) return
    setPending(true)
    try {
      const res = await api.request<any>(`/admin/cohorts/${cohort.id}/regenerate-code`, { method: 'POST' })
      setNewCode(res.join_code_plaintext)
    } catch (err) {
      alert(friendlyAuthError(err))
    } finally {
      setPending(false)
    }
  }

  const advanceSession = async () => {
    const sessionId = prompt('Introduce el ID (UUID) de la sesiÃ³n a habilitar. DÃ©jalo en blanco para limpiar la sesiÃ³n activa.')
    if (sessionId === null) return
    if (!api || pending) return
    if (sessionId !== '' && !confirm(`Vas a habilitar la sesiÃ³n [${sessionId}] para esta cohorte. Â¿Continuar?`)) return
    setPending(true)
    try {
      await api.request<any>(`/admin/cohorts/${cohort.id}/active-session`, { method: 'PATCH', json: { active_session_id: sessionId || null } })
      alert('SesiÃ³n actualizada correctamente.')
      onRefresh()
    } catch (err) {
      alert(friendlyAuthError(err))
    } finally {
      setPending(false)
    }
  }

  return <div>
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h2>{cohort.name} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#666' }}>({cohort.slug})</span></h2>
      <p><strong>Estado:</strong> {cohort.is_active ? 'Activa' : 'Inactiva'}</p>
      <p><strong>Estudiantes matriculados:</strong> {students.length}</p>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => void regenerateCode()} disabled={pending}>Regenerar cÃ³digo</button>
        <button className="btn btn-secondary" onClick={() => void advanceSession()} disabled={pending}>Cambiar sesiÃ³n</button>
      </div>

      {newCode && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff3cd', color: '#856404', borderRadius: '4px' }}>
          <strong>Nuevo cÃ³digo de acceso generado:</strong> <code className="mono" style={{ fontSize: '1.25rem' }}>{newCode}</code>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>CÃ³pialo ahora, no se volverÃ¡ a mostrar.</p>
        </div>
      )}
    </div>

    <div className="card">
      <h3>Estudiantes</h3>
      {students.length === 0 ? <p>No hay estudiantes en esta cohorte.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Nombre</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Email</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{s.full_name || s.display_name || '(Sin nombre)'}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{s.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
}