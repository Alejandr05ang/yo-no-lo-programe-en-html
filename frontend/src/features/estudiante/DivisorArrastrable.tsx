import { useEffect, useRef, useState, type RefObject } from 'react'

const CLAVE = 've:split-editor'
const MIN_EDITOR = 320
const MIN_PREVIEW = 360

interface Props {
  /** Ref al contenedor .ve-grid cuyo --ed-manual se ajusta. */
  gridRef: RefObject<HTMLDivElement | null>
}

// Barra entre editor y preview. Arrastrar fija el ancho del editor en px
// (variable --ed-manual del grid) y lo recuerda por navegador.
export function DivisorArrastrable({ gridRef }: Props) {
  const [arrastrando, setArrastrando] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  // Restaurar el ancho guardado.
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    try {
      const guardado = localStorage.getItem(CLAVE)
      if (guardado) grid.style.setProperty('--ed-manual', guardado)
    } catch {
      /* sin almacenamiento: se usa el 50/50 por defecto */
    }
  }, [gridRef])

  const anchoEncargo = (grid: HTMLElement) =>
    parseFloat(getComputedStyle(grid).gridTemplateColumns.split(' ')[0]) || 0

  const aplicar = (clientX: number) => {
    const grid = gridRef.current
    if (!grid) return
    const rect = grid.getBoundingClientRect()
    const w = clientX - rect.left - anchoEncargo(grid)
    const max = rect.width - anchoEncargo(grid) - MIN_PREVIEW
    const clamp = Math.max(MIN_EDITOR, Math.min(max, w))
    grid.style.setProperty('--ed-manual', `${Math.round(clamp)}px`)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setArrastrando(true)
    ref.current?.setPointerCapture(e.pointerId)
    const onMove = (ev: PointerEvent) => aplicar(ev.clientX)
    const onUp = () => {
      setArrastrando(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const v = gridRef.current?.style.getPropertyValue('--ed-manual')
      try {
        if (v) localStorage.setItem(CLAVE, v)
      } catch {
        /* sin almacenamiento */
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const grid = gridRef.current
    if (!grid) return
    const paso = e.shiftKey ? 48 : 16
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const actual =
      parseFloat(getComputedStyle(grid).gridTemplateColumns.split(' ')[1]) || 0
    const rect = grid.getBoundingClientRect()
    aplicar(rect.left + anchoEncargo(grid) + actual + (e.key === 'ArrowLeft' ? -paso : paso))
    const v = grid.style.getPropertyValue('--ed-manual')
    try {
      if (v) localStorage.setItem(CLAVE, v)
    } catch {
      /* sin almacenamiento */
    }
  }

  return (
    <button
      ref={ref}
      type="button"
      className="ve-divisor"
      data-arrastrando={arrastrando}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Ajustar el ancho del editor"
    />
  )
}
