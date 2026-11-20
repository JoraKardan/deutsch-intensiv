// Regulile de „efectuat” pentru secțiunile cu exerciții (vezi discuția de design):
//  - Exerciții: efectuate de la 80% răspunsuri corecte (scorul ia ultima încercare).
//  - Shadowing: o replică e trecută la „Verifică” ≥ 70% (cel mai bun scor); unde recunoașterea vocală
//    lipsește (browserul) sau replica e spusă pe litere, contează înregistrarea. Secțiunea: 80% din replici.
import type { Lesson } from './types'
import type { LessonProgress } from './store'
import { isSpelling } from './text'

export const SECTION_PASS = 0.8
export const LINE_PASS = 70

type RecognitionWindow = { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
export const hasRecognition = (): boolean =>
  typeof window !== 'undefined' &&
  Boolean((window as unknown as RecognitionWindow).SpeechRecognition ?? (window as unknown as RecognitionWindow).webkitSpeechRecognition)

export interface Score {
  done: number
  total: number
  passed: boolean
}

export function exerciseScore(lesson: Lesson, lp?: LessonProgress): Score {
  const total = lesson.exercises.length
  const done = lesson.exercises.filter((e) => lp?.exercises[e.id]).length
  return { done, total, passed: total > 0 && done / total >= SECTION_PASS }
}

/** Replica e trecută? */
export function linePassed(de: string, r?: { best?: number; rec?: boolean }): boolean {
  if (!r) return false
  if ((r.best ?? 0) >= LINE_PASS) return true
  return Boolean(r.rec) && (!hasRecognition() || isSpelling(de))
}

export function shadowScore(lesson: Lesson, lp?: LessonProgress): Score {
  const total = lesson.dialog.lines.length
  const done = lesson.dialog.lines.filter((l) => linePassed(l.de, lp?.shadow?.[l.id])).length
  return { done, total, passed: total > 0 && done / total >= SECTION_PASS }
}

/** Scorul secțiunii, pentru secțiunile cu prag (altfel null). */
export function sectionScore(key: string, lesson: Lesson, lp?: LessonProgress): Score | null {
  if (key === 'exercises') return exerciseScore(lesson, lp)
  if (key === 'shadowing') return shadowScore(lesson, lp)
  return null
}
