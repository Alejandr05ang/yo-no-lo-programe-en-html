import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { alternarPausa, estado as estadoMusica, iniciar } from '../../lib/musica'
import { useAuth } from '../auth/authContext'
import { api } from '../../lib/api'
import { BarraDemo, type ModoDemo } from './BarraDemo'
import './demo-nivel.css'

const CLAVE_DEMO = 'tutorias:demo:'
const claveLocal = (uid: string | null) => CLAVE_DEMO + (uid ?? 'anon')

export function DemoNivel() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const auth = useAuth()
  const navigate = useNavigate()
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [modo, setModo] = useState<ModoDemo>('build')
  const [guardado, setGuardado] = useState<string | null>(null)

  const sendToIframe = useCallback((type: string, payload?: unknown) => {
    // El iframe corre con sandbox="allow-scripts", así que su origen es opaco:
    // '*' es el único targetOrigin posible. Del otro lado se valida e.source.
    iframeRef.current?.contentWindow?.postMessage({ source: 'demo-parent', type, ...(payload as object) }, '*')
  }, [])

  // Cargar progreso inicial
  useEffect(() => {
    if (!iframeLoaded) return

    const loadProgress = async () => {
      let stateToRestore = null

      if (auth.user) {
        try {
          const res = await api.getDemoProgress()
          if (res.state && Object.keys(res.state).length > 0) {
            stateToRestore = res.state
          }
        } catch (e) {
          console.error('Error cargando demo progress, usando local fallback', e)
          const local = localStorage.getItem(claveLocal(auth.user.uid))
          if (local) stateToRestore = JSON.parse(local).state
        }
      } else {
        const local = localStorage.getItem(claveLocal(null))
        if (local) stateToRestore = JSON.parse(local).state
      }

      if (stateToRestore) {
        sendToIframe('restore-state', { payload: { state: stateToRestore } })
      }
    }

    void loadProgress()
  }, [iframeLoaded, auth.user, sendToIframe])

  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
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
        const payload = e.data.payload
        setGuardado('Guardando…')

        // Guardar local
        localStorage.setItem(claveLocal(auth.user?.uid ?? null), JSON.stringify(payload))

        // Debounce backend save
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

        if (auth.user) {
          saveTimeoutRef.current = setTimeout(async () => {
            try {
              await api.updateDemoProgress(payload)
              setGuardado('Guardado ✓')
            } catch (err) {
              console.error('Error guardando en backend', err)
              setGuardado('Pendiente de sincronizar')
            }
          }, 1000)
        } else {
          setGuardado('Guardado en este equipo')
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [auth.user])

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  }, [])

  const pedirModo = useCallback((siguiente: ModoDemo) => {
    // El iframe es el dueño del motor: se le pide el cambio y él confirma
    // con mode-changed. No adelantamos el estado del selector.
    sendToIframe('set-mode', { mode: siguiente })
  }, [sendToIframe])

  const salir = useCallback(async () => {
    const uid = auth.user?.uid ?? null // capturar antes: tras signOut ya no está
    await auth.signOut()
    if (uid) localStorage.removeItem(claveLocal(uid))
    navigate('/login', { replace: true })
  }, [auth, navigate])

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
