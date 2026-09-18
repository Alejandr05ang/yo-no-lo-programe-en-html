import Editor, { type BeforeMount, type Monaco, type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useEffect, useRef, useState } from 'react'
import { API_DOCS } from '../../lib/apiDocs'
import type { ArchivoEditor, EstadoGuardado, SalidaEjecucion } from '../../lib/tipos'

interface Props {
  archivos: ArchivoEditor[] // [portafolio.js, datos.js, …]
  contenido: string // contenido actual del archivo editable
  onCambio: (valor: string) => void
  salida: SalidaEjecucion | null
  guardado: EstadoGuardado
  ejecutando?: boolean
  entregando?: boolean
  onEjecutar: () => void
  onEntregar: () => void
  abierto: boolean
  onToggle: () => void
  /** Abrir el formulario "Mis datos" (se ofrece cuando la pestaña activa es de solo lectura). */
  onEditarDatos: () => void
}

// Hallazgo de beta (docs/decisiones.md, H3): la API curada (crearTitulo, mostrar, datos…)
// nunca se declara en ningún archivo, así que Monaco no la autocompleta — mientras que sí
// ofrece de fondo TODO el scope global de JS/DOM (decodeURI, Date, Image, File…), que no es
// parte del vocabulario enseñado. Esto declara la API real (misma forma que lib/sandbox.ts)
// para que aparezca con su documentación en español; no oculta el resto del scope global
// porque los tipos de DOM (classList, addEventListener, style…) sí hacen falta más adelante
// en el cronograma (L2, Ju1, Mi2) — suprimir esos globales sin perder esos tipos requeriría
// un filtro de autocompletado propio, fuera de alcance de este arreglo puntual.
function doc(clave: string): string {
  return (API_DOCS[clave]?.descripcion ?? '').replace(/\*\//g, '* /')
}

const LIB_API_CURADA = `
/** ${doc('crearTitulo()')} */
declare function crearTitulo(texto: string): HTMLElement
/** ${doc('crearSubtitulo()')} */
declare function crearSubtitulo(texto: string): HTMLElement
/** ${doc('crearParrafo()')} */
declare function crearParrafo(texto: string): HTMLElement
/** ${doc('crearLista()')} */
declare function crearLista(): HTMLElement
/** ${doc('crearItem()')} */
declare function crearItem(texto: string): HTMLElement
/** ${doc('crearEnlace()')} */
declare function crearEnlace(texto: string, url: string): HTMLElement
/** ${doc('crearImagen()')} */
declare function crearImagen(url: string, descripcion: string): HTMLElement
/** ${doc('mostrar()')} */
declare function mostrar(elemento: HTMLElement): HTMLElement
/** ${doc('agregarA()')} */
declare function agregarA(contenedor: HTMLElement, elemento: HTMLElement): HTMLElement
/** ${doc('cadaSegundo()')} */
declare function cadaSegundo(hacer: () => void): void

/** Los datos de este encargo — los prepara el evaluador, no hace falta crearlos.
 *  Forma provisional (docs/decisiones.md D5/EN2-EN4): "any" no autocompleta miembros como
 *  .length sobre datos.hobbies — declararlo con forma concreta es lo que lo habilita. */
declare const datos: {
  nombre: string
  sobreMi: string
  redes: Record<string, string>
  hobbies: string[]
  proyectos: Record<string, unknown>[]
  skills: Record<string, string[]>
}
`

// Colores del handoff §Paleta del panel oscuro.
const definirTema: BeforeMount = (monaco) => {
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    LIB_API_CURADA,
    'ts:taller/api-curada.d.ts',
  )

  // Preferencia: nada de subrayado rojo mientras el estudiante escribe (el validador
  // propio de Monaco marca typos y sintaxis en vivo). El único rojo que ve es el de
  // marcarLineaDeError(), y solo después de pulsar "Ejecutar" — se deja que se equivoque
  // mientras escribe, sin juzgarlo línea por línea en tiempo real.
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
  })

  monaco.editor.defineTheme('taller-oscuro', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'd7d3d3', background: '191816' },
      { token: 'comment', foreground: '7d7979', fontStyle: 'italic' },
      { token: 'number', foreground: 'e1ad66' },
      { token: 'string', foreground: 'd7d3d3' },
    ],
    colors: {
      'editor.background': '#191816',
      'editor.foreground': '#d7d3d3',
      'editorLineNumber.foreground': '#605d5d',
      'editorLineNumber.activeForeground': '#9b9797',
      'editor.selectionBackground': '#3a270d',
      'editorCursor.foreground': '#e1ad66',
      'editor.lineHighlightBackground': '#1f1d1b',
      'editorGutter.background': '#191816',
    },
  })
}

