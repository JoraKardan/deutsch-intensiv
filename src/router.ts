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
