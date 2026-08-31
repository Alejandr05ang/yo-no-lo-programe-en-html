import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { BetaTag } from '../../components/Beta'
import { Nav } from '../../components/Nav'
import { diaDeEncargo } from '../../lib/encargos'
import { reiniciarAcceso } from '../../lib/acceso'
import { detener as detenerMusica } from '../../lib/musica'
import { encargoFrontera, reiniciarProgreso } from '../../lib/progreso'
import { CAPAS, capaActual, sesionesConEstado, type EstadoSesion } from '../../lib/sesiones'
import './mapa.css'

const ETIQUETA_ESTADO: Record<EstadoSesion, string> = {
  hecho: 'hecho',
  hoy: 'hoy',
  manana: 'mañana',
  cerrado: 'cerrado',
}

// Escalera de trazos del currículo en espiral: % del track que llena cada capa (1→5).
const RELLENO_BARRA = ['24%', '43%', '62%', '81%', '100%']

// Pantalla 1e — Mapa de progreso. Ver el avance de las dos semanas y volver a un
// encargo ya disponible (docs/encargos.md §5.4).
export function Mapa() {
  const navigate = useNavigate()
  const sesiones = sesionesConEstado()
  const capa = capaActual()
  const diaHoy = `Hoy: ${diaDeEncargo(encargoFrontera())}`

  return (
    <div className="mapa">
      <Nav seccion="Mapa" dia={diaHoy} iniciales="AR" activo="mapa" />

      <div className="mapa-cuerpo">
        <header className="mapa-encabezado">
          <h2>El portafolio se construye una pieza por sesión</h2>
          <p>
            Cada día suma una capa sobre lo anterior y reabre los mismos conceptos en un contexto
            nuevo. Nada se reemplaza: lo del lunes sigue vivo el viernes.
          </p>
        </header>

        {/* Calendario de 10 sesiones */}
        <div className="mapa-calendario">
          {sesiones.map((s) => {
            const navegable = s.destino != null
            const Cont = navegable ? 'button' : 'div'
            return (
              <Cont
                key={s.codigo}
                className="mapa-celda"
                data-estado={s.estado}
                {...(navegable
                  ? {
                      type: 'button' as const,
                      onClick: () => navigate(`/portafolio?e=${s.destino}`),
                    }
                  : {})}
              >
                <div className="mapa-celda-cod mono">
                  {s.codigo} · {s.duracion}
                </div>
                <div className="mapa-celda-tema">{s.tema}</div>
                <div className="mapa-celda-pieza">{s.pieza}</div>
                <div className="mapa-celda-tag">
                  <span
                    className={`tag mono ${s.estado === 'hoy' ? 'tag-accent' : s.estado === 'manana' ? 'tag-outline' : 'tag-neutral'}`}
                  >
                    {ETIQUETA_ESTADO[s.estado]}
                    {s.avanceTexto && ` · ${s.avanceTexto}`}
                  </span>
                </div>
              </Cont>
            )
          })}
        </div>

        <div className="mapa-abajo">
          {/* Currículo en espiral */}
          <section>
            <h4>Currículo en espiral</h4>
            <p className="mapa-parrafo">
              Las cinco capas se ven como una escalera de trazos: cada peldaño incluye los anteriores.
            </p>
            <div className="mapa-espiral">
              {CAPAS.map((nombre, i) => {
                const n = i + 1
                const activa = n === capa
                const pasada = n < capa
                return (
                  <div key={n} className="mapa-espiral-fila" data-activa={activa}>
                    <span className="mono mapa-espiral-num">{n}</span>
                    <span className="mapa-espiral-nombre" data-futura={!activa && !pasada}>
                      {nombre}
                    </span>
                    <span
                      className="mapa-espiral-barra"
                      data-futura={!activa && !pasada}
                      style={{ '--pct': RELLENO_BARRA[i] } as CSSProperties}
                    />
                  </div>
                )
              })}
            </div>
          </section>

          {/* Retos platino */}
          <section>
            <h4>
              Retos platino <span className="text-muted mapa-sub">· opcionales, no bloquean</span>{' '}
              <BetaTag />
            </h4>
            <div className="mapa-platino">
              <div className="card mapa-reto">
                <div className="mapa-reto-txt">
                  <div className="card-title">Memoria de imágenes</div>
                  <div className="card-meta">array + bucle + condicional + clic</div>
                </div>
                <span
                  className={`tag mono ${capa >= 3 ? 'tag-accent' : 'tag-outline'}`}
                >
                  {capa >= 3 ? 'abierto' : 'pronto'}
                </span>
              </div>
              <div className="card mapa-reto">
                <div className="mapa-reto-txt">
                  <div className="card-title">Ahorcado</div>
                  <div className="card-meta">se abre con matrices y funciones · Ma2</div>
                </div>
                <span className="tag tag-outline mono">Ma2</span>
              </div>
              <div className="card mapa-reto mapa-reto-punteado">
                <div className="mapa-reto-txt">
                  <div className="card-title mapa-reto-apagado">Buscaminas</div>
                  <div className="card-meta">recursión — fuera del flujo obligatorio</div>
                </div>
                <span className="tag tag-neutral mono mapa-reto-apagado">etapa final</span>
              </div>
            </div>
            <p className="mono mapa-nota">
              Pendiente del equipo: si el platino suma a la nota o es extra-crédito visible.
            </p>
          </section>
        </div>

        {import.meta.env.DEV && (
          <p className="mono mapa-nota">
            <button
              className="mapa-reset"
              onClick={() => {
                reiniciarProgreso()
                reiniciarAcceso()
                detenerMusica()
                navigate('/inicio')
              }}
            >
              reiniciar todo (dev)
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
