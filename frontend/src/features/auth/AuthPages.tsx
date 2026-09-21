import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, NavLink } from 'react-router-dom'
import { useAuth } from './authContext'
import { friendlyAuthError, onboardingPath } from './session'
import { JoinClassForm, ProfileForm } from './OnboardingForms'
import './auth.css'

function useAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const busy = useRef(false)
  async function run(action: () => Promise<void>, message?: string) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError(null)
    setSuccess(null)
    try {
      await action()
      if (message) setSuccess(message)
    } catch (failure) {
      setError(friendlyAuthError(failure))
    } finally { busy.current = false; setPending(false) }
  }
  return { pending, error, success, run }
}

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => { document.title = `${title} · Taller de desarrollo web` }, [title])
  return (
    <div className="auth-shell">
      <aside className="auth-intro" aria-label="El taller">
        <Link className="auth-brand" to="/">Taller <span>·</span> Portafolio</Link>
        <div className="auth-promise">
          <p className="kicker">Tutorías de verano</p>
          <h1>Construye algo<br /> que sea tuyo.</h1>
          <p>Una idea, tus primeras líneas de código y un portafolio que crece contigo. Cada encargo suma a lo que ya construiste.</p>
        </div>
        <p className="auth-intro-foot">Dos semanas. Un proyecto propio.</p>
      </aside>
      <main className="auth-panel">
        <div className="auth-content">
          <h2>{title}</h2>
          {children}
        </div>
      </main>
    </div>
  )
}

function Feedback({ error, success }: { error?: string | null; success?: string | null }) {
  return <>
    {error && <p className="auth-message" role="alert">{error}</p>}
    {success && <p className="auth-message" role="status">{success}</p>}
  </>
}

export function LoadingPage() {
  return <AuthLayout title="Preparando tu cuenta"><p role="status">Comprobando tu sesión…</p></AuthLayout>
}

export function SessionDestination() {
  const { user, session } = useAuth()
  if (sessionStorage.getItem('goto_demo') === '1') {
    sessionStorage.removeItem('goto_demo')
    return <Navigate to="/demo" replace />
  }
  if (user && !user.emailVerified) return <Navigate to="/verificar-email" replace />
  return <Navigate to={session ? onboardingPath(session.onboarding.state) : '/cuenta'} replace />
}

export function AuthPage({ register = false }: { register?: boolean }) {
  const auth = useAuth()
  const action = useAction()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const passwordId = useId()
  const disabled = action.pending || !auth.initialized || Boolean(auth.configurationError)
  if (!auth.initialized) return <LoadingPage />
  if (auth.user) return <SessionDestination />
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void action.run(async () => {
      try {
        if (register) {
          const res = await auth.signUp(email, password)
          if (res.isNewUser) sessionStorage.setItem('goto_demo', '1')
        } else {
          await auth.signIn(email, password)
        }
      }
      finally { setPassword('') }
    })
  }
  return (
    <AuthLayout title={register ? 'Crea tu cuenta' : 'Vuelve a tu proyecto'}>
      <p>{register ? 'Empieza por tu cuenta. Después completarás tu perfil y te unirás a tu clase.' : 'Entra con el método que usaste al crear tu cuenta.'}</p>
      <Feedback error={auth.configurationError ?? action.error ?? auth.sessionError} />
      <button className="btn btn-secondary btn-block" disabled={disabled} onClick={() => void action.run(async () => {
        const res = await auth.signInGoogle()
        if (res.isNewUser) sessionStorage.setItem('goto_demo', '1')
      })}>
        {action.pending ? 'Un momento…' : 'Continuar con Google'}
      </button>
      <div className="auth-divider" aria-hidden="true"><span>o con tu correo</span></div>
      <form className="auth-form" onSubmit={submit} aria-busy={action.pending}>
        <div className="field">
          <label htmlFor="auth-email">Correo electrónico</label>
          <input id="auth-email" className="input" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={disabled} />
        </div>
        <div className="field">
          <label htmlFor={passwordId}>Contraseña</label>
          <div className="auth-password">
            <input id={passwordId} className="input" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 6 : undefined} aria-describedby={register ? 'password-help' : undefined} value={password} onChange={(event) => setPassword(event.target.value)} disabled={disabled} />
            <button className="btn btn-secondary" type="button" aria-controls={passwordId} aria-pressed={visible} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
          </div>
          {register && <p id="password-help" className="auth-help">Usa al menos 6 caracteres. El servicio de acceso comprobará los requisitos de tu contraseña.</p>}
        </div>
        {!register && <Link to="/recuperar">Olvidé mi contraseña</Link>}
        <button className="btn btn-primary btn-block" disabled={disabled}>{action.pending ? 'Un momento…' : register ? 'Crear mi cuenta' : 'Iniciar sesión'}</button>
      </form>
      <p className="auth-footer">{register ? '¿Ya tienes cuenta?' : '¿Es tu primera vez?'} <Link to={register ? '/login' : '/registro'}>{register ? 'Inicia sesión' : 'Crea tu cuenta'}</Link></p>
      <p className="auth-help">Si compartes este computador, cierra sesión al terminar. Tu acceso se conserva solo en esta pestaña.</p>
    </AuthLayout>
  )
}

