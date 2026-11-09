import { useRef, useState } from 'react'
import { getSlowRate, play, setSlowRate, SLOW_RATES } from '../lib/audio'
import { exportProgress, importProgress, resetProgress, update, useProgress } from '../lib/store'

export function SettingsPage() {
  const p = useProgress()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [slowRate, setSlowRateState] = useState(getSlowRate)

  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `deutsch-progres-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <h1>Progres și setări</h1>

      <div className="card">
        <h3>Copie de siguranță</h3>
        <p className="muted">
          Progresul se salvează automat în acest browser. Descarcă din când în când o copie (de ex. o dată pe săptămână), ca să nu-l pierzi
          dacă ștergi datele browserului sau schimbi calculatorul.
        </p>
        <div className="row wrap">
          <button onClick={download}>⬇ Descarcă progresul</button>
          <button className="ghost" onClick={() => file.current?.click()}>
            ⬆ Încarcă dintr-un fișier
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                importProgress(await f.text())
                setMsg('✓ Progres încărcat.')
              } catch (err) {
                setMsg(`✗ ${(err as Error).message}`)
              }
              e.target.value = ''
            }}
          />
        </div>
        {msg && <p>{msg}</p>}
      </div>

      <div className="card">
        <h3>Data de început a cursului</h3>
        <p className="muted">Folosită pentru a calcula dacă ești în ritm (8 lecții pe săptămână).</p>
        <input
          type="date"
          value={p.startedAt}
          onChange={(e) =>
            e.target.value &&
            update((d) => {
              d.startedAt = e.target.value
            })
          }
        />
      </div>

      <div className="card">
        <h3>Viteza pentru 🐢 (redare rară)</h3>
        <p className="muted">Cât de rar se redă audio la butoanele 🐢 și „Tot, rar”. Începe cu 0,7×; când devine prea ușor, crește viteza.</p>
        <div className="row wrap">
          {SLOW_RATES.map((r) => (
            <button
              key={r}
              className={r === slowRate ? '' : 'ghost'}
              onClick={() => {
                setSlowRate(r)
                setSlowRateState(r)
                play('w01-1', 'd3', '', true)
              }}
            >
              {String(r).replace('.', ',')}×
            </button>
          ))}
        </div>
        <p className="muted small">La click auzi o mostră la viteza aleasă.</p>
      </div>

      <div className="card">
        <h3>Audio</h3>
        <p className="muted">
          Fișierele audio se generează local cu vocile germane din macOS: <code>npm run audio</code>. Dacă un fișier lipsește, aplicația
          folosește vocea germană a browserului. Calitatea e mai slabă, dar funcționează.
        </p>
      </div>

      <div className="card danger-zone">
        <h3>Resetare</h3>
        <p className="muted">Șterge tot progresul: lecții, fișe, istoric. Nu se poate anula.</p>
        <button
          className="danger"
          onClick={() => {
            if (confirm('Sigur ștergi tot progresul? Descarcă întâi o copie de siguranță.')) resetProgress()
          }}
        >
          Șterge progresul
        </button>
      </div>
    </div>
  )
}
