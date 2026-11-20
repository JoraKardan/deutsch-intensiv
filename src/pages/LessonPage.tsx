import { useEffect, useState } from 'react'
import type { Lesson } from '../lib/types'
import { flatLessons, hasContent, lessons, untranslated } from '../lib/content'
import { t } from '../lib/i18n'
import { locale } from '../lib/lang'
import { addCustom, completeLesson, markSection, useProgress } from '../lib/store'
import { parseAnalysis, type CustomItem } from '../lib/analysis'
import { playSequence, stopAll } from '../lib/audio'
import { buildSpeakingPrompt } from '../lib/prompt'
import { rich } from '../lib/text'
import { AudioButtons } from '../components/Audio'
import { ExerciseList } from '../components/Exercises'
import { GrammarView } from '../components/GrammarView'
import { Shadowing } from '../components/Shadowing'
import { Interlinear, useLitPref } from '../components/Interlinear'
import { go } from '../router'

const SECTIONS = (['intro', 'pron', 'dialog', 'phrases', 'grammar', 'exercises', 'shadowing', 'speaking', 'finish'] as const).map((key) => ({
  key,
  label: t.lesson.sections[key],
}))

type SectionKey = (typeof SECTIONS)[number]['key']

export function LessonPage({ id, section }: { id: string; section?: string }) {
  const lesson = lessons[id]
  const progress = useProgress()
  if (!lesson) {
    return (
      <div className="card">
        <h2>{t.lesson.notFound}</h2>
        <p>{t.lesson.notFoundText(id)}</p>
        <a href="#/plan">{t.lesson.backToPlan}</a>
      </div>
    )
  }
  const sections = SECTIONS.filter((s) => s.key !== 'pron' || lesson.pronunciation)
  const current = (sections.find((s) => s.key === section)?.key ?? 'intro') as SectionKey
  const idx = sections.findIndex((s) => s.key === current)
  const visited = progress.lessons[id]?.sections ?? []

  return (
    <LessonShell lesson={lesson} current={current}>
      <nav className="tabs">
        {sections.map((s, i) => (
          <a
            key={s.key}
            href={`#/lesson/${id}/${s.key}`}
            className={`tab ${s.key === current ? 'active' : ''} ${visited.includes(s.key) ? 'seen' : ''}`}
          >
            <span className="num">{i + 1}</span> {s.label}
          </a>
        ))}
      </nav>
      <section className="section">
        {current === 'intro' && <Intro lesson={lesson} />}
        {current === 'pron' && <Pron lesson={lesson} />}
        {current === 'dialog' && <DialogView lesson={lesson} />}
        {current === 'phrases' && <Phrases lesson={lesson} />}
        {current === 'grammar' && <GrammarView lesson={lesson} />}
        {current === 'exercises' && (
          <>
            <p className="muted small">{t.lesson.exercisesTip}</p>
            <ExerciseList lesson={lesson} />
          </>
        )}
        {current === 'shadowing' && <Shadowing lesson={lesson} />}
        {current === 'speaking' && <Speaking lesson={lesson} />}
        {current === 'finish' && <Finish lesson={lesson} />}
      </section>
      <div className="row between pager">
        {idx > 0 ? <a href={`#/lesson/${id}/${sections[idx - 1].key}`}>← {sections[idx - 1].label}</a> : <span />}
        {idx < sections.length - 1 && (
          <a className="btn" href={`#/lesson/${id}/${sections[idx + 1].key}`}>
            {sections[idx + 1].label} →
          </a>
        )}
      </div>
    </LessonShell>
  )
}

function LessonShell({ lesson, current, children }: { lesson: Lesson; current: SectionKey; children: React.ReactNode }) {
  useEffect(() => {
    markSection(lesson.id, current)
    window.scrollTo({ top: 0 })
    return () => stopAll()
  }, [lesson.id, current])
  return (
    <div>
      <div className="lesson-head">
        <div className="muted small">
          {lesson.phase} · {t.lesson.head(lesson.week, lesson.day)}
          {lesson.kind === 'review' && t.lesson.review}
        </div>
        <h1>{lesson.title}</h1>
        <div className="subtitle">{lesson.titleRo}</div>
      </div>
      {untranslated.includes(lesson.id) && <div className="card note small">{t.lesson.untranslated}</div>}
      {children}
    </div>
  )
}

function Intro({ lesson }: { lesson: Lesson }) {
  return (
    <div>
      <p>{rich(lesson.intro)}</p>
      <h3>{t.lesson.goals}</h3>
      <ul className="checks">
        {lesson.goals.map((g, i) => (
          <li key={i}>{g}</li>
        ))}
      </ul>
      <div className="card note">{rich(t.lesson.howTo)}</div>
    </div>
  )
}

