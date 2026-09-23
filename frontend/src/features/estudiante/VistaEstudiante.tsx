import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { api } from '../../lib/api'
import { useAuth } from '../auth/authContext'
import { challengeKeyFromNumero } from '../../lib/challengeIdentity'
import { esVistaDeConsulta, habilitarEdicionForzada } from '../../lib/dispositivo'
import { componerAndamiaje, diaDeEncargo, ENCARGOS, NUMEROS_DE_ENCARGO } from '../../lib/encargos'
import { posicionEnDia, rutaDia, type ActividadDelDia } from '../../lib/navegacionActividades'
import { datosComoTexto, pareceContenidoDeDatos, portafolioEjemplo } from '../../lib/mockEncargo'
import { leerPerfilLegado, olvidarPerfilLegado, perfilComoDatos, perfilDesdeBackend, perfilDelServidorEstaVacio, perfilParaBackend, PERFIL_DEFECTO, type Perfil } from '../../lib/perfil'
import { ejecutarPreview } from '../../lib/sandbox'
import type { EstadoGuardado, ResultadoRevision, SalidaEjecucion } from '../../lib/tipos'
import { PanelEncargo } from '../encargo/PanelEncargo'
import { DivisorArrastrable } from './DivisorArrastrable'
import { EditorPanel } from '../editor/EditorPanel'
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

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

export function VistaEstudiante() {
  return <VistaEstudianteInterna />
}

