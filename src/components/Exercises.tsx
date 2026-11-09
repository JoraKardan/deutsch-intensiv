import { useMemo, useState } from 'react'
import type { Exercise, Lesson } from '../lib/types'
import { matchWords, normalize, shuffle } from '../lib/text'
import { recordExercise, resetExercises, useProgress } from '../lib/store'
import { AudioButtons } from './Audio'
import { UmlautInput } from './UmlautInput'

/** Găsește textul unui fragment audio (replică, expresie, pronunție) după id. */
export function audioText(lesson: Lesson, id: string): string {
  return (
    lesson.dialog.lines.find((l) => l.id === id)?.de ??
    lesson.phrases.find((p) => p.id === id)?.de ??
    lesson.pronunciation?.items.find((p) => p.id === id)?.de ??
    ''
  )
}

const TYPE_LABEL: Record<Exercise['type'], string> = {
  mcq: 'Alege răspunsul',
  dictation: 'Dictare: ascultă și scrie',
  order: 'Ordonează cuvintele',
  gap: 'Completează',
}

export function ExerciseList({ lesson }: { lesson: Lesson }) {
  const progress = useProgress()
  const results = progress.lessons[lesson.id]?.exercises ?? {}
  const [round, setRound] = useState(0)
  const done = Object.keys(results).length
  const correct = Object.values(results).filter(Boolean).length
  const total = lesson.exercises.length

  return (
    <div>
      <div className="row between">
        <p className="muted">
          Rezultat: <strong>{correct}</strong> corecte din {total} {done < total && `(${total - done} rămase)`}
        </p>
        {done > 0 && (
          <button
            className="ghost"
            onClick={() => {
              resetExercises(lesson.id)
              setRound((r) => r + 1)
            }}
          >
            ↺ Reia exercițiile
          </button>
        )}
      </div>
      <ol className="exercises">
        {lesson.exercises.map((ex) => (
          <li key={`${ex.id}-${round}`} className="card exercise">
            <div className="ex-type">{TYPE_LABEL[ex.type]}</div>
            <ExerciseView lesson={lesson} ex={ex} onResult={(ok) => recordExercise(lesson.id, ex.id, ok)} />
          </li>
        ))}
      </ol>
    </div>
  )
}

type ExProps = { lesson: Lesson; onResult: (ok: boolean) => void }

function ExerciseView({ ex, ...p }: ExProps & { ex: Exercise }) {
  switch (ex.type) {
    case 'mcq':
      return <Mcq ex={ex} {...p} />
    case 'dictation':
      return <Dictation ex={ex} {...p} />
    case 'order':
      return <Order ex={ex} {...p} />
    case 'gap':
      return <Gap ex={ex} {...p} />
  }
}

function Mcq({ ex, lesson, onResult }: ExProps & { ex: Extract<Exercise, { type: 'mcq' }> }) {
  const [picked, setPicked] = useState<number | null>(null)
  return (
    <div>
      <p className="question">
        {ex.audio && <AudioButtons lessonId={lesson.id} id={ex.audio} text={audioText(lesson, ex.audio)} />} {ex.question}
      </p>
      <div className="options">
        {ex.options.map((o, i) => {
          const cls = picked === null ? '' : i === ex.answer ? 'right' : i === picked ? 'wrong' : 'dim'
          return (
            <button
              key={i}
              className={`option ${cls}`}
              disabled={picked !== null}
              onClick={() => {
                setPicked(i)
                onResult(i === ex.answer)
              }}
            >
              {o}
            </button>
          )
        })}
      </div>
      {picked !== null && ex.explain && <p className="explain">{ex.explain}</p>}
    </div>
  )
}

