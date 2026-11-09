import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs'

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }))

export type Dir = 'de-ro' | 'ro-de'

/** Card serializat în localStorage (datele ca string ISO). */
export interface StoredCard {
  id: string
  lessonId: string
  phraseId: string
  dir: Dir
  card: Record<string, unknown>
}

export const GRADES: { grade: Grade; label: string; key: string; cls: string }[] = [
  { grade: Rating.Again, label: 'Din nou', key: '1', cls: 'again' },
  { grade: Rating.Hard, label: 'Greu', key: '2', cls: 'hard' },
  { grade: Rating.Good, label: 'Bine', key: '3', cls: 'good' },
  { grade: Rating.Easy, label: 'Ușor', key: '4', cls: 'easy' },
]

function toCard(s: StoredCard): Card {
  const c = s.card as Record<string, unknown>
  return {
    ...(c as unknown as Card),
    due: new Date(c.due as string),
    last_review: c.last_review ? new Date(c.last_review as string) : undefined,
  }
}

function serialize(card: Card): Record<string, unknown> {
  return JSON.parse(JSON.stringify(card))
}

export const cardId = (lessonId: string, phraseId: string, dir: Dir) => `${lessonId}:${phraseId}:${dir}`

export function newCard(lessonId: string, phraseId: string, dir: Dir, now = new Date()): StoredCard {
  return { id: cardId(lessonId, phraseId, dir), lessonId, phraseId, dir, card: serialize(createEmptyCard(now)) }
}

export function rate(s: StoredCard, grade: Grade, now = new Date()): StoredCard {
  const { card } = scheduler.next(toCard(s), now, grade)
  return { ...s, card: serialize(card) }
}

export function dueDate(s: StoredCard): Date {
  return new Date(s.card.due as string)
}

export function isNew(s: StoredCard): boolean {
  return (s.card.reps as number) === 0
}

/** Când ar reveni cardul pentru fiecare notă. */
export function previewIntervals(s: StoredCard, now = new Date()): Record<number, string> {
  const out: Record<number, string> = {}
  for (const { grade } of GRADES) {
    const due = scheduler.next(toCard(s), now, grade).card.due
    out[grade] = formatInterval(due.getTime() - now.getTime())
  }
  return out
}

export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.round(h / 24)
  if (d < 31) return `${d} ${d === 1 ? 'zi' : 'zile'}`
  const mo = Math.round(d / 30)
  return `${mo} ${mo === 1 ? 'lună' : 'luni'}`
}
