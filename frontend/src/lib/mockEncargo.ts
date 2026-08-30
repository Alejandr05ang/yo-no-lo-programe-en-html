import type { ArchivoEditor, Encargo, EstadoGuardado, SalidaEjecucion } from './tipos'

// Datos de ejemplo para desarrollar la pantalla 1a sin backend.
// Refleja el ENCARGO 1 de docs/encargos.md — la experiencia de alguien que nunca programó,
// no la del estudiante que ya va por bucles. Cuando exista el backend, esto lo entrega FastAPI.

export const encargoEjemplo: Encargo = {
  numero: 1,
  titulo: 'Tu nombre',
  desbloqueadoTexto: 'desbloqueado hoy 10:00',
  parrafos: [
    'Esta página va a ser tu portafolio. Ahora mismo no dice nada.',
    'Lo primero que cualquiera tiene que ver al abrirla es tu nombre. Escríbelo en el código y pulsa Ejecutar para verlo aparecer.',
  ],
  herramientas: [
    { nombre: 'crearTitulo()' },
    { nombre: 'crearParrafo()' },
    { nombre: 'mostrar()' },
    { nombre: 'const' },
  ],
  pistaDisponibleEn: 300, // 5:00
}

export const archivoPortafolioEjemplo: ArchivoEditor = {
  nombre: 'portafolio.js',
  soloLectura: false,
  contenido: `// La página está vacía. Escribe tu nombre entre las comillas y pulsa Ejecutar.
const titulo = crearTitulo("tu nombre")
mostrar(titulo)
`,
}

export const archivoDatosEjemplo: ArchivoEditor = {
  nombre: 'datos.js',
  soloLectura: true,
  contenido: `// "datos" ya existe, no hace falta crearlo. Lo vas a usar más adelante.
// Este archivo lo puede cambiar el evaluador; vos no lo escribís.
const datos = {
  nombre: "",
  sobreMi: "",
  redes: {},
  hobbies: [],
  proyectos: [],
}
`,
}

// En E1 todavía no hay salida ni revisión.
export const salidaEjemplo: SalidaEjecucion | null = null

export const guardadoEjemplo: EstadoGuardado = {
  guardadoHaceSegundos: 2,
  intentos: 0,
}

// La revisión ya no es un mock fijo: la corre revisionLocal.ts a partir del código real.

export const portafolioEjemplo = {
  nombre: 'Ana Rivas',
  subtitulo: 'Estudiante de ingeniería · Bogotá',
  sobreMi:
    'Aprendiendo a construir cosas para internet. Este sitio lo escribí yo, línea por línea, durante dos semanas.',
  hobbies: ['Escalada en roca', 'Fotografía analógica', 'Ajedrez'],
  hobbiesEnArchivoDePrueba: 14,
  url: 'ana-rivas.taller.dev',
}
