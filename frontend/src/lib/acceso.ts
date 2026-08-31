// Estado de acceso del estudiante (localStorage — persiste entre sesiones del navegador).
// En producción esto lo sabe el backend (cuenta + último acceso).

const CLAVE_DIAGNOSTICO = 've:diagnostico-hecho'
const CLAVE_ULTIMO_ACCESO = 've:ultimo-acceso'

function hoy(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

/** ¿Ya completó el diagnóstico inicial (pantalla 1f)? */
export function diagnosticoHecho(): boolean {
  try {
    return localStorage.getItem(CLAVE_DIAGNOSTICO) === '1'
  } catch {
    return false
  }
}

export function marcarDiagnostico() {
  try {
    localStorage.setItem(CLAVE_DIAGNOSTICO, '1')
  } catch {
    /* sin almacenamiento */
  }
}

/** ¿Ya entró hoy? (si no, se muestra la bienvenida diaria). */
export function accedioHoy(): boolean {
  try {
    return localStorage.getItem(CLAVE_ULTIMO_ACCESO) === hoy()
  } catch {
    return true // sin almacenamiento: no molestamos con la bienvenida
  }
}

export function marcarAcceso() {
  try {
    localStorage.setItem(CLAVE_ULTIMO_ACCESO, hoy())
  } catch {
    /* sin almacenamiento */
  }
}

/** Solo desarrollo: volver a ver el flujo de entrada. */
export function reiniciarAcceso() {
  try {
    localStorage.removeItem(CLAVE_DIAGNOSTICO)
    localStorage.removeItem(CLAVE_ULTIMO_ACCESO)
  } catch {
    /* nada */
  }
}
