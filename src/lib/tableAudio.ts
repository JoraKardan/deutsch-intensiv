// Audio pentru celulele tabelelor de gramatică.
// Folosit și de aplicație (butoanele ▶), și de tools/gen-audio.mjs (Node importă direct fișierul .ts),
// deci id-urile și textele rămân sincronizate automat.
//
// `table.audio`:
//   - "conjugation": prima coloană = pronumele; fiecare formă se citește cu pronumele („ich arbeite”,
//     „er arbeitet, sie arbeitet, es arbeitet”), iar antetul (infinitivul) separat.
//   - "row": fiecare rând e o singură propoziție, împărțită pe coloane.
//   - [1, 2]: coloanele (index de la 0) care sunt în germană și se citesc ca atare.
// Textul dintre paranteze (traducerea) și `**` nu se citesc.
import type { GrammarTable, Lesson } from './types'

export interface TableClip {
  id: string
  text: string
}

export interface TableAudio {
  headers: (TableClip | null)[]
  cells: (TableClip | null)[][]
  rows: (TableClip | null)[]
}

const strip = (s: string) =>
  s
    .replaceAll('**', '')
    .replace(/\([^)]*\)/g, '')
    .replace(/…/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** „a / b” → „a, b” (bara s-ar citi „Schrägstrich”). */
const speakable = (s: string) =>
  strip(s)
    .split(/\s*\/\s*/)
    .map((x) => x.trim())
    .filter(Boolean)
    .join(', ')
    .replace(/([.?!]),/g, '$1')

const isBlank = (s: string) => !s || s === '—' || s === '-'

function pronouns(cell: string): string[] {
  const seen = new Set<string>()
  return strip(cell)
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()))
}

export function tableAudio(t: GrammarTable, ti: number): TableAudio {
  const pre = `t${ti + 1}`
  const mode = t.audio
  const clip = (id: string, text: string): TableClip | null => (isBlank(text) ? null : { id, text })
  const none: TableAudio = {
    headers: t.headers.map(() => null),
    cells: t.rows.map((r) => r.map(() => null)),
    rows: t.rows.map(() => null),
  }
  if (!mode) return none

  if (mode === 'row') {
    return {
      ...none,
      rows: t.rows.map((r, ri) =>
        clip(
          `${pre}r${ri + 1}`,
          r
            .map(strip)
            .filter((c) => !isBlank(c))
            .join(' '),
        ),
      ),
    }
  }

  if (mode === 'conjugation') {
    return {
      ...none,
      headers: t.headers.map((h, ci) => (ci === 0 ? null : clip(`${pre}h${ci + 1}`, strip(h)))),
      cells: t.rows.map((r, ri) =>
        r.map((c, ci) => {
          if (ci === 0) return null
          const form = strip(c)
          if (isBlank(form)) return null
          return clip(`${pre}r${ri + 1}c${ci + 1}`, pronouns(r[0]).map((p) => `${p} ${form}`).join(', '))
        }),
      ),
    }
  }

  return {
    ...none,
    cells: t.rows.map((r, ri) => r.map((c, ci) => (mode.includes(ci) ? clip(`${pre}r${ri + 1}c${ci + 1}`, speakable(c)) : null))),
  }
}

/** Toate fragmentele audio din tabelele unei lecții, în ordine. */
export function lessonTableClips(l: Lesson): TableClip[] {
  return (l.grammar.tables ?? []).flatMap((t, ti) => {
    const a = tableAudio(t, ti)
    return [...a.headers, ...a.cells.flat(), ...a.rows].filter((x): x is TableClip => x !== null)
  })
}
