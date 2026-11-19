// Ecranul rămâne aprins cât timp aplicația e deschisă și vizibilă (Screen Wake Lock API).
// Browserul eliberează blocarea când pagina e ascunsă; o cerem din nou la revenire.

const KEY = 'deutsch-wake-lock'

type Sentinel = { release(): Promise<void>; addEventListener(t: 'release', f: () => void): void }
type WakeLockApi = { request(type: 'screen'): Promise<Sentinel> }

const api = (): WakeLockApi | undefined => (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock

let sentinel: Sentinel | null = null
let started = false
let choice: boolean | null = null // setarea din sesiunea curentă (dacă localStorage nu merge)

export const wakeLockSupported = () => !!api()

export function getKeepAwake(): boolean {
  if (choice !== null) return choice
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

async function acquire() {
  const wl = api()
  if (!wl || sentinel || !getKeepAwake() || document.visibilityState !== 'visible') return
  try {
    const s = await wl.request('screen')
    sentinel = s
    s.addEventListener('release', () => {
      if (sentinel === s) sentinel = null
    })
  } catch {
    /* refuzat (ex. baterie descărcată) – reîncercăm la următoarea revenire în aplicație */
  }
}

async function releaseLock() {
  const s = sentinel
  sentinel = null
  try {
    await s?.release()
  } catch {
    /* deja eliberat */
  }
}

export function setKeepAwake(on: boolean) {
  choice = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* stocare indisponibilă – setarea ține doar până la închidere */
  }
  if (on) acquire()
  else releaseLock()
}

export function startKeepAwake() {
  if (started || !api()) return
  started = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') acquire()
  })
  // Unele browsere cer o atingere înainte de prima blocare.
  document.addEventListener('pointerdown', () => acquire(), { passive: true })
  acquire()
}
