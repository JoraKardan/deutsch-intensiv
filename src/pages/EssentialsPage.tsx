import { essentials, ESSENTIALS_ID } from '../lib/essentials'
import { t } from '../lib/i18n'
import { Say, SlowButton } from '../components/Say'

export function EssentialsPage() {
  return (
    <div>
      <h1>{t.essentials.title}</h1>
      <p className="muted">{t.essentials.intro}</p>
      <p className="muted small">
        <span className="later-badge">{t.essentials.later}</span> {t.essentials.laterNote}
      </p>
      {essentials.map((s) => (
        <section key={s.title} className="card ess-section">
          <h3>{s.title}</h3>
          {s.note && <p className="muted small">{s.note}</p>}
          <ul className="ess-list">
            {s.items.map((x) => (
              <li key={x.id}>
                <div className="grow">
                  <Say lessonId={ESSENTIALS_ID} id={x.id} text={x.de} className="de block" />
                  <div className="muted small">
                    {x.tr}
                    {x.later && <span className="later-badge">{t.essentials.later}</span>}
                  </div>
                </div>
                <SlowButton lessonId={ESSENTIALS_ID} id={x.id} text={x.de} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