export function RecoveryPage() {
  const auth = useAuth()
  const action = useAction()
  const [email, setEmail] = useState('')
  return (
    <AuthLayout title="Recupera tu acceso">
      <p>Escribe el correo con el que creaste tu cuenta.</p>
      <Feedback error={auth.configurationError ?? action.error} success={action.success} />
      <form className="auth-form" aria-busy={action.pending} onSubmit={(event) => {
        event.preventDefault()
        void action.run(() => auth.resetPassword(email), 'Si existe una cuenta compatible con ese correo, recibirás instrucciones.')
      }}>
        <div className="field">
          <label htmlFor="recovery-email">Correo electrónico</label>
          <input id="recovery-email" className="input" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} required disabled={action.pending} />
        </div>
        <button className="btn btn-primary" disabled={action.pending || Boolean(auth.configurationError)}>{action.pending ? 'Enviando…' : 'Enviar instrucciones'}</button>
      </form>
      <Link to="/login">Volver al inicio de sesión</Link>
    </AuthLayout>
  )
}

export function VerificationPage() {
  const auth = useAuth()
  const action = useAction()
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  if (auth.session && auth.session.onboarding.state !== 'EMAIL_VERIFICATION_REQUIRED') return <Navigate to={onboardingPath(auth.session.onboarding.state)} replace />
  return (
    <AuthLayout title="Verifica tu correo">
      <OnboardingSteps current={1} />
      <p>Para continuar, abre el enlace de verificación de tu correo <strong>{auth.user?.email}</strong>. Si no lo encuentras, revisa la carpeta de correo no deseado o solicita otro enlace.</p>
      <Feedback error={action.error ?? auth.verificationError} success={action.success} />
      <div className="auth-actions">
        <button className="btn btn-primary" disabled={action.pending || auth.loading} onClick={() => void action.run(auth.refresh, 'Comprobación terminada. Si aún no has abierto el enlace, revisa tu correo.')}>{action.pending || auth.loading ? 'Comprobando…' : 'Ya verifiqué mi correo'}</button>
        <button className="btn btn-secondary" disabled={action.pending || cooldown > 0} onClick={() => void action.run(async () => { await auth.sendVerification(); setCooldown(60) }, 'Enlace enviado. Revisa tu correo.')}>
          {cooldown ? `Podrás reenviar en ${cooldown} s` : 'Reenviar verificación'}
        </button>
      </div>
      {auth.sessionError && <Feedback error={auth.sessionError} />}
      <button className="btn btn-ghost" disabled={action.pending} onClick={() => void action.run(auth.signOut)}>Cerrar sesión</button>
    </AuthLayout>
  )
}

function OnboardingSteps({ current }: { current: 1 | 2 | 3 }) {
  return <ol className="auth-steps" aria-label="Preparación de tu cuenta">
    {['Cuenta', 'Perfil', 'Clase'].map((step, index) => <li key={step} aria-current={index + 1 === current ? 'step' : undefined}><span>{index + 1}</span>{step}</li>)}
  </ol>
}

