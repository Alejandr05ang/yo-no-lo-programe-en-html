import { useEffect, useState } from 'react'

export function AdminDashboard() {
  const [metrics, setMetrics] = useState({ cohorts_count: 0, students_count: 0 })
  const [cohorts, setCohorts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [admins, setAdmins] = useState<any[]>([])
  const [flags, setFlags] = useState<any[]>([])
  
  useEffect(() => {
    const fetchAll = async () => {
      // Usar localStorage.getItem('token') es inseguro pero para el MVP de frontend está bien.
      // O si usan cookies, el backend manejará auth. Asumiendo fetch nativo hereda credentials si es necesario.
      const headers = { 'content-type': 'application/json' }
      
      const resM = await fetch('/api/admin/dashboard', { headers })
      if (resM.ok) setMetrics(await resM.json())
      
      const resC = await fetch('/api/admin/cohorts', { headers })
      if (resC.ok) setCohorts(await resC.json())
      
      const resU = await fetch('/api/admin/users', { headers })
      if (resU.ok) setUsers(await resU.json())
      
      const resA = await fetch('/api/admin/admins', { headers })
      if (resA.ok) setAdmins(await resA.json())
      
      const resF = await fetch('/api/admin/feature-flags', { headers })
      if (resF.ok) setFlags(await resF.json())
    }
    fetchAll()
  }, [])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1rem' }}>
      <h1>Panel de Administración</h1>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <h2>{metrics.cohorts_count}</h2>
          <p>Cohortes</p>
        </div>
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <h2>{metrics.students_count}</h2>
          <p>Estudiantes</p>
        </div>
      </div>
      
      <section>
        <h2>Cohortes</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Nombre</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Slug</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map(c => (
              <tr key={c.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{c.name}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{c.slug}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{c.is_active ? 'Activa' : 'Inactiva'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      <section>
        <h2>Usuarios Recientes</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Email</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.slice(0, 10).map(u => (
              <tr key={u.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{u.email}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
    </div>
  )
}
