import { flatLessons, hasContent, LESSONS_PER_WEEK, PHASES } from '../lib/content'
import { streak, todayKey, toggleRoutine, useProgress } from '../lib/store'
import { dueCards } from './ReviewPage'

export const ROUTINE = [
  { key: 'srs', label: 'Repetiția fișelor', time: '20–30 min', hint: 'Prima activitate a zilei' },
  { key: 'lesson', label: 'Lecția (sau lecțiile) zilei', time: '75–90 min', hint: '1–2 lecții noi' },
  { key: 'shadow', label: 'Shadowing', time: '20–30 min', hint: 'Dialogul de azi + cel de ieri' },
  { key: 'input', label: 'Ascultare externă', time: '45–60 min', hint: 'Nicos Weg, Easy German etc.' },
  { key: 'speak', label: 'Vorbire cu Claude', time: '20–30 min', hint: 'Scenariul lecției, mod vocal' },
]

export const RESOURCES = [
  {
    title: 'Nicos Weg (DW)',
    url: 'https://learngerman.dw.com/de/nicos-weg/c-36519789',
    note: 'Curs video gratuit A1–B1, cu exerciții. Ideal ca „ascultare externă” în fazele A1 și A2.',
  },
  {
    title: 'Easy German (YouTube)',
    url: 'https://www.youtube.com/@EasyGerman',
    note: 'Interviuri pe stradă cu oameni reali, subtitrate în germană și engleză. De la A2 încolo.',
  },
  {
    title: 'Super Easy German (YouTube)',
    url: 'https://www.youtube.com/results?search_query=super+easy+german',
    note: 'Episoade pentru începători, vorbite rar. Bune din prima săptămână.',
  },
  {
    title: 'Langsam gesprochene Nachrichten (DW)',
    url: 'https://www.dw.com/de/deutsch-lernen/nachrichten/s-8030',
    note: 'Știri citite rar. De la A2 încolo.',
  },
  {
    title: 'Language Reactor',
    url: 'https://www.languagereactor.com/',
    note: 'Extensie Chrome: subtitrare dublă pe YouTube și Netflix.',
  },
  {
    title: 'DWDS – dicționar',
    url: 'https://www.dwds.de/',
    note: 'Dicționar german-german cu pronunție și exemple. Pentru traduceri: Reverso Context sau Linguee.',
  },
]

export function Dashboard() {
  const p = useProgress()
  const done = flatLessons.filter((l) => p.lessons[l.id]?.completedAt)
  const nextLessons = flatLessons.filter((l) => !p.lessons[l.id]?.completedAt).slice(0, 2)
  const due = dueCards(p.cards).length
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
          <p className="muted">
            Ziua {daysIn} din curs · {done.length} / {flatLessons.length} lecții finalizate
          </p>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="v">🔥 {s}</div>
            <div className="l">zile la rând</div>
          </div>
          <div className="stat">
            <div className="v">{due}</div>
            <div className="l">fișe de repetat</div>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Azi</h3>
          {due > 0 ? (
            <a className="btn block" href="#/review">
              ① Repetiție: {due} fișe →
            </a>
          ) : (
            <div className="muted">① Repetiție: nimic scadent acum ✓</div>
          )}
          {nextLessons.map((l, i) =>
            hasContent(l.id) ? (
              <a key={l.id} className={`btn block ${i ? 'ghost' : ''}`} href={`#/lesson/${l.id}`}>
                {i === 0 ? '②' : '③'} {l.title} <span className="small">({l.titleRo})</span>
              </a>
            ) : (
              <div key={l.id} className="card note small">
                Lecția „{l.title}” (săpt. {l.week}) nu e creată încă. Cere-i lui Claude Code: <em>„generează lecțiile pentru săptămâna {l.week}”</em>.
              </div>
            ),
          )}
          <p className={`small ${diff >= 0 ? 'good' : 'warn'}`}>
            {diff >= 0
              ? `Ești în ritm${diff > 0 ? ` (+${diff} lecții înainte)` : ''}. Ritmul cursului: ~8 lecții pe săptămână.`
              : `Ești cu ${-diff} ${-diff === 1 ? 'lecție' : 'lecții'} în urmă față de ritmul de 4 luni. Nu-i bai: consecvența contează mai mult decât viteza.`}
          </p>
        </div>

        <div className="card">
          <h3>Rutina zilei</h3>
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
        <h3>Progres pe faze</h3>
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
        <h3>Resurse pentru ascultare externă</h3>
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
