import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react'
import { useRef, useState } from 'react'
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
}

// Colores del handoff §Paleta del panel oscuro.
const definirTema: BeforeMount = (monaco) => {
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
}: Props) {
  const [activo, setActivo] = useState(0)
  const archivo = archivos[activo]
  const menuRef = useRef<HTMLDetailsElement>(null)
  const hayOverflow = archivos.length > 3

  const onMount: OnMount = (editor, monaco) => {
    monaco.editor.setTheme('taller-oscuro')
    editor.updateOptions({ fontSize: 13, lineHeight: 23, fontFamily: 'ui-monospace, Menlo, monospace' })
  }

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
          onChange={(v) => !archivo.soloLectura && onCambio(v ?? '')}
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
