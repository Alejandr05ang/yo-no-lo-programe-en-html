import { Link } from 'react-router-dom'
import './publicacion.css'

export function CierreTaller({ code, preview = false }: { code: string; preview?: boolean }) {
  const final = code === 'V2'
  return <section className="ses-cierre">
    <h2>{final ? 'Prepara tu demo final' : 'De tu borrador a una versión compartida'}</h2>
    <p>{final
      ? 'Muestra tu sitio, explica una decisión que tomaste y una mejora que quieras hacer después del taller.'
      : 'Tu código guardado es la fuente editable. Una publicación es una fotografía de una versión: tus compañeros ven esa versión hasta que decidas actualizarla.'}</p>
    {final ? <ol>
      <li>Diagnóstico final: explica una variable, una condición, un bucle y una función que usaste en tu sitio.</li>
      <li>Revisa tu web en móvil y escritorio. Corrige los últimos detalles desde el editor.</li>
      <li>En Mi sitio, prepara una nueva vista previa y actualiza la publicación si cambió algo.</li>
      <li>Abre la galería y comparte el enlace de tu sitio con tu cohorte. Presenta qué aprendiste y una próxima mejora.</li>
    </ol> : <ol>
      <li>Abre tu trabajo en el editor y espera a que indique «guardado».</li>
      <li>En Mi sitio, elige la fuente guardada, ponle un título y revisa la vista previa de publicación.</li>
      <li>Publica para tu cohorte y copia el enlace. Comprueba el resultado en la galería.</li>
      <li>Edita un detalle, guarda y vuelve a Mi sitio: verás los cambios sin publicar. Actualiza la publicación para compartir esa versión.</li>
    </ol>}
    {!final && <p><strong>Git como concepto:</strong> un commit registra una versión de la fuente; un repositorio conserva su historia. Publicar aquí crea una versión visible para tu cohorte. Puedes compartir tu trabajo sin una cuenta de GitHub ni un despliegue externo.</p>}
    <p>La publicación conserva el diseño y el contenido como una vista estática. Los temporizadores y otros scripts se practican en el editor; no se ejecutan en la página compartida.</p>
    {preview ? <p className="text-muted">Guía para la actividad en clase. La publicación se realiza desde la cuenta de cada estudiante.</p> : <div className="ses-cierre-acciones">
      <Link className="btn btn-primary" to={final ? '/galeria' : '/mi-sitio'}>{final ? 'Abrir galería' : 'Abrir Mi sitio'}</Link>
      <Link className="btn btn-secondary" to={final ? '/mi-sitio' : '/galeria'}>{final ? 'Revisar Mi sitio' : 'Ver galería'}</Link>
    </div>}
  </section>
}
