const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'Tu sesión necesita verificarse de nuevo. Vuelve a iniciar sesión.',
  EMAIL_NOT_VERIFIED: 'Verifica tu correo antes de continuar.',
  PROFILE_INCOMPLETE: 'Completa tu perfil antes de continuar.',
  INVALID_JOIN_CODE: 'No pudimos validar ese código de clase.',
  NOT_COHORT_MEMBER: 'Primero debes unirte a una clase.',
  CHALLENGE_LOCKED: 'Tu docente todavía no ha habilitado este encargo.',
  SESSION_LOCKED: 'Tu docente todavía no ha abierto este día.',
  SESSION_PAUSED: 'Tu docente pausó temporalmente este día. Tu progreso sigue guardado.',
  SESSION_NOT_OPEN: 'Solo se puede pausar un día que la clase ya tiene disponible.',
  NOT_FOUND: 'No encontramos lo que buscabas.',
  ACCOUNT_DISABLED: 'Esta cuenta está desactivada. Comunícaselo a tu docente.',
  INVALID_AVATAR: 'Esa imagen no se pudo usar como avatar. Prueba con un JPEG, PNG o WebP de menos de 5 MB.',
  COHORT_EXISTS: 'Ya existe una clase con ese identificador.',
  FORBIDDEN: 'Tu cuenta no tiene acceso a esta sección.',
  RATE_LIMITED: 'Has realizado varios intentos. Espera un momento y vuelve a intentarlo.',
  VALIDATION_ERROR: 'Revisa los datos del formulario e inténtalo de nuevo.',
  PAYLOAD_TOO_LARGE: 'Lo que intentas guardar es demasiado grande. Quita algo e inténtalo de nuevo.',
  SERVICE_UNAVAILABLE: 'El servicio del taller no está disponible en este momento. Inténtalo de nuevo.',
  NETWORK_ERROR: 'No se pudo conectar con el taller. Revisa tu conexión e inténtalo de nuevo.',
  INVALID_RESPONSE: 'El taller devolvió una respuesta inesperada. Inténtalo de nuevo.',
  INVALID_API_URL: 'La conexión con el taller todavía no está configurada correctamente.',
  SESSION_CHANGED: 'La sesión cambió. Vuelve a intentar la operación con tu cuenta actual.',
  REQUEST_CANCELLED: 'La operación se canceló.',
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status = 0) {
    super(MESSAGES[code] ?? MESSAGES.SERVICE_UNAVAILABLE)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

interface ClientOptions {
  baseUrl?: string
  browserOrigin: string
  development: boolean
  getSessionKey: () => string | null
  getIdToken: (forceRefresh: boolean) => Promise<string | null>
  fetcher?: typeof fetch
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  json?: unknown
  form?: FormData
  signal?: AbortSignal
}

function apiBase(options: ClientOptions): URL {
  let base: URL
  try {
    base = new URL(options.baseUrl || '/api', options.browserOrigin)
  } catch {
    throw new ApiError('INVALID_API_URL')
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  const allowedProtocol = base.protocol === 'https:' || (options.development && local && base.protocol === 'http:')
  if (!allowedProtocol || base.username || base.password || base.search || base.hash || !['/', '/api', '/api/'].includes(base.pathname)) {
    throw new ApiError('INVALID_API_URL')
  }
  base.pathname = '/api/'
  return base
}

function responseError(status: number, body: unknown): ApiError {
  const fallback = status === 401 ? 'AUTH_REQUIRED' : status === 403 ? 'FORBIDDEN' : status === 422 ? 'VALIDATION_ERROR' : status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE'
  let code = fallback
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = body.error
    if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' && Object.hasOwn(MESSAGES, error.code)) code = error.code
  }
  return new ApiError(code, status)
}

/** The configured FastAPI origin is the only destination permitted to receive ID tokens. */
export function createApiClient(options: ClientOptions) {
  const base = apiBase(options)
  const fetcher = options.fetcher ?? fetch
  async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    if (!/^\/[a-z0-9][a-z0-9/_-]*(?:\?[^#\\]*)?$/i.test(path)) throw new ApiError('INVALID_API_URL')
    const destination = new URL(path.slice(1), base)
    if (destination.origin !== base.origin || !destination.pathname.startsWith('/api/')) throw new ApiError('INVALID_API_URL')
    const sessionKey = options.getSessionKey()
    if (!sessionKey) throw new ApiError('AUTH_REQUIRED', 401)
    const checkSession = () => {
      if (options.getSessionKey() !== sessionKey) throw new ApiError('SESSION_CHANGED')
    }
    const timeout = new AbortController()
    const timer = setTimeout(() => timeout.abort(), 20_000)
    const signal = init.signal ? AbortSignal.any([init.signal, timeout.signal]) : timeout.signal
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await options.getIdToken(attempt === 1)
        checkSession()
        if (!token) throw new ApiError('AUTH_REQUIRED', 401)
        const headers = new Headers({ Accept: 'application/json', Authorization: `Bearer ${token}` })
        if (init.json !== undefined) headers.set('Content-Type', 'application/json')
        const response = await fetcher(destination, {
          method: init.method ?? 'GET',
          headers,
          body: init.form ?? (init.json === undefined ? undefined : JSON.stringify(init.json)),
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
          signal,
        })
        checkSession()
        if (response.status === 401 && attempt === 0) {
          await response.body?.cancel()
          continue
        }
        let body: unknown
        try { body = response.status === 204 ? null : await response.json() } catch {
          if (!response.ok) throw responseError(response.status, null)
          throw new ApiError('INVALID_RESPONSE', response.status)
        }
        checkSession()
        if (!response.ok) throw responseError(response.status, body)
        return body as T
      }
      throw new ApiError('AUTH_REQUIRED', 401)
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (init.signal?.aborted) throw new ApiError('REQUEST_CANCELLED')
      throw new ApiError('NETWORK_ERROR')
    } finally {
      clearTimeout(timer)
    }
  }
  return { request }
}

export type ApiClient = ReturnType<typeof createApiClient>
