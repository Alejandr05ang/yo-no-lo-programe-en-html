import type { ResultadoRevision } from './tipos'
import { ENCARGOS, type EncargoMock } from './encargos'
import { revisarLocalmente } from './revisionLocal'
import { challengeKeyFromNumero } from './challengeIdentity'
import { ApiError, type ApiClient } from './http'

/**
 * Las llamadas que tocan el backend reciben el cliente autenticado que expone
 * AuthProvider (auth.api). No se construye uno aquí: sería un segundo camino
 * para el token de Firebase, y el que había antes no lo adjuntaba, así que todo
 * el progreso del alumno respondía 401 y se perdía en silencio.
 */
function exigirCliente(cliente: ApiClient | null): ApiClient {
  if (!cliente) throw new ApiError('AUTH_REQUIRED', 401)
  return cliente
}

export const api = {
  /** El encargo por número. Vive en el bundle, no necesita red. */
  async encargo(numero: number): Promise<EncargoMock> {
    await espera(120)
    return ENCARGOS[numero] ?? ENCARGOS[1]
  },

  async getProgress(cliente: ApiClient | null, numero: number): Promise<{ draft_code: string, status: string }> {
    const key = challengeKeyFromNumero(numero)
    try {
      return await exigirCliente(cliente).request(`/challenges/${key}/progress`)
    } catch {
      // Sin sesión, sin red o con el reto todavía bloqueado: se empieza en blanco
      // y el respaldo local de quien llama decide si hay algo que restaurar.
      return { draft_code: '', status: 'not_started' }
    }
  },

  async autoguardar(cliente: ApiClient | null, numero: number, draft_code: string): Promise<void> {
    const key = challengeKeyFromNumero(numero)
    await exigirCliente(cliente).request(`/challenges/${key}/progress`, {
      method: 'PUT',
      json: { draft_code, status: 'in_progress' },
    })
  },

  async entregarARevision(
    cliente: ApiClient | null,
    numero: number,
    contenido: string,
    datos: unknown,
  ): Promise<ResultadoRevision> {
    const key = challengeKeyFromNumero(numero)
    await exigirCliente(cliente).request(`/challenges/${key}/submit`, {
      method: 'POST',
      json: { code_submitted: contenido },
    })
    // La corrección automática todavía corre en el navegador; el servidor guarda
    // la entrega para que exista el registro aunque el corrector cambie después.
    await espera(400)
    return revisarLocalmente(numero, contenido, datos)
  },
}

function espera(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
