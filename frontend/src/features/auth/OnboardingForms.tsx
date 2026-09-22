import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { friendlyAuthError } from './session'
import { useAuth } from './authContext'

export function ProfileForm() {
  const auth = useAuth()
  const current = auth.session?.user
  const [fullName, setFullName] = useState(current?.full_name ?? '')
  const [displayName, setDisplayName] = useState(current?.display_name ?? '')
  const [description, setDescription] = useState(current?.description ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(current?.website_url ?? '')
  
  useEffect(() => {
    if (current) {
      setFullName(current.full_name ?? '')
      setDisplayName(current.display_name ?? '')
      setDescription(current.description ?? '')
      setWebsiteUrl(current.website_url ?? '')
    }
  }, [current])
  const [avatar, setAvatar] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth.api || pending) return
    setPending(true)
    setError(null)
    try {
      await auth.api.request('/profile', {
        method: 'PUT',
        json: {
          full_name: fullName,
          display_name: displayName,
          description,
          website_url: websiteUrl || null,
          github_url: current?.github_url ?? null,
          linkedin_url: current?.linkedin_url ?? null,
        },
      })
      if (avatar) {
        const form = new FormData()
        form.append('avatar', avatar)
        await auth.api.request('/profile/avatar', { method: 'POST', form })
      }
      await auth.refresh()
    } catch (failure) {
      setError(friendlyAuthError(failure))
    } finally {
      setPending(false)
    }
  }

  return <form className="auth-form onboarding-form" onSubmit={(event) => void submit(event)} aria-busy={pending}>
    {error && <p className="auth-message" role="alert">{error}</p>}
    <div className="field"><label htmlFor="profile-name">Nombre completo</label><input id="profile-name" className="input" minLength={2} maxLength={120} required value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
    <div className="field"><label htmlFor="profile-display">Nombre para mostrar</label><input id="profile-display" className="input" minLength={2} maxLength={80} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></div>
    <div className="field"><label htmlFor="profile-description">Sobre mí</label><textarea id="profile-description" className="input" maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
    <div className="field"><label htmlFor="profile-site">Sitio web HTTPS (opcional)</label><input id="profile-site" className="input" type="url" inputMode="url" placeholder="https://" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} /></div>
    <div className="field"><label htmlFor="profile-avatar">Avatar JPEG, PNG o WebP (opcional)</label><input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /></div>
    <button className="btn btn-primary" disabled={pending}>{pending ? 'Guardando…' : 'Guardar y continuar'}</button>
  </form>
}

export function JoinClassForm({ onUnido }: { onUnido?: () => void } = {}) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{ cohort_name: string; joined: boolean } | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth.api || pending) return
    setPending(true)
    setError(null)
    try {
      const response = await auth.api.request<{ cohort_name: string, joined: boolean }>('/cohorts/join', { method: 'POST', json: { code } })
      setSuccessData(response)
      // Refrescar primero: el mapa exige la membresía que acaba de crearse.
      await auth.refresh()
      if (onUnido) onUnido()
      else navigate('/mapa', { replace: true })
    } catch (failure) {
      setError(friendlyAuthError(failure))
      setPending(false)
    }
  }

  if (successData) {
    return <div className="auth-form onboarding-form">
      <p className="auth-message" role="status">
        <strong>{successData.joined ? '¡Ya estás dentro!' : 'Ya pertenecías a esta clase.'}</strong><br />
        Clase: {successData.cohort_name}
      </p>
      <p>Abriendo tu mapa…</p>
    </div>
  }

  return <form className="auth-form onboarding-form" onSubmit={(event) => void submit(event)} aria-busy={pending}>
    {error && <p className="auth-message" role="alert">{error}</p>}
    <div className="field">
      <label htmlFor="join-code">Código de acceso</label>
      <input id="join-code" className="input mono" minLength={8} maxLength={80} autoCapitalize="characters"
        autoComplete="off" required aria-describedby="join-ayuda" value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())} disabled={pending} />
      <p id="join-ayuda" className="auth-help">Te lo da tu docente al empezar el taller.</p>
    </div>
    <button className="btn btn-primary" disabled={pending}>{pending ? 'Comprobando…' : 'Unirme a la clase'}</button>
  </form>
}
