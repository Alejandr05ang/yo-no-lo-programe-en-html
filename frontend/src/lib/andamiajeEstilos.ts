// Andamiaje CSS del portafolio (brief §5.2, §5.8, §7.3). Vocabulario chico y fijo — igual
// que la API de JS expone crearTitulo()/mostrar() en vez de createElement/appendChild crudos,
// esto expone un puñado de clases y variables en vez de todo el sistema de diseño de la
// plataforma (design-system.css, que es del CHROME de la app, no del portafolio del
// estudiante). El estudiante nunca escribe ni ve este archivo: se inyecta en el sandbox
// (lib/sandbox.ts) y en la vista previa final (PanelPreview.tsx) para que classList.add()/
// toggle() (L2) tengan algo real a lo que engancharse.
//
// Las variables :root son la "decoración libre" de §5.2/§5.8: cambiarlas alcanza para que
// el portafolio se vea distinto sin tocar el resto. Las clases y sus nombres son fijos
// (andamiaje entregado, no se inventan clases nuevas desde el código del estudiante).

/** Documento completo para el iframe del portafolio: mismo wrapper en PanelPreview y en la
 *  vista de consulta (VistaConsultaMovil) — lo que ve un visitante es un único documento. */
export function documentoPortafolio(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${ANDAMIAJE_CSS}</style>
</head><body>${html}${PUENTE_ENLACES}</body></html>`
}

// Un clic en un enlace de la vista previa no navega el iframe: se avisa a la ventana principal
// (features/preview/useAbrirEnlaces.ts), que valida la dirección y la abre en otra pestaña. Las
// anclas internas (#seccion) siguen funcionando dentro de la página.
const PUENTE_ENLACES = `<script>
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a') : null;
  if (!a) return;
  var href = a.getAttribute('href');
  if (href && href.charAt(0) === '#') return;
  e.preventDefault();
  if (href) parent.postMessage({ tipo: 'abrir-enlace', href: href }, '*');
});
</script>`

export const ANDAMIAJE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Lora:wght@400;600&display=swap');

:root {
  --color-fondo: #fdfcfa;
  --color-texto: #241f1a;
  --color-acento: #b6752f;
  --fuente-titulos: "Cormorant Garamond", Georgia, serif;
  --fuente-texto: "Lora", Georgia, serif;
  --espaciado: 16px;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  padding: var(--espaciado);
  background: var(--color-fondo);
  color: var(--color-texto);
  font-family: var(--fuente-texto);
  font-size: 16px;
  line-height: 1.6;
}
h1, h2, h3 {
  font-family: var(--fuente-titulos);
  font-weight: 600;
  line-height: 1.2;
  margin: 0 0 calc(var(--espaciado) * 0.5);
}
p { margin: 0 0 var(--espaciado); }
a { color: var(--color-acento); }

.salto { height: var(--espaciado); }

.nav {
  display: flex;
  align-items: center;
  gap: var(--espaciado);
  padding-bottom: calc(var(--espaciado) * 0.75);
  margin-bottom: var(--espaciado);
  border-bottom: 1px solid color-mix(in srgb, var(--color-texto) 12%, transparent);
}
.nav a { text-decoration: none; }

.card {
  padding: calc(var(--espaciado) * 1.25);
  border: 1px solid color-mix(in srgb, var(--color-texto) 12%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-fondo) 96%, var(--color-texto) 4%);
}

.badge-destacado {
  display: inline-block;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-acento) 16%, transparent);
  color: var(--color-acento);
}

/* Utilidades de layout (Ma2, §5.7): .grid para columnas, .fila para una línea flex. */
.grid { display: grid; gap: var(--espaciado); }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.fila { display: flex; flex-wrap: wrap; gap: var(--espaciado); align-items: center; }

/* Media query base (Mi2, §5.6): a los estudiantes se les entrega ya resuelta. */
@media (max-width: 640px) {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
}
`
