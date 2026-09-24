import { ANDAMIAJE_CSS } from './andamiajeEstilos.ts'
import { normalizarEnlacesDelHtml } from './enlaces.ts'
import { aJavaScript } from './pseudocodigoAJS.ts'

// Ejecuta el código del estudiante en un iframe aislado y devuelve el HTML generado.
//
// Reglas (docs/arquitectura.md §2, brief §5.2): nunca eval en la ventana principal.
// El iframe va con sandbox="allow-scripts" y SIN allow-same-origin, así el código
// del estudiante no puede tocar la app. La comunicación es por postMessage.
//
// OJO: esto es solo para la VISTA PREVIA. La evaluación real (autograder) corre en
// el servidor con Deno; este módulo no decide si un encargo se acepta.
//
// La implementación de la API aquí sigue docs/encargos.md §3 (API revisada). Es PROVISIONAL
// (pendiente D5 / EN2-EN4): debe terminar coincidiendo con la API del grader y el desbloqueo por día.
// Las funciones tienen nombres descriptivos en español. El control de flujo (si/para cada/
// mientras/función) el estudiante lo escribe en pseudocódigo (lib/pseudocodigoAJS.ts) — acá
// se traduce a JS real ANTES de ejecutar, así el resto de este archivo no cambia.

export interface ResultadoPreview {
  ok: boolean
  html: string
  error?: { mensaje: string; linea?: number }
  logs: string[]
}

const RUNTIME = String.raw`
  const __logs = [];
  const console_ = console;
  console = { log: (...a) => { __logs.push(a.join(' ')); console_.log(...a); } };

  // Globales ya listas. "pagina" es un contenedor propio, no document.body, para que
  // lo que se devuelve sea SOLO lo que construyó el estudiante (sin el <script> de arranque).
  const pagina = document.getElementById('__raiz');
  const datos = window.__DATOS__ ?? {};

  function __crear(tag, texto) {
    const el = document.createElement(tag);
    if (texto != null) el.textContent = String(texto);
    return el;
  }
  const crearTitulo    = (texto) => __crear('h1', texto);
  const crearSubtitulo = (texto) => __crear('h2', texto);
  const crearParrafo   = (texto) => __crear('p', texto);
  function crearSalto() {
    const el = document.createElement('div');
    el.className = 'salto';
    return el;
  }
  const crearLista   = () => __crear('ul');
  const crearItem    = (texto) => __crear('li', texto);
  const crearBoton   = (texto) => __crear('button', texto);
  function crearCarrusel() {
    const carrusel = __crear('section');
    carrusel.setAttribute('data-carrusel', 'true');
    carrusel.setAttribute('aria-live', 'polite');
    return carrusel;
  }
  function crearEnlace(texto, url) {
    const a = __crear('a', texto);
    a.setAttribute('href', String(url ?? '#'));
    return a;
  }
  function crearImagen(url, descripcion) {
    const img = __crear('img');
    img.setAttribute('src', String(url ?? ''));
    img.setAttribute('alt', String(descripcion ?? ''));
    return img;
  }

  function mostrar(elemento) { pagina.appendChild(elemento); return elemento; }
  function agregarA(contenedor, elemento) { contenedor.appendChild(elemento); return elemento; }
  function vaciar(contenedor) { contenedor.replaceChildren(); return contenedor; }

  function proyectosDestacados(proyectos) {
    return Array.isArray(proyectos) ? proyectos.filter((proyecto) => proyecto && proyecto.destacado === true) : [];
  }

  // En la vista previa el iframe es efímero: corremos la acción una vez para ver el
  // resultado y dejamos un intervalo que morirá con el iframe. El segundo formato
  // mantiene un carrusel: reemplaza su único contenido y recorre la lista en ciclo.
  function cadaSegundo(destino, elementos, crearElemento) {
    if (Array.isArray(elementos) && typeof crearElemento === 'function') {
      if (elementos.length === 0) {
        destino.replaceChildren(__crear('p', 'Todavía no hay proyectos destacados.'));
        return;
      }
      let indice = 0;
      const avanzar = () => {
        destino.replaceChildren(crearElemento(elementos[indice]));
        indice = (indice + 1) % elementos.length;
      };
      avanzar();
      setInterval(avanzar, 1000);
      return;
    }
    if (typeof destino === 'function') {
      destino();
      setInterval(destino, 1000);
    }
  }
`

// El código del estudiante se corre con eval() (en vez de quedar embebido como texto
// del <script>) y se le pega un "//# sourceURL" al final. Eso hace dos cosas a la vez:
// 1) los números de línea de cualquier error quedan relativos a SU código (línea 1 =
//    su primera línea), sin tener que restar cuántas líneas ocupa el andamiaje interno;
// 2) un error de sintaxis (llave sin cerrar, etc.) pasa a ser una excepción que el
//    try/catch puede atrapar, en vez de abortar en silencio todo el <script> y que el
//    estudiante vea "no terminó a tiempo" por un typo (confuso para quien no programa).
// Un texto con "</script>" (en "Mis datos" o en el código) cerraría el <script> antes de
// tiempo y la vista previa acabaría en "no terminó a tiempo". Se escribe "<" como \u003c, que
// dentro de un literal de JS sigue siendo el mismo carácter.
function comoLiteralSeguro(valor: unknown): string {
  return JSON.stringify(valor).replace(/</g, '\\u003c')
}

