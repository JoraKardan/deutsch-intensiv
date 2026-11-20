// Limba interfeței și a traducerilor (germana rămâne aceeași).
// Se alege o dată (bara de sus sau linkul ?lang=ru) și se ține în localStorage.
// Schimbarea limbii reîncarcă pagina: conținutul și textele se calculează la pornire.

export type Lang = 'ro' | 'ru'
export const LANGS: Lang[] = ['ro', 'ru']

const KEY = 'deutsch-intensiv-lang'

function detect(): Lang {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    if (fromUrl === 'ro' || fromUrl === 'ru') {
      localStorage.setItem(KEY, fromUrl)
      return fromUrl
    }
    const saved = localStorage.getItem(KEY)
    if (saved === 'ro' || saved === 'ru') return saved
  } catch {
    /* stocare indisponibilă */
  }
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'ro'
}

export const lang: Lang = typeof window === 'undefined' ? 'ro' : detect()

export function setLang(l: Lang) {
  if (l === lang) return
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* stocare indisponibilă */
  }
  const url = new URL(window.location.href)
  url.searchParams.delete('lang')
  window.location.replace(url.toString())
}

/** Pluralul rusesc: 1 карточка, 2 карточки, 5 карточек. */
export function ruPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export const locale = lang === 'ru' ? 'ru-RU' : 'ro-RO'
