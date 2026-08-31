// Música de fondo. Un solo <audio> vivo fuera del árbol de React, para que siga sonando
// al navegar entre pantallas (la app es una SPA: los cambios de ruta NO recargan).
// - `iniciar()` se llama desde el clic de "Entrar al taller" / "Continuar" (el gesto habilita el audio).
// - al RECARGAR (F5) el navegador exige un gesto nuevo: `reanudar()` restaura el estado (tema,
//   posición) y deja la música PAUSADA. Vuelve a sonar con UN clic en el ícono (pausadoPorRecarga).

export interface Pista {
  archivo: string
  titulo: string
}

// Los archivos viven en frontend/public/music/ (ver ese README). Se sirven en /music/*.
export const PISTAS: Pista[] = [
  { archivo: 'casiopea-sunny-side-feelin.mp3', titulo: "Casiopea — Sunny Side Feelin'" },
  { archivo: '199x.mp3', titulo: '199X' },
  { archivo: 'a-place-in-the-sun.mp3', titulo: 'A Place In The Sun' },
  { archivo: 'breezin.mp3', titulo: "Breezin'" },
  { archivo: 'brasilian-skies.mp3', titulo: 'Brasilian Skies' },
  { archivo: 'delvon-lamarr-move-on-up.mp3', titulo: 'Delvon Lamarr Organ Trio — Move On Up' },
  { archivo: 'double-trouble.mp3', titulo: 'Double Trouble' },
  { archivo: 'first-light.mp3', titulo: 'First Light' },
  { archivo: 'jamiroquai-travelling-without-moving.mp3', titulo: 'Jamiroquai — Travelling Without Moving' },
  { archivo: 'light-of-the-world-petes-crusade.mp3', titulo: "Light Of The World — Pete's Crusade" },
  { archivo: 'oh-tengo-suerte.mp3', titulo: 'Oh! Tengo Suerte' },
  { archivo: 'ready-to-fly.mp3', titulo: 'Ready To Fly' },
  { archivo: 'spectrum-f-l-y.mp3', titulo: 'Spectrum — F-L-Y' },
  { archivo: 'str4ta-rhythm-in-your-mind.mp3', titulo: 'STR4TA — Rhythm In Your Mind' },
  { archivo: 'tatsuro-yamashita-kiska.mp3', titulo: 'Tatsuro Yamashita — Kiska (1978)' },
  { archivo: 'this-is-all-i-have-for-you.mp3', titulo: 'This Is All I Have For You' },
  { archivo: 'hi-fi-set-sky-restaurant.mp3', titulo: 'ハイ・ファイ・セット — スカイレストラン (1975)' },
  { archivo: 'funky-motion.mp3', titulo: 'ファンキー・モーション' },
  { archivo: 'hoshikuzu.mp3', titulo: '星くず' },
  { archivo: 'hong-kong-love-song.mp3', titulo: '香港戀歌' },
  { archivo: 'breeze.mp3', titulo: 'ブリーズ' },
  { archivo: 'jun-fukamachi-on-the-move.mp3', titulo: 'Jun Fukamachi — On The Move' },
  { archivo: 'just-the-way-you-are.mp3', titulo: 'Just The Way You Are' },
  { archivo: 'kimiko-kasai-japan-jazz-live.mp3', titulo: '笠井紀美子 Kimiko Kasai Band — Japan Jazz Live' },
  { archivo: 'kingo-hamada-dakareni-kita-onna.mp3', titulo: 'Kingo Hamada — 抱かれに来た女' },
  { archivo: 'mambo-jambo.mp3', titulo: 'Mambo Jambo' },
  { archivo: 'masaru-imada-nowin.mp3', titulo: 'Masaru Imada — Nowin' },
  { archivo: 'masayoshi-takanaka-sayonara-fuji-san.mp3', titulo: 'Masayoshi Takanaka — サヨナラ…FUJIさん' },
  { archivo: 'painted-paradise.mp3', titulo: 'ペインテッド・パラダイス' },
]

const CLAVE = 've:musica'
const BASE_MUSICA =
  import.meta.env.VITE_MUSICA_URL || `${import.meta.env.BASE_URL || '/'}music/`

interface Guardado {
  activa: boolean
  muteada: boolean
  cola: number[]
  pos: number
  t: number
}

let audio: HTMLAudioElement | null = null
let cola: number[] = []
let pos = 0
let pausadoPorRecarga = false
let quitarGesto = () => {}
const escuchas = new Set<() => void>()
let snap = { activa: false, sonando: false, muteada: false, pausadoPorRecarga: false, titulo: '' }

function notificar() {
  const n = {
    activa: !!audio,
    sonando: !!audio && !audio.paused,
    muteada: !!audio && audio.muted,
    pausadoPorRecarga,
    titulo: audio ? PISTAS[cola[pos]]?.titulo ?? '' : '',
  }
  if (
    n.activa !== snap.activa ||
    n.sonando !== snap.sonando ||
    n.muteada !== snap.muteada ||
    n.pausadoPorRecarga !== snap.pausadoPorRecarga ||
    n.titulo !== snap.titulo
  ) {
    snap = n
  }
  escuchas.forEach((f) => f())
}

