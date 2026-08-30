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
// Las funciones tienen nombres descriptivos en español; el control de flujo (const/if/for/function)
// es JavaScript real, así que no hace falta implementarlo.

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
  const crearTitulo  = (texto) => __crear('h1', texto);
  const crearParrafo = (texto) => __crear('p', texto);
  const crearLista   = () => __crear('ul');
  const crearItem    = (texto) => __crear('li', texto);
  const crearBoton   = (texto) => __crear('button', texto);
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

  // En la vista previa el iframe es efímero: corremos la acción una vez para ver el
  // resultado y dejamos un intervalo que morirá con el iframe.
  function cadaSegundo(hacer) { hacer(); setInterval(hacer, 1000); }
`

function construirSrcdoc(codigoEstudiante: string, datos: unknown): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>body{margin:0;font:15px/1.6 "Lora",Georgia,serif;color:#201f1d}</style>
</head><body><div id="__raiz"></div><script>
window.__DATOS__ = ${JSON.stringify(datos)};
${RUNTIME}
try {
  ${codigoEstudiante}
  parent.postMessage({ tipo: 'preview-ok', html: document.getElementById('__raiz').innerHTML, logs: __logs }, '*');
} catch (e) {
  parent.postMessage({ tipo: 'preview-error', mensaje: String(e && e.message || e), logs: __logs }, '*');
}
<\/script></body></html>`
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
      const d = ev.data
      if (d?.tipo === 'preview-ok') {
        terminar({ ok: true, html: d.html, logs: d.logs ?? [] })
      } else if (d?.tipo === 'preview-error') {
        terminar({ ok: false, html: '', error: { mensaje: d.mensaje }, logs: d.logs ?? [] })
      }
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
    iframe.srcdoc = construirSrcdoc(codigoEstudiante, datos)
    document.body.appendChild(iframe)
  })
}
