// ZIP mínimo (método "stored", sin compresión): suficiente para entregar 3 archivos de texto
// pequeños sin sumar una dependencia. Formato: PKWARE APPNOTE 4.3 (local headers + central directory).

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[n] = c >>> 0
  }
  return tabla
})()

export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of datos) c = TABLA_CRC[(c ^ byte) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export interface ArchivoZip { nombre: string; contenido: string }

export function crearZip(archivos: ArchivoZip[], fecha = new Date()): Uint8Array {
  const codificador = new TextEncoder()
  // Fecha/hora en formato MS-DOS.
  const hora = (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (fecha.getSeconds() >> 1)
  const dia = ((Math.max(fecha.getFullYear(), 1980) - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate()

  const partes: Uint8Array[] = []
  const directorio: Uint8Array[] = []
  let desplazamiento = 0

  for (const archivo of archivos) {
    const nombre = codificador.encode(archivo.nombre)
    const datos = codificador.encode(archivo.contenido)
    const crc = crc32(datos)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // nombres y contenido en UTF-8
    local.setUint16(8, 0, true)
    local.setUint16(10, hora, true)
    local.setUint16(12, dia, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, datos.length, true)
    local.setUint32(22, datos.length, true)
    local.setUint16(26, nombre.length, true)
    local.setUint16(28, 0, true)
    partes.push(new Uint8Array(local.buffer), nombre, datos)

    const central = new DataView(new ArrayBuffer(46))
    central.setUint32(0, 0x02014b50, true)
    central.setUint16(4, 20, true)
    central.setUint16(6, 20, true)
    central.setUint16(8, 0x0800, true)
    central.setUint16(10, 0, true)
    central.setUint16(12, hora, true)
    central.setUint16(14, dia, true)
    central.setUint32(16, crc, true)
    central.setUint32(20, datos.length, true)
    central.setUint32(24, datos.length, true)
    central.setUint16(28, nombre.length, true)
    central.setUint32(42, desplazamiento, true)
    directorio.push(new Uint8Array(central.buffer), nombre)

    desplazamiento += 30 + nombre.length + datos.length
  }

  const tamanoDirectorio = directorio.reduce((total, parte) => total + parte.length, 0)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true)
  fin.setUint16(8, archivos.length, true)
  fin.setUint16(10, archivos.length, true)
  fin.setUint32(12, tamanoDirectorio, true)
  fin.setUint32(16, desplazamiento, true)

  const todo = [...partes, ...directorio, new Uint8Array(fin.buffer)]
  const salida = new Uint8Array(todo.reduce((total, parte) => total + parte.length, 0))
  let posicion = 0
  for (const parte of todo) { salida.set(parte, posicion); posicion += parte.length }
  return salida
}
