import { useState, type ReactNode } from 'react'
import type { Lesson } from '../lib/types'
import { rich } from '../lib/text'
import { play, playSequence } from '../lib/audio'
import { tableAudio, type TableClip } from '../lib/tableAudio'
import { AudioButtons } from './Audio'

export function GrammarView({ lesson }: { lesson: Lesson }) {
  const g = lesson.grammar
  const [playing, setPlaying] = useState<string | null>(null)

  const playOne = (c: TableClip) => {
    setPlaying(c.id)
    play(lesson.id, c.id, c.text).then(() => setPlaying((p) => (p === c.id ? null : p)))
  }
  const playAll = (list: TableClip[]) => playSequence(lesson.id, list, false, setPlaying)

  const speakable = (c: TableClip | null, content: ReactNode, onClick?: () => void) =>
    c ? (
      <button className={`cell-play${playing === c.id ? ' playing' : ''}`} onClick={onClick ?? (() => playOne(c))}>
        <span className="cell-icon" aria-hidden>
          ▶
        </span>
        <span>{content}</span>
      </button>
    ) : (
      content
    )

  return (
    <div className="grammar">
      <h3>{g.title}</h3>
      {g.explanation.map((p, i) => (
        <p key={i}>{rich(p)}</p>
      ))}
      {g.tables?.map((t, i) => {
        const a = tableAudio(t, i)
        return (
          <div key={i} className="table-wrap">
            <table>
              {t.caption && <caption>{t.caption}</caption>}
              <thead>
                <tr>
                  {t.headers.map((h, j) => {
                    const hc = a.headers[j]
                    // antetul unui verb: infinitivul + toate formele, la rând
                    const column = [hc, ...a.cells.map((r) => r[j])].filter((x): x is TableClip => x !== null)
                    return <th key={j}>{speakable(hc, rich(h), () => playAll(column))}</th>
                  })}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r, j) => (
                  <tr key={j}>
                    {r.map((c, k) => (
                      <td key={k}>
                        {k === 0 && a.rows[j] ? speakable(a.rows[j], rich(c)) : speakable(a.cells[j][k], rich(c))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
      {g.tables?.some((t) => t.audio) && <p className="muted small">▶ Atinge un cuvânt din tabel ca să-l asculți.</p>}
      <h4>Exemple</h4>
      <ul className="examples">
        {g.examples.map((e, i) => (
          <li key={i}>
            <AudioButtons lessonId={lesson.id} id={`g${i + 1}`} text={e.de.replaceAll('**', '')} slowToo={false} />
            <span className="de">{rich(e.de)}</span>
            <span className="muted"> — {e.ro}</span>
          </li>
        ))}
      </ul>
      {g.tip && <div className="card note">💡 {rich(g.tip)}</div>}
    </div>
  )
}
