import { flatLessons, hasContent, LESSONS_PER_WEEK, PHASES } from '../lib/content'
import { streak, todayKey, toggleRoutine, useProgress } from '../lib/store'
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

export function Dashboard() {
  const p = useProgress()
  const done = flatLessons.filter((l) => p.lessons[l.id]?.completedAt)
  const nextLessons = flatLessons.filter((l) => !p.lessons[l.id]?.completedAt).slice(0, 2)
  const due = dueCards(p).length
  const s = streak(p)
  const today = p.days[todayKey()]
  const routineDone = today?.routine ?? []

  const daysIn = Math.floor((Date.now() - new Date(p.startedAt + 'T00:00:00').getTime()) / 86400000) + 1
  // cât ar fi trebuit terminat până la sfârșitul zilei de ieri
  const expected = Math.min(flatLessons.length, Math.floor(((daysIn - 1) * LESSONS_PER_WEEK) / 7))
  const diff = done.length - expected

  return (
    <div className="dashboard">
      <div className="hero">
        <div>
          <h1>Guten Tag! 👋</h1>
          <p className="muted">{t.dash.dayOf(daysIn, done.length, flatLessons.length)}</p>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="v">🔥 {s}</div>
            <div className="l">{t.dash.streak}</div>
          </div>
          <div className="stat">
            <div className="v">{due}</div>
            <div className="l">{t.dash.due}</div>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>{t.dash.today}</h3>
          {due > 0 ? (
            <a className="btn block" href="#/review">
              {t.dash.reviewBtn(due)}
            </a>
          ) : (
            <div className="muted">{t.dash.nothingDue}</div>
          )}
          {nextLessons.map((l, i) =>
            hasContent(l.id) ? (
              <a key={l.id} className={`btn block ${i ? 'ghost' : ''}`} href={`#/lesson/${l.id}`}>
                {i === 0 ? '②' : '③'} {l.title} <span className="small">({l.titleRo})</span>
              </a>
            ) : (
              <div key={l.id} className="card note small">
                {t.dash.notCreated(l.title, l.week)}
              </div>
            ),
          )}
          <p className={`small ${diff >= 0 ? 'good' : 'warn'}`}>
            {diff >= 0 ? t.dash.onPace(diff) : t.dash.behind(-diff)}
          </p>
        </div>

        <div className="card">
          <h3>{t.dash.routine}</h3>
          <ul className="routine">
            {ROUTINE.map((r) => (
              <li key={r.key}>
                <label>
                  <input type="checkbox" checked={routineDone.includes(r.key)} onChange={() => toggleRoutine(r.key)} />
                  <span>
                    <strong>{r.label}</strong> <span className="muted small">· {r.time}</span>
                    <br />
                    <span className="muted small">{r.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3>{t.dash.phasesTitle}</h3>
        {PHASES.map((ph) => {
          const all = flatLessons.filter((l) => l.phase === ph.phase)
          const d = all.filter((l) => p.lessons[l.id]?.completedAt).length
          return (
            <div key={ph.phase} className="phase-bar">
              <div className="row between small">
                <span>
                  <strong>{ph.label}</strong> <span className="muted">({ph.weeks})</span>
                </span>
                <span>
                  {d} / {all.length}
                </span>
              </div>
              <div className="bar">
                <div style={{ width: `${(d / all.length) * 100}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
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
      </div>
    </div>
  )
}
