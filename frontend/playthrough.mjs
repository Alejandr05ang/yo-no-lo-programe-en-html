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

async function run() {
  const datos = perfilComoDatos(PERFIL_DEFECTO)
  // Ensure hobbies has some items, and test length 0 is OK if needed, but per default it has items
  if (!datos.hobbies || !datos.hobbies.length) {
    datos.hobbies = ["Hobby 1", "Hobby 2"]
  }
  datos.redes = [
    { nombre: "GitHub", url: "https://github.com" },
    { nombre: "LinkedIn", url: "https://linkedin.com" }
  ]
  datos.proyectos = [
    { nombre: "P1", terminado: true, destacado: true, imagenUrl: "p1.jpg", tipo: "demo", url: "https://demo1.com" },
    { nombre: "P2", terminado: false, destacado: false, imagenUrl: "p2.jpg", tipo: "texto" },
    { nombre: "P3", terminado: false, destacado: false, imagenUrl: "p3.jpg", tipo: "otro" }
  ]
  datos.skills = [
    { categoria: "Frontend", items: ["HTML", "CSS", "JS"] },
    { categoria: "Backend", items: ["Node", "SQL"] }
  ]
  
  let allPass = true
  
  const soluciones = {
    1: `mostrar(crearTitulo("Taller HTML"))`,
    2: `mostrar(crearTitulo("Taller HTML")); mostrar(crearParrafo("P1")); mostrar(crearParrafo("P2"))`,
    3: `mostrar(crearTitulo("Taller HTML")); mostrar(crearParrafo("P1")); mostrar(crearParrafo("P2")); mostrar(crearSubtitulo("S"));`,
    4: `mostrar(crearTitulo("Taller HTML")); mostrar(crearParrafo("P1")); mostrar(crearParrafo("P2")); mostrar(crearSubtitulo("S"));
        let l = crearLista();
        for (const r of datos.redes) {
          if (r.url) {
            let item = crearItem("");
            agregarA(item, crearEnlace(r.nombre, r.url));
            agregarA(l, item);
          }
        }
        mostrar(l);
       `,
    5: `let l = crearLista(); for (const p of datos.proyectos) { agregarA(l, crearItem(p.nombre)); } mostrar(l)`,
    6: `let l = crearLista(); for (const h of datos.hobbies) { agregarA(l, crearItem(h)); } mostrar(l)`,
    7: `mostrar(crearTitulo("Taller HTML")); mostrar(crearParrafo("En construcción"))`,
    8: `let c = crearCarrusel(); for (const p of proyectosDestacados(datos.proyectos)) { agregarA(c, crearImagen(p.imagenUrl, p.nombre)); } mostrar(c)`,
    9: `mostrar(crearTitulo("Taller HTML")); mostrar(crearParrafo("A1")); mostrar(crearParrafo("A2"));
        for (const p of datos.proyectos) { if (p.terminado) mostrar(crearParrafo(p.nombre)); }`,
    10: `for (const grupo of datos.skills) {
          mostrar(crearSubtitulo(grupo.categoria));
          let l = crearLista();
          for (const item of grupo.items) {
            agregarA(l, crearItem(item));
          }
          mostrar(l);
        }`,
    11: `for (const p of datos.proyectos) {
          if (p.tipo === 'demo') {
            mostrar(crearEnlace(p.nombre, p.url));
          } else if (p.tipo === 'texto') {
            mostrar(crearParrafo(p.nombre));
          } else {
            mostrar(crearParrafo(p.nombre));
          }
        }`
  }

  for (let numero = 1; numero <= 11; numero++) {
    const encargo = ENCARGOS[numero]
    if (!encargo) continue
    const code = soluciones[numero] || ""
    console.log(`\nProbando e${numero}...`)
    
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
      
      // Pasar html explícitamente para evitar ejecución en iframe
      const res = await revisarLocalmente(numero, code, datos, html)
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
    process.exit(0)
  } else {
    process.exit(1)
  }
}

run()
