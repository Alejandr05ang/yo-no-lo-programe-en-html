// Detección de "vista de consulta" (docs/design-handoff.md §1g): decide por CAPACIDAD del
// equipo (puntero, hover, tamaño físico de pantalla), nunca por ancho de ventana — un ancho
// de ventana angosto (pantalla dividida, una ventana redimensionada) no implica falta de
// teclado/mouse real, y por eso NO debe forzar la vista de solo-consulta.
//
// Se evalúa una sola vez al montar el componente (nunca en resize): si se escuchara el
// resize, la app saltaría entre editor y vista de consulta mientras el usuario ajusta el
// ancho de la ventana, exactamente la frustración que esto busca evitar.

const CLAVE_OVERRIDE = 've:editar-de-todos-modos'

function detectarVistaDeConsulta(): boolean {
  if (typeof window === 'undefined' || typeof matchMedia !== 'function') return false
  const punteroGrueso = matchMedia('(pointer: coarse)').matches
  const sinHoverReal = !matchMedia('(hover: hover)').matches
  const pantallaFisicaChica = Math.max(screen.width, screen.height) < 900
  return punteroGrueso && sinHoverReal && pantallaFisicaChica
}

/** true = mostrar la vista de consulta (1g), sin editor. Respeta la vía de escape del usuario. */
export function esVistaDeConsulta(): boolean {
  try {
    if (localStorage.getItem(CLAVE_OVERRIDE) === '1') return false
  } catch {
    /* sin almacenamiento: se sigue con la detección normal */
  }
  return detectarVistaDeConsulta()
}

/** Vía de escape (docs/design-handoff.md §1g): "Editar de todos modos", persistida. */
export function habilitarEdicionForzada() {
  try {
    localStorage.setItem(CLAVE_OVERRIDE, '1')
  } catch {
    /* sin almacenamiento: la elección no sobrevive a esta sesión */
  }
}
