// Tema: automat (după telefon), luminoasă sau întunecată. Se ține în localStorage.
// CSS: :root[data-theme="light"|"dark"]; fără atribut → după prefers-color-scheme.

export type Theme = 'auto' | 'light' | 'dark'
const KEY = 'deutsch-intensiv-theme'
const BAR = { light: '#FFFCF7', dark: '#262220' }

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'light' || t === 'dark' || t === 'auto') return t
  } catch {
    /* stocare indisponibilă */
  }
  return 'auto'
}

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

function apply(t: Theme) {
  const root = document.documentElement
  if (t === 'auto') delete root.dataset.theme
  else root.dataset.theme = t
  const dark = t === 'dark' || (t === 'auto' && media?.matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? BAR.dark : BAR.light)
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* stocare indisponibilă */
  }
  apply(t)
}

export function startTheme() {
  apply(getTheme())
  media?.addEventListener('change', () => apply(getTheme()))
}
