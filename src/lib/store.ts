import { useSyncExternalStore } from 'react'
import type { Lesson } from './types'
import { newCard, rate, type StoredCard } from './srs'
import type { Grade } from 'ts-fsrs'

const KEY = 'deutsch-intensiv-v1'

export interface LessonProgress {
  completedAt?: string
  sections: string[]
  exercises: Record<string, boolean>
}

export interface DayLog {
  reviews: number
  lessons: string[]
  routine: string[]
}

export interface Progress {
  version: 1
  startedAt: string
  lessons: Record<string, LessonProgress>
  cards: Record<string, StoredCard>
  days: Record<string, DayLog>
}

export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function fresh(): Progress {
  return { version: 1, startedAt: todayKey(), lessons: {}, cards: {}, days: {} }
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as Progress
      if (p && p.version === 1) return p
    }
  } catch {
    /* stocare indisponibilă – pornim curat */
  }
  return fresh()
}

let state: Progress = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignorăm – progresul rămâne doar în memorie */
  }
}

export function update(fn: (draft: Progress) => void) {
  const draft = structuredClone(state)
  fn(draft)
  state = draft
  persist()
  listeners.forEach((l) => l())
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

export const getProgress = () => state

function day(p: Progress, key = todayKey()): DayLog {
  return (p.days[key] ??= { reviews: 0, lessons: [], routine: [] })
}

function lessonP(p: Progress, id: string): LessonProgress {
  return (p.lessons[id] ??= { sections: [], exercises: {} })
}

export function markSection(lessonId: string, section: string) {
  if (state.lessons[lessonId]?.sections.includes(section)) return
  update((p) => {
    lessonP(p, lessonId).sections.push(section)
    day(p) // marchează ziua ca activă
  })
}

export function recordExercise(lessonId: string, exId: string, correct: boolean) {
  update((p) => {
    lessonP(p, lessonId).exercises[exId] = correct
  })
}

export function resetExercises(lessonId: string) {
  update((p) => {
    lessonP(p, lessonId).exercises = {}
  })
}

/** Finalizează lecția: expresiile intră în repetiție (în ambele direcții). */
export function completeLesson(lesson: Lesson) {
  update((p) => {
    const lp = lessonP(p, lesson.id)
    if (!lp.completedAt) lp.completedAt = new Date().toISOString()
    for (const ph of lesson.phrases) {
      for (const dir of ['de-ro', 'ro-de'] as const) {
        const c = newCard(lesson.id, ph.id, dir)
        if (!p.cards[c.id]) p.cards[c.id] = c
      }
    }
    const d = day(p)
    if (!d.lessons.includes(lesson.id)) d.lessons.push(lesson.id)
  })
}

export function reviewCard(id: string, grade: Grade) {
  update((p) => {
    const c = p.cards[id]
    if (!c) return
    p.cards[id] = rate(c, grade)
    day(p).reviews++
  })
}

export function toggleRoutine(item: string) {
  update((p) => {
    const d = day(p)
    d.routine = d.routine.includes(item) ? d.routine.filter((x) => x !== item) : [...d.routine, item]
  })
}

/** Zile consecutive cu activitate, până azi (sau ieri, dacă azi încă n-ai început). */
export function streak(p: Progress): number {
  const active = (k: string) => {
    const d = p.days[k]
    return Boolean(d && (d.reviews > 0 || d.lessons.length > 0 || d.routine.length > 0))
  }
  const d = new Date()
  if (!active(todayKey(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (active(todayKey(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function exportProgress(): string {
  return JSON.stringify(state, null, 2)
}

export function importProgress(json: string) {
  const p = JSON.parse(json) as Progress
  if (!p || p.version !== 1 || typeof p.cards !== 'object') throw new Error('Fișier invalid')
  update((d) => Object.assign(d, p))
}

export function resetProgress() {
  update((d) => Object.assign(d, fresh()))
}
