import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { register } from 'node:module'
import { ventana } from '../vista/entorno.ts'
import type { ArchivoEditor } from '../../src/lib/tipos.ts'

// El adaptador @monaco-editor/react es el REAL (el que decide qué modelo reutiliza y cuál
// dispone al desmontar). Solo el núcleo de Monaco se sustituye: el editor de verdad no corre
// en jsdom (se queda sin memoria dibujando). El doble conserva lo que importa aquí, el
// registro global de modelos por nombre de archivo que Monaco comparte entre montajes.
register('./monacoIsolationLoader.mjs', import.meta.url)
Object.assign(ventana, {
  matchMedia: (media: string) => ({ media, matches: false, addEventListener() {}, removeEventListener() {} }),
})

type Oyente = () => void
const LECTURA = 91
class ModeloFalso {
  private oyentes = new Set<Oyente>()
  constructor(private valor: string, readonly uri: { path: string }, private registro: Map<string, ModeloFalso>) {}
  getValue() { return this.valor }
  setValue(valor: string) { this.valor = valor; this.oyentes.forEach((o) => o()) }
  getFullModelRange() { return {} }
  getLineCount() { return this.valor.split('\n').length }
  getLineMaxColumn(linea: number) { return (this.valor.split('\n')[linea - 1] ?? '').length + 1 }
  alCambiar(oyente: Oyente) { this.oyentes.add(oyente); return { dispose: () => this.oyentes.delete(oyente) } }
  dispose() { if (this.registro.get(this.uri.path) === this) this.registro.delete(this.uri.path) }
}
const modelos = new Map<string, ModeloFalso>()
const uri = (nombre: string) => ({ path: nombre.startsWith('/') ? nombre : `/${nombre}` })
const nada = { dispose() {} }
const monacoFalso = {
  Uri: { parse: uri },
  MarkerSeverity: { Error: 8 },
  languages: { typescript: { javascriptDefaults: { addExtraLib() {}, setDiagnosticsOptions() {} } } },
  editor: {
    EditorOption: { readOnly: LECTURA },
    getModel: (u: { path: string }) => modelos.get(u.path) ?? null,
    getModels: () => [...modelos.values()],
    createModel: (valor: string, _lenguaje: string, u: { path: string }) => {
      const modelo = new ModeloFalso(valor, u, modelos)
      modelos.set(u.path, modelo)
      return modelo
    },
    create: (_contenedor: unknown, { model, ...opciones }: { model: ModeloFalso; readOnly?: boolean }) => {
      let actual = model
      let oyenteDeContenido: Oyente | null = null
      let suscripcion = nada
      const volverASuscribir = () => {
        suscripcion.dispose()
        suscripcion = oyenteDeContenido ? actual.alCambiar(oyenteDeContenido) : nada
      }
      return {
        getModel: () => actual,
        setModel: (modelo: ModeloFalso) => { actual = modelo; volverASuscribir() },
        getValue: () => actual.getValue(),
        setValue: (valor: string) => actual.setValue(valor),
        executeEdits: (_origen: string, [edicion]: { text: string }[]) => actual.setValue(edicion.text),
        getOption: (opcion: number) => (opcion === LECTURA ? !!opciones.readOnly : undefined),
        updateOptions: (nuevas: { readOnly?: boolean }) => Object.assign(opciones, nuevas),
        onDidChangeModelContent: (oyente: Oyente) => {
          oyenteDeContenido = oyente
          volverASuscribir()
          return { dispose: () => { oyenteDeContenido = null; volverASuscribir() } }
        },
        saveViewState: () => null, restoreViewState() {}, pushUndoStop() {}, revealLine() {},
        dispose: () => suscripcion.dispose(),
      }
    },
    defineTheme() {}, setTheme() {}, setModelLanguage() {}, setModelMarkers() {},
    getModelMarkers: () => [], onDidChangeMarkers: () => nada,
  },
}

const { loader } = await import('@monaco-editor/react')
loader.config({ monaco: monacoFalso as never })
const { act, createElement } = await import('react')
const { createRoot } = await import('react-dom/client')
const { EditorPanel } = await import('../../src/features/editor/EditorPanel.tsx')

const disposers: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const dispose of disposers.splice(0)) await dispose()
  modelos.clear()
})
const model = (nombre: string) => monacoFalso.editor.getModel(monacoFalso.Uri.parse(nombre))
const archivo = (nombre: string, contenido: string, soloLectura = false): ArchivoEditor => ({ nombre, contenido, soloLectura })
const esperar = () => act(() => new Promise<void>((r) => setTimeout(r, 0)))

async function mount(inicial: ArchivoEditor[]) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  let mounted = true
  async function render(archivos: ArchivoEditor[]) {
    await act(async () => root.render(createElement(EditorPanel, {
      archivos, onCambio() {}, salida: null, guardado: { estado: 'saved', intentos: 0 },
      onEjecutar() {}, onEntregar() {}, abierto: true, onToggle() {}, onEditarDatos() {},
    })))
    await esperar()
  }
  async function unmount() {
    if (!mounted) return
    mounted = false
    await act(async () => root.unmount())
    host.remove()
  }
  disposers.push(unmount)
  await render(inicial)
  return {
    host, render, unmount,
    async tab(nombre: string) {
      const tab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((b) => b.textContent?.startsWith(nombre))
      assert.ok(tab, `pestaña ${nombre}`)
      await act(async () => tab.click())
      await esperar()
    },
  }
}

test('salir de A elimina del registro de Monaco una sección borrada antes de desmontar', async () => {
  const main = archivo('portafolio.js', 'const cuenta = "A"')
  const seccion = archivo('seccion.js', 'const secreto = "PRIVADO A"')
  const ui = await mount([main, seccion])
  await ui.tab('seccion.js')
  assert.equal(model('seccion.js')?.getValue(), seccion.contenido)
  await ui.tab('portafolio.js')
  await ui.render([main])
  await ui.unmount()
  assert.equal(model('seccion.js'), null, 'la sección eliminada de A no debe quedar huérfana al salir')
  assert.equal(monacoFalso.editor.getModels().length, 0)
})

test('B abre el mismo nombre de sección con su contenido después de salir A', async () => {
  const mainA = archivo('portafolio.js', 'const cuenta = "A"')
  const uiA = await mount([mainA, archivo('seccion.js', 'const secreto = "PRIVADO A"')])
  await uiA.tab('seccion.js')
  await uiA.tab('portafolio.js')
  await uiA.render([mainA])
  await uiA.unmount()
  const contenidoB = 'const cuenta = "PRIVADO B"'
  const uiB = await mount([archivo('seccion.js', contenidoB)])
  assert.equal(model('seccion.js')?.getValue(), contenidoB)
  assert.doesNotMatch(model('seccion.js')?.getValue() ?? '', /PRIVADO A/)
  await uiB.unmount()
  assert.equal(monacoFalso.editor.getModels().length, 0)
})
