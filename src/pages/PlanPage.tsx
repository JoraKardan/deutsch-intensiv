import { useState } from 'react'
import { curriculum, hasContent } from '../lib/content'
import { useProgress } from '../lib/store'

export function PlanPage() {
  const p = useProgress()
  const firstOpen = curriculum.weeks.find((w) => w.lessons.some((l) => !p.lessons[l.id]?.completedAt))?.week ?? 1
  const [open, setOpen] = useState<number[]>([firstOpen])
  return (
    <div>
      <h1>Planul cursului</h1>
      <p className="muted">
        16 săptămâni · 8 lecții pe săptămână (7 noi + recapitulare). Ritm recomandat: luni–sâmbătă câte 1–2 lecții, duminică doar repetiție,
        ascultare și conversație.
      </p>
      {curriculum.weeks.map((w) => {
        const d = w.lessons.filter((l) => p.lessons[l.id]?.completedAt).length
        const isOpen = open.includes(w.week)
        return (
          <div key={w.week} className="card week">
            <button className="week-head" onClick={() => setOpen(isOpen ? open.filter((x) => x !== w.week) : [...open, w.week])}>
              <span className="badge">{w.phase}</span>
              <span className="grow">
                <strong>Săptămâna {w.week}:</strong> {w.title} <span className="muted">· {w.titleRo}</span>
              </span>
              <span className="muted small">
                {d}/{w.lessons.length}
              </span>
              <span>{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <ol className="week-lessons">
                {w.lessons.map((l) => {
                  const done = p.lessons[l.id]?.completedAt
                  const avail = hasContent(l.id)
                  return (
                    <li key={l.id} className={done ? 'done' : avail ? '' : 'locked'}>
                      <span className="status">{done ? '✅' : avail ? '▶️' : '🔒'}</span>
                      <span className="grow">
                        {avail ? <a href={`#/lesson/${l.id}`}>{l.title}</a> : <span>{l.title}</span>}
                        <span className="muted"> — {l.titleRo}</span>
                        <div className="muted small">{l.focus}</div>
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        )
      })}
      <p className="muted small">🔒 = lecție încă necreată. Lecțiile se generează pe săptămâni, pe măsură ce avansezi.</p>
    </div>
  )
}
