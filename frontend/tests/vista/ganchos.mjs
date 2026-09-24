// Ganchos del cargador de Node para montar las pantallas REALES en jsdom (tests/vista):
// - "@monaco-editor/react" → un editor falso (un <textarea>): Monaco no corre en jsdom;
// - los .css que importan los componentes → módulo vacío;
// - import.meta.env (que Vite rellena al compilar) → un objeto mínimo, para que módulos como
//   lib/musica.ts se puedan evaluar fuera de Vite.
// Todo lo demás se carga tal cual, con el mismo tsx que el resto de las pruebas.

const EDITOR_FALSO = new URL('./monacoFalso.mjs', import.meta.url).href

export async function resolve(especificador, contexto, siguiente) {
  if (especificador === '@monaco-editor/react') return { url: EDITOR_FALSO, shortCircuit: true }
  return siguiente(especificador, contexto)
}

export async function load(url, contexto, siguiente) {
  if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true }
  const r = await siguiente(url, contexto)
  if (url.includes('/src/') && r.source != null) {
    const fuente = String(r.source)
    if (fuente.includes('import.meta.env')) {
      return { ...r, source: `import.meta.env ??= { BASE_URL: '/', DEV: false, PROD: true, MODE: 'test' };\n${fuente}` }
    }
  }
  return r
}
