import { ANDAMIAJE_CSS } from './andamiajeEstilos.ts'
import { normalizarEnlacesDelHtml } from './enlaces.ts'
import { aJavaScript } from './pseudocodigoAJS.ts'
import type { DocumentoJu1 } from './tipos.ts'

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
  /** `archivo`: solo lo llenan los documentos multi-pestaña (Ju1) — "portafolio.js" o
   *  "seccion-<nombre>.js" — para marcar la línea de error en la pestaña correcta
   *  (EditorPanel.tsx). undefined en el resto de los encargos = un solo archivo, como siempre. */
  error?: { mensaje: string; linea?: number; archivo?: string }
  logs: string[]
}

const RUNTIME = String.raw`
  const __logs = [];
  const console_ = console;
  console = { log: (...a) => { __logs.push(a.join(' ')); console_.log(...a); } };

  // Globales ya listas. "pagina" es un contenedor propio, no document.body, para que
  // lo que se devuelve sea SOLO lo que construyó el estudiante (sin el <script> de arranque).
  // "let", no "const": en el documento de Ju1 (construirSrcdocJu1, más abajo) cada
  // sección corre con SU PROPIO contenedor detached, así que "pagina" se reasigna antes de
  // evaluar cada script — acá (un solo archivo, como siempre) nunca se reasigna, así que el
  // cambio de const a let no le cambia el comportamiento en nada.
  let pagina = document.getElementById('__raiz');
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

  // Personalización visual (Ju1): vocabulario chico y fijo, igual que el resto del API — no
  // se expone CSS crudo. Los nombres de tamaño/fuente que no están en la lista se tratan como
  // el valor por defecto, nunca rompen la página (mismo criterio que crearEnlace/crearImagen
  // con datos incompletos).
  function crearSeccion(tipo) {
    const el = document.createElement('div');
    const clases = {
      encabezado: 'fila',
      cuerpo: 'card',
      'cuadricula-2': 'grid grid-2',
      'cuadricula-3': 'grid grid-3',
    };
    el.className = clases[tipo] || '';
    return el;
  }
  const __TAMANOS = { 'pequeño': '0.85em', normal: '1em', grande: '1.3em', 'muy grande': '1.8em' };
  function cambiarTamano(elemento, tamano) {
    elemento.style.fontSize = __TAMANOS[tamano] || __TAMANOS.normal;
    return elemento;
  }
  const __FUENTES = {
    'clásica': '"Lora", Georgia, serif',
    elegante: '"Cormorant Garamond", Georgia, serif',
    moderna: '"Inter", Arial, sans-serif',
    manuscrita: '"Caveat", cursive',
  };
  function cambiarFuente(elemento, fuente) {
    elemento.style.fontFamily = __FUENTES[fuente] || __FUENTES['clásica'];
    return elemento;
  }
  function cambiarColorTexto(elemento, color) {
    elemento.style.color = String(color);
    return elemento;
  }
  const __ALINEACIONES = { izquierda: 'left', centro: 'center', derecha: 'right', justificado: 'justify' };
  function cambiarAlineacion(elemento, alineacion) {
    elemento.style.textAlign = __ALINEACIONES[alineacion] || __ALINEACIONES.izquierda;
    return elemento;
  }
  // Con dos argumentos (elemento, color): fondo de ESE elemento nada más — sin sorpresas, un
  // estilo puesto directo. Con uno solo, pinta "pagina" — la que esté puesta AHORA, así que el
  // resultado depende de dónde se llama, no es siempre "toda la página":
  // - En una sección de Ju1 (o en el main), "pagina" YA es un contenedor propio (nunca la raíz
  //   compartida — ver construirSrcdocJu1) y termina siendo un descendiente normal de #__raiz,
  //   así que ponerle el fondo directo alcanza y sobrevive: pinta ESA pestaña nada más — la
  //   sección donde se llama, o toda la página compuesta si se llama desde portafolio.js.
  // - En un encargo de un solo archivo (o una pestaña de prueba), "pagina" ES #__raiz, y de acá
  //   solo sobrevive su innerHTML cuando termina de correr (ver ejecutarPreview más abajo) — un
  //   fondo puesto directo en la raíz se perdía sin que nadie lo viera nunca. Un <style> CON
  //   variable :root, escrito como hijo DENTRO de #__raiz, sí viaja con ese innerHTML (y de ahí
  //   sale la única lectura de --color-fondo, en el body de andamiajeEstilos.ts), así que el
  //   color llega también a la vista previa y al portafolio publicado.
  function cambiarColorFondo(elementoOColor, color) {
    if (color === undefined) {
      if (pagina !== document.getElementById('__raiz')) {
        pagina.style.backgroundColor = String(elementoOColor);
        return;
      }
      let estilo = document.getElementById('__fondo_pagina');
      if (!estilo) {
        estilo = document.createElement('style');
        estilo.id = '__fondo_pagina';
        pagina.appendChild(estilo);
      }
      estilo.textContent = ':root { --color-fondo: ' + String(elementoOColor) + '; }';
      return;
    }
    elementoOColor.style.backgroundColor = String(color);
    return elementoOColor;
  }

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
  const m = d as { tipo?: unknown; html?: unknown; mensaje?: unknown; linea?: unknown; logs?: unknown; archivo?: unknown }
  const logs = Array.isArray(m.logs) ? m.logs.map(String) : []
  if (m.tipo === 'preview-ok') {
    const { html, avisos } = normalizarEnlacesDelHtml(String(m.html ?? ''), parser)
    return { ok: true, html, logs: [...logs, ...avisos] }
  }
  if (m.tipo === 'preview-error') {
    const linea = typeof m.linea === 'number' ? m.linea : undefined
    const archivo = typeof m.archivo === 'string' ? m.archivo : undefined
    return { ok: false, html: '', error: { mensaje: String(m.mensaje ?? 'error'), linea, archivo }, logs }
  }
  return null
}

/** El ir-y-venir con el iframe efímero (crearlo, escuchar el postMessage, el timeout, limpiar)
 *  es igual para el documento de un solo archivo y el de Ju1 — lo único que cambia es el
 *  srcdoc que se le manda. Ver ejecutarPreview/ejecutarPreviewJu1 más abajo. */
function correrEnIframe(srcdoc: string, timeoutMs: number): Promise<ResultadoPreview> {
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
    iframe.srcdoc = srcdoc
    document.body.appendChild(iframe)
  })
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
  return correrEnIframe(construirSrcdoc(traduccion.js, datos), timeoutMs)
}

// ── Ju1: documento multi-pestaña (ver frontend/src/lib/estructuraDePagina.ts) ──────────────
// Cada sección corre su propio script, con su PROPIO contenedor detached (no el <div
// id="__raiz"> compartido), en la MISMA página/scope que el resto — así el RUNTIME (arriba)
// se emite una sola vez, igual que con un solo archivo. El resultado de cada sección se guarda
// envuelto en un <div> con el grid-row/grid-column que le toca según la cuadrícula, y ese
// envoltorio es lo que se expone como variable con nombre ANTES de correr el "main"
// (portafolio.js) — mismo mecanismo que ya usa `datos` (una variable que sale de "afuera").
// Con la posición ya resuelta en el envoltorio, el main solo necesita `mostrar(nombreSeccion)`;
// no importa en qué orden lo haga, el CSS grid las ubica igual.
export function construirSrcdocJu1(doc: DocumentoJu1, datos: unknown): string {
  const nombresEnLaCuadricula = new Set(
    doc.estructura.celdas.filter((c): c is typeof c & { seccion: string } => c.seccion !== null).map((c) => c.seccion),
  )
  const secciones = doc.secciones.filter((s) => nombresEnLaCuadricula.has(s.nombre))

  const bloquesDeSecciones = secciones
    .map((s) => {
      const celda = doc.estructura.celdas.find((c) => c.seccion === s.nombre)!
      const archivo = `seccion-${s.nombre}.js`
      const codigoConFuente = s.contenido + `\n//# sourceURL=${archivo}`
      return `
  pagina = document.createElement('div');
  __evaluarConNombre(${comoLiteralSeguro(codigoConFuente)}, ${comoLiteralSeguro(archivo)});
  (function () {
    var envoltura = document.createElement('div');
    envoltura.style.gridRow = '${celda.fila + 1} / span ${celda.expandeFilas}';
    envoltura.style.gridColumn = '${celda.columna + 1} / span ${celda.expandeColumnas}';
    envoltura.appendChild(pagina);
    window.__SECCIONES__[${comoLiteralSeguro(s.nombre)}] = envoltura;
  })();`
    })
    .join('\n')

  const declaracionesDeSecciones = secciones
    .map((s) => `  var ${s.nombre} = window.__SECCIONES__[${comoLiteralSeguro(s.nombre)}];`)
    .join('\n')

  const archivoMain = 'portafolio.js'
  const mainConFuente = doc.main + `\n//# sourceURL=${archivoMain}`

  return `<!doctype html><html><head><meta charset="utf-8">
<style>${ANDAMIAJE_CSS}</style>
</head><body><div id="__raiz"></div><script>
window.__DATOS__ = ${comoLiteralSeguro(datos)};
window.__SECCIONES__ = {};
${RUNTIME}
var __raizReal = pagina;

// A diferencia del documento de un solo archivo, acá corren VARIOS scripts en secuencia (uno
// por sección + el main): __archivoConError dice cuál está corriendo en este momento, así un
// error de cualquiera de ellos se puede marcar en SU pestaña, no siempre en portafolio.js.
var __archivoConError = null;
function __evaluarConNombre(codigo, archivo) {
  __archivoConError = archivo;
  eval(codigo);
  __archivoConError = null;
}
function __escaparRegExp(s) {
  return s.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
}
function __lineaDelError(e) {
  if (__archivoConError) {
    var patron = new RegExp(__escaparRegExp(__archivoConError) + ':(\\\\d+):(\\\\d+)');
    var m = patron.exec((e && e.stack) || '');
    if (m) return Number(m[1]);
  }
  if (e && typeof e.lineNumber === 'number') return e.lineNumber;
  return undefined;
}

window.onerror = function (mensaje, _url, lineno, _colno, error) {
  parent.postMessage(
    { tipo: 'preview-error', archivo: __archivoConError, mensaje: String(mensaje), linea: __lineaDelError(error) ?? lineno, logs: __logs },
    '*',
  );
  return true;
};

try {
${bloquesDeSecciones}

  var __grid = document.createElement('div');
  __grid.style.display = 'grid';
  __grid.style.gridTemplateRows = 'repeat(${doc.estructura.filas}, auto)';
  __grid.style.gridTemplateColumns = 'repeat(${doc.estructura.columnas}, 1fr)';
  __grid.style.gap = 'var(--espaciado)';
  __raizReal.appendChild(__grid);
  pagina = __grid;
${declaracionesDeSecciones}
  __evaluarConNombre(${comoLiteralSeguro(mainConFuente)}, ${comoLiteralSeguro(archivoMain)});
  parent.postMessage({ tipo: 'preview-ok', html: __raizReal.innerHTML, logs: __logs }, '*');
} catch (e) {
  parent.postMessage(
    { tipo: 'preview-error', archivo: __archivoConError, mensaje: String((e && e.message) || e), linea: __lineaDelError(e), logs: __logs },
    '*',
  );
}
</script></body></html>`
}

