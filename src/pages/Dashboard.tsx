import { flatLessons, hasContent, LESSONS_PER_WEEK, PHASES } from '../lib/content'
import { FlameIcon } from '../components/Icons'
import { streak, todayKey, toggleRoutine, useProgress, type Progress } from '../lib/store'
import { dueCards } from './ReviewPage'
import { t } from '../lib/i18n'

export const ROUTINE = ['srs', 'lesson', 'shadow', 'input', 'speak'].map((key) => {
  const [label, time, hint] = t.routine[key]
  return { key, label, time, hint }
})

export const RESOURCES = [
  {
    title: 'Nicos Weg (DW)',
    url: 'https://learngerman.dw.com/de/nicos-weg/c-36519687',
    note: t.resources[0],
  },
  {
    title: 'Easy German (YouTube)',
    url: 'https://www.youtube.com/@EasyGerman',
    note: t.resources[1],
  },
  {
    title: 'Super Easy German (YouTube)',
    url: 'https://www.youtube.com/results?search_query=super+easy+german',
    note: t.resources[2],
  },
  {
    title: 'Langsam gesprochene Nachrichten (DW)',
    url: 'https://learngerman.dw.com/de/langsam-gesprochene-nachrichten/s-60040332',
    note: t.resources[3],
  },
  {
    title: 'Language Reactor',
    url: 'https://www.languagereactor.com/',
    note: t.resources[4],
  },
  {
    title: 'DWDS',
    url: 'https://www.dwds.de/',
    note: t.resources[5],
  },
]

/** Pașii rutinei bifați automat azi (manual se pot bifa oricând și ceilalți). */
function autoDone(p: Progress, due: number): Set<string> {
  const d = p.days[todayKey()]
  const s = new Set<string>(d?.auto ?? [])
  if (d && d.reviews > 0 && due === 0) s.add('srs')
  if (d && d.lessons.length > 0) s.add('lesson')
  return s
}

export function Dashboard() {
  const p = useProgress()
  const done = flatLessons.filter((l) => p.lessons[l.id]?.completedAt)
  const next = flatLessons.find((l) => !p.lessons[l.id]?.completedAt)
  const due = dueCards(p).length
  const s = streak(p)
  const routineDone = p.days[todayKey()]?.routine ?? []
  const auto = autoDone(p, due)

  const daysIn = Math.floor((Date.now() - new Date(p.startedAt + 'T00:00:00').getTime()) / 86400000) + 1
  // cât ar fi trebuit terminat până la sfârșitul zilei de ieri
  const expected = Math.min(flatLessons.length, Math.floor(((daysIn - 1) * LESSONS_PER_WEEK) / 7))
  const diff = done.length - expected

  // faza curentă: a lecției următoare (sau ultima, la final)
  const phase = PHASES.find((ph) => ph.phase === (next ?? flatLessons[flatLessons.length - 1]).phase)!
  const inPhase = flatLessons.filter((l) => l.phase === phase.phase)
  const phaseDone = inPhase.filter((l) => p.lessons[l.id]?.completedAt).length

  return (
    <div className="dashboard">
      <section className="hero">
        <h1>Guten Tag!</h1>
        <p className="muted">{t.dash.dayOf(daysIn, done.length, flatLessons.length)}</p>
        <div className="phase-bar">
          <div className="row between small">
            <strong>{phase.label}</strong>
            <span className="muted">
              {phaseDone} / {inPhase.length}
            </span>
          </div>
          <div className="bar">
            <div style={{ width: `${(phaseDone / inPhase.length) * 100}%` }} />
          </div>
        </div>
        <p className="streak">
          {s >= 3 && <FlameIcon size={18} className="flame" />}
          <span>
            <strong>{s}</strong> {t.dash.streak(s)}
          </span>
        </p>
      </section>

      <section className="card">
        <h3>{t.dash.today}</h3>
        {due > 0 ? (
          <a className="btn block primary-action" href="#/review">
            <span>{t.dash.reviewBtn(due)}</span>
            <span aria-hidden="true">→</span>
          </a>
        ) : (
          <div className="muted done-line">{t.dash.nothingDue}</div>
        )}
        {next &&
          (hasContent(next.id) ? (
            <a className={`btn block next-lesson ${due > 0 ? 'ghost' : 'primary-action'}`} href={`#/lesson/${next.id}`}>
              <span className="grow">
                <strong>{next.title}</strong>
                <span className="small sub">{t.dash.nextLesson(next.titleRo)}</span>
              </span>
              <span aria-hidden="true">→</span>
            </a>
          ) : (
            <div className="card note small">{t.dash.notCreated(next.title, next.week)}</div>
          ))}
        <p className={`small ${diff >= 0 ? 'good' : 'warn'}`}>{diff >= 0 ? t.dash.onPace(diff) : t.dash.behind(-diff)}</p>
      </section>

      <section className="card">
        <h3>{t.dash.routine}</h3>
        <ul className="routine">
          {ROUTINE.map((r) => {
            const isAuto = auto.has(r.key)
            return (
              <li key={r.key}>
                <label>
                  <input
                    type="checkbox"
                    checked={isAuto || routineDone.includes(r.key)}
                    disabled={isAuto}
                    onChange={() => toggleRoutine(r.key)}
                  />
                  <span className="grow">
                    <strong>{r.label}</strong> <span className="muted small">· {r.time}</span>
                    <br />
                    <span className="muted small">{r.hint}</span>
                  </span>
                  {isAuto && <span className="auto-tag">{t.dash.auto}</span>}
                </label>
              </li>
            )
          })}
        </ul>
        <p className="muted small">{t.dash.autoNote}</p>
      </section>

      <section className="card">
        <h3>{t.dash.resources}</h3>
        <ul className="resources">
          {RESOURCES.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.title} ↗
              </a>
              <div className="muted small">{r.note}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
