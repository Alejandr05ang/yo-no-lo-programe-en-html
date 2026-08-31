import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BetaTag } from '../../components/Beta'
import { diagnosticoHecho, marcarAcceso, marcarDiagnostico } from '../../lib/acceso'
import { guardarPerfil, leerPerfil } from '../../lib/perfil'
import { PortadaLayout } from './PortadaLayout'

const EXPERIENCIA = [
  'Nunca',
  'Algo en clase o por mi cuenta',
  'Sí, escribo código con soltura',
]

const FRAGMENTO = `const nombres = ["Ana", "Luis", "Sara"]
for (const n of nombres) {
  mostrar(n)
}`

// Pantalla 1f — Entrada y diagnóstico inicial (primera sesión, L1).
// El CONTENIDO del diagnóstico lo entrega el equipo del taller (brief §6); esto es un
// ejemplo. La plataforma solo lo presenta y guarda la respuesta.
export function Entrada() {
  const navigate = useNavigate()

  // El diagnóstico se responde una sola vez. Si ya está hecho, no se vuelve a mostrar.
  if (diagnosticoHecho()) return <Navigate to="/portafolio" replace />

  return <FormularioDiagnostico navigate={navigate} />
}

function FormularioDiagnostico({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [nombre, setNombre] = useState(() => leerPerfil().nombre)
  const [experiencia, setExperiencia] = useState<number | null>(null)
  const [lectura, setLectura] = useState('')

  const continuar = () => {
    guardarPerfil({ ...leerPerfil(), nombre: nombre.trim() || 'Estudiante' })
    try {
      localStorage.setItem(
        've:diagnostico-respuestas',
        JSON.stringify({ experiencia, lectura }),
      )
    } catch {
      /* sin almacenamiento */
    }
    marcarDiagnostico()
    marcarAcceso()
    navigate('/portafolio')
  }

  return (
    <PortadaLayout>
      <div className="card-kicker">
        Paso 1 de 3 · diagnóstico inicial <BetaTag>ejemplo</BetaTag>
      </div>
      <h3>Antes de empezar</h3>
      <p style={{ fontSize: 13, margin: 0, color: 'var(--color-neutral-800)', textAlign: 'justify' }}>
        No es un examen y no afecta tu nota. Sirve para armar las parejas de trabajo y para calibrar
        el ritmo de la clase.
      </p>
      <hr className="hr" />

      <div className="field">
        <label htmlFor="e-nombre">Nombre</label>
        <input
          id="e-nombre"
          className="input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <div className="field">
        <label>¿Has programado antes?</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 6 }}>
          {EXPERIENCIA.map((op, i) => (
            <label className="radio" key={op}>
              <input
                type="radio"
                name="exp"
                checked={experiencia === i}
                onChange={() => setExperiencia(i)}
              />
              <span className="dot" />
              {op}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Lee este fragmento. ¿Qué crees que aparece en la página?</label>
        <pre className="portada-codigo">{FRAGMENTO}</pre>
        <textarea
          className="input"
          placeholder="Escríbelo con tus palabras. Si no tienes idea, dilo — también es una respuesta útil."
          value={lectura}
          onChange={(e) => setLectura(e.target.value)}
        />
      </div>

      <div className="portada-pie">
        <span className="mono">Preguntas 1 – 3 de 12</span>
        <button className="btn btn-primary" onClick={continuar}>
          Continuar
        </button>
      </div>
    </PortadaLayout>
  )
}
