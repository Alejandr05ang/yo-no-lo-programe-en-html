import { JSDOM } from 'jsdom'
const dom = new JSDOM(`<!DOCTYPE html><body></body>`)
global.window = dom.window
global.document = dom.window.document
global.DOMParser = dom.window.DOMParser
global.URL.createObjectURL = () => 'blob:dummy'
global.HTMLIFrameElement = dom.window.HTMLIFrameElement

import { componerAndamiaje, ENCARGOS } from './src/lib/encargos.ts'
import { revisarLocalmente } from './src/lib/revisionLocal.ts'
import { PERFIL_DEFECTO, perfilComoDatos } from './src/lib/perfil.ts'
import * as sandbox from './src/lib/sandbox.ts'

const mockHTML = {
  1: '<h1>Taller HTML</h1>',
  2: '<h1>Taller HTML</h1><p>H</p><p>H</p>',
  3: '<h1>T</h1><h2>S</h2><p>H</p>',
  4: '<h1>T</h1><ul><li>A</li></ul>',
  5: '<ul><li>A</li></ul>',
  6: '<ul><li>Hobby 1</li><li>Hobby 2</li></ul>',
  7: '<h1>T</h1><p>En construcción</p>',
  8: '<section data-carrusel="true"><img src="p1"></section>',
  9: 'Terminado',
  10: '<h1 style="color:red">T</h1>',
  11: '<body>...</body>',
}

sandbox.ejecutarPreview = async (codigo, datos) => {
  return { ok: true, html: mockHTML[codigo] || '', logs: [] }
}

async function run() {
  const datos = perfilComoDatos(PERFIL_DEFECTO)
  let allPass = true
  // We can't easily mock the exact iframe evaluation output without a JS interpreter.
  // We'll write the raw JS solutions and run them using new Function.
  
  const soluciones = {
    1: `mostrar(crearTitulo("Taller HTML"))`,
    2: `mostrar(crearTitulo("Taller HTML")); mostrar(crearParrafo("P1")); mostrar(crearParrafo("P2"))`,
    3: `mostrar(crearTitulo("T")); mostrar(crearSubtitulo("S")); mostrar(crearParrafo("P"))`,
    4: `let l = crearLista(); agregarA(l, crearItem("A")); mostrar(l)`,
    5: `let l = crearLista(); for (const p of datos.proyectos) { agregarA(l, crearItem(p.nombre)); } mostrar(l)`,
    6: `let l = crearLista(); for (const h of datos.hobbies) { agregarA(l, crearItem(h)); } mostrar(l)`,
    7: `mostrar(crearTitulo("T")); mostrar(crearParrafo("En construcción"))`,
    8: `let c = crearCarrusel(); for (const p of proyectosDestacados(datos.proyectos)) { agregarA(c, crearImagen(p.imagenUrl)); } mostrar(c)`,
    9: `for (const p of datos.proyectos) { if (p.terminado) mostrar(crearParrafo(p.nombre)); }`,
    10: `let t = crearTitulo("T"); t.style.color = "red"; mostrar(t)`,
    11: `mostrar(crearParrafo("T"))`
  }

  for (let numero = 1; numero <= 11; numero++) {
    const encargo = ENCARGOS[numero]
    if (!encargo) continue
    const code = soluciones[numero] || ""
    console.log(`\nProbando e${numero}...`)
    
    // Instead of full iframe, we will run the evaluator manually
    try {
      const DOM = new JSDOM(`<!DOCTYPE html><div id="__raiz"></div>`)
      const d = DOM.window.document
      const raiz = d.getElementById('__raiz')
      
      const API = {
        crearTitulo: (t) => { let el = d.createElement('h1'); el.textContent=t; return el; },
        crearSubtitulo: (t) => { let el = d.createElement('h2'); el.textContent=t; return el; },
        crearParrafo: (t) => { let el = d.createElement('p'); el.textContent=t; return el; },
        crearLista: () => { return d.createElement('ul'); },
        crearItem: (t) => { let el = d.createElement('li'); el.textContent=t; return el; },
        crearEnlace: (t, u) => { let el = d.createElement('a'); el.textContent=t; el.href=u; return el; },
        crearImagen: (u, t) => { let el = d.createElement('img'); el.src=u; el.alt=t; return el; },
        crearCarrusel: () => { let el = d.createElement('section'); el.setAttribute('data-carrusel','true'); return el; },
        mostrar: (el) => { raiz.appendChild(el); return el; },
        agregarA: (p, el) => { p.appendChild(el); return el; },
        proyectosDestacados: (l) => l.filter(p => p.destacado)
      }
      
      const fn = new Function('datos', ...Object.keys(API), code)
      fn(datos, ...Object.values(API))
      
      const html = raiz.innerHTML
      // Monkey patch ejecutarPreview temporarily for revisarLocalmente
      sandbox.ejecutarPreview = async () => ({ ok: true, html, logs: [] })
      
      const res = await revisarLocalmente(numero, code, datos)
      console.log(`Resultado: ${res.casosPasados}/${res.casosTotales}`)
      if (res.casosPasados !== res.casosTotales) {
         console.error(`BLOCKER e${numero}: No pasan todos los casos en el scaffolding!`)
         console.error(res.casos)
         allPass = false
      }
    } catch (e) {
      console.error(`BLOCKER e${numero} throw:`, e)
      allPass = false
    }
  }
  
  if (allPass) {
    console.log('PASS e1-e11')
  }
}

run()
