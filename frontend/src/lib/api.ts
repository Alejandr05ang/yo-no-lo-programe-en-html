import type { ResultadoRevision } from './tipos'
import { ENCARGOS, type EncargoMock } from './encargos'
import { revisarLocalmente } from './revisionLocal'
import { challengeKeyFromNumero } from './challengeIdentity'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${ruta}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  /** El encargo por número. */
  async encargo(numero: number): Promise<EncargoMock> {
    await espera(120)
    return ENCARGOS[numero] ?? ENCARGOS[1]
  },

  async autoguardar(numero: number, draft_code: string): Promise<{ guardadoHaceSegundos: number }> {
    const key = challengeKeyFromNumero(numero)
    await pedir(`/challenges/${key}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ draft_code, status: 'in_progress' })
    })
    return { guardadoHaceSegundos: 0 }
  },

  async entregarARevision(
    numero: number,
    contenido: string,
    datos: unknown,
  ): Promise<ResultadoRevision> {
    const key = challengeKeyFromNumero(numero)
    // 1. Submit to backend
    await pedir(`/challenges/${key}/submit`, {
      method: 'POST',
      body: JSON.stringify({ code_submitted: contenido })
    })
    // 2. Client side grader for now, until Deno grader is ready (Phase 10)
    await espera(400)
    const result = revisarLocalmente(numero, contenido, datos)
    // 3. Optional: update auto_result in backend via another endpoint, but for now MVP is just saving it.
    return result
  },
}

function espera(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

