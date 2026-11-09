// Redare audio: fișierele generate de `npm run audio` (public/audio/<lecție>/<id>.m4a),
// cu rezervă pe vocea germană a browserului doar dacă fișierul lipsește.
//
// Folosim UN SINGUR element <audio> pentru tot: Safari permite redarea automată
// (următoarea replică dintr-o secvență) doar pe un element deja „deblocat” de un click.

let player: HTMLAudioElement | null = null
let pending: (() => void) | null = null // rezolvă promisiunea redării curente
let req = 0 // id-ul cererii curente; evenimentele vechi sunt ignorate
let seq = 0 // id-ul secvenței curente (Ascultă tot)

function getPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio()
    player.preload = 'auto'
  }
  return player
}

export function audioUrl(lessonId: string, id: string) {
  return `${import.meta.env.BASE_URL}audio/${lessonId}/${id}.m4a`
}

// Viteza pentru 🐢: browserul încetinește audio fără să schimbe tonul vocii.
// (Vocile Premium din macOS aproape ignoră viteza cerută la generare.)
const SLOW_KEY = 'deutsch-intensiv-slow-rate'
export const SLOW_RATES = [0.5, 0.6, 0.7, 0.8, 0.9]

export function getSlowRate(): number {
  try {
    const v = Number(localStorage.getItem(SLOW_KEY))
    if (SLOW_RATES.includes(v)) return v
  } catch {
    /* stocare indisponibilă */
  }
  return 0.7
}

export function setSlowRate(v: number) {
  try {
    localStorage.setItem(SLOW_KEY, String(v))
  } catch {
    /* ignorăm */
  }
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('de'))
  return (
    voices.find((v) => /premium|enhanced/i.test(v.name)) ??
    voices.find((v) => /anna|petra|markus/i.test(v.name)) ??
    voices[0]
  )
}

export function speak(text: string, slow = false): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve()
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'de-DE'
    const v = pickVoice()
    if (v) u.voice = v
    u.rate = slow ? 0.7 : 0.95
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

/** Oprește orice sunet și închide promisiunea redării curente. */
function haltCurrent() {
  req++
  const p = player
  if (p && !p.paused) p.pause()
  if ('speechSynthesis' in window) speechSynthesis.cancel()
  const done = pending
  pending = null
  done?.()
}

function playRaw(lessonId: string, id: string, text: string, slow: boolean): Promise<void> {
  haltCurrent()
  const mine = req
  const a = getPlayer()
  return new Promise<void>((resolve) => {
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      a.onended = null
      a.onerror = null
      if (pending === finish) pending = null
      resolve()
    }
    pending = finish
    a.onended = () => {
      if (mine === req) finish()
    }
    // Doar dacă fișierul nu se poate încărca (lipsă / format) folosim vocea browserului.
    a.onerror = () => {
      if (mine !== req) return
      a.onended = null
      a.onerror = null
      speak(text, slow).then(finish)
    }
    a.src = audioUrl(lessonId, id)
    // după schimbarea src, viteza revine la defaultPlaybackRate, așa că le setăm pe amândouă
    const rate = slow ? getSlowRate() : 1
    a.defaultPlaybackRate = rate
    a.playbackRate = rate
    a.preservesPitch = true
    a.currentTime = 0
    a.play().catch((e: DOMException) => {
      if (mine !== req) return // a fost întreruptă de o redare nouă – normal
      if (e.name === 'NotAllowedError') {
        // browserul a blocat redarea automată: oprim secvența, fără suprapuneri
        seq++
        finish()
      }
      // alte erori (ex. fișier lipsă) ajung în onerror
    })
  })
}

export function stopAll() {
  seq++
  haltCurrent()
}

export function play(lessonId: string, id: string, text: string, slow = false) {
  seq++
  return playRaw(lessonId, id, text, slow)
}

/** Redă mai multe fragmente la rând; se oprește la stopAll() sau la alt play(). */
export async function playSequence(
  lessonId: string,
  items: { id: string; text: string }[],
  slow: boolean,
  onItem?: (id: string | null) => void,
) {
  const mine = ++seq
  lastSequence = mine
  for (const it of items) {
    if (mine !== seq) break
    onItem?.(it.id)
    await playRaw(lessonId, it.id, it.text, slow)
    if (mine !== seq) break
    await new Promise((r) => setTimeout(r, slow ? 700 : 450))
  }
  // ștergem evidențierea, dacă între timp n-a pornit altă secvență
  if (lastSequence === mine) onItem?.(null)
}

let lastSequence = 0
