import { useEffect, useId, useMemo, useState } from 'react'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'

/** Campos que devuelven GET /api/instructor/cohorts y
 *  GET /api/instructor/cohorts/{cohort_id}/students (app/instructor/routes.py). */
interface InstructorCohort { id: string; name: string; slug: string; is_active: boolean }
interface CohortStudent { id: string; email: string; full_name: string; display_name: string }

function isList(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((item) => item !== null && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
}

function studentName(student: CohortStudent): string {
  return student.full_name || student.display_name || 'Sin nombre'
}

export function InstructorDashboard() {
  const { api } = useAuth()
  const cohortFieldId = useId()
  const [cohorts, setCohorts] = useState<InstructorCohort[]>([])
  const [cohortsLoading, setCohortsLoading] = useState(true)
  const [cohortsError, setCohortsError] = useState<string | null>(null)
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  const [students, setStudents] = useState<CohortStudent[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsError, setStudentsError] = useState<string | null>(null)

  useEffect(() => {
    if (!api) return
    const controller = new AbortController()
    setCohortsLoading(true)
    setCohortsError(null)
    void (async () => {
      try {
        const response = await api.request<unknown>('/instructor/cohorts', { signal: controller.signal })
        if (!isList(response)) throw new Error('respuesta inesperada')
        const list = response as unknown as InstructorCohort[]
        setCohorts(list)
        setSelectedCohort(list.length > 0 ? list[0].id : null)
      } catch (failure) {
        if (controller.signal.aborted) return
        setCohorts([])
        setSelectedCohort(null)
        setCohortsError(friendlyAuthError(failure))
      } finally {
        if (!controller.signal.aborted) setCohortsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [api])

  useEffect(() => {
    if (!api || !selectedCohort) return
    const controller = new AbortController()
    setStudents([])
    setStudentsLoading(true)
    setStudentsError(null)
    void (async () => {
      try {
        const response = await api.request<unknown>(`/instructor/cohorts/${selectedCohort}/students`, { signal: controller.signal })
        if (!isList(response)) throw new Error('respuesta inesperada')
        setStudents(response as unknown as CohortStudent[])
      } catch (failure) {
        if (controller.signal.aborted) return
        setStudentsError(friendlyAuthError(failure))
      } finally {
        if (!controller.signal.aborted) setStudentsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [api, selectedCohort])

  const current = useMemo(() => cohorts.find((cohort) => cohort.id === selectedCohort) ?? null, [cohorts, selectedCohort])

  return (
    <AccountFrame>
      <div className="kicker">Docencia</div>
      <h1>Panel de instructor</h1>
      <p className="text-muted">Consulta tus cohortes y quiénes están matriculados en cada una.</p>

      {cohortsError && <p className="auth-message" role="alert">{cohortsError}</p>}
      {cohortsLoading && <p role="status">Cargando tus cohortes…</p>}

      {!cohortsLoading && !cohortsError && cohorts.length === 0 && (
        <p role="status">No tienes cohortes asignadas.</p>
      )}

      {cohorts.length > 0 && (
        <section className="card account-status">
          <h2>Tus cohortes</h2>
          <div className="field">
            <label htmlFor={cohortFieldId}>Cohorte</label>
            <select id={cohortFieldId} className="input" value={selectedCohort ?? ''} onChange={(event) => setSelectedCohort(event.target.value)}>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
              ))}
            </select>
          </div>
          {current && (
            <p className="card-meta">
              <span className="mono">{current.slug}</span>
              <span className={current.is_active ? 'tag tag-accent' : 'tag tag-outline'}>{current.is_active ? 'activa' : 'inactiva'}</span>
            </p>
          )}
        </section>
      )}

      {selectedCohort && (
        <section className="card account-status">
          <h2>Estudiantes</h2>
          {studentsError && <p className="auth-message" role="alert">{studentsError}</p>}
          {studentsLoading && <p role="status">Cargando estudiantes…</p>}
          {!studentsLoading && !studentsError && (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{studentName(student)}</td>
                    <td className="mono">{student.email}</td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td className="text-muted" colSpan={2}>No hay estudiantes en esta cohorte.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      )}
    </AccountFrame>
  )
}
