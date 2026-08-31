import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { api } from '../../lib/api'
import { componerAndamiaje, diaDeEncargo, NUMEROS_DE_ENCARGO } from '../../lib/encargos'
import { datosComoTexto, guardadoEjemplo, portafolioEjemplo } from '../../lib/mockEncargo'
import { guardarPerfil, leerPerfil, perfilComoDatos } from '../../lib/perfil'
import { ejecutarPreview } from '../../lib/sandbox'
import type { ResultadoRevision, SalidaEjecucion } from '../../lib/tipos'
import { PanelEncargo } from '../encargo/PanelEncargo'
import { DivisorArrastrable } from './DivisorArrastrable'
import { EditorPanel } from '../editor/EditorPanel'
import { MisDatos } from '../perfil/MisDatos'
import { PanelPreview } from '../preview/PanelPreview'
import { PanelRevision } from '../revision/PanelRevision'
import './vista-estudiante.css'

const CLAVE_ENCARGO = 've:encargo-abierto'
// Estado efímero por pestaña (sessionStorage): sobrevive recargas, se pierde al cerrar la
// pestaña. Igual criterio que el estado dinámico del portafolio (brief §2.6). En producción
// esto lo guarda el backend por estudiante.
const CLAVE_SOLUCIONES = 've:soluciones' // código aceptado por encargo (para heredar)
const CLAVE_BORRADORES = 've:borradores' // código en curso por encargo (para no perder trabajo al navegar)

const MIN_ENCARGO = NUMEROS_DE_ENCARGO[0]
const MAX_ENCARGO = NUMEROS_DE_ENCARGO[NUMEROS_DE_ENCARGO.length - 1]

function leerEncargoAbierto(): boolean {
  try {
    return localStorage.getItem(CLAVE_ENCARGO) !== '0'
  } catch {
    return true
  }
}

function leerMapa(clave: string): Record<number, string> {
  try {
    return JSON.parse(sessionStorage.getItem(clave) ?? '{}')
  } catch {
    return {}
  }
}

