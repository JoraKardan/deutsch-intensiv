import { useSyncExternalStore } from 'react'

const getHash = () => window.location.hash.replace(/^#/, '') || '/'

export function useRoute(): string[] {
  const hash = useSyncExternalStore(
    (cb) => {
      window.addEventListener('hashchange', cb)
      return () => window.removeEventListener('hashchange', cb)
    },
    getHash,
  )
  return hash.split('/').filter(Boolean)
}

export const go = (path: string) => {
  window.location.hash = path
}

// Roata dințată e un comutator: din Setări, a doua apăsare te duce înapoi unde erai.
// Pagina de dinainte se ține în sessionStorage, ca să supraviețuiască reîncărcării
// (schimbarea limbii reîncarcă aplicația).
const BACK_KEY = 'deutsch-intensiv-before-settings'
let beforeSettings = '#/'
if (typeof window !== 'undefined') {
  try {
    beforeSettings = sessionStorage.getItem(BACK_KEY) ?? '#/'
  } catch {
    /* stocare indisponibilă */
  }
  const remember = () => {
    if (getHash().startsWith('/settings')) return
    beforeSettings = window.location.hash || '#/'
    try {
      sessionStorage.setItem(BACK_KEY, beforeSettings)
    } catch {
      /* stocare indisponibilă */
    }
  }
  remember()
  window.addEventListener('hashchange', remember)
}

/** Unde duce roata dințată: în Setări dacă nu ești acolo, altfel înapoi la pagina dinainte. */
export const settingsHref = () => (getHash().startsWith('/settings') ? beforeSettings : '#/settings')
