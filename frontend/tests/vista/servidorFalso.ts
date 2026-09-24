// Un backend en memoria para las pruebas de la pantalla del estudiante. Se usa a través del
// cliente HTTP REAL de la app (lib/http.ts, createApiClient) como su `fetcher`, así que las
// rutas, los métodos y los cuerpos son exactamente los que la app envía.
//
// Imita las reglas del backend que importan aquí (backend/app/progress/routes.py y
// backend/app/catalog/service.py):
// - un reto aceptado sigue aceptado aunque luego llegue un autoguardado (siguiente_estado);
// - accepted exige todos los casos (ProgressUpdateBody);
// - un día que no está abierto rechaza leer y guardar su progreso;
// - POST /submit crea la fila de progreso si no existe.
// Y permite retener una petición (para ordenar carreras) o hacerla fallar como sin red.
import { ENCARGOS, NUMEROS_DE_ENCARGO } from '../../src/lib/encargos.ts'

export type Acceso = 'open' | 'paused' | 'locked'

export interface Llamada {
  metodo: string
  ruta: string
  cuerpo?: Record<string, unknown>
}

interface Progreso {
  status: 'draft' | 'in_progress' | 'accepted'
  draft_code: string
  cases_passed: number
  cases_total: number
}

export interface PerfilServidor {
  full_name: string
  display_name: string
  description: string
  github_url: string | null
  linkedin_url: string | null
  website_url: string | null
  hobbies: string[]
}

type Criterio = (l: Llamada) => boolean

// El mismo reparto que backend/app/catalog/seed.py.
export const DIAS: { code: string; day_number: number; title: string }[] = [
  { code: 'L1', day_number: 1, title: 'Diagnóstico y algoritmos' },
  { code: 'Ma1', day_number: 2, title: 'Variables y DOM' },
  { code: 'Mi1', day_number: 3, title: 'Condicionales y bucles' },
  { code: 'Ju1', day_number: 4, title: 'Personalización visual' },
  { code: 'V1', day_number: 5, title: 'Estado y movimiento' },
  { code: 'L2', day_number: 6, title: 'Filtrar con intención' },
  { code: 'Ma2', day_number: 7, title: 'Matrices y funciones' },
  { code: 'Mi2', day_number: 8, title: 'Funciones por tipo' },
  { code: 'Ju2', day_number: 9, title: 'Git y publicación' },
  { code: 'V2', day_number: 10, title: 'Demo final' },
]

class Retencion {
  llego!: () => void
  readonly llegada = new Promise<void>((r) => { this.llego = r })
  soltar!: () => void
  readonly suelta = new Promise<void>((r) => { this.soltar = r })
  usada = false
  constructor(readonly criterio: Criterio) {}
}

export class ServidorFalso {
  readonly progreso = new Map<string, Progreso>()
  readonly entregas: { key: string; code: string }[] = []
  readonly llamadas: Llamada[] = []
  accesos: Record<string, Acceso>
  /** Retos cerrados a mano por el docente dentro de un día abierto. */
  readonly retosCerrados = new Set<string>()
  perfil: PerfilServidor = {
    full_name: 'Ana Rivas',
    display_name: 'Ana',
    description: '',
    github_url: null,
    linkedin_url: null,
    website_url: null,
    hobbies: [],
  }
  private retenciones: Retencion[] = []
  private fallos: { criterio: Criterio; veces: number }[] = []

  constructor(accesos: Partial<Record<string, Acceso>> = {}) {
    this.accesos = Object.fromEntries(DIAS.map((d) => [d.code, accesos[d.code] ?? (['L1', 'Ma1', 'Mi1'].includes(d.code) ? 'open' : 'locked')]))
  }

  /** La próxima petición que cumpla el criterio se queda esperando hasta soltar(). */
  retener(criterio: Criterio): Retencion {
    const r = new Retencion(criterio)
    this.retenciones.push(r)
    return r
  }

  /** Las próximas `veces` peticiones que cumplan el criterio fallan como sin conexión. */
  fallar(criterio: Criterio, veces = 1) {
    this.fallos.push({ criterio, veces })
  }

  /** Vuelve la conexión: se olvidan los fallos pendientes. */
  restablecerRed() {
    this.fallos = []
  }

  borrador(key: string, codigo: string, status: Progreso['status'] = 'in_progress') {
    this.progreso.set(key, { status, draft_code: codigo, cases_passed: 0, cases_total: 0 })
  }

  guardados(key: string): Llamada[] {
    return this.llamadas.filter((l) => l.metodo === 'PUT' && l.ruta === `/api/challenges/${key}/progress`)
  }

  private diaDe(key: string) {
    const n = Number(key.slice(1))
    return DIAS.find((d) => d.code === ENCARGOS[n]?.sesion)
  }