function persistir(clave: string, obj: unknown) {
  try {
    sessionStorage.setItem(clave, JSON.stringify(obj))
  } catch {
    /* sin almacenamiento: se sigue sin persistir */
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

export function VistaEstudiante() {
  const [params, setParams] = useSearchParams()
  const numero = clamp(Number(params.get('e')) || MIN_ENCARGO, MIN_ENCARGO, MAX_ENCARGO)

  const { data: encargo } = useQuery({
    queryKey: ['encargo', numero],
    queryFn: () => api.encargo(numero),
  })

  const [encargoAbierto, setEncargoAbierto] = useState(leerEncargoAbierto)
  const [editorAbierto, setEditorAbierto] = useState(true)
  const [previewExpandido, setPreviewExpandido] = useState(false)
  const [misDatosAbierto, setMisDatosAbierto] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const [perfil, setPerfil] = useState(leerPerfil)
  const perfilRef = useRef(perfil)
  perfilRef.current = perfil

  const solucionesRef = useRef<Record<number, string>>(leerMapa(CLAVE_SOLUCIONES))
  const borradoresRef = useRef<Record<number, string>>(leerMapa(CLAVE_BORRADORES))
  const numeroAnteriorRef = useRef<number | null>(null)

  const [contenido, setContenido] = useState('')
  const contenidoRef = useRef('')
  contenidoRef.current = contenido

  const [salida, setSalida] = useState<SalidaEjecucion | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [revision, setRevision] = useState<ResultadoRevision | null>(null)
  const [ejecutando, setEjecutando] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const [avanzando, setAvanzando] = useState(false)

  // `datos` de la preview = perfil del estudiante + override del encargo (donde este necesita
  // un estado concreto). Que sea propio hace que el portafolio se sienta suyo desde E1.
  const datos = useMemo(
    () => ({ ...perfilComoDatos(perfil), ...(encargo?.datosOverride ?? {}) }),
    [perfil, encargo],
  )
  const archivoDatos = useMemo(
    () => ({ nombre: 'datos.js', soloLectura: true, contenido: datosComoTexto(datos) }),
    [datos],
  )

  const irAEncargo = (n: number) =>
    setParams((p) => {
      p.set('e', String(n))
      return p
    })

  // Al cambiar de encargo: guardar el borrador del que se sale y cargar el que entra.
  useEffect(() => {
    if (!encargo) return
    const anterior = numeroAnteriorRef.current
    if (anterior != null && anterior !== numero) {
      borradoresRef.current[anterior] = contenidoRef.current
      persistir(CLAVE_BORRADORES, borradoresRef.current)
    }
    numeroAnteriorRef.current = numero

    const nuevo = borradoresRef.current[numero] ?? componerAndamiaje(numero, solucionesRef.current)
    setContenido(nuevo)
    setSalida(null)
    setRevision(null)

    // No se limpia la vista previa: si el encargo hereda código que ya funciona, se corre
    // para mostrar el portafolio acumulado desde el primer instante (sensación de avance).
    if (encargo.heredaDe != null) {
      const d = { ...perfilComoDatos(perfilRef.current), ...encargo.datosOverride }
      void ejecutarPreview(nuevo, d).then((r) => {
        if (r.ok) setPreviewHtml(r.html)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encargo, numero])

  const ejecutar = useCallback(async () => {
    setEjecutando(true)
    const r = await ejecutarPreview(contenido, datos)
    setEjecutando(false)
    if (r.ok) {
      setPreviewHtml(r.html)
      setSalida({
        lineas: r.logs.length
          ? r.logs.map((texto) => ({ prefijo: 'consola', texto }))
          : [{ prefijo: 'consola', texto: 'ejecución sin errores' }],
      })
    } else {
      setSalida({
        lineas: [{ prefijo: 'consola', texto: r.error?.mensaje ?? 'error desconocido' }],
      })
    }
  }, [contenido, datos])

  const entregar = useCallback(async () => {
    setEntregando(true)
    const r = await api.entregarARevision(numero, contenido, datos)
    setRevision(r)
    setEntregando(false)
  }, [contenido, datos, numero])

  // Al guardar "Mis datos": refrescar la preview para que se vea el cambio de una.
  useEffect(() => {
    if (previewHtml) void ejecutar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil])

  // Autoguardado + cache del borrador del encargo actual.
  useEffect(() => {
    if (!contenido) return
    const t = setTimeout(() => {
      void api.autoguardar(contenido)
      borradoresRef.current[numero] = contenido
      persistir(CLAVE_BORRADORES, borradoresRef.current)
    }, 800)
    return () => clearTimeout(t)
  }, [contenido, numero])

  const aceptado = !!revision && revision.casosPasados === revision.casosTotales
  const haySiguiente = numero < MAX_ENCARGO

  // Al aceptar: guardar la solución (para heredarla) y pasar solo al siguiente encargo
  // si este es la frontera (docs/encargos.md §5.2). Sin botón: la transición es automática.
  useEffect(() => {
    if (!aceptado) {
      setAvanzando(false)
      return
    }
    solucionesRef.current[numero] = contenidoRef.current
    borradoresRef.current[numero] = contenidoRef.current
    persistir(CLAVE_SOLUCIONES, solucionesRef.current)
    persistir(CLAVE_BORRADORES, borradoresRef.current)

    const esFrontera = haySiguiente && !solucionesRef.current[numero + 1]
    if (!esFrontera) return
    setAvanzando(true)
    const id = window.setTimeout(() => irAEncargo(numero + 1), 1600)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aceptado, numero])

  const mensajeAceptado = !aceptado
    ? ''
    : avanzando
      ? 'Pasando al siguiente encargo…'
      : haySiguiente
        ? 'Encargo aceptado.'
        : 'Terminaste el último encargo. Tu portafolio está completo.'

  return (
    <div className="ve">
      <Nav dia={diaDeEncargo(numero)} iniciales="AR" />

      <div className="solo-escritorio">Editar código requiere computador.</div>

      <div
        ref={gridRef}
        className="ve-grid oculto-en-movil"
        data-encargo={encargoAbierto ? 'abierto' : 'cerrado'}
        data-editor={editorAbierto ? 'abierto' : 'cerrado'}
        data-preview={previewExpandido ? 'expandido' : 'normal'}
      >
        {!encargo ? (
          <section className="ve-col-encargo">
            <p className="text-muted">Cargando encargo…</p>
          </section>
        ) : (
          <PanelEncargo
            encargo={encargo.meta}
            abierto={encargoAbierto}
            onToggle={() =>
              setEncargoAbierto((v) => {
                try {
                  localStorage.setItem(CLAVE_ENCARGO, v ? '0' : '1')
                } catch {
                  /* almacenamiento no disponible: seguimos sin persistir */
                }
                return !v
              })
            }
          />
        )}

        <EditorPanel
          archivos={[{ nombre: 'portafolio.js', soloLectura: false, contenido }, archivoDatos]}
          contenido={contenido}
          onCambio={setContenido}
          salida={salida}
          guardado={guardadoEjemplo}
          ejecutando={ejecutando}
          entregando={entregando}
          onEjecutar={ejecutar}
          onEntregar={entregar}
          abierto={editorAbierto}
          onToggle={() => setEditorAbierto((v) => !v)}
          onEditarDatos={() => setMisDatosAbierto(true)}
        />

        <DivisorArrastrable gridRef={gridRef} />

        <div className="ve-col-preview">
          <PanelPreview
            url={portafolioEjemplo.url}
            html={previewHtml}
            expandido={previewExpandido}
            onToggleExpandir={() => setPreviewExpandido((v) => !v)}
          />
          <PanelRevision resultado={revision} aceptado={aceptado} mensajeAceptado={mensajeAceptado} />
        </div>
      </div>

      {misDatosAbierto && (
        <MisDatos
          perfil={perfil}
          onGuardar={(p) => {
            setPerfil(p)
            guardarPerfil(p)
          }}
          onCerrar={() => setMisDatosAbierto(false)}
        />
      )}
    </div>
  )
}
