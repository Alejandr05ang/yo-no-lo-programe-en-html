import { useState, useEffect, type FormEvent } from 'react'
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
    <div className="field"><label htmlFor="profile-description">Sobre mÃ­</label><textarea id="profile-description" className="input" maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
    <div className="field"><label htmlFor="profile-site">Sitio web HTTPS (opcional)</label><input id="profile-site" className="input" type="url" inputMode="url" placeholder="https://" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} /></div>
    <div className="field"><label htmlFor="profile-avatar">Avatar JPEG, PNG o WebP (opcional)</label><input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /></div>
    <button className="btn btn-primary" disabled={pending}>{pending ? 'Guardandoâ€¦' : 'Guardar y continuar'}</button>
  </form>
}

export function JoinClassForm() {
  const auth = useAuth()
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
      await auth.refresh()
      setTimeout(() => {
        window.location.assign('/mapa')
      }, 2000)
    } catch (failure) {
      setError(friendlyAuthError(failure))
      setPending(false)
    }
  }

  if (successData) {
    return <div className="auth-form onboarding-form">
      <p className="auth-message" role="status" style={{ background: '#d4edda', color: '#155724', padding: '1rem', borderRadius: '4px' }}>
        <strong>Â¡Te has unido a la clase!</strong><br />
        Clase: {successData.cohort_name}<br />
        MembresÃ­a: Activa
      </p>
      <p>Redirigiendo a tu mapa...</p>
    </div>
  }

  return <form className="auth-form onboarding-form" onSubmit={(event) => void submit(event)} aria-busy={pending}>
    {error && <p className="auth-message" role="alert">{error}</p>}
    <div className="field"><label htmlFor="join-code">CÃ³digo de clase</label><input id="join-code" className="input mono" minLength={8} maxLength={80} autoCapitalize="characters" autoComplete="off" required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></div>
    <button className="btn btn-primary" disabled={pending}>{pending ? 'Comprobandoâ€¦' : 'Entrar a clase'}</button>
  </form>
}