export function suscribir(f: () => void): () => void {
  escuchas.add(f)
  return () => escuchas.delete(f)
}

export function estado() {
  return snap
}

function mezclar(): number[] {
  const a = PISTAS.map((_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function guardar() {
  if (!audio) return
  const g: Guardado = {
    activa: true,
    muteada: audio.muted,
    cola,
    pos,
    t: audio.currentTime || 0,
  }
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g))
  } catch {
    /* sin almacenamiento */
  }
}

function leerGuardado(): Guardado | null {
  try {
    const raw = localStorage.getItem(CLAVE)
    return raw ? (JSON.parse(raw) as Guardado) : null
  } catch {
    return null
  }
}

function cargarPista(t = 0) {
  if (!audio) return
  audio.src = `${BASE_MUSICA}${PISTAS[cola[pos]].archivo}`
  if (t > 0) {
    audio.addEventListener('loadedmetadata', function ir() {
      audio?.removeEventListener('loadedmetadata', ir)
      if (audio) audio.currentTime = Math.min(t, audio.duration - 1 || t)
    })
  }
}

function destruirAudio() {
  if (audio) {
    audio.pause()
    audio.src = ''
    audio.load()
    audio = null
  }
}

function crearAudio(muteada: boolean) {
  destruirAudio() // nunca dos <audio> a la vez
  audio = new Audio()
  audio.volume = 0.32
  audio.muted = muteada
  audio.addEventListener('ended', siguiente)
  audio.addEventListener('play', notificar)
  audio.addEventListener('pause', notificar)
  let fallos = 0
  audio.addEventListener('playing', () => {
    fallos = 0
    if (pausadoPorRecarga) {
      pausadoPorRecarga = false
      notificar()
    }
  })
  audio.addEventListener('error', () => {
    if (++fallos > 3) {
      audio?.pause()
      notificar()
      return
    }
    siguiente()
  })
  let ultimo = 0
  audio.addEventListener('timeupdate', () => {
    const ahora = Date.now()
    if (ahora - ultimo > 3000) {
      ultimo = ahora
      guardar()
    }
  })
}

/** Arranca la música (llamar desde un onClick — el gesto del usuario habilita el audio). */
export function iniciar() {
  pausadoPorRecarga = false
  if (audio) {
    void audio.play().catch(() => {})
    notificar()
    return
  }
  crearAudio(leerGuardado()?.muteada ?? false)
  cola = mezclar()
  pos = 0
  cargarPista()
  void audio!.play().catch(() => {})
  guardar()
  notificar()
}

export function siguiente() {
  if (!audio) return
  pausadoPorRecarga = false
  pos += 1
  if (pos >= cola.length) {
    cola = mezclar()
    pos = 0
  }
  cargarPista()
  void audio.play().catch(() => {})
  guardar()
  notificar()
}

export function alternarPausa() {
  if (!audio) return
  pausadoPorRecarga = false
  if (audio.paused) void audio.play().catch(() => {})
  else audio.pause()
  notificar()
}

export function alternarMute() {
  if (!audio) return
  audio.muted = !audio.muted
  guardar()
  notificar()
}

export function detener() {
  destruirAudio()
  quitarGesto()
  pausadoPorRecarga = false
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    /* nada */
  }
  notificar()
}

/** Al cargar la app: si había música, restaurar el estado. El navegador exige un gesto
 *  para volver a sonar tras un F5 — se retoma en el PRIMER clic o tecla del usuario en
 *  cualquier parte (DeepSeek "solución 2"). Si media-engagement lo permite, suena solo. */
function reanudar() {
  if (audio) return
  const g = leerGuardado()
  if (!g?.activa) return
  crearAudio(g.muteada)
  cola = g.cola?.length === PISTAS.length ? g.cola : mezclar()
  pos = Number.isInteger(g.pos) && g.pos < cola.length ? g.pos : 0
  cargarPista(g.t)
  pausadoPorRecarga = true
  notificar()

  void audio!.play().catch(() => {}) // por si el navegador lo permite

  const alGesto = () => {
    quitarGesto()
    if (pausadoPorRecarga && audio?.paused) void audio.play().catch(() => {})
  }
  quitarGesto = () => {
    document.removeEventListener('pointerdown', alGesto, true)
    document.removeEventListener('keydown', alGesto, true)
    quitarGesto = () => {}
  }
  document.addEventListener('pointerdown', alGesto, true)
  document.addEventListener('keydown', alGesto, true)
}

reanudar()

// En desarrollo, si Vite recarga este módulo en caliente, frenar el audio viejo
// (si no, quedan dos <audio> sonando a la vez).
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    destruirAudio()
    quitarGesto()
    escuchas.clear()
  })
}