  private mapa() {
    return {
      cohort_id: 'c1',
      cohort_name: 'Clase de prueba',
      sessions: DIAS.map((d) => {
        const acceso = this.accesos[d.code]
        return {
          code: d.code,
          day_number: d.day_number,
          title: d.title,
          access: acceso,
          challenges: NUMEROS_DE_ENCARGO.filter((n) => ENCARGOS[n].sesion === d.code).map((n) => ({
            key: `e${n}`,
            title: ENCARGOS[n].meta.titulo,
            unlocked: acceso === 'open' && !this.retosCerrados.has(`e${n}`),
            progress_status: this.progreso.get(`e${n}`)?.status ?? 'not_started',
          })),
        }
      }),
    }
  }

  private vista(p: Progreso | undefined) {
    return {
      status: p?.status ?? 'not_started',
      draft_code: p?.draft_code ?? '',
      cases_passed: p?.cases_passed ?? 0,
      cases_total: p?.cases_total ?? 0,
    }
  }

  private responder(llamada: Llamada): Response {
    const error = (status: number, code: string) => Response.json({ error: { code, message: code } }, { status })
    const { metodo, ruta, cuerpo } = llamada
    if (metodo === 'GET' && ruta === '/api/map') return Response.json(this.mapa())
    if (metodo === 'PUT' && ruta === '/api/profile') {
      this.perfil = { ...this.perfil, ...(cuerpo as unknown as PerfilServidor) }
      return Response.json({ ok: true })
    }
    const reto = /^\/api\/challenges\/(e\d+)\/(progress|submit)$/.exec(ruta)
    if (reto) {
      const key = reto[1]
      const dia = this.diaDe(key)
      if (!dia) return error(404, 'NOT_FOUND')
      const acceso = this.accesos[dia.code]
      if (acceso === 'locked') return error(403, 'SESSION_LOCKED')
      if (acceso === 'paused') return error(403, 'SESSION_PAUSED')
      if (this.retosCerrados.has(key)) return error(403, 'CHALLENGE_LOCKED')
      const actual = this.progreso.get(key)
      if (reto[2] === 'progress' && metodo === 'GET') return Response.json(this.vista(actual))
      if (reto[2] === 'progress' && metodo === 'PUT') {
        const b = cuerpo as { status?: Progreso['status']; draft_code?: string; cases_passed?: number; cases_total?: number }
        if (b.status === 'accepted' && !(b.cases_total && b.cases_passed === b.cases_total)) return error(422, 'VALIDATION_ERROR')
        const status = actual?.status === 'accepted' ? 'accepted' : (b.status ?? actual?.status ?? 'draft')
        const nuevo: Progreso = {
          status,
          draft_code: b.draft_code ?? actual?.draft_code ?? '',
          cases_passed: b.cases_passed ?? actual?.cases_passed ?? 0,
          cases_total: b.cases_total ?? actual?.cases_total ?? 0,
        }
        this.progreso.set(key, nuevo)
        return Response.json(this.vista(nuevo))
      }
      if (reto[2] === 'submit' && metodo === 'POST') {
        const code = String((cuerpo as { code_submitted?: unknown }).code_submitted ?? '')
        this.entregas.push({ key, code })
        if (!actual) this.progreso.set(key, { status: 'in_progress', draft_code: code, cases_passed: 0, cases_total: 0 })
        return Response.json({ id: `s${this.entregas.length}`, attempt_number: this.entregas.length, created_at: new Date(0).toISOString() })
      }
    }
    return error(404, 'NOT_FOUND')
  }

  /** El `fetcher` para createApiClient. */
  fetch = async (entrada: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(entrada instanceof Request ? entrada.url : entrada))
    const llamada: Llamada = {
      metodo: init?.method ?? 'GET',
      ruta: url.pathname,
      cuerpo: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    }
    const retencion = this.retenciones.find((r) => !r.usada && r.criterio(llamada))
    if (retencion) {
      retencion.usada = true
      retencion.llego()
      await retencion.suelta
    }
    // Se registra al responder: el orden de `llamadas` es el orden en que el servidor las atiende.
    const fallo = this.fallos.find((f) => f.veces > 0 && f.criterio(llamada))
    if (fallo) {
      fallo.veces--
      throw new TypeError('fetch failed')
    }
    this.llamadas.push(llamada)
    await new Promise((r) => setTimeout(r, 5))
    return this.responder(llamada)
  }
}

export const esGuardado = (key: string): Criterio => (l) => l.metodo === 'PUT' && l.ruta === `/api/challenges/${key}/progress`
export const esLectura = (key: string): Criterio => (l) => l.metodo === 'GET' && l.ruta === `/api/challenges/${key}/progress`
export const esEntrega = (key: string): Criterio => (l) => l.metodo === 'POST' && l.ruta === `/api/challenges/${key}/submit`
