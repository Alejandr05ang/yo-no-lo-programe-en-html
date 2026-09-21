import { useEffect, useState } from 'react'

export function InstructorDashboard() {
  const [cohorts, setCohorts] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchCohorts = async () => {
      const headers = { 'content-type': 'application/json' }
      const res = await fetch('/api/instructor/cohorts', { headers })
      if (res.ok) {
        const data = await res.json()
        setCohorts(data)
        if (data.length > 0) setSelectedCohort(data[0].id)
      }
    }
    fetchCohorts()
  }, [])

  useEffect(() => {
    if (!selectedCohort) return
    const fetchStudents = async () => {
      const headers = { 'content-type': 'application/json' }
      const res = await fetch(`/api/instructor/cohorts/${selectedCohort}/students`, { headers })
      if (res.ok) {
        setStudents(await res.json())
      }
    }
    fetchStudents()
  }, [selectedCohort])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1rem' }}>
      <h1>Panel de Instructor</h1>
      
      {cohorts.length > 0 ? (
        <div style={{ marginBottom: '2rem' }}>
          <label><strong>Cohorte: </strong></label>
          <select value={selectedCohort || ''} onChange={e => setSelectedCohort(e.target.value)}>
            {cohorts.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <p>No tienes cohortes asignadas.</p>
      )}

      {selectedCohort && (
        <section>
          <h2>Estudiantes</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Nombre</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Email</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{s.full_name || s.display_name || 'Sin nombre'}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{s.email}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: '0.5rem' }}>No hay estudiantes en esta cohorte.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
