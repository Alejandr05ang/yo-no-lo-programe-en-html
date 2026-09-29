// Este archivo de pruebas necesita el adaptador real, aunque el cargador de tests/vista
// sustituya normalmente @monaco-editor/react por un textarea.
const ADAPTADOR_REAL = new URL('../../node_modules/@monaco-editor/react/dist/index.mjs', import.meta.url).href
// En Node, "@monaco-editor/loader" resuelve a su build CommonJS y el import por defecto del
// adaptador recibe { default: loader }. El navegador (Vite) usa el build ESM: se usa ese.
const CARGADOR_ESM = new URL('../../node_modules/@monaco-editor/loader/lib/es/index.js', import.meta.url).href
const DIRECTORIO_ESM = new URL('../../node_modules/@monaco-editor/loader/lib/es/', import.meta.url).href

export async function resolve(especificador, contexto, siguiente) {
  if (especificador === '@monaco-editor/react') return { url: ADAPTADOR_REAL, shortCircuit: true }
  if (especificador === '@monaco-editor/loader') return { url: CARGADOR_ESM, format: 'module', shortCircuit: true }
  const resuelto = await siguiente(especificador, contexto)
  return resuelto.url.startsWith(DIRECTORIO_ESM) ? { ...resuelto, format: 'module' } : resuelto
}

export async function load(url, contexto, siguiente) {
  if (url.startsWith(DIRECTORIO_ESM)) return siguiente(url, { ...contexto, format: 'module' })
  return siguiente(url, contexto)
}