function Dictation({ ex, lesson, onResult }: ExProps & { ex: Extract<Exercise, { type: 'dictation' }> }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const result = useMemo(() => (checked ? matchWords(ex.text, value) : null), [checked, ex.text, value])
  const check = () => {
    setChecked(true)
    onResult(normalize(value) === normalize(ex.text))
  }
  return (
    <div>
      <p className="question">
        <AudioButtons lessonId={lesson.id} id={ex.audio} text={ex.text} /> Ascultă (de câte ori ai nevoie) și scrie ce auzi.
      </p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!checked) check()
        }}
      >
        <UmlautInput value={value} onChange={setValue} disabled={checked} placeholder="Scrie în germană…" className="wide" />
        {!checked && <button type="submit">Verifică</button>}
      </form>
      {result && (
        <div className="explain">
          <div className="diff">
            {result.map((w, i) => (
              <span key={i} className={w.ok ? 'ok' : 'miss'}>
                {w.word}{' '}
              </span>
            ))}
          </div>
          {ex.ro && <div className="muted">{ex.ro}</div>}
        </div>
      )}
    </div>
  )
}

function Order({ ex, onResult }: ExProps & { ex: Extract<Exercise, { type: 'order' }> }) {
  const tokens = useMemo(() => {
    const ws = ex.answer.split(/\s+/)
    let s = shuffle(ws.map((w, i) => ({ w, i })))
    for (let t = 0; t < 5 && s.map((x) => x.w).join(' ') === ex.answer && ws.length > 1; t++) s = shuffle(s)
    return s
  }, [ex.answer])
  const [picked, setPicked] = useState<number[]>([])
  const [checked, setChecked] = useState<boolean | null>(null)
  const built = picked.map((k) => tokens[k].w).join(' ')
  const check = () => {
    const ok = normalize(built) === normalize(ex.answer)
    setChecked(ok)
    onResult(ok)
  }
  return (
    <div>
      <p className="question">„{ex.ro}“</p>
      <div className="built">{built || <span className="muted">Apasă cuvintele în ordinea corectă…</span>}</div>
      <div className="chips">
        {tokens.map((t, k) => (
          <button key={k} className="chip" disabled={picked.includes(k) || checked !== null} onClick={() => setPicked([...picked, k])}>
            {t.w}
          </button>
        ))}
      </div>
      {checked === null ? (
        <div className="row">
          <button className="ghost" onClick={() => setPicked(picked.slice(0, -1))} disabled={!picked.length}>
            ⌫ Înapoi
          </button>
          <button onClick={check} disabled={picked.length !== tokens.length}>
            Verifică
          </button>
        </div>
      ) : (
        <p className={`explain ${checked ? 'good' : 'bad'}`}>{checked ? '✓ Corect!' : `✗ Corect: ${ex.answer}`}</p>
      )}
    </div>
  )
}

function Gap({ ex, onResult }: ExProps & { ex: Extract<Exercise, { type: 'gap' }> }) {
  const parts = ex.text.split('___')
  const [vals, setVals] = useState<string[]>(() => ex.answers.map(() => ''))
  const [checked, setChecked] = useState<boolean[] | null>(null)
  const check = () => {
    const res = ex.answers.map((alts, i) => alts.some((a) => normalize(a) === normalize(vals[i])))
    setChecked(res)
    onResult(res.every(Boolean))
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!checked) check()
      }}
    >
      {ex.ro && <p className="muted">„{ex.ro}“</p>}
      <p className="gap-line">
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < parts.length - 1 && (
              <span className={checked ? (checked[i] ? 'gap ok' : 'gap miss') : 'gap'}>
                <UmlautInput
                  value={vals[i]}
                  keys={false}
                  disabled={!!checked}
                  onChange={(v) => setVals(vals.map((x, j) => (j === i ? v : x)))}
                  style={{ width: `${Math.max(5, ...ex.answers[i].map((a) => a.length)) + 2}ch` }}
                />
                {checked && !checked[i] && <span className="fix">{ex.answers[i][0]}</span>}
              </span>
            )}
          </span>
        ))}
      </p>
      {ex.hint && !checked && <p className="muted small">💡 {ex.hint}</p>}
      {!checked && <button type="submit">Verifică</button>}
      {checked && <p className={`explain ${checked.every(Boolean) ? 'good' : 'bad'}`}>{checked.every(Boolean) ? '✓ Corect!' : '✗ Vezi corectura mai sus.'}</p>}
    </form>
  )
}
