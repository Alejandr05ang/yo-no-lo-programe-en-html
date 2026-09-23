import { useState } from 'react'
import { EJEMPLOS_PEDAGOGICOS } from '../../lib/pseudocodigo'

interface Props {
  numero: number
}

export function PanelPedagogico({ numero }: Props) {
  const ejemplo = EJEMPLOS_PEDAGOGICOS[numero]
  const [mostrarPseudocodigo, setMostrarPseudocodigo] = useState(true)

  if (!ejemplo) return null

  return (
    <div className="panel-pedagogico" style={{
      background: '#2b2a27',
      borderBottom: '1px solid #3c3a36',
      padding: '8px 12px',
      fontSize: '12px',
      color: '#d7d3d3'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: 'bold', color: '#e1ad66' }}>💡 Así se piensa</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            className={`btn btn-outline ${mostrarPseudocodigo ? 'active' : ''}`} 
            onClick={() => setMostrarPseudocodigo(true)}
            style={{ padding: '2px 8px', fontSize: '11px', borderColor: mostrarPseudocodigo ? '#e1ad66' : '#555', color: mostrarPseudocodigo ? '#e1ad66' : '#999' }}
          >
            Pseudocódigo
          </button>
          <button 
            className={`btn btn-outline ${!mostrarPseudocodigo ? 'active' : ''}`} 
            onClick={() => setMostrarPseudocodigo(false)}
            style={{ padding: '2px 8px', fontSize: '11px', borderColor: !mostrarPseudocodigo ? '#e1ad66' : '#555', color: !mostrarPseudocodigo ? '#e1ad66' : '#999' }}
          >
            JavaScript
          </button>
        </div>
      </div>
      <pre style={{ 
        margin: 0, 
        fontFamily: 'ui-monospace, Menlo, monospace', 
        whiteSpace: 'pre-wrap',
        color: mostrarPseudocodigo ? '#a8c7fa' : '#d7d3d3',
        backgroundColor: '#191816',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #3c3a36'
      }}>
        {mostrarPseudocodigo ? ejemplo.pseudocodigo : ejemplo.javascript}
      </pre>
    </div>
  )
}
