import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Nav } from '../../components/Nav'
import { api } from '../../lib/api'
import {
  archivoDatosEjemplo,
  archivoPortafolioEjemplo,
  guardadoEjemplo,
  portafolioEjemplo,
  salidaEjemplo,
} from '../../lib/mockEncargo'
import { ejecutarPreview } from '../../lib/sandbox'
import type { ResultadoRevision, SalidaEjecucion } from '../../lib/tipos'
import { PanelEncargo } from '../encargo/PanelEncargo'
import { DivisorArrastrable } from './DivisorArrastrable'
import { EditorPanel } from '../editor/EditorPanel'
import { PanelPreview } from '../preview/PanelPreview'
import { PanelRevision } from '../revision/PanelRevision'
import './vista-estudiante.css'

// Datos que el evaluador puede cambiar (datos.js). En E1 el código todavía no los usa.
const datosParaPreview = {
  nombre: '',
  sobreMi: '',
  redes: {},
  hobbies: [],
  proyectos: [],
}

// HTML inicial del preview: E1 arranca con la página casi vacía (el resultado de
// ejecutar el andamiaje, que muestra el título con el placeholder).
const previewInicial = `
<h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;color:#9b9797">tu nombre</h1>
`

const CLAVE_ENCARGO = 've:encargo-abierto'

// Conveniencia por visitante: recordar si dejó el encargo plegado. Arranca abierto.
function leerEncargoAbierto(): boolean {
  try {
    return localStorage.getItem(CLAVE_ENCARGO) !== '0'
  } catch {
    return true
  }
}

export function VistaEstudiante() {
  const { data: encargo, isLoading } = useQuery({
    queryKey: ['encargo', 'hoy'],
    queryFn: api.encargoDelDia,
  })

  const [encargoAbierto, setEncargoAbierto] = useState(leerEncargoAbierto)
  const [editorAbierto, setEditorAbierto] = useState(true)
  const gridRef = useRef<HTMLDivElement>(null)
  const [previewExpandido, setPreviewExpandido] = useState(false)
  const [contenido, setContenido] = useState(archivoPortafolioEjemplo.contenido)
  const [salida, setSalida] = useState<SalidaEjecucion | null>(salidaEjemplo)
  const [previewHtml, setPreviewHtml] = useState(previewInicial)
  const [revision, setRevision] = useState<ResultadoRevision | null>(null)
  const [ejecutando, setEjecutando] = useState(false)
  const [entregando, setEntregando] = useState(false)

  const ejecutar = useCallback(async () => {
    setEjecutando(true)
    const r = await ejecutarPreview(contenido, datosParaPreview)
    setEjecutando(false)
    if (r.ok) {
      setPreviewHtml(r.html || previewInicial)
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
  }, [contenido])

  const entregar = useCallback(async () => {
    setEntregando(true)
    const r = await api.entregarARevision(encargo?.numero ?? 1, contenido, datosParaPreview)
    setRevision(r)
    setEntregando(false)
  }, [contenido, encargo?.numero])

  // Autoguardado (debounce). Provisional: api.autoguardar es un stub.
  useEffect(() => {
    const t = setTimeout(() => void api.autoguardar(contenido), 800)
    return () => clearTimeout(t)
  }, [contenido])

  return (
    <div className="ve">
      <Nav dia="Día 2 — Ma1" iniciales="AR" />

      <div className="solo-escritorio">Editar código requiere computador.</div>

      <div
        ref={gridRef}
        className="ve-grid oculto-en-movil"
        data-encargo={encargoAbierto ? 'abierto' : 'cerrado'}
        data-editor={editorAbierto ? 'abierto' : 'cerrado'}
        data-preview={previewExpandido ? 'expandido' : 'normal'}
      >
        {isLoading || !encargo ? (
          <section className="ve-col-encargo">
            <p className="text-muted">Cargando encargo…</p>
          </section>
        ) : (
          <PanelEncargo
            encargo={encargo}
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
          archivos={[
            { ...archivoPortafolioEjemplo, contenido },
            archivoDatosEjemplo,
          ]}
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
        />

        <DivisorArrastrable gridRef={gridRef} />

        <div className="ve-col-preview">
          <PanelPreview
            url={portafolioEjemplo.url}
            html={previewHtml}
            expandido={previewExpandido}
            onToggleExpandir={() => setPreviewExpandido((v) => !v)}
          />
          <PanelRevision resultado={revision} />
        </div>
      </div>
    </div>
  )
}
