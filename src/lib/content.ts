import curriculumJson from '../../content/curriculum.json'
import type { Curriculum, CurriculumLesson, Lesson, Phase } from './types'

const modules = import.meta.glob<Lesson>('../../content/lessons/*.json', {
  eager: true,
  import: 'default',
})

export const curriculum = curriculumJson as Curriculum

export const lessons: Record<string, Lesson> = {}
for (const m of Object.values(modules)) lessons[m.id] = m

export type FlatLesson = CurriculumLesson & { week: number; phase: Phase; index: number }

/** Toate lecțiile din programă, în ordine. */
export const flatLessons: FlatLesson[] = curriculum.weeks.flatMap((w) =>
  w.lessons.map((l) => ({ ...l, week: w.week, phase: w.phase })),
).map((l, index) => ({ ...l, index }))

export const lessonMeta = (id: string) => flatLessons.find((l) => l.id === id)
export const hasContent = (id: string) => Boolean(lessons[id])

export const PHASES: { phase: Phase; label: string; weeks: string }[] = [
  { phase: 'A1', label: 'A1 – Fundația', weeks: 'săpt. 1–5' },
  { phase: 'A2', label: 'A2 – Viața de zi cu zi', weeks: 'săpt. 6–10' },
  { phase: 'B1', label: 'B1 – Conversație', weeks: 'săpt. 11–16' },
]

/** Ritmul cursului: 8 unități pe săptămână (7 lecții + recapitulare). */
export const LESSONS_PER_WEEK = 8
