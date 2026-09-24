import { useState } from 'react'
import type { Celda, EstructuraDePagina } from '../../lib/tipos'
import './estructura.css'

interface Props {
  estructura: EstructuraDePagina
  onAgregarFila: () => void
  onAgregarColumna: () => void
  /** Devuelve un mensaje si no se pudo (p. ej. "tiene que quedar al menos una fila"), o null. */
  onEliminarFila: () => string | null
  onEliminarColumna: () => string | null
  /** Combina el rectángulo (o, si es una sola celda, no hace falta combinar nada) y lo
   *  convierte en una sección con ese nombre. Devuelve un mensaje si no se pudo, o null si
   *  salió bien. */
  onCrearSeccion: (
    filaInicio: number,
    columnaInicio: number,
    filaFin: number,
    columnaFin: number,
    etiqueta: string,
  ) => string | null
  onSepararCelda: (celdaId: string) => void
  onAbrirSeccion: (nombre: string) => void
}

// Herramienta visual tipo planilla ("protoexcel"): arma la ESTRUCTURA de la página a clics, sin
// escribir código. Clic en una celda elige una punta del rectángulo, clic en otra celda la
// punta opuesta — igual que seleccionar un rango en una planilla — y "crear sección" la
// convierte en una sección con su propia pestaña de código (EditorPanel.tsx la toma de ahí).
// A propósito son dos CLICS, no arrastrar el mouse: funciona igual con mouse, trackpad o
// pantalla táctil, y es más fácil de acertar para alguien recién empezando.
export function EditorEstructura({
  estructura,
  onAgregarFila,
  onAgregarColumna,
  onEliminarFila,
  onEliminarColumna,
  onCrearSeccion,
  onSepararCelda,
  onAbrirSeccion,
}: Props) {
  const [origen, setOrigen] = useState<Celda | null>(null)
  const [hasta, setHasta] = useState<Celda | null>(null)
  const [etiqueta, setEtiqueta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorEstructura, setErrorEstructura] = useState<string | null>(null)

  const filaMin = origen && hasta ? Math.min(origen.fila, hasta.fila) : -1
  const filaMax = origen && hasta ? Math.max(origen.fila, hasta.fila) : -1
  const columnaMin = origen && hasta ? Math.min(origen.columna, hasta.columna) : -1
  const columnaMax = origen && hasta ? Math.max(origen.columna, hasta.columna) : -1

  function limpiarSeleccion() {
    setOrigen(null)
    setHasta(null)
    setEtiqueta('')
    setError(null)
  }

  function alClicCelda(celda: Celda) {
    if (celda.seccion !== null) {
      limpiarSeleccion()
      onAbrirSeccion(celda.seccion)
      return
    }
    setError(null)
    if (!origen) {
      setOrigen(celda)
      setHasta(celda)
    } else {
      setHasta(celda)
    }
  }

  function confirmar() {
    if (!origen || !hasta) return
    if (!etiqueta.trim()) {
      setError('Ponele un nombre a la sección.')
      return
    }
    const resultado = onCrearSeccion(origen.fila, origen.columna, hasta.fila, hasta.columna, etiqueta.trim())
    if (resultado) {
      setError(resultado)
      return
    }
    limpiarSeleccion()
  }

  function estaSeleccionada(celda: Celda): boolean {
    if (!origen || !hasta) return false
    const celdaFilaMax = celda.fila + celda.expandeFilas - 1
    const celdaColumnaMax = celda.columna + celda.expandeColumnas - 1
    return (
      celda.fila <= filaMax && celdaFilaMax >= filaMin && celda.columna <= columnaMax && celdaColumnaMax >= columnaMin
    )
  }

  return (
    <div className="ee">
      <div className="ee-acciones">
        <button type="button" className="ee-boton" onClick={() => { setErrorEstructura(null); onAgregarFila() }}>+ agregar fila</button>
        <button type="button" className="ee-boton" onClick={() => setErrorEstructura(onEliminarFila())}>eliminar fila</button>
        <button type="button" className="ee-boton" onClick={() => { setErrorEstructura(null); onAgregarColumna() }}>+ agregar columna</button>
        <button type="button" className="ee-boton" onClick={() => setErrorEstructura(onEliminarColumna())}>eliminar columna</button>
      </div>
      {errorEstructura && <p className="ee-form-error" role="alert">{errorEstructura}</p>}

      <div
        className="ee-grid"
        style={{
          gridTemplateRows: `repeat(${estructura.filas}, minmax(56px, 1fr))`,
          gridTemplateColumns: `repeat(${estructura.columnas}, 1fr)`,
        }}
      >
        {estructura.celdas.map((celda) => (
          <div
            key={celda.id}
            className="ee-celda-envoltorio"
            style={{
              gridRow: `${celda.fila + 1} / span ${celda.expandeFilas}`,
              gridColumn: `${celda.columna + 1} / span ${celda.expandeColumnas}`,
            }}
          >
            <button
              type="button"
              className="ee-celda"
              data-etiquetada={celda.seccion !== null || undefined}
              data-seleccionada={estaSeleccionada(celda) || undefined}
              onClick={() => alClicCelda(celda)}
            >
              {celda.seccion ?? '···'}
            </button>
            {celda.seccion !== null && (
              <button
                type="button"
                className="ee-celda-separar"
                title="Separar esta sección"
                aria-label={`Separar la sección ${celda.seccion}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm(`Separar "${celda.seccion}" borra el código que tenga esa sección. ¿Seguro?`)) {
                    onSepararCelda(celda.id)
                  }
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {origen && (
        <div className="ee-form">
          <span className="ee-form-ayuda">
            {hasta && origen.id === hasta.id
              ? 'Nombrá esta celda para convertirla en una sección:'
              : 'Nombrá esta selección para combinarla en una sección:'}
          </span>
          <input
            className="ee-form-input"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmar()}
            placeholder="Encabezado, Sobre mí, Pie de página…"
            autoFocus
          />
          <button type="button" className="ee-boton ee-boton-primario" onClick={confirmar}>Crear sección</button>
          <button type="button" className="ee-boton" onClick={limpiarSeleccion}>Cancelar</button>
          {error && <p className="ee-form-error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  )
}