function VistaEstudianteInterna() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const numero = clamp(Number(params.get('e')) || MIN_ENCARGO, MIN_ENCARGO, MAX_ENCARGO)

  const { data: encargo } = useQuery({
    queryKey: ['encargo', numero],
    queryFn: () => api.encargo(numero),
  })

  const [encargoAbierto, setEncargoAbierto] = useState(leerEncargoAbierto)
  const [editorAbierto, setEditorAbierto] = useState(true)
  const [previewExpandido, setPreviewExpandido] = useState(false)
  const [misDatosAbierto, setMisDatosAbierto] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  // Se evalúa una sola vez al montar (lib/dispositivo.ts): por capacidad del equipo, no por
  // ancho de ventana — una pantalla dividida angosta en una computadora real no debe caer acá.
  const { user, api: clienteApi, session, refresh } = useAuth()
  const [vistaConsulta, setVistaConsulta] = useState(esVistaDeConsulta)

  // Fallback para calcular la posición sin pegarle a la API (o si falla)
  const actividadesDelDia = useMemo(() => {
    const sesionActual = diaDeEncargo(numero)
    return NUMEROS_DE_ENCARGO
      .filter((n) => diaDeEncargo(n) === sesionActual)
      .map((n) => ({
        key: challengeKeyFromNumero(n),
        title: ENCARGOS[n]?.meta.titulo || `Encargo ${n}`,
        unlocked: true,
      }))
  }, [numero])

  // Obtener la sesión real si hay clienteApi
  const { data: sesionActiva } = useQuery({
    queryKey: ['session', diaDeEncargo(numero)],
    queryFn: async () => {
      if (!clienteApi) throw new Error('No api')
      return clienteApi.request<{ challenges: ActividadDelDia[] }>(`/map/sessions/${encodeURIComponent(diaDeEncargo(numero))}`)
    },
    enabled: !!clienteApi,
  })

  const posicion = useMemo(() => {
    const key = challengeKeyFromNumero(numero)
    const retos = sesionActiva?.challenges ?? actividadesDelDia
    return posicionEnDia(retos, key)
  }, [sesionActiva, actividadesDelDia, numero])

  // El perfil sale de Postgres, no del navegador: así es el mismo en cualquier
  // equipo y sobrevive a vaciar el almacenamiento local.
  const perfil: Perfil = useMemo(
    () => (session ? perfilDesdeBackend(session.user) : PERFIL_DEFECTO),
    [session],
  )
  const perfilRef = useRef(perfil)
  perfilRef.current = perfil

  // Migración de una sola vez para quien guardó su perfil cuando vivía en el
  // navegador: se sube, y solo cuando el servidor confirma se borra la copia local.
  const migradoRef = useRef(false)
  useEffect(() => {
    if (migradoRef.current || !session || !clienteApi) return
    const legado = leerPerfilLegado()
    if (!legado) return
    migradoRef.current = true
    if (!perfilDelServidorEstaVacio(session.user)) {
      // El servidor ya tiene perfil propio: manda él y lo heredado se descarta.
      olvidarPerfilLegado()
      return
    }
    void (async () => {
      try {
        await clienteApi.request('/profile', { method: 'PUT', json: perfilParaBackend(legado, session.user) })
        olvidarPerfilLegado()
        await refresh()
      } catch (e) {
        console.error('No se pudo migrar el perfil guardado en este navegador', e)
        migradoRef.current = false
      }
    })()
  }, [session, clienteApi, refresh])

  const solucionesRef = useRef<Record<number, string>>(leerMapa(CLAVE_SOLUCIONES))
  const borradoresRef = useRef<Record<number, string>>(leerMapa(CLAVE_BORRADORES))
  const numeroAnteriorRef = useRef<number | null>(null)

  const [contenido, setContenido] = useState('')
  const contenidoRef = useRef('')
  contenidoRef.current = contenido

  const [salida, setSalida] = useState<SalidaEjecucion | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [revision, setRevision] = useState<ResultadoRevision | null>(null)
  const [ejecutando, setEjecutando] = useState(false)
  const [entregando, setEntregando] = useState(false)

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

  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>({ estado: 'saved', intentos: 0 })
  const getProgressReq = useRef(0)
  const numeroRef = useRef(numero)
  useEffect(() => { numeroRef.current = numero }, [numero])

  // Cola para serializar los guardados y evitar carreras de red.
  const saveChainRef = useRef<Promise<void>>(Promise.resolve())

  const [progressStatus, setProgressStatus] = useState<string>('not_started')

  const flushPendiente = async () => {
    // Si está sucio el actual, lo encolamos para guardarlo.
    if (user && contenidoRef.current && estadoGuardado.estado === 'dirty') {
      setEstadoGuardado(prev => ({ ...prev, estado: 'saving' }))
      const numSave = numero
      const cont = contenidoRef.current
      saveChainRef.current = saveChainRef.current.catch(() => {}).then(async () => {
        try {
          await api.autoguardar(clienteApi, numSave, cont)
          if (numSave === numeroRef.current) setEstadoGuardado(prev => ({ ...prev, estado: 'saved' }))
        } catch {
          if (numSave === numeroRef.current) setEstadoGuardado(prev => ({ ...prev, estado: 'error' }))
        }
      })
    }
    // Esperamos a que todo lo encolado termine (incluyendo el posible dirty anterior)
    await saveChainRef.current.catch(() => {})
  }

  const irAEncargo = async (n: number) => {
    await flushPendiente()
    setParams((p) => {
      p.set('e', String(n))
      return p
    })
  }

  // Al cambiar de encargo: guardar el borrador del que se sale y cargar el que entra.
  useEffect(() => {
    if (!encargo) return
    const anterior = numeroAnteriorRef.current
    if (anterior != null && anterior !== numero) {
      borradoresRef.current[anterior] = contenidoRef.current
      persistir(CLAVE_BORRADORES, borradoresRef.current)
      if (user && contenidoRef.current && estadoGuardado.estado === 'dirty') {
         void api.autoguardar(clienteApi, anterior, contenidoRef.current)
      }
    }
    numeroAnteriorRef.current = numero

    let fallbackLocal: string | undefined = borradoresRef.current[numero]
    if (user) {
      const fallbackExt = localStorage.getItem(`tutorias:draft:${user.uid}:${challengeKeyFromNumero(numero)}`)
      if (fallbackExt) fallbackLocal = fallbackExt
    }
    // Un bug de Monaco (arreglado en EditorPanel.tsx) podía autoguardar el contenido de
    // datos.js como si fuera el borrador de portafolio.js. Lo que ya haya quedado guardado
    // así (de antes del arreglo) se descarta acá en vez de mostrárselo al estudiante.
    if (fallbackLocal && pareceContenidoDeDatos(fallbackLocal)) fallbackLocal = undefined

    const setInitialCode = (code: string) => {
      setContenido(code)
      setEstadoGuardado(prev => ({ ...prev, estado: 'saved' }))
      setSalida(null)
      setRevision(null)
      if (encargo.heredaDe != null) {
        const d = { ...perfilComoDatos(perfilRef.current), ...encargo.datosOverride }
        void ejecutarPreview(code, d).then((r) => {
          if (r.ok) setPreviewHtml(r.html)
        })
      } else {
        setPreviewHtml('')
      }
    }

    let cancelled = false
    if (user) {
      const reqId = ++getProgressReq.current
      api.getProgress(clienteApi, numero).then(res => {
         if (cancelled || reqId !== getProgressReq.current) return
         setProgressStatus(res.status)
         if (res.status === 'accepted') {
           setEstadoGuardado(prev => ({ ...prev, estado: 'saved' }))
         }
         // Un bug de Monaco (arreglado en EditorPanel.tsx) podía autoguardar el contenido de
         // datos.js como si fuera el borrador de portafolio.js — lo que ya haya quedado
         // guardado así en el backend se descarta acá en vez de mostrárselo al estudiante.
         if (res.draft_code && !pareceContenidoDeDatos(res.draft_code)) {
             setInitialCode(res.draft_code)
         } else {
             setInitialCode(fallbackLocal ?? componerAndamiaje(numero, solucionesRef.current))
         }
         // Set revision after initial code because initial code clears it!
         if (res.status === 'accepted') {
           setRevision({ 
             ok: true, 
             casosPasados: res.cases_passed ?? 0, 
             casosTotales: res.cases_total ?? 0, 
             casos: [], 
             htmlPreview: '', 
             logs: [] 
           })
         }
      }).catch(() => {
         if (cancelled || reqId !== getProgressReq.current) return
         setInitialCode(fallbackLocal ?? componerAndamiaje(numero, solucionesRef.current))
      })
    } else {
      setInitialCode(fallbackLocal ?? componerAndamiaje(numero, solucionesRef.current))
    }
    return () => { cancelled = true }
  }, [numero, encargo, user, clienteApi])

  const ejecutar = useCallback(async () => {
    setEjecutando(true)
    const r = await ejecutarPreview(contenido, datos)
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
      })
    }
  }, [contenido, datos])

  const entregar = useCallback(async () => {
    setEntregando(true)
    const r = await api.entregarARevision(clienteApi, numero, contenido, datos)
    setRevision(r)
    setEntregando(false)
    setEstadoGuardado(prev => ({ ...prev, intentos: prev.intentos + 1 }))
    
    if (r.casosPasados === r.casosTotales && user && clienteApi) {
      try {
        await clienteApi.request(`/challenges/${challengeKeyFromNumero(numero)}/progress`, {
          method: 'PUT',
          json: { 
            draft_code: contenido, 
            status: 'accepted',
            cases_passed: r.casosPasados,
            cases_total: r.casosTotales
          }
        })
        setProgressStatus('accepted')
      } catch (e) {
        console.error('Error al persistir accepted', e)
        setEstadoGuardado(prev => ({ ...prev, estado: 'error' }))
      }
    }
  }, [contenido, datos, numero, clienteApi, user])

  // Al guardar "Mis datos": refrescar la preview para que se vea el cambio de una.
  useEffect(() => {
    if (previewHtml) void ejecutar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil])

  // Autoguardado + cache del borrador del encargo actual.
  useEffect(() => {
    if (!contenido) return
    if (estadoGuardado.estado === 'saved') {
      // Evitar que el setInitialCode dispare un dirty
      return
    }
    const t = setTimeout(() => {
      setEstadoGuardado(prev => ({ ...prev, estado: 'saving' }))
      if (user) {
        const numSave = numero
        const cont = contenido
        saveChainRef.current = saveChainRef.current.catch(() => {}).then(async () => {
          try {
            await api.autoguardar(clienteApi, numSave, cont)
            if (numSave === numeroRef.current) setEstadoGuardado(prev => ({ ...prev, estado: 'saved' }))
          } catch {
            if (numSave === numeroRef.current) setEstadoGuardado(prev => ({ ...prev, estado: 'error' }))
          }
        })
        localStorage.setItem(`tutorias:draft:${user.uid}:${challengeKeyFromNumero(numero)}`, contenido)
      } else {
        setEstadoGuardado(prev => ({ ...prev, estado: 'saved' }))
      }
      borradoresRef.current[numero] = contenido
      persistir(CLAVE_BORRADORES, borradoresRef.current)
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenido, numero, user, clienteApi])

  const onChangeContenido = useCallback((v: string) => {
    setContenido(v)
    setEstadoGuardado(prev => ({ ...prev, estado: 'dirty' }))
  }, [])

  const aceptado = progressStatus === 'accepted' || (!!revision && revision.casosPasados === revision.casosTotales)
  const esUltimo = numero >= MAX_ENCARGO

  // Al aceptar: guardar la solución (para heredarla)
  useEffect(() => {
    if (!aceptado) return
    solucionesRef.current[numero] = contenidoRef.current
    borradoresRef.current[numero] = contenidoRef.current
    persistir(CLAVE_SOLUCIONES, solucionesRef.current)
    persistir(CLAVE_BORRADORES, borradoresRef.current)
  }, [aceptado, numero])

  const mensajeAceptado =
    aceptado && esUltimo ? 'Terminaste el último encargo. Tu portafolio está completo.' : ''

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
            <p className="text-muted">Cargando encargo…</p>
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

        <EditorPanel
          numero={numero}
          archivos={[{ nombre: 'portafolio.js', soloLectura: false, contenido }, archivoDatos]}
          contenido={contenido}
          onCambio={onChangeContenido}
          salida={salida}
          guardado={estadoGuardado}
          ejecutando={ejecutando}
          entregando={entregando}
          onEjecutar={ejecutar}
          onEntregar={entregar}
          abierto={editorAbierto}
          onToggle={() => setEditorAbierto((v) => !v)}
          onEditarDatos={() => setMisDatosAbierto(true)}
        />

        <DivisorArrastrable gridRef={gridRef} />

        <div className="ve-col-preview">
          <PanelPreview
            url={portafolioEjemplo.url}
            html={previewHtml}
            expandido={previewExpandido}
            onToggleExpandir={() => setPreviewExpandido((v) => !v)}
          />
          <PanelRevision resultado={revision} aceptado={aceptado} mensajeAceptado={mensajeAceptado} syncError={estadoGuardado.estado === 'error'} />
          {posicion && (
            <div className="ve-navegacion">
              {posicion.anterior ? (
                <button className="btn btn-outline" onClick={() => irAEncargo(posicion.anterior!.numero)}>
                  ← Anterior
                </button>
              ) : <div></div>}
              {posicion.siguiente ? (
                <button className="btn btn-outline" onClick={() => irAEncargo(posicion.siguiente!.numero)}>
                  Siguiente →
                </button>
              ) : (
                <button
                  className="btn btn-outline"
                  onClick={async () => {
                    await flushPendiente()
                    navigate(rutaDia(diaDeEncargo(numero)))
                  }}
                >
                  Ver actividades del día
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {misDatosAbierto && (
        <MisDatos
          perfil={perfil}
          onGuardar={(p) => {
            if (!clienteApi || !session) return
            void (async () => {
              try {
                await clienteApi.request('/profile', { method: 'PUT', json: perfilParaBackend(p, session.user) })
                await refresh()
              } catch (e) {
                console.error('No se pudo guardar el perfil', e)
              }
            })()
          }}
          onCerrar={() => setMisDatosAbierto(false)}
        />
      )}
    </div>
  )
}