export function EditorPanel({
  archivos,
  contenido,
  onCambio,
  salida,
  guardado,
  ejecutando,
  entregando,
  onEjecutar,
  onEntregar,
  abierto,
  onToggle,
  onEditarDatos,
}: Props) {
  const [activo, setActivo] = useState(0)
  const archivo = archivos[activo]
  const menuRef = useRef<HTMLDetailsElement>(null)
  const hayOverflow = archivos.length > 3
  const monacoRef = useRef<Monaco | null>(null)

  const onMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco
    monaco.editor.setTheme('taller-oscuro')
    editor.updateOptions({ fontSize: 13, lineHeight: 23, fontFamily: 'ui-monospace, Menlo, monospace' })
  }

  // Encuentra el modelo del archivo editable (no el de datos.js, que es solo lectura)
  // sin importar qué pestaña esté abierta ahora mismo.
  function marcarLineaDeError(linea: number | undefined) {
    const monaco = monacoRef.current
    if (!monaco) return
    const modelo = monaco.editor
      .getModels()
      .find((m: editor.ITextModel) => m.uri.path.endsWith('/portafolio.js'))
    if (!modelo) return
    if (!linea || linea < 1 || linea > modelo.getLineCount()) {
      monaco.editor.setModelMarkers(modelo, 'ejecucion', [])
      return
    }
    monaco.editor.setModelMarkers(modelo, 'ejecucion', [
      {
        startLineNumber: linea,
        startColumn: 1,
        endLineNumber: linea,
        endColumn: modelo.getLineMaxColumn(linea),
        message: salida?.lineas[0]?.texto ?? 'Hubo un error en esta línea',
        severity: monaco.MarkerSeverity.Error,
      },
    ])
  }

  // Cada vez que corre el código, marcamos (o limpiamos) la línea del error.
  useEffect(() => {
    marcarLineaDeError(salida?.linea)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salida])

  if (!abierto) {
    return (
      <div className="ed-rail">
        <button
          className="enc-toggle"
          onClick={onToggle}
          aria-expanded={false}
          aria-label="Abrir el editor"
          title="Abrir el editor"
        >
          ›
        </button>
        <span className="ed-rail-label">
          {archivos.length > 1 ? `${archivos.length} archivos · ` : ''}
          {archivo.nombre}
        </span>
      </div>
    )
  }

  return (
    <div className="ve-col-editor">
      <div className="ed-tabs">
        <div className="ed-tabs-scroll" role="tablist">
          {archivos.map((a, i) => (
            <button
              key={a.nombre}
              role="tab"
              aria-selected={i === activo}
              className="ed-tab"
              onClick={() => setActivo(i)}
            >
              {a.nombre}
              {a.soloLectura && <span className="ed-tab-nota"> — solo lectura</span>}
            </button>
          ))}
        </div>

        {hayOverflow && (
          <details className="ed-menu" ref={menuRef}>
            <summary title="Todos los archivos">{archivos.length} archivos ▾</summary>
            <ul>
              {archivos.map((a, i) => (
                <li key={a.nombre}>
                  <button
                    aria-current={i === activo}
                    onClick={() => {
                      setActivo(i)
                      if (menuRef.current) menuRef.current.open = false
                    }}
                  >
                    {a.nombre}
                    {a.soloLectura && <span className="ed-tab-nota"> — solo lectura</span>}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        {archivo.soloLectura && (
          <button className="ed-editar-datos" onClick={onEditarDatos}>
            editar mis datos
          </button>
        )}

        <button
          className="ed-colapsar"
          onClick={onToggle}
          aria-label="Colapsar el editor"
          title="Colapsar el editor"
        >
          ‹
        </button>
      </div>

      <div className="ed-codigo">
        <Editor
          height="100%"
          language="javascript"
          path={archivo.nombre}
          value={archivo.soloLectura ? archivo.contenido : contenido}
          beforeMount={definirTema}
          onMount={onMount}
          onChange={(v) => {
            if (archivo.soloLectura) return
            onCambio(v ?? '')
            marcarLineaDeError(undefined)
          }}
          options={{
            readOnly: archivo.soloLectura,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 18, bottom: 12 },
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            tabSize: 2,
            wordWrap: 'on', // comentarios largos en español sin scroll horizontal — más amable para principiantes
            automaticLayout: true, // recupera el tamaño al salir de "pantalla completa" del preview
          }}
        />
      </div>

      <div className="ed-consola" aria-live="polite">
        {salida?.lineas.length ? (
          salida.lineas.map((l, i) => (
            <div key={i}>
              {l.prefijo && <span className="ed-consola-prefijo">{l.prefijo}</span>}{' '}
              {l.texto}
              {l.detalle && (
                <>
                  {'\n'}
                  <span className="ed-consola-detalle">{'          ' + l.detalle}</span>
                </>
              )}
            </div>
          ))
        ) : (
          <span className="ed-consola-detalle">
            <span className="ed-consola-prefijo">consola</span> sin salida todavía — pulsa Ejecutar
          </span>
        )}
      </div>

      <div className="ed-acciones">
        <button className="btn btn-primary" onClick={onEjecutar} disabled={ejecutando}>
          {ejecutando ? 'Ejecutando…' : 'Ejecutar'}
        </button>
        <button className="btn btn-secondary" onClick={onEntregar} disabled={entregando}>
          {entregando ? 'Revisando…' : 'Entregar a revisión'}
        </button>
        <span className="mono ed-sello">
          guardado hace {guardado.guardadoHaceSegundos} s · {guardado.intentos} intentos
        </span>
      </div>
    </div>
  )
}
