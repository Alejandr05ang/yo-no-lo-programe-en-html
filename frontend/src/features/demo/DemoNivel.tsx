import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { alternarPausa, estado as estadoMusica, iniciar } from '../../lib/musica'
import { useAuth } from '../auth/authContext'
import { BarraDemo, type ModoDemo } from './BarraDemo'
import {
  borrarLocal,
  elegirRestauracion,
  escribirLocal,
  leerLocal,
  type ProgresoDemo,
} from './demoStorage'
import './demo-nivel.css'

/** Margen tras el último cambio antes de escribir en el servidor. */
const ESPERA_AUTOGUARDADO = 800

export function DemoNivel() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const auth = useAuth()
  const navigate = useNavigate()
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Último progreso que el backend todavía no ha confirmado: cubre tanto la
  // ventana del debounce como un PUT que falló.
  const pendienteRef = useRef<ProgresoDemo | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [modo, setModo] = useState<ModoDemo>('build')
  const [guardado, setGuardado] = useState<string | null>(null)

  const sendToIframe = useCallback((type: string, payload?: unknown) => {
    // El iframe corre con sandbox="allow-scripts", así que su origen es opaco:
    // '*' es el único targetOrigin posible. Del otro lado se valida e.source.
    iframeRef.current?.contentWindow?.postMessage({ source: 'demo-parent', type, ...(payload as object) }, '*')
  }, [])

  // Sube un progreso al backend. El respaldo local se marca sincronizado sólo
  // cuando el servidor confirma, para que un fallo quede registrado como tal.
  const sincronizar = useCallback(async (progreso: ProgresoDemo): Promise<boolean> => {
    const uid = auth.user?.uid ?? null
    if (!auth.user || !auth.api) {
      escribirLocal(uid, progreso, false)
      setGuardado('Guardado en este equipo')
      return false
    }
    setGuardado('Guardando…')
    try {
      await auth.api.request('/demo/progress', { method: 'PUT', json: progreso })
      escribirLocal(uid, progreso, true)
      pendienteRef.current = null
      setGuardado('Guardado ✓')
      return true
    } catch (error) {
      console.error('No se pudo guardar el progreso de la demo', error)
      escribirLocal(uid, progreso, false)
      pendienteRef.current = progreso
      setGuardado('Pendiente de sincronizar')
      return false
    }
  }, [auth.api, auth.user])

  // Carga inicial. Espera a que Firebase resuelva: leer antes significaría
  // tomar el respaldo anónimo y restaurarlo dentro de la sesión de un alumno.
  useEffect(() => {
    if (!iframeLoaded || !auth.initialized) return
    let cancelado = false

    const cargar = async () => {
      const uid = auth.user?.uid ?? null
      const local = leerLocal(uid)
      let backend: ProgresoDemo | null = null

      if (auth.user && auth.api) {
        try {
          backend = await auth.api.request<ProgresoDemo>('/demo/progress')
        } catch (error) {
          console.error('No se pudo leer el progreso de la demo, se usa el respaldo local', error)
        }
      }
      if (cancelado) return

      const { origen, progreso } = elegirRestauracion(backend, local)
      if (progreso) {
        sendToIframe('restore-state', { payload: { state: progreso.state } })
      }
      if (origen === 'local-pendiente' && progreso) {
        // Trabajo que el servidor nunca recibió: reintentarlo al entrar.
        await sincronizar(progreso)
      } else if (origen === 'backend') {
        setGuardado('Guardado ✓')
      }
    }

    void cargar()
    return () => { cancelado = true }
  }, [iframeLoaded, auth.initialized, auth.user, auth.api, sendToIframe, sincronizar])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return
      if (e.data?.source !== 'nivel-demo') return

      if (e.data.type === 'interaccion') {
        // El gesto ocurre dentro del iframe, donde el listener de musica.ts no llega.
        const s = estadoMusica()
        if (!s.activa) {
          iniciar()
        } else if (s.pausadoPorRecarga) {
          alternarPausa()
        }
      } else if (e.data.type === 'mode-changed') {
        setModo(e.data.mode === 'play' ? 'play' : 'build')
      } else if (e.data.type === 'state-changed') {
        const progreso = e.data.payload as ProgresoDemo
        const uid = auth.user?.uid ?? null

        // El respaldo local se escribe ya, sin esperar al debounce: si la
        // pestaña se cierra antes del PUT, el trabajo sigue estando.
        escribirLocal(uid, progreso, false)
        pendienteRef.current = progreso
        setGuardado(auth.user ? 'Guardando…' : 'Guardado en este equipo')

        if (temporizadorRef.current) clearTimeout(temporizadorRef.current)
        if (auth.user) {
          temporizadorRef.current = setTimeout(() => { void sincronizar(progreso) }, ESPERA_AUTOGUARDADO)
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [auth.user, sincronizar])

  // Al recuperar la red, reintentar lo que quedó sin subir.
  useEffect(() => {
    const alVolver = () => {
      const pendiente = pendienteRef.current
      if (pendiente && auth.user) void sincronizar(pendiente)
    }
    window.addEventListener('online', alVolver)
    return () => window.removeEventListener('online', alVolver)
  }, [auth.user, sincronizar])

  useEffect(() => () => {
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current)
  }, [])

  const pedirModo = useCallback((siguiente: ModoDemo) => {
    // El iframe es el dueño del motor: se le pide el cambio y él confirma
    // con mode-changed. No adelantamos el estado del selector.
    sendToIframe('set-mode', { mode: siguiente })
  }, [sendToIframe])

  const salir = useCallback(async () => {
    const uid = auth.user?.uid ?? null // capturar antes: tras signOut ya no está
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current)

    // Cerrar sesión no debe tirar trabajo: primero se intenta dejarlo en el
    // servidor. El respaldo local sólo se borra si allí quedó a salvo; si no,
    // se conserva para reintentarlo en el próximo acceso de este mismo usuario.
    let aSalvo = pendienteRef.current === null
    if (!aSalvo && pendienteRef.current) aSalvo = await sincronizar(pendienteRef.current)

    await auth.signOut()
    if (uid && aSalvo) borrarLocal(uid)
    navigate('/login', { replace: true })
  }, [auth, navigate, sincronizar])

  return (
    <div className="demo-nivel">
      <BarraDemo modo={modo} onModo={pedirModo} guardado={guardado} onSalir={() => void salir()} />
      <iframe
        ref={iframeRef}
        onLoad={() => setIframeLoaded(true)}
        className="demo-nivel__frame"
        src="/nivel-demo.html"
        title="Constructor de niveles — Demo Día 1"
        sandbox="allow-scripts"
      />
    </div>
  )
}
