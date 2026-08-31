// Cliente HTTP tipado hacia el backend FastAPI.
// Todavía sin backend: los métodos leen los mocks de encargos.ts.
// Cuando exista la API, reemplazar el cuerpo por fetch() y mantener las firmas.

import type { ResultadoRevision } from './tipos'
import { ENCARGOS, type EncargoMock } from './encargos'
import { revisarLocalmente } from './revisionLocal'

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
  /** El encargo por número. En producción: GET /encargos/:n (403 si la sesión no abrió). */
  async encargo(numero: number): Promise<EncargoMock> {
    // return pedir<EncargoMock>(`/encargos/${numero}`)
    await espera(120)
    return ENCARGOS[numero] ?? ENCARGOS[1]
  },

  async autoguardar(_contenido: string): Promise<{ guardadoHaceSegundos: number }> {
    // return pedir('/entregas/autoguardar', { method: 'POST', body: JSON.stringify({ contenido }) })
    await espera(80)
    return { guardadoHaceSegundos: 0 }
  },

  async entregarARevision(
    numeroEncargo: number,
    contenido: string,
    datos: unknown,
  ): Promise<ResultadoRevision> {
    // Real: el servidor corre el código contra casos ocultos de tamaño variable; el
    // cliente NUNCA recibe los casos ni la solución.
    // return pedir<ResultadoRevision>('/entregas/revisar', { method: 'POST', body: JSON.stringify({ numeroEncargo, contenido }) })
    await espera(400)
    return revisarLocalmente(numeroEncargo, contenido, datos)
  },
}

function espera(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// Silenciar el "no usado" de pedir() hasta que se cablee el backend.
void pedir
