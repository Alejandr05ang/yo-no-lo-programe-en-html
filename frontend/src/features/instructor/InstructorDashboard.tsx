import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import { ApiError } from '../../lib/http'

/** Campos que devuelven GET /api/instructor/cohorts y
 *  GET /api/instructor/cohorts/{cohort_id}/students (app/instructor/routes.py). */
interface InstructorCohort { id: string; name: string; slug: string; is_active: boolean }
type MembershipStatus = 'active' | 'removed' | 'pending'
interface CohortStudent {
  id: string; email: string; full_name: string; display_name: string
  joined_at: string | null; status: MembershipStatus
}
const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = { active: 'Activo', removed: 'Retirado', pending: 'Pendiente' }

function isList(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((item) => item !== null && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
}

function studentName(student: CohortStudent): string {
  return student.full_name || student.display_name || 'Sin nombre'
}

function isStudent(value: unknown): value is CohortStudent {
  if (value === null || typeof value !== 'object') return false
  const student = value as Record<string, unknown>
  return ['id', 'email', 'full_name', 'display_name'].every((field) => typeof student[field] === 'string')
    && (student.joined_at === null || typeof student.joined_at === 'string')
    && (student.status === 'active' || student.status === 'removed' || student.status === 'pending')
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
  const [confirmation, setConfirmation] = useState<{ studentId: string; status: 'active' | 'removed' } | null>(null)
  const [membershipPending, setMembershipPending] = useState(false)
  const [membershipError, setMembershipError] = useState<string | null>(null)
  const [membershipSuccess, setMembershipSuccess] = useState<string | null>(null)
  const membershipRequest = useRef<AbortController | null>(null)
  // Desde el panel de administración se llega con la cohorte que se estaba viendo.
  const [params] = useSearchParams()
  const requestedCohort = useRef(params.get('cohort'))

  useEffect(() => {
    if (!api) return
    const controller = new AbortController()
    setCohortsLoading(true)
    setCohortsError(null)
    void (async () => {
      try {
        const response = await api.request<unknown>('/instructor/cohorts', { signal: controller.signal })
        if (controller.signal.aborted) return
        if (!isList(response)) throw new Error('respuesta inesperada')
        const list = response as unknown as InstructorCohort[]
        setCohorts(list)
        setSelectedCohort(list.find((cohort) => cohort.id === requestedCohort.current)?.id ?? list[0]?.id ?? null)
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
    membershipRequest.current?.abort()
    membershipRequest.current = null
    setConfirmation(null)
    setMembershipPending(false)
    setMembershipError(null)
    setMembershipSuccess(null)
    if (!api || !selectedCohort) return
    const controller = new AbortController()
    setStudents([])
    setStudentsLoading(true)
    setStudentsError(null)
    void (async () => {
      try {
        const response = await api.request<unknown>(`/instructor/cohorts/${selectedCohort}/students`, { signal: controller.signal })
        if (controller.signal.aborted) return
        if (!Array.isArray(response) || !response.every(isStudent)) throw new ApiError('INVALID_RESPONSE')
        setStudents(response)
      } catch (failure) {
        if (controller.signal.aborted) return
        setStudentsError(friendlyAuthError(failure))
      } finally {
        if (!controller.signal.aborted) setStudentsLoading(false)
      }
    })()
    return () => {
      controller.abort()
      membershipRequest.current?.abort()
    }
  }, [api, selectedCohort])

  const current = useMemo(() => cohorts.find((cohort) => cohort.id === selectedCohort) ?? null, [cohorts, selectedCohort])

  const updateMembership = async () => {
    if (!api || !selectedCohort || !confirmation || membershipRequest.current) return
    const { studentId, status } = confirmation
    const controller = new AbortController()
    membershipRequest.current = controller
    setMembershipPending(true)
    setMembershipError(null)
    setMembershipSuccess(null)
    try {
      const response = await api.request<unknown>(`/instructor/cohorts/${selectedCohort}/students/${studentId}/membership`, {
        method: 'PATCH', json: { status }, signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (!isStudent(response) || response.id !== studentId || response.status !== status) throw new ApiError('INVALID_RESPONSE')
      setStudents((previous) => previous.map((student) => student.id === studentId ? response : student))
      setConfirmation(null)
      setMembershipSuccess(`${studentName(response)}: acceso ${status === 'removed' ? 'retirado' : 'reactivado'}.`)
    } catch (failure) {
      if (!controller.signal.aborted) setMembershipError(friendlyAuthError(failure))
    } finally {
      if (!controller.signal.aborted) setMembershipPending(false)
      if (membershipRequest.current === controller) membershipRequest.current = null
    }
  }

  return (
    <AccountFrame>
      <div className="kicker">Docencia</div>
      <h1>Panel de instructor</h1>
      <p className="text-muted">Consulta tus cohortes y gestiona el acceso de sus estudiantes.</p>

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
            <select id={cohortFieldId} className="input" value={selectedCohort ?? ''} onChange={(event) => {
              membershipRequest.current?.abort()
              setSelectedCohort(event.target.value)
            }}>
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
          {membershipError && <p className="auth-message" role="alert">{membershipError}</p>}
          {membershipSuccess && <p className="auth-message" role="status">{membershipSuccess}</p>}
          {studentsLoading && <p role="status">Cargando estudiantes…</p>}
          {!studentsLoading && !studentsError && (
            <div style={{ overflowX: 'auto' }}>
            <table className="table" aria-busy={membershipPending}>
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acceso</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{studentName(student)}</td>
                    <td className="mono">{student.email}</td>
                    <td><span className={student.status === 'active' ? 'tag tag-accent' : 'tag tag-outline'}>{MEMBERSHIP_LABEL[student.status]}</span></td>
                    <td>
                      {confirmation?.studentId === student.id ? (
                        <div role="group" aria-label={`Confirmar acceso de ${studentName(student)}`}>
                          <p>¿{confirmation.status === 'removed' ? 'Retirar' : 'Reactivar'} el acceso de <strong>{studentName(student)}</strong> en {current?.name}?</p>
                          <p className="text-muted">{confirmation.status === 'removed'
                            ? 'Perderá el acceso a esta cohorte y no podrá volver a entrar con el código. Su progreso se conserva; podrás reactivar su acceso aquí.'
                            : 'Volverá a acceder a los días habilitados de esta cohorte con su progreso guardado.'}</p>
                          <button type="button" className="btn btn-secondary" disabled={membershipPending} onClick={() => { setConfirmation(null); setMembershipError(null) }}>Cancelar</button>
                          {' '}
                          <button type="button" className="btn btn-primary" disabled={membershipPending} onClick={() => void updateMembership()}>
                            {membershipPending ? 'Aplicando…' : confirmation.status === 'removed' ? 'Confirmar retiro' : 'Confirmar reactivación'}
                          </button>
                        </div>
                      ) : student.status !== 'pending' ? (
                        <button type="button" className="btn btn-secondary" disabled={membershipPending}
                          aria-label={`${student.status === 'active' ? 'Retirar' : 'Reactivar'} a ${studentName(student)}`}
                          onClick={() => {
                            setConfirmation({ studentId: student.id, status: student.status === 'active' ? 'removed' : 'active' })
                            setMembershipError(null)
                            setMembershipSuccess(null)
                          }}>
                          {student.status === 'active' ? 'Retirar' : 'Reactivar'}
                        </button>
                      ) : <span className="text-muted">Sin acceso activo</span>}
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td className="text-muted" colSpan={4}>No hay estudiantes en esta cohorte.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </section>
      )}
    </AccountFrame>
  )
}
