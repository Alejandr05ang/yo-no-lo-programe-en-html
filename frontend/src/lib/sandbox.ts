// Ejecuta el código del estudiante en un iframe aislado y devuelve el HTML generado.
//
// Reglas (docs/arquitectura.md §2, brief §5.2): nunca eval en la ventana principal.
// El iframe va con sandbox="allow-scripts" y SIN allow-same-origin, así el código
// del estudiante no puede tocar la app. La comunicación es por postMessage.
//
// OJO: esto es solo para la VISTA PREVIA. La evaluación real (autograder) corre en
// el servidor con Deno; este módulo no decide si un encargo se acepta.
//
// La implementación de la API en español aquí es PROVISIONAL (pendiente D5 en
// docs/decisiones.md): debe terminar coincidiendo con la API que expone el grader
// y con lo que se desbloquea por día.

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

  const pagina = document.body;

  function crearElemento(tag, texto) {
    const el = document.createElement(tag);
    if (texto != null) el.textContent = String(texto);
    return el;
  }
  function agregarA(padre, hijo) {
    padre.appendChild(hijo);
    return hijo;
  }
  function repetir(veces, hacer) {
    for (let i = 0; i < veces; i++) hacer(i);
  }
  function si(condicion, entonces, sino) {
    if (condicion) return entonces && entonces();
    return sino && sino();
  }
  const sino = undefined; // 'sino' se usa como argumento de si(); existe como identificador para no romper autocompletado

  function obtenerDatos() { return window.__DATOS__ ?? {}; }
`

function construirSrcdoc(codigoEstudiante: string, datos: unknown): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>body{margin:0;font:15px/1.6 "Lora",Georgia,serif;color:#201f1d}</style>
</head><body><script>
window.__DATOS__ = ${JSON.stringify(datos)};
${RUNTIME}
try {
  ${codigoEstudiante}
  parent.postMessage({ tipo: 'preview-ok', html: document.body.innerHTML, logs: __logs }, '*');
} catch (e) {
  parent.postMessage({ tipo: 'preview-error', mensaje: String(e && e.message || e), logs: __logs }, '*');
}
<\/script></body></html>`
}

/** Corre el código en un iframe efímero y resuelve con el HTML resultante. */
export function ejecutarPreview(
  codigoEstudiante: string,
  datos: unknown,
  timeoutMs = 2000,
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
          error: { mensaje: 'El código tardó demasiado (¿un bucle sin fin?).' },
          logs: [],
        }),
      timeoutMs,
    )

    window.addEventListener('message', onMsg)
    iframe.srcdoc = construirSrcdoc(codigoEstudiante, datos)
    document.body.appendChild(iframe)
  })
}
