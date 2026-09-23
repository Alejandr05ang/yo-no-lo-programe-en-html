import { useRef, useState } from 'react'
import { Nav } from '../../components/Nav'
import { documentoPortafolio } from '../../lib/andamiajeEstilos'
import { useAbrirEnlaces } from '../preview/useAbrirEnlaces'
import { NUMEROS_DE_ENCARGO } from '../../lib/encargos'
import type { Encargo } from '../../lib/tipos'
import './vista-consulta.css'

interface Props {
  encargo: Encargo | null
  dia: string
  previewHtml: string
  urlPortafolio: string
  onEditarDeTodosModos: () => void
}

// Pantalla 1g — vista de consulta (docs/design-handoff.md §1g). Se muestra en equipos sin
// teclado/mouse real y pantalla física chica (lib/dispositivo.ts): en ese caso el móvil es
// de CONSULTA, no de edición — escribir código ahí no es realista para un principiante. Dos
// vistas: el encargo del día (A) y el portafolio publicado, tal como lo ve un visitante (B).
export function VistaConsultaMovil({ encargo, dia, previewHtml, urlPortafolio, onEditarDeTodosModos }: Props) {
  const [vista, setVista] = useState<'encargo' | 'portafolio'>('encargo')
  const marcoRef = useRef<HTMLIFrameElement>(null)
  useAbrirEnlaces(marcoRef)
  const numero = encargo?.numero ?? NUMEROS_DE_ENCARGO[0]
  const nuevasHoy = encargo?.herramientas.filter((h) => h.nuevaHoy) ?? []

  return (
    <div className="vc">
      <Nav seccion="Portafolio" dia={dia} iniciales="AR" activo="portafolio" />

      <div className="vc-tabs" role="tablist" aria-label="Vista">
        <button
          role="tab"
          aria-selected={vista === 'encargo'}
          className="vc-tab"
          onClick={() => setVista('encargo')}
        >
          Encargo del día
        </button>
        <button
          role="tab"
          aria-selected={vista === 'portafolio'}
          className="vc-tab"
          onClick={() => setVista('portafolio')}
        >
          Mi portafolio publicado
        </button>
      </div>

      {vista === 'encargo' ? (
        <div className="vc-cuerpo">
          {!encargo ? (
            <p className="text-muted">Cargando encargo…</p>
          ) : (
            <>
              <div className="kicker">
                Encargo {String(encargo.numero).padStart(2, '0')} · {encargo.desbloqueadoTexto}
              </div>
              <h3 style={{ margin: '4px 0 0' }}>{encargo.titulo}</h3>

              <div className="vc-avance">
                <span className="mono">
                  {numero} / {NUMEROS_DE_ENCARGO.length}
                </span>
                <div className="vc-barras">
                  {NUMEROS_DE_ENCARGO.map((n) => (
                    <span key={n} className="vc-barra" data-llena={n <= numero} />
                  ))}
                </div>
              </div>

              {encargo.parrafos.map((p, i) => (
                <p key={i} className="enc-parrafo">
                  {p}
                </p>
              ))}

              {nuevasHoy.length > 0 && (
                <div className="enc-herramientas">
                  <div className="kicker">Se desbloqueó hoy</div>
                  <div className="enc-tags">
                    {nuevasHoy.map((h) => (
                      <span key={h.nombre} className="tag mono tag-accent">
                        {h.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="vc-aviso">
                Escribir código desde acá no es cómodo para un principiante — esta vista es solo
                para consultar tu encargo y tu avance.
              </p>
            </>
          )}

          <div className="vc-acciones">
            <button className="btn btn-secondary" onClick={() => setVista('portafolio')}>
              Ver mi portafolio publicado
            </button>
            <button className="btn btn-secondary" onClick={onEditarDeTodosModos}>
              Editar de todos modos
            </button>
          </div>
        </div>
      ) : (
        <div className="vc-cuerpo vc-cuerpo-portafolio">
          <div className="pv-url">
            <span className="mono pv-url-campo">{urlPortafolio}</span>
            <span className="tag tag-accent mono">en vivo</span>
          </div>
          <iframe
            ref={marcoRef}
            className="vc-marco"
            title="Tu portafolio publicado"
            sandbox="allow-scripts"
            srcDoc={documentoPortafolio(previewHtml)}
          />
        </div>
      )}
    </div>
  )
}
