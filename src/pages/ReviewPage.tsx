import { useCallback, useEffect, useMemo, useState } from 'react'
import { lessons } from '../lib/content'
import { play, stopAll } from '../lib/audio'
import { MINE, reviewCard, todayKey, useProgress, type Progress } from '../lib/store'
import { dueDate, formatInterval, GRADES, isNew, previewIntervals, type StoredCard } from '../lib/srs'
import { t } from '../lib/i18n'
import { rich } from '../lib/text'

/** Expresia din spatele unei fișe: din lecție sau din conversațiile cu Claude. */
function phraseOf(p: Progress, c: StoredCard): { id: string; de: string; ro: string; note?: string; wrong?: string } | undefined {
  if (c.lessonId === MINE) {
    const x = p.custom?.[c.phraseId]
    if (!x) return undefined
    return { id: x.id, de: x.de, ro: x.ro || t.review.fixIt(x.wrong ?? ''), note: x.why, wrong: x.wrong }
  }
  return lessons[c.lessonId]?.phrases.find((ph) => ph.id === c.phraseId)
}

/** Câte fișe noi din lecții intră în repetiție pe zi. Fișele din conversații (💬) nu au limită. */
export const NEW_PER_DAY = 20

const phraseNum = (id: string) => Number(id.replace(/\D/g, '')) || 0

/** Coada de azi + câte fișe noi așteaptă pentru zilele următoare (din cauza limitei). */
export function reviewQueue(p: Progress, now = new Date()): { queue: StoredCard[]; waitingNew: number } {
  const due = Object.values(p.cards).filter((c) => (lessons[c.lessonId] || c.lessonId === MINE) && dueDate(c) <= now)
  // fișele noi din lecții: în ordinea lecțiilor și a expresiilor, perechile (de-ro + ro-de) una lângă alta,
  // ca limita să ia expresii întregi
  const fresh = due
    .filter((c) => isNew(c) && c.lessonId !== MINE)
    .sort(
      (a, b) =>
        a.lessonId.localeCompare(b.lessonId) || phraseNum(a.phraseId) - phraseNum(b.phraseId) || a.dir.localeCompare(b.dir),
    )
  const room = Math.max(0, NEW_PER_DAY - (p.days[todayKey()]?.newCards ?? 0))
  const allowed = new Set(fresh.slice(0, room).map((c) => c.id))
  // Ordinea: întâi fișele deja învățate (după scadență), apoi cele noi:
  // toate „germană → română”, apoi „română → germană”, ca să nu apară perechea una după alta.
  const rank = (c: StoredCard) => (isNew(c) ? (c.dir === 'de-ro' ? 1 : 2) : 0)
  const queue = due
    .filter((c) => !isNew(c) || c.lessonId === MINE || allowed.has(c.id))
    .sort((a, b) => rank(a) - rank(b) || dueDate(a).getTime() - dueDate(b).getTime())
  return { queue, waitingNew: fresh.length - allowed.size }
}

export function dueCards(p: Progress, now = new Date()): StoredCard[] {
  return reviewQueue(p, now).queue
}

function GradeHelp() {
  const [intro, items, limit, keys] = t.review.help(NEW_PER_DAY)
  return (
    <details className="grade-help">
      <summary>{t.review.helpTitle}</summary>
      <p>{rich(intro)}</p>
      <ul>
        {items.map((x, i) => (
          <li key={i}>{rich(x)}</li>
        ))}
      </ul>
      <p>{rich(limit)}</p>
      <p className="muted">{keys}</p>
    </details>
  )
}