function Pron({ lesson }: { lesson: Lesson }) {
  const p = lesson.pronunciation!
  return (
    <div>
      <h3>{p.title}</h3>
      <p>{rich(p.intro)}</p>
      <div className="pron-grid">
        {p.items.map((it) => (
          <div key={it.id} className="card pron">
            <div className="row between">
              <span className="sound">{it.sound}</span>
              <AudioButtons lessonId={lesson.id} id={it.id} text={it.de} />
            </div>
            <div className="de big">{it.de}</div>
            <div className="muted small">{rich(it.tip)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DialogView({ lesson }: { lesson: Lesson }) {
  const d = lesson.dialog
  const [showDe, setShowDe] = useState(false)
  const [showRo, setShowRo] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [lit, setLit] = useLitPref()
  const hasLit = d.lines.some((l) => l.lit)
  const items = d.lines.map((l) => ({ id: l.id, text: l.de }))
  return (
    <div>
      <h3>{d.title}</h3>
      <p className="muted">{d.situation}</p>
      <div className="card note small">{rich(t.dialog.steps)}</div>
      <div className="row wrap sticky-controls">
        <button onClick={() => playSequence(lesson.id, items, false, setActive)}>{t.dialog.playAll}</button>
        <button className="ghost" onClick={() => playSequence(lesson.id, items, true, setActive)}>
          {t.dialog.allSlow}
        </button>
        <button
          className="ghost"
          onClick={() => {
            stopAll()
            setActive(null)
          }}
        >
          {t.dialog.stop}
        </button>
        <label className="toggle">
          <input type="checkbox" checked={showDe} onChange={(e) => setShowDe(e.target.checked)} /> {t.dialog.germanText}
        </label>
        <label className="toggle">
          <input type="checkbox" checked={showRo} onChange={(e) => setShowRo(e.target.checked)} /> {t.dialog.translation}
        </label>
        {hasLit && (
          <label className="toggle" title={t.dialog.litTitle}>
            <input type="checkbox" checked={lit} disabled={!showDe} onChange={(e) => setLit(e.target.checked)} /> {t.dialog.lit}
          </label>
        )}
      </div>
      <div className="dialog">
        {d.lines.map((l) => (
          <div key={l.id} className={`line ${active === l.id ? 'active' : ''}`}>
            <div className="speaker">{d.speakers[l.speaker]?.name ?? l.speaker}</div>
            <div className="body">
              {showDe ? (
                <Interlinear de={l.de} lit={lit ? l.lit : undefined} />
              ) : (
                <div className="de">
                  <span className="hidden-text">{l.de.replace(/[^\s.,!?]/g, '•')}</span>
                </div>
              )}
              {showRo && <div className="muted small">{l.ro}</div>}
            </div>
            <AudioButtons lessonId={lesson.id} id={l.id} text={l.de} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Phrases({ lesson }: { lesson: Lesson }) {
  const [hideRo, setHideRo] = useState(false)
  const [revealed, setRevealed] = useState<string[]>([])
  const [lit, toggleLit] = useLitPref()
  const hasLit = lesson.phrases.some((p) => p.lit)
  return (
    <div>
      <div className="row between wrap">
        <p className="muted">{t.phrases.intro}</p>
        <label className="toggle">
          <input
            type="checkbox"
            checked={hideRo}
            onChange={(e) => {
              setHideRo(e.target.checked)
              setRevealed([])
            }}
          />{' '}
          {t.phrases.hide}
        </label>
        {hasLit && (
          <label className="toggle">
            <input type="checkbox" checked={lit} onChange={(e) => toggleLit(e.target.checked)} /> {t.dialog.lit}
          </label>
        )}
      </div>
      <div className="phrases">
        {lesson.phrases.map((p) => (
          <div key={p.id} className="phrase">
            <AudioButtons lessonId={lesson.id} id={p.id} text={p.de} />
            <div className="body">
              <Interlinear de={p.de} lit={lit && (!hideRo || revealed.includes(p.id)) ? p.lit : undefined} />
              {hideRo && !revealed.includes(p.id) ? (
                <button className="link small" onClick={() => setRevealed([...revealed, p.id])}>
                  {t.phrases.show}
                </button>
              ) : (
                <div className="muted">{p.ro}</div>
              )}
              {p.note && <div className="note-inline small">{rich(p.note)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Speaking({ lesson }: { lesson: Lesson }) {
  const s = lesson.speaking
  const prompt = buildSpeakingPrompt(lesson)
  const [copied, setCopied] = useState(false)
  const [show, setShow] = useState(false)
  return (
    <div>
      <h3>{t.speaking.situation}</h3>
      <p>{s.scenario}</p>
      <h4>{t.speaking.tasks}</h4>
      <ul className="checks">
        {s.tasks.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
      <div className="card note">
        <strong>{t.speaking.how}</strong>
        <ol>
          {t.speaking.steps.map((x, i) => (
            <li key={i}>{rich(x)}</li>
          ))}
        </ol>
      </div>
      <Commands />
      <div className="row">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(prompt)
              setCopied(true)
              setTimeout(() => setCopied(false), 2500)
            } catch {
              setShow(true)
            }
          }}
        >
          {copied ? t.speaking.copied : t.speaking.copy}
        </button>
        <button className="ghost" onClick={() => setShow(!show)}>
          {show ? t.speaking.hideText : t.speaking.showText}
        </button>
      </div>
      {show && <pre className="prompt">{prompt}</pre>}
      <ImportAnalysis lessonId={lesson.id} />
    </div>
  )
}

function Commands() {
  return (
    <div className="card">
      <strong>{t.speaking.commands}</strong> <span className="muted small">{t.speaking.commandsNote}</span>
      <ul className="small">
        {t.speaking.commandList.map(([c, d]) => (
          <li key={c}>
            <strong>{c}</strong>: {d}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ImportAnalysis({ lessonId }: { lessonId: string }) {
  const [text, setText] = useState('')
  const [items, setItems] = useState<CustomItem[] | null>(null)
  const [added, setAdded] = useState<number | null>(null)
  return (
    <div className="card">
      <h3>{t.analysis.title}</h3>
      <p className="small muted">{t.analysis.intro}</p>
      <textarea
        rows={6}
        style={{ width: '100%' }}
        value={text}
        placeholder="1. ❌ „…“ → ✅ „…“ (= …): …"
        onChange={(e) => {
          setText(e.target.value)
          setItems(null)
          setAdded(null)
        }}
      />
      <div className="row">
        <button disabled={!text.trim()} onClick={() => setItems(parseAnalysis(text))}>
          {t.analysis.check}
        </button>
        {items && items.length > 0 && (
          <button
            onClick={() => {
              setAdded(addCustom(items, lessonId))
              setItems(null)
              setText('')
            }}
          >
            {t.analysis.add(items.length)}
          </button>
        )}
      </div>
      {items && items.length === 0 && (
        <p className="small">{t.analysis.none}</p>
      )}
      {items && items.length > 0 && (
        <ul className="small">
          {items.map((i, k) => (
            <li key={k}>
              {i.kind === 'fix' ? (
                <>
                  ❌ {i.wrong} → ✅ <strong>{i.de}</strong> {i.ro && <span className="muted">({i.ro})</span>}
                </>
              ) : (
                <>
                  💬 <strong>{i.de}</strong> = {i.ro}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {added !== null && (
        <p className="small">
          ✓ {added === 0 ? t.analysis.allThere : t.analysis.added(added)} <a href="#/review">{t.analysis.goReview}</a>
        </p>
      )}
    </div>
  )
}

function Finish({ lesson }: { lesson: Lesson }) {
  const progress = useProgress()
  const lp = progress.lessons[lesson.id]
  const done = lp?.completedAt
  const ex = lp?.exercises ?? {}
  const correct = Object.values(ex).filter(Boolean).length
  const next = flatLessons[(flatLessons.find((l) => l.id === lesson.id)?.index ?? -2) + 1]
  const missing = SECTIONS.filter((s) => s.key !== 'finish' && s.key !== 'intro' && (s.key !== 'pron' || lesson.pronunciation)).filter(
    (s) => !lp?.sections.includes(s.key),
  )
  return (
    <div>
      <h3>{t.finish.title}</h3>
      <ul>
        <li>{rich(t.finish.exercises(correct, lesson.exercises.length))}</li>
        <li>{rich(t.finish.phrases(lesson.phrases.length))}</li>
        {missing.length > 0 && (
          <li className="warn">
            {t.finish.missing} {missing.map((s) => s.label).join(', ')}
          </li>
        )}
      </ul>
      {done ? (
        <div className="card good-bg">
          {t.finish.doneOn(new Date(done).toLocaleDateString(locale))}{' '}
          {next &&
            (hasContent(next.id) ? (
              <a href={`#/lesson/${next.id}`}>{t.finish.next(next.title)}</a>
            ) : (
              <span className="muted">{t.finish.nextMissing(next.title)}</span>
            ))}
        </div>
      ) : (
        <button
          className="big-btn"
          onClick={() => {
            completeLesson(lesson)
          }}
        >
          {t.finish.complete}
        </button>
      )}
      {lesson.external && lesson.external.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h4 style={{ marginTop: 0 }}>{t.finish.external}</h4>
          <ul className="resources">
            {lesson.external.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noreferrer">
                  {r.title} ↗
                </a>
                <div className="muted small">{r.note}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="muted small" style={{ marginTop: '1.5rem' }}>
        {t.finish.tip}
      </p>
      {done && (
        <button className="ghost" onClick={() => go('/review')}>
          {t.finish.goReview}
        </button>
      )}
    </div>
  )
}
