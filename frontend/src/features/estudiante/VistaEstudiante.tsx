import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { api } from '../../lib/api'
import { useAuth } from '../auth/authContext'
import { challengeKeyFromNumero } from '../../lib/challengeIdentity'
import { esVistaDeConsulta, habilitarEdicionForzada } from '../../lib/dispositivo'
import { componerAndamiaje, diaDeEncargo, ENCARGOS, NUMEROS_DE_ENCARGO } from '../../lib/encargos'
import {
  accesoActividad,
  continuacion,
  diaDeReto,
  posicionEnDia,
  rutaDia,
  type ActividadDelDia,
  type DiaDelMapa,
} from '../../lib/navegacionActividades'
import { ApiError } from '../../lib/http'
import { clavePendiente, crearColaDeGuardado, elegirBorrador, sePuedeGuardar, valorPendiente } from '../../lib/colaGuardado'
import { datosComoTexto, pareceContenidoDeDatos, portafolioEjemplo } from '../../lib/mockEncargo'
import { GuardadoSinRefrescar, leerPerfilLegado, olvidarPerfilLegado, perfilComoDatos, perfilDesdeBackend, perfilDelServidorEstaVacio, perfilLegadoParaSubir, perfilParaBackend, PERFIL_DEFECTO, type Perfil } from '../../lib/perfil'
import { ejecutarPreview, ejecutarPreviewJu1 } from '../../lib/sandbox'
import {
  actualizarContenidoDeSeccion,
  actualizarMain,
  agregarColumna,
  agregarFila,
  crearDocumentoJu1Inicial,
  crearSeccion,
  eliminarColumna,
  eliminarFila,
  extenderSeccion,
  parsearDocumentoJu1,
  separarCeldaDelDocumento,
  serializarDocumentoJu1,
} from '../../lib/estructuraDePagina'
import type { EstadoGuardado, EstructuraDePagina, ResultadoRevision, SalidaEjecucion } from '../../lib/tipos'
import { PanelEncargo } from '../encargo/PanelEncargo'
import { DivisorArrastrable } from './DivisorArrastrable'
import { EditorPanel } from '../editor/EditorPanel'
import { EditorEstructura } from '../estructura/EditorEstructura'
import { MisDatos } from '../perfil/MisDatos'
import { PanelPreview } from '../preview/PanelPreview'
import { PanelRevision } from '../revision/PanelRevision'
import { VistaConsultaMovil } from './VistaConsultaMovil'
import './vista-estudiante.css'

const CLAVE_ENCARGO = 've:encargo-abierto'
// Estado efímero por pestaña (sessionStorage): sobrevive recargas, se pierde al cerrar la
// pestaña. Igual criterio que el estado dinámico del portafolio (brief §2.6). En producción
// esto lo guarda el backend por estudiante.
const CLAVE_SOLUCIONES = 've:soluciones' // código aceptado por encargo (para heredar)
const CLAVE_BORRADORES = 've:borradores' // código en curso por encargo (para no perder trabajo al navegar)

const MIN_ENCARGO = NUMEROS_DE_ENCARGO[0]
const MAX_ENCARGO = NUMEROS_DE_ENCARGO[NUMEROS_DE_ENCARGO.length - 1]

function leerEncargoAbierto(): boolean {
  try {
    return localStorage.getItem(CLAVE_ENCARGO) !== '0'
  } catch {
    return true
  }
}

function leerMapa(clave: string): Record<number, string> {
  try {
    return JSON.parse(sessionStorage.getItem(clave) ?? '{}')
  } catch {
    return {}
  }
}

function persistir(clave: string, obj: unknown) {
  try {
    sessionStorage.setItem(clave, JSON.stringify(obj))
  } catch {
    /* sin almacenamiento: se sigue sin persistir */
  }
}

/** Las copias por pestaña llevan el uid: en un equipo compartido, quien entra después en la
 *  misma pestaña no ve ni hereda el código de quien salió. Sin cuenta (modo local de
 *  ejercicios) se usa la clave de siempre, la que lee lib/progreso.ts. */
