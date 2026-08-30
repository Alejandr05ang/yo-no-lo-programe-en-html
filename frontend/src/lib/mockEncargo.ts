import type {
  ArchivoEditor,
  Encargo,
  EstadoGuardado,
  ResultadoRevision,
  SalidaEjecucion,
} from './tipos'

// Datos de ejemplo para desarrollar la pantalla 1a sin backend.
// Copy final tomado del mockup (design/Plataforma Taller.dc.html, panel 1a).
// Cuando exista el backend, esto lo entrega FastAPI (ver docs/arquitectura.md §4).

export const encargoEjemplo: Encargo = {
  numero: 7,
  titulo: 'La lista que no se queda quieta',
  desbloqueadoTexto: 'desbloqueado hoy 10:00',
  parrafos: [
    'Tus hobbies están en datos.hobbies, un archivo que no escribes tú. Hoy tiene tres. La semana que viene puede tener catorce, o ninguno, y la página tiene que verse bien en los tres casos sin que vuelvas a tocar el código.',
    'Escribe el código que construya la sección de hobbies a partir de ese archivo, tal como esté cuando alguien la abra.',
  ],
  herramientas: [
    { nombre: 'crearElemento()' },
    { nombre: 'agregarA()' },
    { nombre: 'obtenerDatos()' },
    { nombre: 'si / sino' },
    { nombre: 'repetir()', nuevaHoy: true },
  ],
  pistaDisponibleEn: 372, // 6:12
}

export const archivoPortafolioEjemplo: ArchivoEditor = {
  nombre: 'portafolio.js',
  soloLectura: false,
  contenido: `const datos = obtenerDatos();
const seccion = crearElemento("section");
seccion.style.padding = "24px";

// mis hobbies, uno por uno
agregarA(seccion, crearElemento("li", datos.hobbies[0]));
agregarA(seccion, crearElemento("li", datos.hobbies[1]));
agregarA(seccion, crearElemento("li", datos.hobbies[2]));

// ...y si mañana hay catorce?

agregarA(pagina, seccion);
`,
}

export const archivoDatosEjemplo: ArchivoEditor = {
  nombre: 'datos.js',
  soloLectura: true,
  contenido: `// Este archivo no lo escribes tú. El evaluador puede cambiarlo.
const datos = {
  hobbies: ["Escalada en roca", "Fotografía analógica", "Ajedrez"],
};
`,
}

export const salidaEjemplo: SalidaEjecucion = {
  lineas: [
    {
      prefijo: 'consola',
      texto: 'Uncaught TypeError: no se puede leer "3" de undefined',
      detalle: 'en portafolio.js:8 — el archivo de datos tiene 3 elementos',
    },
  ],
}

export const guardadoEjemplo: EstadoGuardado = {
  guardadoHaceSegundos: 4,
  intentos: 3,
}

export const revisionEjemplo: ResultadoRevision = {
  casosPasados: 1,
  casosTotales: 4,
  casos: [
    { descripcion: 'Lista con 3 elementos', estado: 'pasa' },
    { descripcion: 'Lista con 14 elementos', estado: 'falla' },
    { descripcion: 'Lista vacía → mensaje', estado: 'falla' },
    { descripcion: 'Sin índices fijos en el código', estado: 'falla' },
  ],
  nota: 'Los casos ocultos cambian de tamaño en cada revisión. Ninguno te dice cómo arreglarlo.',
}

export const portafolioEjemplo = {
  nombre: 'Ana Rivas',
  subtitulo: 'Estudiante de ingeniería · Bogotá',
  sobreMi:
    'Aprendiendo a construir cosas para internet. Este sitio lo escribí yo, línea por línea, durante dos semanas.',
  hobbies: ['Escalada en roca', 'Fotografía analógica', 'Ajedrez'],
  hobbiesEnArchivoDePrueba: 14,
  url: 'ana-rivas.taller.dev',
}
