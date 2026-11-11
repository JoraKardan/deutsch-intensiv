import { useCallback, useEffect, useMemo, useState } from 'react'
import { lessons } from '../lib/content'
import { play, speak, stopAll } from '../lib/audio'
import { MINE, reviewCard, todayKey, useProgress, type Progress } from '../lib/store'
import { dueDate, formatInterval, GRADES, isNew, previewIntervals, type StoredCard } from '../lib/srs'

/** Expresia din spatele unei fișe: din lecție sau din conversațiile cu Claude. */
function phraseOf(p: Progress, c: StoredCard): { id: string; de: string; ro: string; note?: string; wrong?: string } | undefined {
  if (c.lessonId === MINE) {
    const x = p.custom?.[c.phraseId]
    if (!x) return undefined
    return { id: x.id, de: x.de, ro: x.ro || `(corectează) ${x.wrong ?? ''}`, note: x.why, wrong: x.wrong }
  }
  return lessons[c.lessonId]?.phrases.find((ph) => ph.id === c.phraseId)
}

export function dueCards(cards: Record<string, StoredCard>, now = new Date()): StoredCard[] {
  // Ordinea: întâi fișele deja învățate (după scadență), apoi cele noi:
  // toate „germană → română”, apoi „română → germană”, ca să nu apară perechea una după alta.
  const rank = (c: StoredCard) => (isNew(c) ? (c.dir === 'de-ro' ? 1 : 2) : 0)
  return Object.values(cards)
    .filter((c) => (lessons[c.lessonId] || c.lessonId === MINE) && dueDate(c) <= now)
    .sort((a, b) => rank(a) - rank(b) || dueDate(a).getTime() - dueDate(b).getTime())
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

  const queue = useMemo(() => dueCards(progress.cards, now), [progress.cards, now])
  const card = queue[0]
  const mine = card?.lessonId === MINE
  const phrase = card ? phraseOf(progress, card) : undefined
  const source = !card ? '' : mine ? '💬 Din conversații' : lessons[card.lessonId]?.title
  const intervals = useMemo(() => (card ? previewIntervals(card) : {}), [card])

  const say = useCallback(() => {
    if (card && phrase) {
      if (mine) speak(phrase.de)
      else play(card.lessonId, phrase.id, phrase.de)
    }
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
        <h2>Repetiția zilnică</h2>
        <p>Nu ai încă fișe. Ele apar automat după ce finalizezi prima lecție.</p>
        <a className="btn" href="#/">
          ← Acasă
        </a>
      </div>
    )
  }

  if (!card || !phrase) {
    return (
      <div className="card center">
        <h2>🎉 Gata pe moment!</h2>
        <p>Ai terminat toate fișele scadente.</p>
        {nextDue && <p className="muted">Următoarea fișă revine peste {formatInterval(nextDue.getTime() - now.getTime())}.</p>}
        <a className="btn" href="#/">
          ← Acasă
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
          Rămase: <strong>{queue.length}</strong> ({newCount} noi){todayReviews ? ` · azi: ${todayReviews}` : ''}
        </span>
        <span>
          {source} · {card.dir === 'de-ro' ? 'Germană → Română' : 'Română → Germană'}
        </span>
      </div>
      <div className="card flash">
        <div className="hint muted small">{card.dir === 'de-ro' ? 'Ce înseamnă?' : 'Spune cu voce tare în germană:'}</div>
        <div className={card.dir === 'de-ro' ? 'front de' : 'front'}>{front}</div>
        {card.dir === 'de-ro' && (
          <button className="icon" onClick={say} title="Ascultă (R)">
            🔊
          </button>
        )}
        {revealed && (
          <>
            <hr />
            <div className={card.dir === 'ro-de' ? 'back de' : 'back'}>{back}</div>
            {card.dir === 'ro-de' && (
              <button className="icon" onClick={say} title="Ascultă (R)">
                🔊
              </button>
            )}
            {phrase.wrong && <div className="muted small">❌ ai spus: „{phrase.wrong}“</div>}
            {phrase.note && <div className="muted small">{phrase.note}</div>}
          </>
        )}
      </div>
      {!revealed ? (
        <button className="big-btn" onClick={reveal}>
          Arată răspunsul <span className="kbd">Space</span>
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
        „Din nou” = n-am știut · „Greu” = cu efort · „Bine” = am știut · „Ușor” = instant. Fii sincer cu tine: algoritmul se adaptează.
      </p>
    </div>
  )
}
