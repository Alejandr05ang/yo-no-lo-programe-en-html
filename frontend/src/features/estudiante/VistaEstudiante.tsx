import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
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
import { EditorPanel } from '../editor/EditorPanel'
import { PanelPreview } from '../preview/PanelPreview'
import { PanelRevision } from '../revision/PanelRevision'
import './vista-estudiante.css'

// Datos que el evaluador puede cambiar (datos.js). Provisional hasta el backend.
const datosParaPreview = { hobbies: portafolioEjemplo.hobbies }

// HTML inicial del preview: el estado ilustrado en el mockup (3 hobbies + aviso).
const previewInicial = `
<div style="font-family:'Cormorant Garamond',serif;font-size:26px;line-height:1.1">${portafolioEjemplo.nombre}</div>
<div style="font-size:12px;color:#7d7979;margin-top:2px">${portafolioEjemplo.subtitulo}</div>
<hr style="height:1px;border:0;background:rgba(32,31,29,.16);margin:14px 0">
<div style="font-size:13px;text-align:justify;color:#444141">${portafolioEjemplo.sobreMi}</div>
<div style="margin-top:18px;font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#b68235">Hobbies</div>
<ul style="margin:9px 0 0;padding-left:18px;font-size:13px;line-height:1.9">
${portafolioEjemplo.hobbies.map((h) => `<li>${h}</li>`).join('')}
</ul>
<div style="margin-top:14px;border:1px dashed #bab6b6;border-radius:4px;padding:9px;font:11px/1.4 ui-monospace,Menlo,monospace;color:#7d7979">faltan ${portafolioEjemplo.hobbiesEnArchivoDePrueba - portafolioEjemplo.hobbies.length} elementos del archivo de prueba</div>
`

export function VistaEstudiante() {
  const { data: encargo, isLoading } = useQuery({
    queryKey: ['encargo', 'hoy'],
    queryFn: api.encargoDelDia,
  })

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
    const r = await api.entregarARevision(contenido)
    setRevision(r)
    setEntregando(false)
  }, [contenido])

  // Autoguardado (debounce). Provisional: api.autoguardar es un stub.
  useEffect(() => {
    const t = setTimeout(() => void api.autoguardar(contenido), 800)
    return () => clearTimeout(t)
  }, [contenido])

  return (
    <div className="ve">
      <Nav dia="Día 4 — Ju1" iniciales="AR" />

      <div className="solo-escritorio">Editar código requiere computador.</div>

      <div className="ve-grid oculto-en-movil">
        {isLoading || !encargo ? (
          <section className="ve-col-encargo">
            <p className="text-muted">Cargando encargo…</p>
          </section>
        ) : (
          <PanelEncargo encargo={encargo} />
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
        />

        <div className="ve-col-preview">
          <PanelPreview url={portafolioEjemplo.url} html={previewHtml} />
          <PanelRevision resultado={revision} />
        </div>
      </div>
    </div>
  )
}
