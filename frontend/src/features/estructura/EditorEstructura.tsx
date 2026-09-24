import { useRef, useState, type PointerEvent } from 'react'
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
  /** Agranda una sección YA nombrada (`celdaId`) para que también ocupe el resto del
   *  rectángulo, sin tocar su código. Devuelve un mensaje si no se pudo, o null si salió bien. */
  onExtenderSeccion: (
    celdaId: string,
    filaInicio: number,
    columnaInicio: number,
    filaFin: number,
    columnaFin: number,
  ) => string | null
  onSepararCelda: (celdaId: string) => void
  onAbrirSeccion: (nombre: string) => void
  abierto: boolean
  onToggle: () => void
}

// Herramienta visual tipo planilla ("protoexcel"): arma la ESTRUCTURA de la página sin escribir
// código. Dos formas de elegir un rectángulo, ambas llevan al mismo lugar (mismo estado
// origen/hasta): (1) ARRASTRAR desde una celda hasta otra, como en cualquier planilla — con
// vista previa en vivo mientras se arrastra, ARRANCANDO DESDE una sección ya nombrada la
// agranda en vez de pedir combinarla de nuevo; (2) clic en una celda y clic en otra (sin soltar
// el mouse entre medio) para quien prefiere no arrastrar — sigue funcionando para trackpad o
// pantalla táctil, pero solo entre celdas vacías (extender una sección ya nombrada solo se
// hace arrastrando, para no confundirlo con "abrirla"). Una sola celda vacía (clic sin
// arrastrar nada) no necesita combinarse, se etiqueta directo. "Crear sección" la convierte en
// una sección con su propia pestaña de código (EditorPanel.tsx la toma de ahí).
export function EditorEstructura({
  estructura,
  onAgregarFila,
  onAgregarColumna,
  onEliminarFila,
  onEliminarColumna,
  onCrearSeccion,
  onExtenderSeccion,
  onSepararCelda,
  onAbrirSeccion,
  abierto,
  onToggle,
}: Props) {
  const [origen, setOrigen] = useState<Celda | null>(null)
  const [hasta, setHasta] = useState<Celda | null>(null)
  const [etiqueta, setEtiqueta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorEstructura, setErrorEstructura] = useState<string | null>(null)
  // La celda donde empezó el pointerdown, y si ese gesto llegó a arrastrarse a otra celda — un
  // clic simple sobre una sección ya nombrada la ABRE; arrastrar desde ella la AGRANDA. No se
  // sabe cuál de las dos es hasta que el gesto termina (o se mueve), así que el pointerdown NO
  // decide nada todavía, solo lo anota.
  const origenPresionadoRef = useRef<Celda | null>(null)
  const huboArrastreRef = useRef(false)

  const extendiendoSeccion = origen?.seccion != null

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

  function alPresionarCelda(celda: Celda) {
    origenPresionadoRef.current = celda
    huboArrastreRef.current = false
  }

  // Mientras se arrastra (botón principal apretado), esa celda pasa a ser la punta "hasta" — da
  // la vista previa en vivo del rectángulo. No se puede arrastrar HACIA una sección ya nombrada
  // DISTINTA de la de origen (no se pueden combinar dos secciones entre sí desde acá).
  function alEntrarArrastrando(celda: Celda, e: PointerEvent) {
    const inicio = origenPresionadoRef.current
    if (e.buttons !== 1 || !inicio) return
    if (celda.seccion !== null && celda.id !== inicio.id) return
    huboArrastreRef.current = true
    setError(null)
    setOrigen(inicio)
    setHasta(celda)
  }

  // Si hubo arrastre, el gesto ya se resolvió en alEntrarArrastrando — este clic es solo el
  // "soltar" y no hace nada más. Si NO hubo arrastre, es un clic simple: abre la sección si ya
  // tenía nombre, o la usa como punta de una selección nueva (o la extiende, si ya había una
  // punta puesta por un clic anterior — así "clic, clic" sigue funcionando sin arrastrar).
  function alClicCelda(celda: Celda) {
    if (huboArrastreRef.current) {
      huboArrastreRef.current = false
      return
    }
    if (celda.seccion !== null) {
      limpiarSeleccion()
      onAbrirSeccion(celda.seccion)
      return
    }
    setError(null)
    if (!origen) {
      setOrigen(celda)
      setHasta(celda)
    } else if (celda.seccion === null) {
      setHasta(celda)
    }
  }

  function confirmar() {
    if (!origen || !hasta) return
    if (extendiendoSeccion) {
      const resultado = onExtenderSeccion(origen.id, origen.fila, origen.columna, hasta.fila, hasta.columna)
      if (resultado) {
        setError(resultado)
        return
      }
      limpiarSeleccion()
      return
    }
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

  if (!abierto) {
    const nombradas = estructura.celdas.filter((c) => c.seccion !== null).length
    return (
      <div className="ee-rail">
        <button
          type="button"
          className="ee-colapsar"
          onClick={onToggle}
          aria-expanded={false}
          aria-label="Mostrar la cuadrícula"
          title="Mostrar la cuadrícula"
        >
          ›
        </button>
        <span className="ee-rail-label">
          cuadrícula colapsada — {estructura.filas}×{estructura.columnas}
          {nombradas > 0 ? `, ${nombradas} sección${nombradas === 1 ? '' : 'es'}` : ''}
        </span>
      </div>
    )
  }

  return (
    <div className="ee">
      <div className="ee-cab">
        <span className="ee-cab-titulo">estructura de la página</span>
        <button
          type="button"
          className="ee-colapsar"
          onClick={onToggle}
          aria-label="Colapsar la cuadrícula"
          title="Colapsar la cuadrícula (le hace lugar al editor de código)"
        >
          ‹
        </button>
      </div>

      <div className="ee-acciones">
        <button type="button" className="ee-boton" onClick={() => { setErrorEstructura(null); onAgregarFila() }}>+ agregar fila</button>
        <button type="button" className="ee-boton" onClick={() => setErrorEstructura(onEliminarFila())}>eliminar fila</button>
        <button type="button" className="ee-boton" onClick={() => { setErrorEstructura(null); onAgregarColumna() }}>+ agregar columna</button>
        <button type="button" className="ee-boton" onClick={() => setErrorEstructura(onEliminarColumna())}>eliminar columna</button>
      </div>
      {errorEstructura && <p className="ee-form-error" role="alert">{errorEstructura}</p>}

      {!origen && (
        <p className="ee-ayuda">
          Arrastrá sobre varias celdas para juntarlas en una sola sección (por ejemplo, para que
          el encabezado ocupe las tres columnas) — o hacé clic en una sola para usarla tal cual.
          Arrastrar desde una sección que ya tiene nombre la agranda, sin tocar su código.
        </p>
      )}

      <div
        className="ee-grid"
        style={{
          gridTemplateRows: `repeat(${estructura.filas}, minmax(56px, 1fr))`,
          // Un piso de ancho por columna (no un simple "1fr"): con muchas columnas, de otra
          // forma se achicaban hasta volverse ilegibles (el texto de una sección terminaba
          // partido letra por letra) en vez de dejar que la cuadrícula scrollee para el costado.
          gridTemplateColumns: `repeat(${estructura.columnas}, minmax(64px, 1fr))`,
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
              onPointerDown={() => alPresionarCelda(celda)}
              onPointerEnter={(e) => alEntrarArrastrando(celda, e)}
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

      {origen && extendiendoSeccion && (
        <div className="ee-form">
          <span className="ee-form-ayuda">
            Agrandar la sección "{origen.seccion}" para que ocupe también esto — su código no se toca.
          </span>
          <button type="button" className="ee-boton ee-boton-primario" onClick={confirmar}>Agrandar sección</button>
          <button type="button" className="ee-boton" onClick={limpiarSeleccion}>Cancelar</button>
          {error && <p className="ee-form-error" role="alert">{error}</p>}
        </div>
      )}

      {origen && !extendiendoSeccion && (
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
