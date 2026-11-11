import { useEffect, useState } from 'react'
import type { Lesson } from '../lib/types'
import { flatLessons, hasContent, lessons } from '../lib/content'
import { addCustom, completeLesson, markSection, useProgress } from '../lib/store'
import { parseAnalysis, type CustomItem } from '../lib/analysis'
import { playSequence, stopAll } from '../lib/audio'
import { buildSpeakingPrompt } from '../lib/prompt'
import { rich } from '../lib/text'
import { AudioButtons } from '../components/Audio'
import { ExerciseList } from '../components/Exercises'
import { GrammarView } from '../components/GrammarView'
import { Shadowing } from '../components/Shadowing'
import { go } from '../router'

const SECTIONS = [
  { key: 'intro', label: 'Start' },
  { key: 'pron', label: 'Pronunție' },
  { key: 'dialog', label: 'Dialog' },
  { key: 'phrases', label: 'Expresii' },
  { key: 'grammar', label: 'Gramatică' },
  { key: 'exercises', label: 'Exerciții' },
  { key: 'shadowing', label: 'Shadowing' },
  { key: 'speaking', label: 'Vorbire' },
  { key: 'finish', label: 'Final' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

export function LessonPage({ id, section }: { id: string; section?: string }) {
  const lesson = lessons[id]
  const progress = useProgress()
  if (!lesson) {
    return (
      <div className="card">
        <h2>Lecția nu există încă</h2>
        <p>Lecția „{id}” nu a fost creată încă. Vezi planul cursului.</p>
        <a href="#/plan">← Planul cursului</a>
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
            <p className="muted small">Poți scrie ä ö ü ß cu butoanele sau ca ae, oe, ue, ss. Majusculele și punctuația nu contează.</p>
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
          {lesson.phase} · Săptămâna {lesson.week} · Lecția {lesson.day}
          {lesson.kind === 'review' && ' · Recapitulare'}
        </div>
        <h1>{lesson.title}</h1>
        <div className="subtitle">{lesson.titleRo}</div>
      </div>
      {children}
    </div>
  )
}

function Intro({ lesson }: { lesson: Lesson }) {
  return (
    <div>
      <p>{rich(lesson.intro)}</p>
      <h3>La finalul lecției vei putea:</h3>
      <ul className="checks">
        {lesson.goals.map((g, i) => (
          <li key={i}>{g}</li>
        ))}
      </ul>
      <div className="card note">
        <strong>Cum parcurgi lecția (~60–75 min):</strong> Mergi prin secțiuni în ordine. La dialog, ascultă întâi <em>fără text</em>, apoi
        cu text, apoi cu traducere. Spune totul cu voce tare: cu cât vorbești mai mult, cu atât reții mai bine.
      </div>
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
  const items = d.lines.map((l) => ({ id: l.id, text: l.de }))
  return (
    <div>
      <h3>{d.title}</h3>
      <p className="muted">{d.situation}</p>
      <div className="card note small">
        <strong>Pași:</strong> ① Ascultă de 2 ori <em>fără text</em>: ce ai înțeles? ② Ascultă cu textul german. ③ Citește traducerea și
        ascultă încă o dată. ④ Ascultă replicile grele rar (🐢).
      </div>
      <div className="row wrap sticky-controls">
        <button onClick={() => playSequence(lesson.id, items, false, setActive)}>▶ Ascultă tot</button>
        <button className="ghost" onClick={() => playSequence(lesson.id, items, true, setActive)}>
          🐢 Tot, rar
        </button>
        <button
          className="ghost"
          onClick={() => {
            stopAll()
            setActive(null)
          }}
        >
          ⏹ Stop
        </button>
        <label className="toggle">
          <input type="checkbox" checked={showDe} onChange={(e) => setShowDe(e.target.checked)} /> Text german
        </label>
        <label className="toggle">
          <input type="checkbox" checked={showRo} onChange={(e) => setShowRo(e.target.checked)} /> Traducere
        </label>
      </div>
      <div className="dialog">
        {d.lines.map((l) => (
          <div key={l.id} className={`line ${active === l.id ? 'active' : ''}`}>
            <div className="speaker">{d.speakers[l.speaker]?.name ?? l.speaker}</div>
            <div className="body">
              <div className="de">{showDe ? l.de : <span className="hidden-text">{l.de.replace(/[^\s.,!?]/g, '•')}</span>}</div>
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
  return (
    <div>
      <div className="row between wrap">
        <p className="muted">Acestea sunt expresiile de reținut. Când finalizezi lecția, intră automat în repetiția zilnică.</p>
        <label className="toggle">
          <input
            type="checkbox"
            checked={hideRo}
            onChange={(e) => {
              setHideRo(e.target.checked)
              setRevealed([])
            }}
          />{' '}
          Ascunde traducerea (autotest)
        </label>
      </div>
      <div className="phrases">
        {lesson.phrases.map((p) => (
          <div key={p.id} className="phrase">
            <AudioButtons lessonId={lesson.id} id={p.id} text={p.de} />
            <div className="body">
              <div className="de">{p.de}</div>
              {hideRo && !revealed.includes(p.id) ? (
                <button className="link small" onClick={() => setRevealed([...revealed, p.id])}>
                  arată traducerea
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
      <h3>Situația</h3>
      <p>{s.scenario}</p>
      <h4>Ce trebuie să reușești:</h4>
      <ul className="checks">
        {s.tasks.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
      <div className="card note">
        <strong>Cum exersezi cu Claude:</strong>
        <ol>
          <li>Apasă „Copiază scenariul”.</li>
          <li>
            Deschide <strong>aplicația Claude pe telefon</strong> (sau claude.ai), intră în proiectul <strong>Deutsch – Vorbire</strong>,
            pornește o conversație nouă <strong>în proiect</strong> și lipește textul.
          </li>
          <li>
            Pe telefon, apasă butonul de <strong>mod vocal</strong> și vorbește. Pe calculator poți scrie sau dicta.
          </li>
          <li>Claude îți arată la început comenzile (vezi mai jos). La final, spune „<em>stop</em>” ca să primești analiza.</li>
          <li>
            Copiază analiza de la final și lipește-o mai jos, la „După conversație”: greșelile și expresiile noi intră în
            repetiția zilnică.
          </li>
          <li>Ideal: fă scenariul de 2 ori. A doua oară încearcă să nu mai ceri ajutor.</li>
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
          {copied ? '✓ Copiat!' : '📋 Copiază scenariul'}
        </button>
        <button className="ghost" onClick={() => setShow(!show)}>
          {show ? 'Ascunde textul' : 'Vezi textul'}
        </button>
      </div>
      {show && <pre className="prompt">{prompt}</pre>}
      <ImportAnalysis lessonId={lesson.id} />
    </div>
  )
}

/** Comenzile din conversație (aceleași ca în claude-project/instructiuni.md). */
const COMMANDS: [string, string][] = [
  ['ajutor  (sau ?)', 'îți explică în română ce a spus + 2 variante de răspuns'],
  ['mai rar', 'repetă mai simplu și mai scurt'],
  ['cum se spune …?', 'îți dă expresia germană, apoi revine în rol'],
  ['traducere', 'traduce în română ultima lui replică'],
  ['stop', 'iese din rol și îți dă analiza greșelilor'],
]

function Commands() {
  return (
    <div className="card">
      <strong>Comenzi în conversație</strong> <span className="muted small">(le poți spune și în română)</span>
      <ul className="small">
        {COMMANDS.map(([c, d]) => (
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
      <h3>După conversație</h3>
      <p className="small muted">
        Lipește aici analiza de la final (sau toată conversația). Greșelile devin fișe „română → germană”, iar expresiile noi
        intră în ambele direcții.
      </p>
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
          Verifică
        </button>
        {items && items.length > 0 && (
          <button
            onClick={() => {
              setAdded(addCustom(items, lessonId))
              setItems(null)
              setText('')
            }}
          >
            ➕ Adaugă {items.length} în repetiție
          </button>
        )}
      </div>
      {items && items.length === 0 && (
        <p className="small">N-am găsit greșeli sau expresii în formatul analizei (❌ … → ✅ … sau „…“ = …).</p>
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
          ✓ {added === 0 ? 'Toate erau deja în repetiție.' : `Am adăugat ${added} în repetiție.`} <a href="#/review">Mergi la repetiție →</a>
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
      <h3>Bilanțul lecției</h3>
      <ul>
        <li>
          Exerciții: <strong>{correct}</strong> / {lesson.exercises.length} corecte
        </li>
        <li>
          Expresii noi pentru repetiție: <strong>{lesson.phrases.length}</strong> (× 2 direcții: germană → română și română → germană)
        </li>
        {missing.length > 0 && <li className="warn">Secțiuni neparcurse: {missing.map((s) => s.label).join(', ')}</li>}
      </ul>
      {done ? (
        <div className="card good-bg">
          ✓ Lecție finalizată pe {new Date(done).toLocaleDateString('ro-RO')}.{' '}
          {next &&
            (hasContent(next.id) ? (
              <a href={`#/lesson/${next.id}`}>Următoarea: {next.title} →</a>
            ) : (
              <span className="muted">Următoarea lecție („{next.title}”) nu e creată încă.</span>
            ))}
        </div>
      ) : (
        <button
          className="big-btn"
          onClick={() => {
            completeLesson(lesson)
          }}
        >
          ✓ Finalizează lecția și adaugă expresiile în repetiție
        </button>
      )}
      {lesson.external && lesson.external.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h4 style={{ marginTop: 0 }}>Ascultare externă recomandată</h4>
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
        Sfat: mâine, înainte de lecția nouă, fă repetiția (fișele) și reascultă o dată dialogul de azi.
      </p>
      {done && (
        <button className="ghost" onClick={() => go('/review')}>
          Mergi la repetiție →
        </button>
      )}
    </div>
  )
}
