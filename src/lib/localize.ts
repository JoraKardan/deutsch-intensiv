// Pune traducerea într-o altă limbă peste lecția de bază (vezi LessonTranslation în types.ts).
// Folosit de aplicație și de tools/*.mjs (Node importă direct fișierul .ts).
import type { Curriculum, Exercise, Lesson, LessonTranslation, CurriculumTranslation } from './types'

const pick = <T>(base: T, over: T | null | undefined): T => (over === null || over === undefined ? base : over)

export function localizeLesson(base: Lesson, t: LessonTranslation | undefined): Lesson {
  if (!t) return base
  const L: Lesson = structuredClone(base)
  L.titleRo = t.titleTr
  L.goals = t.goals
  L.intro = t.intro
  if (L.pronunciation && t.pronunciation) {
    L.pronunciation.title = t.pronunciation.title
    L.pronunciation.intro = t.pronunciation.intro
    for (const it of L.pronunciation.items) {
      const x = t.pronunciation.items[it.id]
      if (!x) continue
      it.sound = pick(it.sound, x.sound)
      it.tip = x.tip
    }
  }
  L.dialog.situation = t.dialog.situation
  for (const l of L.dialog.lines) {
    const x = t.dialog.lines[l.id]
    if (!x) continue
    l.ro = x.tr
    l.lit = x.lit
  }
  for (const p of L.phrases) {
    const x = t.phrases[p.id]
    if (!x) continue
    p.ro = x.tr
    p.lit = x.lit
    p.note = x.note
  }
  const g = L.grammar
  g.title = t.grammar.title
  g.explanation = t.grammar.explanation
  g.tip = t.grammar.tip
  g.examples.forEach((e, i) => (e.ro = pick(e.ro, t.grammar.examples[i])))
  g.tables?.forEach((tb, i) => {
    const x = t.grammar.tables?.[i]
    if (!x) return
    tb.caption = pick(tb.caption, x.caption)
    if (x.headers) tb.headers = tb.headers.map((h, j) => pick(h, x.headers![j]))
    if (x.rows) tb.rows = tb.rows.map((r, ri) => r.map((c, ci) => pick(c, x.rows![ri]?.[ci])))
  })
  L.exercises = L.exercises.map((e): Exercise => {
    const x = t.exercises[e.id]
    if (!x) return e
    switch (e.type) {
      case 'mcq':
        return {
          ...e,
          question: pick(e.question, x.question),
          options: x.options ? e.options.map((o, i) => pick(o, x.options![i])) : e.options,
          explain: pick(e.explain, x.explain),
        }
      case 'gap':
        return { ...e, ro: pick(e.ro, x.tr), hint: pick(e.hint, x.hint), text: pick(e.text, x.text) }
      case 'order':
        return { ...e, ro: pick(e.ro, x.tr) }
      case 'dictation':
        return { ...e, ro: pick(e.ro, x.tr) }
    }
  })
  L.speaking = { ...L.speaking, ...t.speaking, starter: pick(L.speaking.starter, t.speaking.starter) }
  if (L.external && t.external) L.external = L.external.map((r, i) => ({ ...r, note: pick(r.note, t.external![i]) }))
  return L
}

export function localizeCurriculum(base: Curriculum, t: CurriculumTranslation | undefined): Curriculum {
  if (!t) return base
  return {
    weeks: base.weeks.map((w) => {
      const tw = t.weeks[String(w.week)]
      if (!tw) return w
      return {
        ...w,
        titleRo: tw.titleTr,
        lessons: w.lessons.map((l) => {
          const tl = tw.lessons[l.id]
          return tl ? { ...l, titleRo: tl.titleTr, focus: tl.focus } : l
        }),
      }
    }),
  }
}
