import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AccountFrame } from '../auth/AuthPages'
import { useAuth } from '../auth/authContext'
import { friendlyAuthError } from '../auth/session'
import { ApiError } from '../../lib/http'
import { capturarFuente, guardarImagenesParaEnviar, restaurarImagenes, type EstadoPublicacion, type VistaPreviaPublicacion } from '../../lib/publicacion'
import { descargarRepositorio } from '../../lib/repositorio'
import { numeroFromChallengeKey } from '../../lib/challengeIdentity'
import { rutaActividad } from '../../lib/navegacionActividades'
import { SnapshotFrame } from './SnapshotFrame'
import './publicacion.css'

export function MiSitioPage() {
  const { user } = useAuth()
  return <MiSitio key={user?.uid ?? 'sin-cuenta'} />
}

function MiSitio() {
  const { api } = useAuth()
  const [params, setParams] = useSearchParams()
  const selected = params.get('challenge_key') ?? ''
  const [state, setState] = useState<EstadoPublicacion | null>(null)
  const [title, setTitle] = useState('Mi portafolio')
  const titleLoaded = useRef(false)
  const [preview, setPreview] = useState<VistaPreviaPublicacion | null>(null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [reload, setReload] = useState(0)
  const generation = useRef(Symbol())
  const shareInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    const version = Symbol()
    generation.current = version
    // Se descarta la versión anterior al iniciar la lectura de otra fuente autenticada.
    // eslint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setPending(false)
    setState(null)
    setPreview(null)
    setConsent(false)
    setError(null)
    setMessage('')
    void (async () => {
      try {
        if (!api) throw new ApiError('AUTH_REQUIRED')
        const result = await api.request<EstadoPublicacion>(`/portfolio/publication${selected ? `?challenge_key=${encodeURIComponent(selected)}` : ''}`, { signal: controller.signal })
        if (controller.signal.aborted || generation.current !== version) return
        setState(result)
        if (!titleLoaded.current) {
          if (result.publication) setTitle(result.publication.title)
          titleLoaded.current = true
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(friendlyAuthError(failure))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => { controller.abort(); generation.current = Symbol() }
  }, [api, selected, reload])

  function invalidate() {
    generation.current = Symbol()
    setPreview(null)
    setConsent(false)
    setMessage('')
  }

  async function prepare() {
    if (!api || !state?.source || !state.can_publish || pending || !title.trim()) return
    invalidate()
    const version = generation.current
    const source = state.source
    setPending(true)
    setError(null)
    try {
      const html = await capturarFuente(source)
      if (generation.current !== version) return
      const result = await api.request<VistaPreviaPublicacion>('/portfolio/publication/preview', {
        method: 'POST', json: { challenge_key: source.challenge_key, title: title.trim(), snapshot_html: guardarImagenesParaEnviar(html), source_fingerprint: source.source_fingerprint, visibility: 'cohort' },
      })
      if (generation.current !== version) return
      if (result.source_fingerprint !== source.source_fingerprint) throw new ApiError('SOURCE_CHANGED')
      setPreview(result)
    } catch (failure) {
      if (generation.current === version) setError(failure instanceof ApiError ? failure.message : failure instanceof Error ? failure.message : 'No se pudo preparar la vista previa.')
    } finally {
      if (generation.current === version) setPending(false)
    }
  }

  async function publish() {
    if (!api || !state?.source || !state.can_publish || !preview || !consent || pending || !title.trim()) return
    const version = generation.current
    setPending(true)
    setError(null)
    try {
      const result = await api.request<EstadoPublicacion>('/portfolio/publication/publish', {
        method: 'POST', json: { challenge_key: state.source.challenge_key, title: title.trim(), snapshot_html: preview.snapshot_html, source_fingerprint: preview.source_fingerprint, visibility: 'cohort' },
      })
      if (generation.current !== version) return
      setState(result)
      setConsent(false)
      setMessage('Tu publicación está lista para tu cohorte. Tu fuente sigue guardada en el editor.')
    } catch (failure) {
      if (generation.current !== version) return
      setError(friendlyAuthError(failure))
      setPreview(null)
      setConsent(false)
    } finally {
      if (generation.current === version) setPending(false)
    }
  }

  async function download() {
    if (!preview || !state?.source || downloading) return
    const version = generation.current
    setDownloading(true)
    setError(null)
    try {
      await descargarRepositorio(state.source, title.trim(), restaurarImagenes(preview.snapshot_html))
    } catch {
      if (generation.current === version) setError('No se pudo preparar la descarga.')
    } finally {
      setDownloading(false)
    }
  }

  async function unpublish() {
    if (!api || pending) return
    const version = generation.current
    setPending(true)
    setError(null)
    try {
      const result = await api.request<EstadoPublicacion>('/portfolio/publication/unpublish', { method: 'POST', json: {} })
      if (generation.current !== version) return
      setState(result)
      setPreview(null)
      setConsent(false)
      setMessage('Retiraste la publicación de la galería. Tu código sigue guardado.')
    } catch (failure) {
      if (generation.current === version) setError(friendlyAuthError(failure))
    } finally {
      if (generation.current === version) setPending(false)
    }
  }

  async function copyLink() {
    const input = shareInput.current
    if (!input) return
    try {
      await window.navigator.clipboard.writeText(input.value)
      setMessage('Enlace copiado. Quien lo abra debe iniciar sesión y pertenecer a tu cohorte.')
    } catch {
      input.focus()
      input.select()
      setMessage('El enlace quedó seleccionado. Cópialo con el menú del navegador o Ctrl+C.')
    }
  }

  const published = state?.publication?.is_published ? state.publication : null
  const changed = !!published && (state?.has_unpublished_changes || title.trim() !== published.title || (!!state?.source && state.source.challenge_key !== published.source_challenge_key))
  const numero = state?.source ? numeroFromChallengeKey(state.source.challenge_key) : null
  const blocked = !state?.can_publish || loading || pending || !title.trim()

  return <AccountFrame>
    <div className="kicker">Tu web del taller</div>
    <h1>Mi sitio</h1>
    <p>Elige tu trabajo guardado, revisa una versión y compártela con tu cohorte. Puedes seguir editando y actualizar la publicación cuando quieras.</p>
    {error && <p className="auth-message" role="alert">{error}</p>}
    {message && <p className="auth-message" role="status">{message}</p>}
    {loading && <p role="status">Cargando tu sitio…</p>}
    <div className="sitio-acciones">
      <button className="btn btn-secondary" disabled={loading || pending} onClick={() => setReload((n) => n + 1)}>Volver a cargar la fuente guardada</button>
      <Link to="/galeria">Galería de mi cohorte</Link>
    </div>
    {state && <>
      <section className="card account-status">
        <h2>{published ? changed ? 'Cambios sin publicar' : 'Versión publicada' : 'Aún no compartes una versión'}</h2>
        {published && <>
          <p>Versión {published.revision}. Solo pueden verla los miembros autorizados de tu cohorte.</p>
          <Link to={`/p/${published.slug}`} className="btn btn-secondary">Ver sitio publicado</Link>
          <label className="field sitio-url">Enlace para compartir<input ref={shareInput} className="input" readOnly value={`${window.location.origin}/p/${published.slug}`} onFocus={(event) => event.currentTarget.select()} /></label>
          <button className="btn btn-secondary" onClick={() => void copyLink()}>Copiar enlace</button>
          <button className="btn btn-secondary" disabled={pending} onClick={() => void unpublish()}>Retirar publicación</button>
        </>}
        {changed && <p>La página compartida conserva la versión anterior hasta que prepares una vista previa y actualices la publicación.</p>}
      </section>
      {!state.source ? <p>Guarda primero tu web en una actividad del <Link to="/mapa">mapa del taller</Link>. Tu código guardado aparecerá aquí.</p> : <section className="sitio-form">
        <div className="field"><label htmlFor="sitio-source">Fuente guardada</label><select id="sitio-source" className="input" disabled={pending} value={state.source.challenge_key} onChange={(event) => { invalidate(); setParams({ challenge_key: event.target.value }) }}>
          {state.sources.map((source) => <option key={source.challenge_key} value={source.challenge_key}>{source.session_code} · {source.title}</option>)}
        </select></div>
        <p className="text-muted">Se usa la última fuente que llegó al servidor. {numero !== null && <Link to={rutaActividad(numero)}>Editar esta fuente</Link>}. Después de editar, espera a que indique «guardado» y vuelve aquí.</p>
        <div className="field"><label htmlFor="sitio-title">Título de tu sitio</label><input id="sitio-title" type="text" className="input" maxLength={120} value={title} disabled={pending} onChange={(event) => { setTitle(event.target.value); invalidate() }} /></div>
        <p>Tu correo de acceso no se añade automáticamente. Revisa el texto y los enlaces que escribiste antes de compartirlos. Los proyectos y habilidades de ejemplo del taller no se publican como si fueran tuyos.</p>
        <p>Esta es una versión estática: los temporizadores y otros scripts no se ejecutan; las imágenes sí se ven si su dirección es https (las que no, se omiten). Las fuentes externas no se cargan. El diseño y los textos se conservan cuando son seguros.</p>
        {!state.can_publish && <p className="auth-message">{state.publish_block_reason === 'NOT_COHORT_MEMBER' ? 'Únete a una cohorte para publicar.' : 'La publicación estará disponible cuando tu docente abra Git y publicación y la actividad elegida esté disponible.'}</p>}
        <div className="sitio-acciones">
          <button className="btn btn-secondary" disabled={blocked} onClick={() => void prepare()}>{pending ? 'Procesando…' : 'Preparar vista previa'}</button>
          <button className="btn btn-secondary" disabled={!preview || pending || downloading} title={preview ? undefined : 'Prepara la vista previa para poder descargar'} onClick={() => void download()}>{downloading ? 'Preparando .zip…' : 'Descargar Repositorio'}</button>
        </div>
        {preview && <>
          <h2>Así se verá la versión compartida</h2>
          <SnapshotFrame html={preview.snapshot_html} title="Vista previa de publicación" />
          <label className="sitio-consent"><input type="checkbox" checked={consent} disabled={pending} onChange={(event) => setConsent(event.target.checked)} />Revisé esta versión y quiero compartirla con mi cohorte.</label>
        </>}
        <button className="btn btn-primary" disabled={blocked || !preview || !consent} onClick={() => void publish()}>{published ? 'Actualizar publicación' : 'Publicar para mi cohorte'}</button>
      </section>}
    </>}
  </AccountFrame>
}
