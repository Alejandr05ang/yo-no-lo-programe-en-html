import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { alternarPausa, estado as estadoMusica, iniciar } from '../../lib/musica'
import { ControlesMusica } from '../musica/ControlesMusica'
import { useAuth } from '../auth/authContext'
import { api } from '../../lib/api'
import './demo-nivel.css'

export function DemoNivel() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const auth = useAuth()
  const navigate = useNavigate()
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const sendToIframe = (type: string, payload?: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { source: 'demo-parent', type, payload },
        '*'
      )
    }
  }

  // Enviar estado de auth cuando carga el iframe o cambia auth
  useEffect(() => {
    if (iframeLoaded) {
      sendToIframe('set-auth-state', { authenticated: !!auth.user })
    }
  }, [iframeLoaded, auth.user])

  // Cargar progreso inicial
  useEffect(() => {
    if (!iframeLoaded) return

    const loadProgress = async () => {
      let stateToRestore = null
      
      if (auth.user) {
        try {
          const res = await api.getDemoProgress()
          if (res.data && res.state && Object.keys(res.state).length > 0) {
            stateToRestore = res.state
          }
        } catch (e) {
          console.error("Error cargando demo progress, usando local fallback", e)
          const local = localStorage.getItem(		`tutorias:demo:` + auth.user.uid)
          if (local) stateToRestore = JSON.parse(local).state
        }
      } else {
        const local = localStorage.getItem('t	`tutorias:demo:`anon')
        if (local) stateToRestore = JSON.parse(local).state
      }

      if (stateToRestore) {
        sendToIframe('restore-state', { state: stateToRestore })
      }
    }
    
    loadProgress()
  }, [iframeLoaded, auth.user])

  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return
      if (e.data?.source !== 'nivel-demo') return

      if (e.data.type === 'interaccion') {
        const s = estadoMusica()
        if (!s.activa) {
          iniciar()
        } else if (s.pausadoPorRecarga) {
          alternarPausa()
        }
      } else if (e.data.type === 'go-account') {
        navigate('/cuenta')
      } else if (e.data.type === 'logout') {
        await auth.signOut()
        localStorage.removeItem(		`tutorias:demo:` + (auth.user?.uid || ''))
        navigate('/login', { replace: true })
      } else if (e.data.type === 'state-changed') {
        const payload = e.data.payload
        sendToIframe('save-status', { text: 'Guardando...' })
        
        // Guardar local
        const storageKey = auth.user ? 		`tutorias:demo:` + auth.user.uid : 't	`tutorias:demo:`anon'
        localStorage.setItem(storageKey, JSON.stringify(payload))
        
        // Debounce backend save
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        
        if (auth.user) {
          saveTimeoutRef.current = setTimeout(async () => {
            try {
              await api.updateDemoProgress(payload)
              sendToIframe('save-status', { text: 'Guardado' })
            } catch (err) {
              console.error('Error guardando en backend', err)
              sendToIframe('save-status', { text: 'Guardado localmente (sin red)' })
            }
          }, 1000)
        } else {
           sendToIframe('save-status', { text: 'Guardado (Invitado)' })
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [auth, navigate])

  return (
    <div className="demo-nivel">
      <div className="demo-nivel__musica">
        <ControlesMusica />
      </div>
      <iframe
        ref={iframeRef}
        onLoad={() => setIframeLoaded(true)}
        className="demo-nivel__frame"
        src="/nivel-demo.html"
        title="Constructor de niveles Ã¢â‚¬â€ Demo DÃƒÂ­a 1"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}