/** Como ejecutarPreview(), pero para un DocumentoJu1 (cuadrícula + una pestaña por sección +
 *  el main). Si cualquier pestaña tiene un error de pseudocódigo, se resuelve directo con ESA
 *  pestaña señalada — mismo criterio que ejecutarPreview con un solo archivo. */
export function ejecutarPreviewJu1(doc: DocumentoJu1, datos: unknown, timeoutMs = 5000): Promise<ResultadoPreview> {
  const seccionesJs: { nombre: string; contenido: string }[] = []
  for (const s of doc.secciones) {
    const t = aJavaScript(s.contenido)
    if (!t.ok) {
      return Promise.resolve({
        ok: false,
        html: '',
        error: { mensaje: t.error?.mensaje ?? 'error', linea: t.error?.linea, archivo: `seccion-${s.nombre}.js` },
        logs: [],
      })
    }
    seccionesJs.push({ nombre: s.nombre, contenido: t.js })
  }
  const traduccionMain = aJavaScript(doc.main)
  if (!traduccionMain.ok) {
    return Promise.resolve({
      ok: false,
      html: '',
      error: { mensaje: traduccionMain.error?.mensaje ?? 'error', linea: traduccionMain.error?.linea, archivo: 'portafolio.js' },
      logs: [],
    })
  }

  const docTraducido: DocumentoJu1 = {
    ...doc,
    secciones: seccionesJs.map((s) => ({ nombre: s.nombre, contenido: s.contenido })),
    main: traduccionMain.js,
  }
  return correrEnIframe(construirSrcdocJu1(docTraducido, datos), timeoutMs)
}
