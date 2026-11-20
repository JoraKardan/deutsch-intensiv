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
import { sectionScore } from '../lib/rules'
import { ExerciseList } from '../components/Exercises'
import { GrammarView } from '../components/GrammarView'
import { Shadowing } from '../components/Shadowing'
import { Interlinear, useLitPref } from '../components/Interlinear'
import { Say, SlowButton } from '../components/Say'
import { ChevronDownIcon, CloseIcon, GearIcon, PauseIcon, PlayIcon } from '../components/Icons'
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
      <main>
        <div className="card">
          <h2>{t.lesson.notFound}</h2>
          <p>{t.lesson.notFoundText(id)}</p>
          <a href="#/plan">{t.lesson.backToPlan}</a>
        </div>
      </main>
    )
  }
  const sections = SECTIONS.filter((s) => s.key !== 'pron' || lesson.pronunciation)
  const current = (sections.find((s) => s.key === section)?.key ?? 'intro') as SectionKey
  const idx = sections.findIndex((s) => s.key === current)
  const lp = progress.lessons[id]
  const doneList = lp?.sections ?? []
  const prev = sections[idx - 1]
  const next = sections[idx + 1]
  const score = sectionScore(current, lesson, lp)

  // „→”: secțiunea curentă devine efectuată (exercițiile și shadowing-ul doar de la 80%), apoi mergem mai departe.
  const goNext = () => {
    if (!score || score.passed) markSection(id, current)
    go(`/lesson/${id}/${next.key}`)
  }
  const nextCls = !score ? '' : score.passed ? 'pass' : 'warn'
  const nextPrefix = !score ? '' : `${score.passed ? '✓' : '!'} ${score.done}/${score.total} · `

  return (
    <LessonShell lesson={lesson} current={current}>
      <div className="steps">
        <div className="row between small">
          <span>
            <strong>{t.lesson.stepOf(idx + 1, sections.length)}</strong> · {sections[idx].label}
          </span>
          <span className="muted">{t.lesson.doneCount(sections.filter((s) => doneList.includes(s.key)).length)}</span>
        </div>
        <div className="step-bars" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
          {sections.map((s, i) => (
            <a
              key={s.key}
              href={`#/lesson/${id}/${s.key}`}
              aria-label={`${i + 1}. ${s.label}${doneList.includes(s.key) ? ' ✓' : ''}`}
              aria-current={s.key === current ? 'step' : undefined}
              className={`step ${doneList.includes(s.key) ? 'done' : ''} ${s.key === current ? 'current' : ''}`}
            >
              <span />
            </a>
          ))}
        </div>
      </div>
      <main className={`lesson-main ${current === 'dialog' ? 'has-player' : ''}`}>
        {idx === 0 && (
          <div className="lesson-title">
            <h1>{lesson.title}</h1>
            <div className="subtitle">{lesson.titleRo}</div>
          </div>
        )}
        {untranslated.includes(lesson.id) && <div className="card note small">{t.lesson.untranslated}</div>}
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
      </main>
      <div className="lesson-bottom">
        {score && !score.passed && next && <p className="pass-hint small">{t.lesson.needPass(score.done, score.total)}</p>}
        <div className="pager">
          {prev ? (
            <a className="btn ghost" href={`#/lesson/${id}/${prev.key}`}>
              ← {prev.label}
            </a>
          ) : (
            <span />
          )}
          {next && (
            <button className={`next-btn ${nextCls}`} onClick={goNext}>
              {nextPrefix}
              {next.label} →
            </button>
          )}
        </div>
      </div>
    </LessonShell>
  )
}

