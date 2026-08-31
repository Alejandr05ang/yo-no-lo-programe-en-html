import { useNavigate } from 'react-router-dom'
import { diagnosticoHecho, marcarAcceso } from '../../lib/acceso'
import { diaDeEncargo } from '../../lib/encargos'
import { leerPerfil } from '../../lib/perfil'
import { iniciar as iniciarMusica } from '../../lib/musica'
import { encargoFrontera, encargosAceptados } from '../../lib/progreso'
import { PortadaLayout } from './PortadaLayout'

// Página de entrada (raíz de la app). Un solo layout; el contenido cambia según el estado:
//   - Nunca hizo el diagnóstico → bienvenida + botón que lleva al diagnóstico (/entrar).
//   - Ya lo hizo → bienvenida diaria + botón que entra directo al portafolio (se salta /entrar).
export function Inicio() {
  const navigate = useNavigate()
  const yaEmpezo = diagnosticoHecho()

  if (!yaEmpezo) {
    return (
      <PortadaLayout centrado>
        <div className="card-kicker">Primer día · L1</div>
        <h3>Empecemos</h3>
        <p className="portada-bienvenida-txt">
          Este taller es distinto: no vas a copiar HTML. Vas a escribir el código que arma tu
          página, y en dos semanas vas a tener un portafolio de verdad, publicado en internet con
          tu nombre.
        </p>
        <p className="portada-bienvenida-txt">
          Lo primero es una vez: unas preguntas rápidas para conocerte y armar las parejas de
          trabajo.
        </p>
        <div className="portada-pie">
          <button className="btn btn-primary" onClick={() => navigate('/entrar')}>
            Empezar
          </button>
        </div>
      </PortadaLayout>
    )
  }

  const nombre = leerPerfil().nombre.split(' ')[0]
  const hechos = encargosAceptados().length
  const frontera = encargoFrontera()
  const dia = diaDeEncargo(frontera)

  const entrar = () => {
    iniciarMusica() // el clic es el gesto que habilita el audio
    marcarAcceso()
    navigate('/portafolio')
  }

  return (
    <PortadaLayout
      centrado
      cifras={[
        [String(hechos), 'encargos hechos'],
        ['11', 'en total'],
        [dia.split(' ')[1] ?? '—', 'de hoy'],
      ]}
    >
      <div className="card-kicker">{dia}</div>
      <h3>Hola de nuevo{nombre ? `, ${nombre}` : ''}</h3>
      <p className="portada-bienvenida-txt">
        Hoy sumás una pieza más a tu portafolio. Todo lo que construiste sigue ahí — nada se
        reemplaza.
      </p>
      <p className="portada-bienvenida-txt">
        {hechos === 0 ? 'Empezás por el primer encargo.' : `Vas por el encargo ${frontera} de 11.`}
      </p>
      <div className="portada-pie">
        <button className="btn btn-primary" onClick={entrar}>
          Entrar al taller
        </button>
      </div>
    </PortadaLayout>
  )
}