export function ReviewPage() {
  const progress = useProgress()
  const [now, setNow] = useState(() => new Date())
  const [revealed, setRevealed] = useState(false)

  // reîmprospătăm ca să apară cardurile care revin peste câteva minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000)
    return () => clearInterval(t)
  }, [])

  const { queue, waitingNew } = useMemo(() => reviewQueue(progress, now), [progress, now])
  const card = queue[0]
  const mine = card?.lessonId === MINE
  const phrase = card ? phraseOf(progress, card) : undefined
  const source = !card ? '' : mine ? t.review.fromChat : lessons[card.lessonId]?.title
  const intervals = useMemo(() => (card ? previewIntervals(card) : {}), [card])

  const say = useCallback(() => {
    // fișele din conversații (💬) n-au fișier audio: fără sunet (nu folosim vocea browserului)
    if (card && phrase && !mine) play(card.lessonId, phrase.id, phrase.de)
  }, [card, phrase, mine])

  // germană → română: redăm audio la afișare; română → germană: la întoarcere
  useEffect(() => {
    setRevealed(false)
    if (card?.dir === 'de-ro') say()
    return () => stopAll()
  }, [card?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const reveal = useCallback(() => {
    setRevealed(true)
    if (card?.dir === 'ro-de') say()
  }, [card, say])

  const grade = useCallback(
    (g: number) => {
      if (!card) return
      reviewCard(card.id, g as never)
      setNow(new Date())
    },
    [card],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Space' && !revealed) {
        e.preventDefault()
        reveal()
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key))
      else if (e.key === 'r') say()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, reveal, grade, say])

  const all = Object.values(progress.cards)
  const nextDue = all.map(dueDate).filter((d) => d > now).sort((a, b) => a.getTime() - b.getTime())[0]
  const todayReviews = progress.days[todayKey()]?.reviews

  if (!all.length) {
    return (
      <div className="card">
        <h2>{t.review.empty}</h2>
        <p>{t.review.emptyText}</p>
        <a className="btn" href="#/">
          {t.review.home}
        </a>
      </div>
    )
  }

  if (!card || !phrase) {
    return (
      <div className="card center">
        <h2>{t.review.done}</h2>
        <p>{t.review.doneText}</p>
        {waitingNew > 0 && <p className="muted">{t.review.limitReached(NEW_PER_DAY, waitingNew)}</p>}
        {nextDue && <p className="muted">{t.review.nextIn(formatInterval(nextDue.getTime() - now.getTime()))}</p>}
        <a className="btn" href="#/">
          {t.review.home}
        </a>
      </div>
    )
  }

  const front = card.dir === 'de-ro' ? phrase.de : phrase.ro
  const back = card.dir === 'de-ro' ? phrase.ro : phrase.de
  const newCount = queue.filter(isNew).length

  return (
    <div className="review">
      <div className="row between muted small">
        <span>
          {rich(t.review.status(queue.length, newCount))}
          {todayReviews ? t.review.today(todayReviews) : ''}
          {waitingNew > 0 && <span title={t.review.limitTitle(NEW_PER_DAY)}>{t.review.waiting(waitingNew)}</span>}
        </span>
        <span>
          {source} · {card.dir === 'de-ro' ? `${t.de} → ${t.tr}` : `${t.tr} → ${t.de}`}
        </span>
      </div>
      <div className="card flash">
        <div className="hint muted small">{card.dir === 'de-ro' ? t.review.whatMeans : t.review.sayIt}</div>
        <div className={card.dir === 'de-ro' ? 'front de' : 'front'}>{front}</div>
        {card.dir === 'de-ro' && !mine && (
          <button className="icon" onClick={say} title={t.review.listenR}>
            🔊
          </button>
        )}
        {revealed && (
          <>
            <hr />
            <div className={card.dir === 'ro-de' ? 'back de' : 'back'}>{back}</div>
            {card.dir === 'ro-de' && !mine && (
              <button className="icon" onClick={say} title={t.review.listenR}>
                🔊
              </button>
            )}
            {phrase.wrong && <div className="muted small">{t.review.youSaid(phrase.wrong)}</div>}
            {phrase.note && <div className="muted small">{phrase.note}</div>}
          </>
        )}
      </div>
      {!revealed ? (
        <button className="big-btn" onClick={reveal}>
          {t.review.reveal} <span className="kbd">Space</span>
        </button>
      ) : (
        <div className="grades">
          {GRADES.map((g) => (
            <button key={g.grade} className={`grade ${g.cls}`} onClick={() => grade(g.grade)}>
              <span>{g.label}</span>
              <span className="small">{intervals[g.grade]}</span>
              <span className="kbd">{g.key}</span>
            </button>
          ))}
        </div>
      )}
      <p className="muted small center">
        {t.review.legend}
      </p>
      <GradeHelp />
    </div>
  )
}
