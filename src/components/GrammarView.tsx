import type { Lesson } from '../lib/types'
import { rich } from '../lib/text'
import { AudioButtons } from './Audio'

export function GrammarView({ lesson }: { lesson: Lesson }) {
  const g = lesson.grammar
  return (
    <div className="grammar">
      <h3>{g.title}</h3>
      {g.explanation.map((p, i) => (
        <p key={i}>{rich(p)}</p>
      ))}
      {g.tables?.map((t, i) => (
        <div key={i} className="table-wrap">
          <table>
            {t.caption && <caption>{t.caption}</caption>}
            <thead>
              <tr>
                {t.headers.map((h, j) => (
                  <th key={j}>{rich(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, j) => (
                <tr key={j}>
                  {r.map((c, k) => (
                    <td key={k}>{rich(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
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