function LessonShell({ lesson, current, children }: { lesson: Lesson; current: SectionKey; children: React.ReactNode }) {
  useEffect(() => {
    window.scrollTo({ top: 0 })
    return () => stopAll()
  }, [lesson.id, current])
  return (
    <div className="lesson">
      <header className="topbar lesson-top">
        <a href="#/" className="square-btn" aria-label={t.lesson.close} title={t.lesson.close}>
          <CloseIcon size={20} />
        </a>
        <div className="lesson-top-title">
          <span className="muted small">
            {lesson.phase} · {t.lesson.head(lesson.week, lesson.day)}
            {lesson.kind === 'review' && t.lesson.review}
          </span>
          <strong>{lesson.title}</strong>
        </div>
        <a href="#/settings" className="square-btn" aria-label={t.nav.settings} title={t.nav.settings}>
          <GearIcon size={22} />
        </a>
      </header>
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
              <SlowButton lessonId={lesson.id} id={it.id} text={it.de} />
            </div>
            <Say lessonId={lesson.id} id={it.id} text={it.de} className="de big" />
            <div className="muted small">{rich(it.tip)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Ce arată comutatorul „Text” din dialog (se ține minte între lecții).
const VIEW_KEY = 'deutsch-intensiv-dialog-view'
type DialogPrefs = { de: boolean; tr: boolean; lit: boolean }
function loadPrefs(): DialogPrefs {
  try {
    const x = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null')
    if (x && typeof x === 'object') return { de: x.de !== false, tr: x.tr !== false, lit: x.lit !== false }
  } catch {
    /* stocare indisponibilă */
  }
  return { de: true, tr: true, lit: true }
}

function DialogView({ lesson }: { lesson: Lesson }) {
  const d = lesson.dialog
  const [textOn, setTextOn] = useState(false) // fiecare dialog pornește cu textul ascuns
  const [prefs, setPrefsState] = useState(loadPrefs)
  const [sheet, setSheet] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const items = d.lines.map((l) => ({ id: l.id, text: l.de }))
  const activeIdx = d.lines.findIndex((l) => l.id === active)
  const showDe = textOn && prefs.de
  const showTr = textOn && prefs.tr
  const showLit = showDe && prefs.lit

  const setPrefs = (p: DialogPrefs) => {
    setPrefsState(p)
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(p))
    } catch {
      /* stocare indisponibilă */
    }
  }
  const run = (slow: boolean) => {
    if (playing) {
      stopAll()
      setPlaying(false)
      setActive(null)
      return
    }
    setPlaying(true)
    playSequence(lesson.id, items, slow, setActive).then(() => setPlaying(false))
  }
  useEffect(() => () => stopAll(), [])

  return (
    <div>
      <h3>{d.title}</h3>
      <p className="muted">{d.situation}</p>
      <div className="card note small">{rich(t.dialog.steps)}</div>
      <div className="dialog">
        {d.lines.map((l) => (
          <div key={l.id} className={`line ${active === l.id ? 'active' : ''}`}>
            <div className="grow">
              <div className="speaker">{d.speakers[l.speaker]?.name ?? l.speaker}</div>
              <Say lessonId={lesson.id} id={l.id} text={l.de} className="block" active={active === l.id}>
                {showDe ? (
                  <Interlinear de={l.de} lit={showLit ? l.lit : undefined} />
                ) : (
                  <span className="de hidden-text">{l.de.replace(/[^\s.,!?]/g, '•')}</span>
                )}
              </Say>
              {showTr && <div className="muted small">{l.ro}</div>}
            </div>
            <SlowButton lessonId={lesson.id} id={l.id} text={l.de} />
          </div>
        ))}
      </div>

      <div className="dialog-player">
        <button className="play-round" onClick={() => run(false)} aria-label={playing ? t.dialog.stop : t.dialog.playAll}>
          {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
        </button>
        <div className="grow player-info">
          <span className="small">
            <strong>{t.dialog.lineOf(activeIdx >= 0 ? activeIdx + 1 : 0, d.lines.length)}</strong>
          </span>
          <div className="bar thin">
            <div style={{ width: `${activeIdx >= 0 ? ((activeIdx + 1) / d.lines.length) * 100 : 0}%` }} />
          </div>
        </div>
        <button className="ghost small-btn" onClick={() => run(true)}>
          {t.dialog.slowShort}
        </button>
        <div className="split">
          <label className={textOn ? 'on' : ''}>
            <input type="checkbox" role="switch" checked={textOn} onChange={(e) => setTextOn(e.target.checked)} />
            {t.dialog.text}
          </label>
          <button className="ghost" aria-label={t.dialog.textWhat} onClick={() => setSheet(true)}>
            <ChevronDownIcon size={16} />
          </button>
        </div>
      </div>

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t.dialog.textWhat} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3>{t.dialog.textWhat}</h3>
            <label className="sheet-row">
              <span>{t.dialog.germanText}</span>
              <input type="checkbox" checked={prefs.de} onChange={(e) => setPrefs({ ...prefs, de: e.target.checked })} />
            </label>
            <label className="sheet-row">
              <span>{t.dialog.translation}</span>
              <input type="checkbox" checked={prefs.tr} onChange={(e) => setPrefs({ ...prefs, tr: e.target.checked })} />
            </label>
            <label className="sheet-row">
              <span title={t.dialog.litTitle}>{t.dialog.lit}</span>
              <input type="checkbox" checked={prefs.lit} disabled={!prefs.de} onChange={(e) => setPrefs({ ...prefs, lit: e.target.checked })} />
            </label>
            <p className="muted small">{t.dialog.textNote}</p>
            <button
              className="big-btn"
              onClick={() => {
                setTextOn(true)
                setSheet(false)
              }}
            >
              {t.dialog.done}
            </button>
          </div>
        </div>
      )}
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
      <p className="muted">{t.phrases.intro}</p>
      <div className="row wrap toggles">
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
            <div className="grow">
              <Say lessonId={lesson.id} id={p.id} text={p.de} className="block">
                <Interlinear de={p.de} lit={lit && (!hideRo || revealed.includes(p.id)) ? p.lit : undefined} />
              </Say>
              {hideRo && !revealed.includes(p.id) ? (
                <button className="link small" onClick={() => setRevealed([...revealed, p.id])}>
                  {t.phrases.show}
                </button>
              ) : (
                <div className="muted">{p.ro}</div>
              )}
              {p.note && <div className="note-inline small">{rich(p.note)}</div>}
            </div>
            <SlowButton lessonId={lesson.id} id={p.id} text={p.de} />
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
