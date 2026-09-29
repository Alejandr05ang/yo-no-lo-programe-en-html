import { useMemo } from 'react'
import { documentoPublicado, enlacesDePublicacion } from '../../lib/publicacion'

export function SnapshotFrame({ html, title }: { html: string; title: string }) {
  const document = useMemo(() => documentoPublicado(html), [html])
  const links = useMemo(() => enlacesDePublicacion(html), [html])
  return <div className="sitio-snapshot">
    <iframe title={title} sandbox="allow-scripts" srcDoc={document} referrerPolicy="no-referrer" />
    {links.length > 0 && <section aria-label="Enlaces del sitio" className="sitio-enlaces">
      <h3>Enlaces del sitio</h3>
      <ul>{links.map((link) => <li key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.texto}</a></li>)}</ul>
    </section>}
  </div>
}
