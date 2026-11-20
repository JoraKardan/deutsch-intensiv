import { useState } from 'react'
import { flatLessons, lessons } from '../lib/content'
import { GrammarView } from '../components/GrammarView'
import { t } from '../lib/i18n'

export function GrammarPage() {
  const available = flatLessons.filter((l) => lessons[l.id])
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div>
      <h1>{t.grammarPage.title}</h1>
      <p className="muted">{t.grammarPage.intro}</p>
      {available.map((l) => {
        const lesson = lessons[l.id]
        const isOpen = open === l.id
        return (
          <div key={l.id} className="card week">
            <button className="week-head" onClick={() => setOpen(isOpen ? null : l.id)}>
              <span className="badge">{l.phase}</span>
              <span className="grow">
                <strong>{lesson.grammar.title}</strong>
                <span className="muted small"> · {l.title}</span>
              </span>
              <span>{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && <GrammarView lesson={lesson} />}
          </div>
        )
      })}
    </div>
  )
}
