interface Props {
  url: string
  /** HTML generado por el código del estudiante (viene de sandbox.ejecutarPreview). */
  html: string
  enVivo?: boolean
}

// Columna derecha, arriba: barra de URL + vista previa del portafolio.
// El HTML se renderiza dentro de un iframe sandbox: nunca se inyecta en la app.
export function PanelPreview({ url, html, enVivo = true }: Props) {
  const doc = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;padding:18px;font:15px/1.6 "Lora",Georgia,serif;color:#201f1d;background:#fff}</style>
${html}`

  return (
    <>
      <div className="pv-url">
        <span className="mono pv-url-campo">{url}</span>
        {enVivo && <span className="tag tag-accent mono">en vivo</span>}
      </div>
      <iframe
        className="pv-marco"
        title="Vista previa del portafolio"
        sandbox="allow-scripts"
        srcDoc={doc}
      />
    </>
  )
}