export function construirSrcdoc(codigoEstudiante: string, datos: unknown): string {
  const codigoConFuente = codigoEstudiante + '\n//# sourceURL=estudiante.js'
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${ANDAMIAJE_CSS}</style>
</head><body><div id="__raiz"></div><script>
window.__DATOS__ = ${comoLiteralSeguro(datos)};
${RUNTIME}

function __lineaDelError(e) {
  const m = /estudiante\\.js:(\\d+):(\\d+)/.exec((e && e.stack) || '');
  if (m) return Number(m[1]);
  if (e && typeof e.lineNumber === 'number') return e.lineNumber;
  return undefined;
}

// Cubre errores que NO pasan por el try/catch de abajo porque ocurren después
// (por ejemplo, dentro de la función que le pasás a cadaSegundo()).
window.onerror = function (mensaje, _url, lineno, _colno, error) {
  parent.postMessage(
    { tipo: 'preview-error', mensaje: String(mensaje), linea: __lineaDelError(error) ?? lineno, logs: __logs },
    '*',
  );
  return true;
};

try {
  eval(${comoLiteralSeguro(codigoConFuente)});
  parent.postMessage({ tipo: 'preview-ok', html: document.getElementById('__raiz').innerHTML, logs: __logs }, '*');
} catch (e) {
  parent.postMessage(
    { tipo: 'preview-error', mensaje: String((e && e.message) || e), linea: __lineaDelError(e), logs: __logs },
    '*',
  );
}
</script></body></html>`
}

/**
 * Convierte el mensaje que manda el iframe en el resultado de la vista previa. Los href de
 * crearEnlace() salen del iframe tal como los escribió el estudiante; aquí se normalizan una
 * sola vez (lib/enlaces.ts), así la vista previa y la revisión ven las mismas direcciones.
 * null si el mensaje no es del runtime.
 */
export function resultadoDelMensaje(d: unknown, parser: DOMParser): ResultadoPreview | null {
  if (!d || typeof d !== 'object') return null
  const m = d as { tipo?: unknown; html?: unknown; mensaje?: unknown; linea?: unknown; logs?: unknown }
  const logs = Array.isArray(m.logs) ? m.logs.map(String) : []
  if (m.tipo === 'preview-ok') {
    const { html, avisos } = normalizarEnlacesDelHtml(String(m.html ?? ''), parser)
    return { ok: true, html, logs: [...logs, ...avisos] }
  }
  if (m.tipo === 'preview-error') {
    const linea = typeof m.linea === 'number' ? m.linea : undefined
    return { ok: false, html: '', error: { mensaje: String(m.mensaje ?? 'error'), linea }, logs }
  }
  return null
}

/** Corre el código en un iframe efímero y resuelve con el HTML resultante. */
// El timeout cubre dos cosas a la vez: arranque lento del iframe (máquinas del taller
// que varían) y bucles sin fin. La protección real contra bucles infinitos es del
// grader del servidor (Deno). 5s da margen al arranque en frío sin dejar colgado al
// estudiante demasiado tiempo.
export function ejecutarPreview(
  codigoEstudiante: string,
  datos: unknown,
  timeoutMs = 5000,
): Promise<ResultadoPreview> {
  // Traducir el pseudocódigo (SI/PARA CADA/MIENTRAS/FUNCIÓN) a JS real antes de tocar el
  // iframe — un pseudocódigo mal cerrado (falta un FIN SI, etc.) no es un error de
  // "ejecución", así que se resuelve directo, sin timeout ni srcdoc de por medio.
  const traduccion = aJavaScript(codigoEstudiante)
  if (!traduccion.ok) {
    return Promise.resolve({ ok: false, html: '', error: traduccion.error, logs: [] })
  }
  const codigoJs = traduccion.js

  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.style.display = 'none'
    let resuelto = false

    const limpiar = () => {
      window.removeEventListener('message', onMsg)
      iframe.remove()
      clearTimeout(temporizador)
    }
    const terminar = (r: ResultadoPreview) => {
      if (resuelto) return
      resuelto = true
      limpiar()
      resolve(r)
    }

    const onMsg = (ev: MessageEvent) => {
      if (ev.source !== iframe.contentWindow) return
      let resultado: ResultadoPreview | null
      try {
        resultado = resultadoDelMensaje(ev.data, new DOMParser())
      } catch {
        // Nunca dejar al estudiante esperando el "no terminó a tiempo" por un fallo nuestro.
        resultado = { ok: false, html: '', error: { mensaje: 'No se pudo mostrar el resultado.' }, logs: [] }
      }
      if (resultado) terminar(resultado)
    }

    const temporizador = setTimeout(
      () =>
        terminar({
          ok: false,
          html: '',
          error: { mensaje: 'El código no terminó a tiempo (¿un bucle sin fin, o el navegador va lento?).' },
          logs: [],
        }),
      timeoutMs,
    )

    window.addEventListener('message', onMsg)
    iframe.srcdoc = construirSrcdoc(codigoJs, datos)
    document.body.appendChild(iframe)
  })
}
