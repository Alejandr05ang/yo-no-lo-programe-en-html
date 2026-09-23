import { useState } from 'react'
import { EJEMPLOS_PEDAGOGICOS } from '../../lib/pseudocodigo'
import './panel-pedagogico.css'

interface Props {
  numero: number
}

type Pestana = 'pseudocodigo' | 'javascript'

// Puente pedagógico curado a mano por encargo, arriba del editor mientras el estudiante
// trabaja ESE encargo (a diferencia de las fichas de ayuda de PanelEncargo, que son de
// juguete y no cambian por encargo). Arranca en "Pseudocódigo" porque es el paso previo a
// la sintaxis real — la nota de abajo deja explícito que esa pestaña no es JavaScript, para
// que nadie la copie tal cual en el editor (mismo cuidado que FichaHerramienta.tsx).
export function PanelPedagogico({ numero }: Props) {
  const ejemplo = EJEMPLOS_PEDAGOGICOS[numero]
  const [pestana, setPestana] = useState<Pestana>('pseudocodigo')

  if (!ejemplo) return null

  return (
    <div className="pp">
      <div className="pp-cab">
        <span className="pp-titulo">Así se piensa</span>
        <div className="pp-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={pestana === 'pseudocodigo'}
            className="pp-tab"
            onClick={() => setPestana('pseudocodigo')}
          >
            Pseudocódigo
          </button>
          <button
            role="tab"
            aria-selected={pestana === 'javascript'}
            className="pp-tab"
            onClick={() => setPestana('javascript')}
          >
            JavaScript
          </button>
        </div>
      </div>

      <p className="pp-nota">
        {pestana === 'pseudocodigo'
          ? 'Esto no es código: es la idea en palabras, para pensarla antes de escribir. No lo copies en el editor.'
          : 'Así se ve en JavaScript. No es la solución de tu encargo — tu código va a tener otros nombres y otros datos.'}
      </p>

      <pre className="pp-codigo" data-modo={pestana}>
        {pestana === 'pseudocodigo' ? ejemplo.pseudocodigo : ejemplo.javascript}
      </pre>
    </div>
  )
}