export function AccountFrame({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth()
  const action = useAction()
  return <div className="account-shell">
    <nav className="nav account-nav" aria-label="Navegación de tu cuenta">
      <Link className="nav-brand" to="/cuenta">Taller · Portafolio</Link>
      <NavLink to="/cuenta">Mi cuenta</NavLink>
      {session?.user.role === 'instructor' && <NavLink to="/instructor">Mis clases</NavLink>}
      {session?.user.role === 'admin' && <NavLink to="/admin">Administración</NavLink>}
      <button className="btn btn-secondary" disabled={action.pending} onClick={() => void action.run(signOut)}>{action.pending ? 'Saliendo…' : 'Cerrar sesión'}</button>
    </nav>
    <main className="account-main">
      <Feedback error={action.error} />
      {children}
    </main>
  </div>
}

export function AccountPage({ stage }: { stage?: 'profile' | 'class' }) {
  const auth = useAuth()
  const action = useAction()
  const googleConnected = auth.user?.providerData.some((provider) => provider.providerId === 'google.com') ?? false
  const state = auth.session?.onboarding.state
  if (state === 'EMAIL_VERIFICATION_REQUIRED') return <Navigate to="/verificar-email" replace />
  if (stage && state && onboardingPath(state) !== (stage === 'profile' ? '/onboarding/perfil' : '/onboarding/clase')) return <Navigate to={onboardingPath(state)} replace />
  return (
    <AccountFrame>
      <div className="kicker">Tu cuenta</div>
      <h1>{stage === 'profile' ? 'El siguiente paso: tu perfil' : stage === 'class' ? 'El siguiente paso: tu clase' : 'Tu lugar en el taller'}</h1>
      <OnboardingSteps current={state === 'JOIN_CLASS_REQUIRED' || state === 'READY' ? 3 : 2} />
      <p>{auth.user?.email}</p>
      {auth.loading && <p role="status">Comprobando el estado de tu cuenta…</p>}
      <Feedback error={auth.sessionError ?? auth.configurationError} />
      {auth.sessionError && <button className="btn btn-primary" disabled={auth.loading || action.pending} onClick={() => void action.run(auth.retrySession)}>Volver a comprobar</button>}
      {auth.session && <section className="card account-status">
        <h2>{state === 'PROFILE_REQUIRED' ? 'Perfil pendiente' : state === 'JOIN_CLASS_REQUIRED' ? 'Aún no te has unido a una clase' : 'Cuenta preparada'}</h2>
        <p>{state === 'PROFILE_REQUIRED' ? 'Completa los datos que aparecerán en tu portafolio.' : state === 'JOIN_CLASS_REQUIRED' ? 'Escribe el código que te entregó el equipo docente.' : 'Tu cuenta está lista para entrar al mapa.'}</p>
        {stage === 'profile' && state === 'PROFILE_REQUIRED' && <ProfileForm />}
        {stage === 'class' && state === 'JOIN_CLASS_REQUIRED' && <JoinClassForm />}
        {!stage && state && state !== 'READY' && <Link to={onboardingPath(state)}>Ver el siguiente paso</Link>}
        {!stage && state === 'READY' && <Link to="/mapa" className="btn btn-primary">Ir al mapa</Link>}
      </section>}
      <section className="card account-status">
        <h2>Métodos de acceso</h2>
        <p>{googleConnected ? 'Google conectado ✓' : 'Puedes vincular Google a esta misma cuenta para entrar con cualquiera de los dos métodos.'}</p>
        <Feedback error={action.error} success={action.success} />
        {!googleConnected && <button className="btn btn-secondary" disabled={action.pending} onClick={() => void action.run(auth.linkGoogle, 'Google quedó vinculado a tu cuenta.')}>{action.pending ? 'Conectando…' : 'Vincular Google'}</button>}
        {auth.user?.providerData.some((provider) => provider.providerId === 'password') && <Link to="/recuperar">Cambiar o recuperar mi contraseña</Link>}
      </section>
    </AccountFrame>
  )
}

export function PreparationPage({ role }: { role: 'admin' | 'instructor' | 'student' }) {
  return <AccountFrame>
    <div className="kicker">{role === 'admin' ? 'Administración' : role === 'instructor' ? 'Docencia' : 'El taller'}</div>
    <h1>{role === 'admin' ? 'Prepara tu taller' : role === 'instructor' ? 'Tus clases' : 'Tu próximo encargo'}</h1>
    <p>Esta sección todavía está en preparación. Tu cuenta y su acceso ya fueron comprobados.</p>
    <Link to="/cuenta">Volver a mi cuenta</Link>
  </AccountFrame>
}

export function ForbiddenPage() {
  return <AccountFrame><h1>Esta sección no está disponible para tu cuenta</h1><p>Puedes continuar desde tu cuenta.</p><Link to="/cuenta">Ir a mi cuenta</Link></AccountFrame>
}

export function RouteErrorPage() {
  return <AuthLayout title="No se pudo abrir la página"><p>Recarga la página para volver a intentarlo.</p><a className="btn btn-primary" href="/">Volver al inicio</a></AuthLayout>
}
