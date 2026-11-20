import curriculumJson from '../../content/curriculum.json'
import type { Curriculum, CurriculumLesson, CurriculumTranslation, Lesson, LessonTranslation, Phase } from './types'
import { lang } from './lang'
import { localizeCurriculum, localizeLesson } from './localize'
import { t } from './i18n'

const modules = import.meta.glob<Lesson>('../../content/lessons/*.json', {
  eager: true,
  import: 'default',
})
const ruLessons = import.meta.glob<LessonTranslation>('../../content/ru/lessons/*.json', {
  eager: true,
  import: 'default',
})
const ruCurriculum = import.meta.glob<CurriculumTranslation>('../../content/ru/curriculum.json', {
  eager: true,
  import: 'default',
})

const translations: Record<string, LessonTranslation> = {}
if (lang === 'ru') for (const m of Object.values(ruLessons)) translations[m.id] = m

export const curriculum: Curriculum = localizeCurriculum(
  curriculumJson as Curriculum,
  lang === 'ru' ? Object.values(ruCurriculum)[0] : undefined,
)

export const lessons: Record<string, Lesson> = {}
for (const m of Object.values(modules)) lessons[m.id] = localizeLesson(m, translations[m.id])

/** Lecțiile care încă n-au traducere în limba aleasă (se afișează în română). */
export const untranslated = lang === 'ro' ? [] : Object.keys(lessons).filter((id) => !translations[id])

export type FlatLesson = CurriculumLesson & { week: number; phase: Phase; index: number }

/** Toate lecțiile din programă, în ordine. */
export const flatLessons: FlatLesson[] = curriculum.weeks.flatMap((w) =>
  w.lessons.map((l) => ({ ...l, week: w.week, phase: w.phase })),
).map((l, index) => ({ ...l, index }))

export const lessonMeta = (id: string) => flatLessons.find((l) => l.id === id)
export const hasContent = (id: string) => Boolean(lessons[id])

export const PHASES: { phase: Phase; label: string; weeks: string }[] = [
  { phase: 'A1', label: t.phases.A1, weeks: t.phases.weeks(1, 5) },
  { phase: 'A2', label: t.phases.A2, weeks: t.phases.weeks(6, 10) },
  { phase: 'B1', label: t.phases.B1, weeks: t.phases.weeks(11, 16) },
]

/** Ritmul cursului: 8 unități pe săptămână (7 lecții + recapitulare). */
export const LESSONS_PER_WEEK = 8
