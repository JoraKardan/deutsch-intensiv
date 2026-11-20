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
  return (
    <details className="grade-help">
      <summary>Ce fac butoanele?</summary>
      <p>
        Nicio fișă nu dispare definitiv: fiecare revine, la intervale tot mai mari. Timpul de pe buton arată când revine fișa dacă îl apeși. Algoritmul
        (FSRS) alege intervalele astfel încât, când fișa revine, să ai ~90% șanse s-o știi încă.
      </p>
      <ul>
        <li>
          <strong>Din nou</strong>: n-ai știut. Fișa revine peste ~1–10 minute, în aceeași sesiune. Dacă o știai deja de mai demult, intervalul următor scade
          mult: algoritmul o consideră „fragilă”.
        </li>
        <li>
          <strong>Greu</strong>: ai știut, dar cu efort. Fișa nouă revine tot azi, peste câteva minute; una învățată revine puțin mai târziu decât data trecută.
          Dacă n-ai știut deloc, apasă „Din nou”, nu „Greu”.
        </li>
        <li>
          <strong>Bine</strong>: ai știut. <em>Butonul normal.</em> O fișă nouă mai revine o dată peste ~10 minute, apoi peste 1–3 zile. La fiecare „Bine”
          intervalul crește de ~2–3 ori (ex.: 3 zile → 1 săptămână → 3 săptămâni → 2 luni…).
        </li>
        <li>
          <strong>Ușor</strong>: ai știut instant, fără să te gândești. Fișa sare peste etape și revine abia peste multe zile. Folosește-l doar când ești sigur.
        </li>
      </ul>
      <p>
        Fișele grele le vezi des, cele ușoare tot mai rar. Pe zi intră cel mult <strong>{NEW_PER_DAY} fișe noi</strong> din lecții, ca repetiția să nu se
        adune. Restul așteaptă în ordine pentru zilele următoare. Fișele din conversații (💬) intră toate imediat.
      </p>
      <p className="muted">Taste: Space = arată răspunsul · 1–4 = butoanele · R = ascultă din nou.</p>
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
        {waitingNew > 0 && (
          <p className="muted">
            Ai atins limita de {NEW_PER_DAY} fișe noi pe azi. Încă {waitingNew} fișe noi așteaptă pentru zilele următoare.
          </p>
        )}
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
          {waitingNew > 0 && <span title={`Limita: ${NEW_PER_DAY} fișe noi pe zi`}> · în așteptare: {waitingNew}</span>}
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
      <GradeHelp />
    </div>
  )
}
