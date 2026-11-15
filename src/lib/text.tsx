import { Fragment, type ReactNode } from 'react'

/** Normalizare pentru comparare: fără majuscule, punctuație; ä = ae, ß = ss. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[.,!?;:„“”"'’‘»«()…–—\-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const words = (s: string) => normalize(s).split(' ').filter(Boolean)

/** Pentru fiecare cuvânt din țintă: a fost găsit (în ordine) în ce a scris elevul? */
export function matchWords(target: string, typed: string): { word: string; ok: boolean }[] {
  const raw = target.split(/\s+/).filter(Boolean)
  const t = raw.map((w) => normalize(w))
  const u = words(typed)
  const n = t.length
  const m = u.length
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = t[i] && t[i] === u[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const ok = new Array(n).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (t[i] && t[i] === u[j]) {
      ok[i] = true
      i++
      j++
    } else if (L[i + 1][j] >= L[i][j + 1]) i++
    else j++
  }
  return raw.map((word, k) => ({ word, ok: ok[k] || t[k] === '' }))
}

export function similarity(target: string, typed: string): number {
  const r = matchWords(target, typed)
  return r.length ? r.filter((x) => x.ok).length / r.length : 0
}

// ---- Numere în litere → cifre (pentru recunoașterea vocală, care scrie numerele cu cifre) ----

const UNITS: Record<string, number> = {
  null: 0, eins: 1, ein: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sech: 6, sieben: 7, sieb: 7, acht: 8, neun: 9,
}
const TENS: Record<string, number> = {
  zwanzig: 20, dreissig: 30, vierzig: 40, fuenfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90,
}

function below100(s: string): number | null {
  if (s === 'zehn') return 10
  if (s === 'elf') return 11
  if (s === 'zwoelf') return 12
  if (s in TENS) return TENS[s]
  if (s in UNITS) return UNITS[s]
  if (s.endsWith('zehn')) {
    const u = UNITS[s.slice(0, -4)]
    return u !== undefined && u >= 3 ? 10 + u : null
  }
  const k = s.indexOf('und')
  if (k > 0) {
    const u = UNITS[s.slice(0, k)]
    const t = TENS[s.slice(k + 3)]
    return u !== undefined && u > 0 && t !== undefined ? t + u : null
  }
  return null
}

function below1000(s: string): number | null {
  const k = s.indexOf('hundert')
  if (k < 0) return below100(s)
  const h = k === 0 ? 1 : UNITS[s.slice(0, k)]
  if (h === undefined || h === 0) return null
  const rest = s.slice(k + 7)
  const r = rest ? below100(rest) : 0
  return r === null ? null : h * 100 + r
}

/** Valoarea unui număr german scris în litere (normalizat: ae/oe/ue/ss), sau null. „ein/eine” (articol) nu se convertesc. */
export function germanNumber(w: string): number | null {
  if (w === 'ein' || w === 'eine' || w === 'sech' || w === 'sieb') return null
  const k = w.indexOf('tausend')
  if (k < 0) return below1000(w)
  const t = k === 0 ? 1 : below1000(w.slice(0, k))
  if (t === null || t === 0) return null
  const rest = w.slice(k + 7)
  const r = rest ? below1000(rest) : 0
  return r === null ? null : t * 1000 + r
}

/** Un cuvânt normalizat → token-uri de comparat: numerele (în litere sau cifre) devin cifre separate. */
function speechTokens(w: string): string[] {
  if (/^\d+$/.test(w)) return w.split('')
  const n = germanNumber(w)
  return n === null ? [w] : String(n).split('')
}

/** Ca matchWords, dar pentru recunoașterea vocală: „fünfzig” = „50”, „null eins sieben” = „017”, oricum ar fi grupate cifrele. */
export function speechMatch(target: string, heard: string): { word: string; ok: boolean }[] {
  const raw = target.split(/\s+/).filter(Boolean)
  const t: string[] = []
  const owner: number[] = []
  raw.forEach((w, k) =>
    words(w).forEach((nw) =>
      speechTokens(nw).forEach((tok) => {
        t.push(tok)
        owner.push(k)
      }),
    ),
  )
  const u = words(heard).flatMap(speechTokens)
  const n = t.length
  const m = u.length
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = t[i] === u[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const hit = new Array(n).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (t[i] === u[j]) {
      hit[i++] = true
      j++
    } else if (L[i + 1][j] >= L[i][j + 1]) i++
    else j++
  }
  // Un cuvânt e corect dacă toate token-urile lui au fost găsite.
  return raw.map((word, k) => ({ word, ok: owner.every((o, x) => o !== k || hit[x]) }))
}

export function speechSimilarity(target: string, heard: string): number {
  const r = speechMatch(target, heard)
  return r.length ? r.filter((x) => x.ok).length / r.length : 0
}

/** Randează **bold** din textele de conținut. */
export function rich(s: string): ReactNode {
  const parts = s.split('**')
  return parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>))
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Același text, dacă numerele pot fi scrise și cu cifre („21” = „einundzwanzig”, „13:30” = „dreizehn Uhr dreißig” nu, dar „13 Uhr 30” da). */
export function sameWithNumbers(target: string, typed: string): boolean {
  const a = words(target).flatMap(speechTokens)
  const b = words(typed).flatMap(speechTokens)
  return a.length === b.length && a.every((x, i) => x === b[i])
}

/** Numerele din țintă, în forma „21 = einundzwanzig” (pentru corectură, când elevul a scris cu cifre). */
export function numbersSpelled(target: string): string[] {
  return target
    .split(/\s+/)
    .map((w) => w.replace(/[.,!?;:„“”"]/g, ''))
    .filter((w) => w && germanNumber(words(w)[0] ?? '') !== null)
    .map((w) => `${germanNumber(words(w)[0])} = ${w}`)
}
