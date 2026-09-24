import Editor, { type BeforeMount, type Monaco, type OnMount } from '@monaco-editor/react'
import { useEffect, useRef, useState } from 'react'
import { API_DOCS } from '../../lib/apiDocs'
import type { ArchivoEditor, EstadoGuardado, SalidaEjecucion } from '../../lib/tipos'
import { DiagramaFlujo } from '../flujo/DiagramaFlujo'

interface Props {
  // [portafolio.js, datos.js, …] en un encargo de un solo archivo; con el modelo de Ju1
  // (cuadrícula), además una pestaña editable por cada sección. El contenido de cada uno vive
  // EN el archivo (archivo.contenido) — este panel no asume que hay un único editable.
  archivos: ArchivoEditor[]
  /** Qué archivo cambió y su nuevo contenido — nunca se llama para uno de solo lectura. */
  onCambio: (nombreArchivo: string, valor: string) => void
  /** true mientras se carga el borrador del encargo: el editor no acepta cambios, que se
   *  perderían al llegar el borrador (o se guardarían bajo la clave equivocada). */
  cargando?: boolean
  salida: SalidaEjecucion | null
  guardado: EstadoGuardado
  ejecutando?: boolean
  entregando?: boolean
  /** Sin argumento corre portafolio.js (`contenido`); con uno corre ESE código en su lugar
   *  (una pestaña de prueba), sin tocar `contenido` ni lo que ya está guardado. */
  onEjecutar: (codigo?: string) => void
  onEntregar: () => void
  abierto: boolean
  onToggle: () => void
  /** Abrir el formulario "Mis datos" (se ofrece cuando la pestaña activa es de solo lectura). */
  onEditarDatos: () => void
  /** Pedido externo de abrir una pestaña puntual — p. ej. la herramienta de cuadrícula
   *  (EditorEstructura) al hacer clic en una celda ya nombrada. `token` cambia en cada pedido,
   *  incluso repetido (la misma pestaña dos veces seguidas), para que el efecto dispare igual. */
  archivoSolicitado?: { nombre: string; token: number } | null
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
/** ${doc('crearCarrusel()')} */
declare function crearCarrusel(): HTMLElement
/** ${doc('mostrar()')} */
declare function mostrar(elemento: HTMLElement): HTMLElement
/** ${doc('agregarA()')} */
declare function agregarA(contenedor: HTMLElement, elemento: HTMLElement): HTMLElement
/** ${doc('vaciar()')} */
declare function vaciar(contenedor: HTMLElement): HTMLElement
/** ${doc('proyectosDestacados()')} */
declare function proyectosDestacados(proyectos: Proyecto[]): Proyecto[]
/** ${doc('cadaSegundo()')} */
declare function cadaSegundo(hacer: () => void): void
declare function cadaSegundo(
  carrusel: HTMLElement,
  elementos: Proyecto[],
  crearElemento: (proyecto: Proyecto) => HTMLElement,
): void
/** ${doc('crearSalto()')} */
declare function crearSalto(): HTMLElement
/** ${doc('crearSeccion()')} */
declare function crearSeccion(tipo: 'encabezado' | 'cuerpo' | 'cuadricula-2' | 'cuadricula-3'): HTMLElement
/** ${doc('cambiarTamano()')} */
declare function cambiarTamano(elemento: HTMLElement, tamano: 'pequeño' | 'normal' | 'grande' | 'muy grande'): HTMLElement
/** ${doc('cambiarFuente()')} */
declare function cambiarFuente(elemento: HTMLElement, fuente: 'clásica' | 'elegante' | 'moderna' | 'manuscrita'): HTMLElement
/** ${doc('cambiarColorTexto()')} */
declare function cambiarColorTexto(elemento: HTMLElement, color: string): HTMLElement
/** ${doc('cambiarAlineacion()')} */
declare function cambiarAlineacion(elemento: HTMLElement, alineacion: 'izquierda' | 'centro' | 'derecha' | 'justificado'): HTMLElement
/** ${doc('cambiarColorFondo()')} */
declare function cambiarColorFondo(color: string): void
declare function cambiarColorFondo(elemento: HTMLElement, color: string): HTMLElement

interface Proyecto {
  nombre: string
  imagenUrl?: string
  destacado?: boolean
  terminado?: boolean
  tipo?: string
  url?: string
}

/** Los datos de este encargo — los prepara el evaluador, no hace falta crearlos.
 *  Forma provisional (docs/decisiones.md D5/EN2-EN4): "any" no autocompleta miembros como
 *  .length sobre datos.hobbies — declararlo con forma concreta es lo que lo habilita. */
declare const datos: {
  nombre: string
  sobreMi: string
  redes: Array<{ nombre: string; url: string }>
  hobbies: string[]
  proyectos: Proyecto[]
  skills: Array<{ categoria: string; items: string[] }>
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
  onCambio,
  cargando = false,
  salida,
  guardado,
  ejecutando,
  entregando,
  onEjecutar,
  onEntregar,
  abierto,
  onToggle,
  onEditarDatos,
  archivoSolicitado,
}: Props) {
  type Seleccion = { tipo: 'archivo'; index: number } | { tipo: 'prueba'; id: string }
  type PestanaPrueba = { id: string; nombre: string; contenido: string }

  const [seleccion, setSeleccion] = useState<Seleccion>({ tipo: 'archivo', index: 0 })
  // Pestañas "en blanco" para probar código suelto (una herramienta nueva, un experimento)
  // sin tocar el borrador de portafolio.js. Viven solo acá, no se autoguardan ni se entregan.
  const [pruebas, setPruebas] = useState<PestanaPrueba[]>([])
  const contadorPruebasRef = useRef(0)
  const pruebasRef = useRef<PestanaPrueba[]>([])
  pruebasRef.current = pruebas

  const pruebaActiva = seleccion.tipo === 'prueba' ? pruebas.find((p) => p.id === seleccion.id) ?? null : null
  const archivo = seleccion.tipo === 'archivo' ? archivos[seleccion.index] : archivos[0]
  // Solo cuenta como "de solo lectura" cuando de verdad se está mirando esa pestaña — si hay
  // una prueba activa, `archivo` de arriba es solo un respaldo para no dejar la variable vacía.
  const soloLecturaActiva = !pruebaActiva && archivo.soloLectura

  const menuRef = useRef<HTMLDetailsElement>(null)
  const hayOverflow = archivos.length > 3
  const monacoRef = useRef<Monaco | null>(null)
  const [flujoAbierto, setFlujoAbierto] = useState(false)

  // Un pedido externo de abrir una pestaña (EditorEstructura, al hacer clic en una celda ya
  // nombrada) — dispara con cada `token` nuevo, aunque sea la misma pestaña que ya estaba
  // abierta antes (por eso el token, no solo el nombre: si no, un segundo clic sobre la misma
  // celda no dispararía el efecto).
  useEffect(() => {
    if (!archivoSolicitado) return
    const i = archivos.findIndex((a) => a.nombre === archivoSolicitado.nombre)
    if (i >= 0) setSeleccion({ tipo: 'archivo', index: i })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivoSolicitado])

  function nuevaPestanaDePrueba() {
    contadorPruebasRef.current += 1
    const n = contadorPruebasRef.current
    const id = `prueba-${Date.now()}-${n}`
    setPruebas((prev) => [...prev, { id, nombre: n === 1 ? 'prueba.js' : `prueba ${n}.js`, contenido: '' }])
    setSeleccion({ tipo: 'prueba', id })
  }

  function cerrarPestanaDePrueba(id: string) {
    const p = pruebasRef.current.find((x) => x.id === id)
    if (p) monacoRef.current?.editor.getModel(monacoRef.current.Uri.parse(p.nombre))?.dispose()
    setPruebas((prev) => prev.filter((x) => x.id !== id))
    setSeleccion((sel) => (sel.tipo === 'prueba' && sel.id === id ? { tipo: 'archivo', index: 0 } : sel))
  }

  const onMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco
    monaco.editor.setTheme('taller-oscuro')
    editor.updateOptions({ fontSize: 13, lineHeight: 23, fontFamily: 'ui-monospace, Menlo, monospace' })
  }

  // @monaco-editor/react mantiene un modelo por pestaña (portafolio.js, datos.js…), pero al
  // desmontar SOLO dispone el que estaba activo en ese momento (su prop `keepCurrentModel`,
  // que acá no usamos, queda en false) — el modelo de la OTRA pestaña queda huérfano en el
  // registro global de Monaco, sin dueño. Como Monaco busca los modelos por nombre de archivo
  // (getModel(Uri.parse(path))) y ese nombre no cambia entre encargos ni entre visitas, la
  // próxima vez que este panel se monta reutiliza ese modelo huérfano con SU contenido viejo
  // en vez del que le pasamos por props — así es como una pestaña puede terminar mostrando el
  // texto de otro archivo (o de una sesión anterior) después de recargar o de volver a entrar.
  // Disponemos acá los modelos de todos los archivos de este panel para que cada montaje
  // arranque limpio, siempre con el contenido real.
  const nombresArchivosRef = useRef<string[]>([])
  nombresArchivosRef.current = archivos.map((a) => a.nombre)

  // BUG REAL (reportado en producción): al cambiar de pestaña, @monaco-editor/react dispara
  // "onDidChangeModelContent" de forma SÍNCRONA al cambiar de modelo — pero lo hace dentro de
  // su efecto de "cambiar de modelo", que corre ANTES que su efecto de "volver a registrar el
  // listener onChange" (mismo commit de React, pero los efectos internos de la librería se
  // ejecutan en ese orden). El listener que atiende ese evento es todavía el de la versión
  // ANTERIOR de este componente — su clausura de `archivo` sigue siendo la pestaña de ANTES
  // del cambio. Si esa pestaña anterior era portafolio.js (no solo lectura), el guard
  // `archivo.soloLectura` de abajo no frenaba nada, y el contenido del modelo RECIÉN activado
  // (datos.js) se guardaba con onCambio() como si fuera el código de portafolio.js — que
  // además se autoguarda (VistaEstudiante.tsx) y sobrevive a la próxima recarga.
  // Arreglo: leer `soloLectura` de un ref que se actualiza en el CUERPO del render (no en un
  // efecto), así que para cuando cualquier efecto corre — viejo o nuevo — ya ve la pestaña
  // real del commit actual, sin depender del orden interno de la librería.
  const archivoRef = useRef(archivo)
  archivoRef.current = archivo
  const cargandoRef = useRef(cargando)
  cargandoRef.current = cargando
  useEffect(() => {
    return () => {
      const monaco = monacoRef.current
      if (!monaco) return
      for (const nombre of nombresArchivosRef.current) {
        monaco.editor.getModel(monaco.Uri.parse(nombre))?.dispose()
      }
      for (const p of pruebasRef.current) {
        monaco.editor.getModel(monaco.Uri.parse(p.nombre))?.dispose()
      }
    }
  }, [])

  // Marca la línea del error en la pestaña de la que vino (salida.archivo — undefined en un
  // encargo de un solo archivo, que siempre es portafolio.js), sin importar cuál esté abierta
  // ahora mismo. Limpia el resto: si el error se movió de archivo entre una corrida y la
  // siguiente (dos secciones distintas de Ju1), no puede quedar una marca vieja en la de antes.
  function marcarLineaDeError(linea: number | undefined, archivoConError: string | undefined) {
    const monaco = monacoRef.current
    if (!monaco) return
    const objetivo = archivoConError ?? 'portafolio.js'
    for (const modelo of monaco.editor.getModels()) {
      const esElObjetivo = modelo.uri.path.endsWith('/' + objetivo)
      if (!esElObjetivo || !linea || linea < 1 || linea > modelo.getLineCount()) {
        monaco.editor.setModelMarkers(modelo, 'ejecucion', [])
        continue
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
  }

  // Cada vez que corre el código, marcamos (o limpiamos) la línea del error.
  useEffect(() => {
    marcarLineaDeError(salida?.linea, salida?.archivo)
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
          {pruebaActiva ? pruebaActiva.nombre : archivo.nombre}
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
              aria-selected={seleccion.tipo === 'archivo' && seleccion.index === i}
              className="ed-tab"
              onClick={() => setSeleccion({ tipo: 'archivo', index: i })}
            >
              {a.nombre}
              {a.soloLectura && <span className="ed-tab-nota"> — solo lectura</span>}
            </button>
          ))}
          {pruebas.map((p) => (
            <span key={p.id} className="ed-tab-prueba" role="presentation">
              <button
                role="tab"
                aria-selected={seleccion.tipo === 'prueba' && seleccion.id === p.id}
                className="ed-tab"
                onClick={() => setSeleccion({ tipo: 'prueba', id: p.id })}
              >
                {p.nombre}
              </button>
              <button
                className="ed-tab-cerrar"
                onClick={() => cerrarPestanaDePrueba(p.id)}
                aria-label={`Cerrar ${p.nombre}`}
                title="Cerrar esta pestaña"
              >
                ×
              </button>
            </span>
          ))}
          <button
            className="ed-nueva-pestana"
            onClick={nuevaPestanaDePrueba}
            title="Abrir una pestaña en blanco para probar código, sin tocar portafolio.js"
          >
            + nueva pestaña
          </button>
        </div>

        {hayOverflow && (
          <details className="ed-menu" ref={menuRef}>
            <summary title="Todos los archivos">{archivos.length} archivos ▾</summary>
            <ul>
              {archivos.map((a, i) => (
                <li key={a.nombre}>
                  <button
                    aria-current={seleccion.tipo === 'archivo' && seleccion.index === i}
                    onClick={() => {
                      setSeleccion({ tipo: 'archivo', index: i })
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

        {soloLecturaActiva && (
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
          path={pruebaActiva ? pruebaActiva.nombre : archivo.nombre}
          value={pruebaActiva ? pruebaActiva.contenido : archivo.contenido}
          beforeMount={definirTema}
          onMount={onMount}
          onChange={(v) => {
            if (pruebaActiva) {
              const id = pruebaActiva.id
              setPruebas((prev) => prev.map((p) => (p.id === id ? { ...p, contenido: v ?? '' } : p)))
              return
            }
            if (archivoRef.current.soloLectura || cargandoRef.current) return
            onCambio(archivoRef.current.nombre, v ?? '')
            marcarLineaDeError(undefined, undefined)
          }}
          options={{
            readOnly: pruebaActiva ? false : soloLecturaActiva || cargando,
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

      <div className="ed-consola-acciones">
        <button
          className="ed-ver-flujo"
          onClick={() => setFlujoAbierto(true)}
          title="Ver el diagrama de flujo de tu código (solo lectura)"
        >
          diagrama de flujo
        </button>
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
        <button
          className="btn btn-primary"
          onClick={() => onEjecutar(pruebaActiva?.contenido)}
          disabled={ejecutando || (cargando && !pruebaActiva)}
        >
          {ejecutando ? 'Ejecutando…' : 'Ejecutar'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={onEntregar}
          disabled={entregando || cargando || !!pruebaActiva}
          title={pruebaActiva ? 'Cambiá a la pestaña de portafolio.js para entregar' : undefined}
        >
          {entregando ? 'Revisando…' : 'Entregar a revisión'}
        </button>
        <span className="mono ed-sello">
          {guardado.estado === 'dirty' && 'modificado sin guardar'}
          {guardado.estado === 'saving' && 'guardando...'}
          {cargando ? 'cargando tu borrador…' : guardado.estado === 'saved' && 'guardado'}
          {guardado.estado === 'error' && 'error al guardar'}
          {' · '}
          {guardado.intentos} intentos
        </span>
      </div>

      {flujoAbierto && (
        <DiagramaFlujo codigo={pruebaActiva?.contenido ?? archivo.contenido} onCerrar={() => setFlujoAbierto(false)} />
      )}
    </div>
  )
}
