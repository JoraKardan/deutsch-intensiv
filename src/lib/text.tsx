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