function claveDeCuenta(base: string, uid: string | undefined): string {
  return uid ? `${base}:${uid}` : base
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

type Casos = { casosPasados: number; casosTotales: number }

function sinEncargo<T>(mapa: Record<number, T>, n: number): Record<number, T> {
  const copia = { ...mapa }
  delete copia[n]
  return copia
}

// Un guardado que no llegó (sin red) se reintenta solo, cada vez más espaciado.
const REINTENTO_MIN_MS = 3000
const REINTENTO_MAX_MS = 30_000

/** El contenido inicial de un encargo nuevo (sin borrador propio ni heredado todavía). Un
 *  encargo de modelo 'grid' (Ju1) no arma el archivo con comentario+texto anterior como
 *  componerAndamiaje(): si hereda de otro (heredaDe), lo heredado se usa TAL CUAL como
 *  contenido inicial — sea la cuadrícula ya armada de un encargo de grid anterior (E13
 *  hereda de E12: sigue exactamente donde lo dejó), o el código de siempre de un encargo de
 *  un solo archivo (E12 hereda de E6: aparece sin secciones en portafolio.js — organizarlo es
 *  el punto del encargo). Sin nada que heredar, arranca una cuadrícula vacía. */
function contenidoInicialDe(numero: number, soluciones: Record<number, string>): string {
  const e = ENCARGOS[numero]
  if (e?.modelo === 'grid') {
    const heredado = e.heredaDe != null ? soluciones[e.heredaDe]?.trim() : undefined
    return heredado || serializarDocumentoJu1(crearDocumentoJu1Inicial())
  }
  return componerAndamiaje(numero, soluciones)
}

export function VistaEstudiante() {
  // Otra cuenta es otra pantalla: nada del estado de la anterior pasa a la siguiente.
  const { user } = useAuth()
  return <VistaEstudianteInterna key={user?.uid ?? 'sin-cuenta'} />
}

function VistaEstudianteInterna() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const numero = clamp(Number(params.get('e')) || MIN_ENCARGO, MIN_ENCARGO, MAX_ENCARGO)

  const { data: encargo } = useQuery({
    queryKey: ['encargo', numero],
    queryFn: () => api.encargo(numero),
    // El encargo viene en el bundle: sin red no hay que esperar a nada (si no, el editor se
    // quedaba en "cargando" hasta que volviera la conexión).
    networkMode: 'always',
  })

  const [encargoAbierto, setEncargoAbierto] = useState(leerEncargoAbierto)
  const [editorAbierto, setEditorAbierto] = useState(true)
  // Independiente de editorAbierto: la cuadrícula (Ju1) puede colapsarse sola para hacerle
  // lugar al código sin cerrar el editor entero.
  const [estructuraAbierta, setEstructuraAbierta] = useState(true)
  const [previewExpandido, setPreviewExpandido] = useState(false)
  const [misDatosAbierto, setMisDatosAbierto] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  // Se evalúa una sola vez al montar (lib/dispositivo.ts): por capacidad del equipo, no por
  // ancho de ventana — una pantalla dividida angosta en una computadora real no debe caer acá.
  const { user, api: clienteApi, session, refresh } = useAuth()
  const [vistaConsulta, setVistaConsulta] = useState(esVistaDeConsulta)

  const key = challengeKeyFromNumero(numero)
  const queryClient = useQueryClient()

  // El mapa del backend dice qué días están abiertos, pausados o bloqueados, en qué orden
  // van las actividades y qué ofrecer al terminar un día. Antes se pedía el día con
  // diaDeEncargo(), que es una ETIQUETA ("Día 3 — Mi1") y no un código: la petición nunca
  // salía y "Ver actividades del día" llevaba a una página inexistente. Se vuelve a pedir
  // cada poco y al volver a la pestaña: cuando el docente abre el día siguiente, el alumno
  // ve cómo continuar sin recargar.
  const mapaQuery = useQuery({
    queryKey: ['mapa'],
    queryFn: async () => {
      if (!clienteApi) throw new ApiError('AUTH_REQUIRED', 401)
      return clienteApi.request<{ sessions: DiaDelMapa[] }>('/map')
    },
    enabled: !!clienteApi,
    // Sin red, React Query deja la consulta en pausa indefinidamente y la actividad se
    // quedaba en "Comprobando…". Así falla, y se trabaja con lo local.
    networkMode: 'always',
    // Siempre fresco al entrar: el mapa guardado en memoria puede tener unos segundos y decir
    // "bloqueado" de un día que el docente acaba de abrir (el mapa de la clase ya lo muestra
    // abierto y el editor no dejaba entrar).
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
  const esEstudiante = session?.user.role === 'student'
  // Para la navegación de un docente o admin (vista previa) manda el orden del curso, no los
  // bloqueos de su clase: si no, en un día aún cerrado no había "Siguiente" y "Ver
  // actividades del día" llevaba a un "todavía no está abierto".
  const dias = esEstudiante ? mapaQuery.data?.sessions ?? null : null

  // Sin mapa (sin conexión, o un docente que no está matriculado en la clase) se navega con
  // el orden del bundle, que es el mismo del seed del backend.
  const actividadesDelBundle = useMemo((): ActividadDelDia[] => {
    const sesion = ENCARGOS[numero]?.sesion
    return NUMEROS_DE_ENCARGO.filter((n) => ENCARGOS[n].sesion === sesion).map((n) => ({
      key: challengeKeyFromNumero(n),
      title: ENCARGOS[n].meta.titulo,
      unlocked: true,
    }))
  }, [numero])

  const diaActual = dias ? diaDeReto(dias, key) : null
  // El CÓDIGO público del día (Mi1), el único que entienden /sesiones/:codigo y la API.
  const codigoDia = diaActual?.code ?? ENCARGOS[numero]?.sesion ?? null
  const posicion = useMemo(
    () => posicionEnDia(diaActual?.challenges ?? actividadesDelBundle, key),
    [diaActual, actividadesDelBundle, key],
  )
  const siguePaso = dias ? continuacion(dias, key) : null
  // Con mapa: la siguiente actividad ABIERTA del día (lib/navegacionActividades.ts). Sin mapa
  // (sin conexión, vista previa) la inmediata del bundle.
  const siguienteDisponible = siguePaso?.tipo === 'mismo-dia'
    ? siguePaso.destino
    : !dias && posicion?.siguiente?.disponible ? posicion.siguiente : null

  // Si el alumno puede trabajar aquí. El backend ya rechaza guardar en un reto cerrado; esto
  // evita además mostrarle el editor de una actividad a la que se llegó por URL directa. Un
  // docente sin matrícula la ve en vista previa, y sin conexión se trabaja con lo local.
  const errorMapa = mapaQuery.error instanceof ApiError ? mapaQuery.error.code : null
  const veredicto = dias ? accesoActividad(dias, key) : null
  // Un "cerrado" que viene del mapa guardado en memoria se confirma con el mapa nuevo antes de
  // mostrarse: puede ser de antes de que el docente abriera el día.
  const confirmando = mapaQuery.isFetching && !mapaQuery.isFetchedAfterMount
  const acceso = !esEstudiante
    ? 'abierta'
    : veredicto && (veredicto === 'abierta' || !confirmando)
    ? veredicto
    : clienteApi && (mapaQuery.isPending || confirmando)
      ? 'verificando'
    : errorMapa === 'NOT_COHORT_MEMBER'
      ? 'sin-clase'
      : 'abierta'

  // El perfil sale de Postgres, no del navegador: así es el mismo en cualquier
  // equipo y sobrevive a vaciar el almacenamiento local.
  const perfil: Perfil = useMemo(
    () => (session ? perfilDesdeBackend(session.user) : PERFIL_DEFECTO),
    [session],
  )
  const perfilRef = useRef(perfil)
  perfilRef.current = perfil

  // Migración de una sola vez para quien guardó su perfil cuando vivía en el
  // navegador: se sube, y solo cuando el servidor confirma se borra la copia local. Un solo
  // intento por visita (antes se repetía en cada lectura de la sesión si fallaba).
  const migradoRef = useRef(false)
  useEffect(() => {
    if (migradoRef.current || !session || !clienteApi) return
    const legado = leerPerfilLegado()
    if (!legado) return
    migradoRef.current = true
    // El servidor ya tiene perfil propio: manda él y lo heredado se descarta.
    const cuerpo = perfilDelServidorEstaVacio(session.user) ? perfilLegadoParaSubir(legado, session.user) : null
    if (!cuerpo) {
      olvidarPerfilLegado()
      return
    }
    void (async () => {
      try {
        await clienteApi.request('/profile', { method: 'PUT', json: cuerpo })
        olvidarPerfilLegado()
        // Silencioso: sin desmontar el editor que el estudiante tiene abierto.
        await refresh({ silencioso: true })
      } catch (e) {
        // Datos que el servidor nunca va a aceptar no se reintentan en cada visita.
        if (e instanceof ApiError && e.code === 'VALIDATION_ERROR') olvidarPerfilLegado()
        console.error('No se pudo migrar el perfil guardado en este navegador', e)
      }
    })()
  }, [session, clienteApi, refresh])

  const claveSoluciones = claveDeCuenta(CLAVE_SOLUCIONES, user?.uid)
  const claveBorradores = claveDeCuenta(CLAVE_BORRADORES, user?.uid)
  const solucionesRef = useRef<Record<number, string>>(leerMapa(claveSoluciones))
  const borradoresRef = useRef<Record<number, string>>(leerMapa(claveBorradores))
  const numeroAnteriorRef = useRef<number | null>(null)

  const [contenido, setContenido] = useState('')
  const contenidoRef = useRef('')
  contenidoRef.current = contenido

  const [salida, setSalida] = useState<SalidaEjecucion | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [revision, setRevision] = useState<ResultadoRevision | null>(null)
  const [ejecutando, setEjecutando] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const [celebrando, setCelebrando] = useState(false)
  // Contador (no boolean): reentregar un encargo ya aceptado sin cambiar el código debe volver
  // a saltar (docs/encargos.md §5.2 "también si volviste a repasar... pasa al siguiente igual"),
  // y un booleano que ya estaba en `true` no dispararía el efecto de nuevo.
  const [entregaExitosa, setEntregaExitosa] = useState(0)

  // `datos` de la preview = perfil del estudiante + override del encargo (donde este necesita
  // un estado concreto). Que sea propio hace que el portafolio se sienta suyo desde E1.
  const datos = useMemo(
    () => ({ ...perfilComoDatos(perfil), ...(encargo?.datosOverride ?? {}) }),
    [perfil, encargo],
  )
  const archivoDatos = useMemo(
    () => ({ nombre: 'datos.js', soloLectura: true, contenido: datosComoTexto(datos) }),
    [datos],
  )

  // Ju1 (modelo 'grid'): `contenido` (el mismo string de siempre, autoguardado sin cambios)
  // guarda el DocumentoJu1 serializado en vez de JS — ver plan "Cuadrícula visual + pestañas
  // por sección". `documento` es null en cualquier otro encargo (archivo único, como siempre).
  const esGrid = encargo?.modelo === 'grid'
  const documento = useMemo(() => (esGrid ? parsearDocumentoJu1(contenido) : null), [esGrid, contenido])
  const archivos = useMemo(() => {
    if (!documento) return [{ nombre: 'portafolio.js', soloLectura: false, contenido }, archivoDatos]
    return [
      { nombre: 'portafolio.js', soloLectura: false, contenido: documento.main },
      archivoDatos,
      ...documento.secciones.map((s) => ({
        nombre: `seccion-${s.nombre}.js`,
        soloLectura: false,
        contenido: s.contenido,
      })),
    ]
  }, [documento, contenido, archivoDatos])

  // Pedido de EditorEstructura de abrir la pestaña de una celda ya nombrada — EditorPanel lo
  // consume y cambia de pestaña; `token` para que dispare aunque se pida la misma dos veces.
  const [archivoSolicitado, setArchivoSolicitado] = useState<{ nombre: string; token: number } | null>(null)

  // Los cambios de ESTRUCTURA (agregar/quitar fila o columna, combinar, separar) tocan
  // `documento.estructura` y se re-serializan igual que cualquier otro cambio de `contenido` —
  // misma cola de autoguardado, sin distinción especial. Solo tienen sentido si `documento` ya
  // existe (el panel que los dispara, EditorEstructura, no se muestra si no).
  function actualizarEstructura(actualizar: (e: EstructuraDePagina) => EstructuraDePagina) {
    if (!documento) return
    setContenido(serializarDocumentoJu1({ ...documento, estructura: actualizar(documento.estructura) }))
    setEstadoGuardado(prev => ({ ...prev, estado: 'dirty' }))
  }

  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>({ estado: 'saved', intentos: 0 })
  const getProgressReq = useRef(0)
  const numeroRef = useRef(numero)
  useEffect(() => { numeroRef.current = numero }, [numero])

  // Cola para serializar los guardados y evitar carreras de red (lib/colaGuardado.ts).
  const colaRef = useRef(crearColaDeGuardado())

  const claveBorrador = (n: number) => (user ? `tutorias:draft:${user.uid}:${challengeKeyFromNumero(n)}` : null)
  const guardarCopiaLocal = (n: number, cont: string) => {
    const clave = claveBorrador(n)
    if (!clave) return
    try {
      localStorage.setItem(clave, cont)
    } catch {
      /* sin almacenamiento local: queda el guardado en el servidor */
    }
  }
  // Lo último que este equipo SABE que está en el servidor, por encargo (undefined: no se sabe,
  // p. ej. se abrió sin red). Va en la marca de pendiente: al volver, la copia local solo manda
  // si el servidor no cambió desde entonces (lib/colaGuardado.ts, elegirBorrador).
  const enServidorRef = useRef<Record<number, string>>({})
  const marcarPendiente = (n: number) => {
    if (!user) return
    const base = enServidorRef.current[n]
    try {
      localStorage.setItem(clavePendiente(user.uid, challengeKeyFromNumero(n)), base === undefined ? '1' : valorPendiente(base))
    } catch { /* sin almacenamiento */ }
  }
  const reintentosRef = useRef(0)
  // Guarda en el servidor el borrador `cont` del encargo `numSave`, en la cola. Si no llega,
  // deja una marca en este equipo: al volver al encargo la copia local manda y se vuelve a
  // subir. Y solo se da por "guardado" si mientras tanto no se escribió nada más; si no,
  // lo escrito durante el envío quedaba marcado como guardado sin haberse enviado.
  const guardarEnServidor = (numSave: number, cont: string) => {
    const marca = user ? clavePendiente(user.uid, challengeKeyFromNumero(numSave)) : null
    colaRef.current.encolar(async () => {
      try {
        await api.autoguardar(clienteApi, numSave, cont)
        reintentosRef.current = 0
        enServidorRef.current[numSave] = cont
        if (marca) try { localStorage.removeItem(marca) } catch { /* sin almacenamiento */ }
        if (numSave === numeroRef.current) {
          setEstadoGuardado(prev => (contenidoRef.current === cont ? { ...prev, estado: 'saved' } : prev))
        }
      } catch {
        marcarPendiente(numSave)
        if (numSave === numeroRef.current) setEstadoGuardado(prev => ({ ...prev, estado: 'error' }))
      }
    })
  }

  // Aceptados que pasaron la revisión pero todavía no llegaron al servidor (sin red): se
  // reintentan solos y, mientras tanto, se avisa "Pendiente de sincronizar".
  const [aceptadosPendientes, setAceptadosPendientes] = useState<Record<number, Casos>>({})
  // El aceptado va por la MISMA cola que el autoguardado, así que nunca se cruza con él, y no
  // lleva el código: el borrador lo guarda el autoguardado. Antes mandaba el código entregado
  // y, si mientras se revisaba el estudiante seguía escribiendo, pisaba en el servidor lo más
  // nuevo con lo entregado.
  const guardarAceptado = (numSave: number, casos: Casos) => {
    colaRef.current.encolar(async () => {
      try {
        await exigirCliente().request(`/challenges/${challengeKeyFromNumero(numSave)}/progress`, {
          method: 'PUT',
          json: { status: 'accepted', cases_passed: casos.casosPasados, cases_total: casos.casosTotales },
        })
        reintentosRef.current = 0
        setAceptadosPendientes(prev => sinEncargo(prev, numSave))
        if (numSave === numeroRef.current) setProgressStatus('accepted')
        // El mapa cuenta las actividades completadas del día: que se entere ya.
        void queryClient.invalidateQueries({ queryKey: ['mapa'] })
      } catch (e) {
        console.error('No se pudo guardar el aceptado; se vuelve a intentar', e)
        // Un rechazo del servidor (día pausado, reto cerrado…) no se arregla reintentando.
        const reintentable = !(e instanceof ApiError) || e.code === 'NETWORK_ERROR' || e.code === 'SERVICE_UNAVAILABLE' || e.code === 'REQUEST_CANCELLED'
        setAceptadosPendientes(prev => (reintentable ? { ...prev, [numSave]: casos } : sinEncargo(prev, numSave)))
        if (!reintentable && numSave === numeroRef.current) setErrorEntrega(e instanceof ApiError ? e.message : 'No se pudo guardar la entrega.')
      }
    })
  }
  function exigirCliente() {
    if (!clienteApi) throw new ApiError('AUTH_REQUIRED', 401)
    return clienteApi
  }

  const [progressStatus, setProgressStatus] = useState<string>('not_started')
  // El encargo cuyo borrador está AHORA en el editor. Mientras se carga el de otro encargo
  // (volver atrás en el navegador, un enlace), `contenido` todavía es el del anterior: el
  // autoguardado no debe dispararse con ese texto bajo la clave nueva.
  const [numeroCargado, setNumeroCargado] = useState<number | null>(null)
  const numeroCargadoRef = useRef<number | null>(null)
  const [errorEntrega, setErrorEntrega] = useState<string | null>(null)

  const flushPendiente = async () => {
    // Si está sucio el actual, lo encolamos para guardarlo. Solo si el editor tiene el
    // borrador de ESTE encargo (no el del anterior, mientras carga).
    if (user && sePuedeGuardar({ contenido: contenidoRef.current, numero, numeroCargado, estado: estadoGuardado.estado })) {
      setEstadoGuardado(prev => ({ ...prev, estado: 'saving' }))
      guardarCopiaLocal(numero, contenidoRef.current)
      guardarEnServidor(numero, contenidoRef.current)
    }
    // Esperamos a que todo lo encolado termine (incluyendo el posible dirty anterior)
    await colaRef.current.esperar()
  }

  const flushPendienteRef = useRef(flushPendiente)
  flushPendienteRef.current = flushPendiente

  // Toda navegación manual espera a que el último cambio quede guardado.
  const irAEncargo = async (n: number) => {
    await flushPendiente()
    setParams((p) => {
      p.set('e', String(n))
      return p
    })
  }
  const irADia = async (codigo: string) => {
    await flushPendiente()
    navigate(rutaDia(codigo))
  }

  // Lo que no llegó al servidor (el borrador o un aceptado) se reintenta solo, cada vez más
  // espaciado, sin esperar a que el estudiante vuelva a escribir o a navegar: si no, la última
  // versión solo existía en este equipo.
  useEffect(() => {
    const borrador = estadoGuardado.estado === 'error' && !!user && numeroCargado === numero && contenidoRef.current.length > 0
    const aceptados = Object.entries(aceptadosPendientes)
    if (!borrador && aceptados.length === 0) return
    const espera = Math.min(REINTENTO_MIN_MS * 2 ** reintentosRef.current, REINTENTO_MAX_MS)
    const t = setTimeout(() => {
      reintentosRef.current++
      if (borrador) {
        setEstadoGuardado(prev => ({ ...prev, estado: 'saving' }))
        guardarCopiaLocal(numero, contenidoRef.current)
        guardarEnServidor(numero, contenidoRef.current)
      }
      for (const [n, casos] of aceptados) guardarAceptado(Number(n), casos)
    }, espera)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoGuardado.estado, aceptadosPendientes, numero, numeroCargado, user])

  // Salir de la pantalla por cualquier camino (un enlace, el menú, Atrás) o cerrar/recargar la
  // pestaña no puede perder lo escrito durante la pausa del autoguardado: la copia de este
  // equipo queda marcada como pendiente (al volver, manda y se sube) y se intenta subir ya.
  const estadoGuardadoRef = useRef(estadoGuardado.estado)
  const alSalirRef = useRef<(cerrandoPestana: boolean) => void>(() => {})
  useEffect(() => {
    estadoGuardadoRef.current = estadoGuardado.estado
    alSalirRef.current = (cerrandoPestana) => {
      const n = numeroRef.current
      if (!user || numeroCargadoRef.current !== n || !contenidoRef.current) return
      const estado = estadoGuardadoRef.current
      // Al cerrar la pestaña, un envío en curso puede no llegar: también cuenta como pendiente.
      if (estado !== 'dirty' && estado !== 'error' && !(cerrandoPestana && estado === 'saving')) return
      guardarCopiaLocal(n, contenidoRef.current)
      marcarPendiente(n)
      if (estado !== 'saving') guardarEnServidor(n, contenidoRef.current)
    }
  })
  useEffect(() => {
    const alOcultar = () => alSalirRef.current(true)
    window.addEventListener('pagehide', alOcultar)
    return () => {
      window.removeEventListener('pagehide', alOcultar)
      alSalirRef.current(false)
    }
  }, [])

  // Al cambiar de encargo: guardar el borrador del que se sale y cargar el que entra.
  useEffect(() => {
    if (!encargo) return
    const anterior = numeroAnteriorRef.current
    // Solo si lo que hay en el editor ES el borrador del encargo del que se sale.
    if (anterior != null && anterior !== numero && numeroCargadoRef.current === anterior) {
      borradoresRef.current[anterior] = contenidoRef.current
      persistir(claveBorradores, borradoresRef.current)
      if (user && contenidoRef.current && (estadoGuardado.estado === 'dirty' || estadoGuardado.estado === 'error')) {
        guardarCopiaLocal(anterior, contenidoRef.current)
        guardarEnServidor(anterior, contenidoRef.current)
      }
    }
    numeroAnteriorRef.current = numero

    let fallbackLocal: string | undefined = borradoresRef.current[numero]
    let pendiente: string | null = null
    if (user) {
      let fallbackExt: string | null = null
      try {
        fallbackExt = localStorage.getItem(`tutorias:draft:${user.uid}:${challengeKeyFromNumero(numero)}`)
        pendiente = localStorage.getItem(clavePendiente(user.uid, challengeKeyFromNumero(numero)))
      } catch {
        /* sin almacenamiento local */
      }
      if (fallbackExt) fallbackLocal = fallbackExt
    }
    // Un bug de Monaco (arreglado en EditorPanel.tsx) podía autoguardar el contenido de
    // datos.js como si fuera el borrador de portafolio.js. Lo que ya haya quedado guardado
    // así (de antes del arreglo) se descarta acá en vez de mostrárselo al estudiante.
    if (fallbackLocal && pareceContenidoDeDatos(fallbackLocal)) fallbackLocal = undefined

    const setInitialCode = (code: string) => {
      setContenido(code)
      setNumeroCargado(numero)
      numeroCargadoRef.current = numero
      setErrorEntrega(null)
      setEstadoGuardado(prev => ({ ...prev, estado: 'saved' }))
      setSalida(null)
      setRevision(null)
      if (encargo.heredaDe != null || encargo.modelo === 'grid') {
        const d = { ...perfilComoDatos(perfilRef.current), ...encargo.datosOverride }
        const promesa = encargo.modelo === 'grid' ? ejecutarPreviewJu1(parsearDocumentoJu1(code), d) : ejecutarPreview(code, d)
        void promesa.then((r) => {
          if (r.ok) setPreviewHtml(r.html)
        })
      } else {
        setPreviewHtml('')
      }
    }

    // Primer arranque de un encargo: la solución del encargo anterior se hereda. Antes solo
    // se buscaba en sessionStorage, que se vacía al cerrar la pestaña: en una clase nueva, o en
    // otro equipo, el alumno recibía el código de ejemplo en vez del suyo. El servidor tiene
    // su borrador del encargo anterior; se usa ese.
    const componerInicial = async (): Promise<string> => {
      if (fallbackLocal) return fallbackLocal
      const soluciones = { ...solucionesRef.current }
      const previo = encargo.heredaDe
      if (previo != null && !soluciones[previo]?.trim()) {
        const anteriorServidor = await api.getProgress(clienteApi, previo)
        if (anteriorServidor.draft_code.trim() && !pareceContenidoDeDatos(anteriorServidor.draft_code)) {
          soluciones[previo] = anteriorServidor.draft_code
        }
      }
      return contenidoInicialDe(numero, soluciones)
    }

    let cancelled = false
    if (user) {
      const reqId = ++getProgressReq.current
      const vigente = () => !cancelled && reqId === getProgressReq.current
      void (async () => {
        // Primero que termine el guardado del encargo del que se viene (o uno anterior de
        // este mismo, al volver atrás): si no, se leería del servidor una versión vieja.
        await colaRef.current.esperar()
        if (!vigente()) return
        const res = await api.getProgress(clienteApi, numero)
        if (!vigente()) return
        setProgressStatus(res.status)
        // Un bug de Monaco (arreglado en EditorPanel.tsx) podía autoguardar el contenido de
        // datos.js como si fuera el borrador de portafolio.js — lo que ya haya quedado
        // guardado así en el backend se descarta acá en vez de mostrárselo al estudiante.
        const servidor = res.draft_code && !pareceContenidoDeDatos(res.draft_code) ? res.draft_code : ''
        if (!res.sinRespuesta) enServidorRef.current[numero] = servidor
        const elegido = elegirBorrador({ servidor, local: fallbackLocal ?? null, pendiente })
        // Una marca que ya no manda (lo local ya está en el servidor, o el servidor cambió
        // después en otro equipo) se borra: si no, volvería a decidir en la próxima visita.
        if (pendiente && !elegido?.subir && !res.sinRespuesta && user) {
          try { localStorage.removeItem(clavePendiente(user.uid, challengeKeyFromNumero(numero))) } catch { /* sin almacenamiento */ }
        }
        const codigo = elegido ? elegido.codigo : await componerInicial()
        if (!vigente()) return
        setInitialCode(codigo)
        // Lo que no llegó al servidor se vuelve a subir con el autoguardado.
        if (elegido?.subir) setEstadoGuardado(prev => ({ ...prev, estado: 'dirty' }))
        // Después de setInitialCode, que limpia la revisión.
        if (res.status === 'accepted') {
          setEstadoGuardado(prev => ({ ...prev, estado: 'saved' }))
          setRevision({
            ok: true,
            casosPasados: res.cases_passed ?? 0,
            casosTotales: res.cases_total ?? 0,
            casos: [],
            htmlPreview: '',
            logs: [],
          })
        }
      })()
    } else {
      setInitialCode(fallbackLocal ?? contenidoInicialDe(numero, solucionesRef.current))
    }
    return () => { cancelled = true }
  }, [numero, encargo, user, clienteApi, claveBorradores])

  // `codigoPrueba`: cuando el estudiante corre una pestaña de prueba en vez de la entrega real
  // (EditorPanel.tsx). Se ve en la misma consola y vista previa, pero nunca pisa `contenido`
  // ni lo que ya está guardado — es la forma de "probar antes de aplicar a toda la página".
  // Sin eso, se corre LA ENTREGA: el documento completo (Ju1) o `contenido` tal cual (el resto).
  const ejecutar = useCallback(async (codigoPrueba?: string) => {
    setEjecutando(true)
    const r = codigoPrueba !== undefined
      ? await ejecutarPreview(codigoPrueba, datos)
      : documento
        ? await ejecutarPreviewJu1(documento, datos)
        : await ejecutarPreview(contenido, datos)
    setEjecutando(false)
    if (r.ok) {
      setPreviewHtml(r.html)
      setSalida({
        lineas: r.logs.length
          ? r.logs.map((texto) => ({ prefijo: 'consola', texto }))
          : [{ prefijo: 'consola', texto: 'ejecución sin errores' }],
      })
    } else {
      const mensaje = r.error?.mensaje ?? 'error desconocido'
      const linea = r.error?.linea
      setSalida({
        lineas: [{ prefijo: 'consola', texto: linea ? `${mensaje} (línea ${linea})` : mensaje }],
        linea,
        archivo: r.error?.archivo,
      })
    }
  }, [contenido, datos, documento])

  const entregar = useCallback(async () => {
    setEntregando(true)
    setErrorEntrega(null)
    let r: ResultadoRevision
    try {
      // Antes de entregar, que el último cambio quede guardado.
      await flushPendienteRef.current()
      r = await api.entregarARevision(clienteApi, numero, contenido, datos)
    } catch (e) {
      // Sin esto el botón se quedaba en "Revisando…" para siempre ante un 403 o sin red.
      setErrorEntrega(e instanceof ApiError ? e.message : 'No se pudo entregar. Inténtalo de nuevo.')
      return
    } finally {
      setEntregando(false)
    }
    // Si mientras se revisaba el alumno pasó a otro encargo, el resultado no se pinta allí;
    // el aceptado sí se guarda, en SU encargo (numero y contenido son los de la entrega).
    const sigueAqui = numeroRef.current === numero
    if (sigueAqui) {
      setRevision(r)
      setEstadoGuardado(prev => ({ ...prev, intentos: prev.intentos + 1 }))
    }

    if (r.casosPasados === r.casosTotales && user && clienteApi) {
      guardarAceptado(numero, { casosPasados: r.casosPasados, casosTotales: r.casosTotales })
    }
    // El salto automático (docs/encargos.md §5.2) es un evento, no un estado: si el encargo ya
    // estaba aceptado y se reentrega igual, tiene que volver a saltar.
    if (sigueAqui && r.casosPasados === r.casosTotales) {
      setEntregaExitosa((n) => n + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenido, datos, numero, clienteApi, user])

  // Al pasar todos los casos: el sello "encargo aceptado" se ve un instante (con el parpadeo de
  // pantalla completa) y la plataforma salta sola al siguiente encargo — sin botón, siempre,
  // salvo que sea el último o el siguiente esté bloqueado (docs/encargos.md §5.2). Los valores
  // de esUltimo/siguienteDisponible que importan son los del momento en que se dispara el
  // efecto, no los de cuando se creó `entregar`: por eso van fuera de sus deps y se leen acá.
  useEffect(() => {
    if (entregaExitosa === 0) return
    setCelebrando(true)
    const destino = siguienteDisponible
    const esElUltimo = esUltimo
    const t = setTimeout(() => {
      setCelebrando(false)
      if (!esElUltimo && destino) void irAEncargo(destino.numero)
    }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregaExitosa])

  // Al guardar "Mis datos": refrescar la preview para que se vea el cambio de una.
  useEffect(() => {
    if (previewHtml) void ejecutar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil])

  // Autoguardado + cache del borrador del encargo actual.
  useEffect(() => {
    if (!contenido) return
    // Solo el borrador del encargo que está cargado: si todavía se está cargando otro,
    // `contenido` es el del anterior y se guardaría bajo la clave equivocada.
    if (numeroCargado !== numero) return
    if (estadoGuardado.estado === 'saved') {
      // Evitar que el setInitialCode dispare un dirty
      return
    }
    const t = setTimeout(() => {
      setEstadoGuardado(prev => ({ ...prev, estado: 'saving' }))
      if (user) {
        // La copia de este equipo primero: si el envío falla, queda marcada como pendiente
        // y al volver al encargo es la que se muestra (y se vuelve a subir).
        guardarCopiaLocal(numero, contenido)
        guardarEnServidor(numero, contenido)
      } else {
        setEstadoGuardado(prev => ({ ...prev, estado: 'saved' }))
      }
      borradoresRef.current[numero] = contenido
      persistir(claveBorradores, borradoresRef.current)
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenido, numero, numeroCargado, user, clienteApi])

  // En un encargo de un solo archivo, el único editable es siempre "portafolio.js" — el
  // nombre no importa. En Ju1 (modelo 'grid'), `nombreArchivo` dice CUÁL de las pestañas
  // cambió (el main o una sección) y hay que actualizar esa parte del documento antes de
  // volver a serializarlo — `contenido` sigue siendo el único string que se autoguarda.
  const onChangeContenido = useCallback((nombreArchivo: string, v: string) => {
    setContenido((actual) => {
      if (!esGrid) return v
      const doc = parsearDocumentoJu1(actual)
      if (nombreArchivo === 'portafolio.js') return serializarDocumentoJu1(actualizarMain(doc, v))
      const nombreSeccion = nombreArchivo.replace(/^seccion-/, '').replace(/\.js$/, '')
      return serializarDocumentoJu1(actualizarContenidoDeSeccion(doc, nombreSeccion, v))
    })
    setEstadoGuardado(prev => ({ ...prev, estado: 'dirty' }))
  }, [esGrid])

  // Solo del encargo cuyo borrador está en el editor: justo después de cambiar de encargo,
  // progressStatus y revision todavía son los del anterior.
  const aceptado = numeroCargado === numero
    && (progressStatus === 'accepted' || (!!revision && revision.casosPasados === revision.casosTotales))
  const esUltimo = numero >= MAX_ENCARGO

  // Al aceptar: guardar la solución (para heredarla)
  useEffect(() => {
    if (!aceptado || numeroCargadoRef.current !== numero) return
    solucionesRef.current[numero] = contenidoRef.current
    borradoresRef.current[numero] = contenidoRef.current
    persistir(claveSoluciones, solucionesRef.current)
    persistir(claveBorradores, borradoresRef.current)
  }, [aceptado, numero, claveSoluciones, claveBorradores])

  const mensajeAceptado =
    aceptado && esUltimo ? 'Terminaste el último encargo. Tu portafolio está completo.' : ''

  // "Mis datos" es el mismo diálogo en todas las pantallas de aquí abajo (misma key): si el
  // docente pausa el día mientras el estudiante lo está llenando, no se pierde lo escrito.
  const dialogoMisDatos = misDatosAbierto && (
    <MisDatos
      key="mis-datos"
      perfil={perfil}
      onGuardar={async (p) => {
        if (!clienteApi || !session) return
        await clienteApi.request('/profile', { method: 'PUT', json: perfilParaBackend(p, session.user) })
        // Silencioso: la sesión se relee sin desmontar el editor; `perfil` y datos.js se
        // actualizan en cuanto llega la respuesta.
        try {
          await refresh({ silencioso: true })
        } catch {
          throw new GuardadoSinRefrescar()
        }
      }}
      onCerrar={() => setMisDatosAbierto(false)}
    />
  )

  // Una actividad que el mapa dice cerrada no se abre, aunque se llegue por URL directa:
  // ni instrucciones, ni editor. Se explica por qué y se ofrece la salida.
  if (acceso === 'verificando') {
    return (
      <div className="ve">
        <Nav seccion="Portafolio" dia={diaDeEncargo(numero)} iniciales="AR" activo="portafolio" />
        <main className="ve-bloqueo"><p role="status">Comprobando la actividad…</p></main>
        {dialogoMisDatos}
      </div>
    )
  }
  if (acceso !== 'abierta') {
    const textos = {
      'pausada': {
        titulo: 'Este día está en pausa',
        cuerpo: 'Tu docente pausó temporalmente este día. Tu progreso y tu código siguen guardados: cuando lo reabra, estarán como los dejaste.',
      },
      'bloqueada': {
        titulo: 'Esta actividad todavía no está abierta',
        cuerpo: 'Tu docente la abrirá cuando llegue su día. Mientras tanto puedes repasar lo que ya está abierto en el mapa.',
      },
      'sin-clase': {
        titulo: 'Primero únete a tu clase',
        cuerpo: 'Para trabajar en las actividades necesitas unirte a tu clase con el código que te dio tu docente.',
      },
      'desconocida': {
        titulo: 'Esta actividad no está disponible',
        cuerpo: 'No aparece entre las actividades de tu clase. Vuelve al mapa para ver las que tienes abiertas.',
      },
    }[acceso]
    return (
      <div className="ve">
        <Nav seccion="Portafolio" dia={diaDeEncargo(numero)} iniciales="AR" activo="portafolio" />
        <main className="ve-bloqueo">
          <div className="kicker">{encargo ? `Encargo ${String(numero).padStart(2, '0')} · ${encargo.meta.titulo}` : 'Taller'}</div>
          <h1>{textos.titulo}</h1>
          <p>{textos.cuerpo}</p>
          <Link className="btn btn-primary" to="/mapa">Volver al mapa</Link>
        </main>
        {dialogoMisDatos}
      </div>
    )
  }

  // La vista de consulta del teléfono va DESPUÉS de comprobar el acceso: una actividad cerrada
  // tampoco muestra sus instrucciones en el teléfono.
  if (vistaConsulta) {
    return (
      <VistaConsultaMovil
        encargo={encargo?.meta ?? null}
        dia={diaDeEncargo(numero)}
        previewHtml={previewHtml}
        urlPortafolio={portafolioEjemplo.url}
        onEditarDeTodosModos={() => {
          habilitarEdicionForzada()
          setVistaConsulta(false)
        }}
      />
    )
  }


  return (
    <div className="ve">
      {celebrando && <div className="ve-flash-exito" aria-hidden="true" />}
      <Nav seccion="Portafolio" dia={diaDeEncargo(numero)} iniciales="AR" activo="portafolio" />

      <div
        ref={gridRef}
        className="ve-grid"
        data-encargo={encargoAbierto ? 'abierto' : 'cerrado'}
        data-editor={editorAbierto ? 'abierto' : 'cerrado'}
        data-preview={previewExpandido ? 'expandido' : 'normal'}
      >
        {!encargo ? (
          <section className="ve-col-encargo">
            <p className="text-muted" role="status">Cargando encargo…</p>
          </section>
        ) : (
          <PanelEncargo
            encargo={encargo.meta}
            abierto={encargoAbierto}
            onToggle={() =>
              setEncargoAbierto((v) => {
                try {
                  localStorage.setItem(CLAVE_ENCARGO, v ? '0' : '1')
                } catch {
                  /* almacenamiento no disponible: seguimos sin persistir */
                }
                return !v
              })
            }
          />
        )}

        <div className="ve-col-editor-conjunto">
          {documento && editorAbierto && (
            <EditorEstructura
              estructura={documento.estructura}
              onAgregarFila={() => actualizarEstructura(agregarFila)}
              onAgregarColumna={() => actualizarEstructura(agregarColumna)}
              onEliminarFila={() => {
                const r = eliminarFila(documento.estructura)
                if (r.ok) actualizarEstructura(() => r.valor)
                return r.ok ? null : r.error
              }}
              onEliminarColumna={() => {
                const r = eliminarColumna(documento.estructura)
                if (r.ok) actualizarEstructura(() => r.valor)
                return r.ok ? null : r.error
              }}
              onCrearSeccion={(fi, ci, ff, cf, etq) => {
                const r = crearSeccion(documento, fi, ci, ff, cf, etq)
                if (!r.ok) return r.error
                setContenido(serializarDocumentoJu1(r.valor))
                setEstadoGuardado(prev => ({ ...prev, estado: 'dirty' }))
                return null
              }}
              onExtenderSeccion={(celdaId, fi, ci, ff, cf) => {
                const r = extenderSeccion(documento, celdaId, fi, ci, ff, cf)
                if (!r.ok) return r.error
                setContenido(serializarDocumentoJu1(r.valor))
                setEstadoGuardado(prev => ({ ...prev, estado: 'dirty' }))
                return null
              }}
              onSepararCelda={(celdaId) => {
                setContenido(serializarDocumentoJu1(separarCeldaDelDocumento(documento, celdaId)))
                setEstadoGuardado(prev => ({ ...prev, estado: 'dirty' }))
              }}
              onAbrirSeccion={(nombre) => setArchivoSolicitado({ nombre: `seccion-${nombre}.js`, token: Date.now() })}
              abierto={estructuraAbierta}
              onToggle={() => setEstructuraAbierta((v) => !v)}
            />
          )}
          <EditorPanel
            archivos={archivos}
            onCambio={onChangeContenido}
            cargando={numeroCargado !== numero}
            salida={salida}
            guardado={estadoGuardado}
            ejecutando={ejecutando}
            entregando={entregando}
            onEjecutar={ejecutar}
            onEntregar={entregar}
            abierto={editorAbierto}
            onToggle={() => setEditorAbierto((v) => !v)}
            onEditarDatos={() => setMisDatosAbierto(true)}
            archivoSolicitado={archivoSolicitado}
          />
        </div>

        <DivisorArrastrable gridRef={gridRef} />

        <div className="ve-col-preview">
          <PanelPreview
            url={portafolioEjemplo.url}
            html={previewHtml}
            expandido={previewExpandido}
            onToggleExpandir={() => setPreviewExpandido((v) => !v)}
          />
          {errorEntrega && <p className="auth-message ve-error-entrega" role="alert">{errorEntrega}</p>}
          <PanelRevision resultado={revision} aceptado={aceptado} mensajeAceptado={mensajeAceptado} syncError={estadoGuardado.estado === 'error' || numero in aceptadosPendientes} />
          {posicion && (
            <nav className="ve-navegacion" aria-label="Actividades del día">
              <div className="ve-nav-fila">
                {posicion.anterior ? (
                  <button type="button" className="btn btn-secondary" onClick={() => void irAEncargo(posicion.anterior!.numero)}>
                    ← Actividad anterior<span className="sr-only">: {posicion.anterior.titulo}</span>
                  </button>
                ) : <span />}
                <span className="ve-nav-posicion" aria-current="step">
                  Actividad {posicion.posicion} de {posicion.total}
                </span>
                {siguienteDisponible ? (
                  <button type="button" className="btn btn-primary" onClick={() => void irAEncargo(siguienteDisponible.numero)}>
                    Siguiente actividad →<span className="sr-only">: {siguienteDisponible.titulo}</span>
                  </button>
                ) : codigoDia ? (
                  <button type="button" className="btn btn-secondary" onClick={() => void irADia(codigoDia)}>
                    Ver actividades del día
                  </button>
                ) : <span />}
              </div>
              {posicion.siguiente && !posicion.siguiente.disponible && !siguienteDisponible && (
                <p className="ve-nav-nota">La siguiente actividad de este día todavía no está abierta.</p>
              )}
              {/* Al final del día no se salta solo a ningún lado: se dice qué hay después
                  y el alumno decide. El mapa se vuelve a pedir cada poco, así que en cuanto el
                  docente abre el día siguiente aparece cómo continuar. */}
              {siguePaso?.tipo === 'dia-siguiente' && (
                <div className="ve-nav-dia" role="status">
                  <p>
                    No quedan más actividades abiertas en este día. El <strong>Día {siguePaso.dia.day_number} · {siguePaso.dia.title}</strong> ya está abierto.
                  </p>
                  {siguePaso.destino ? (
                    <button type="button" className="btn btn-primary" onClick={() => void irAEncargo(siguePaso.destino!.numero)}>
                      Continuar con el Día {siguePaso.dia.day_number}: {siguePaso.destino.titulo} →
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={() => void irADia(siguePaso.dia.code)}>
                      Ir al Día {siguePaso.dia.day_number} →
                    </button>
                  )}
                </div>
              )}
              {siguePaso?.tipo === 'dia-bloqueado' && (
                <p className="ve-nav-nota">
                  No quedan más actividades abiertas en este día. El Día {siguePaso.dia.day_number} se abrirá más adelante; mientras tanto puedes volver al <Link to="/mapa">mapa</Link>.
                </p>
              )}
              {siguePaso?.tipo === 'dia-pausado' && (
                <p className="ve-nav-nota">
                  No quedan más actividades abiertas en este día. Tu docente pausó el Día {siguePaso.dia.day_number} por un momento; vuelve al <Link to="/mapa">mapa</Link> para ver lo que tienes abierto.
                </p>
              )}
              {siguePaso?.tipo === 'fin' && (
                <p className="ve-nav-nota">Es la última actividad del taller.</p>
              )}
            </nav>
          )}
        </div>
      </div>

      {dialogoMisDatos}
    </div>
  )
}
