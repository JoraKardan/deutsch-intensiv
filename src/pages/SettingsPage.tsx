import { useRef, useState } from 'react'
import { getSlowRate, play, setSlowRate, SLOW_RATES } from '../lib/audio'
import { t } from '../lib/i18n'
import { lang, LANGS, setLang } from '../lib/lang'
import { rich } from '../lib/text'
import { getTheme, setTheme, type Theme } from '../lib/theme'
import { getAutoAudio, setAutoAudio, downloadAllAudio, isInstalled, offlineSupported, useAudioCacheStatus, useInstallPrompt } from '../lib/offline'

// Fișierele pentru asistentul de conversație (generate de `npm run claude-project`), în limba aleasă.
// Se încarcă doar la click. despre-mine.md (personal) NU e inclus: se oferă un șablon gol.
const projectFiles = import.meta.glob<string>('../../claude-project/{,ru/}{instructiuni,vocabular,gramatica,personaje}.md', {
  query: '?raw',
  import: 'default',
})
const templates = import.meta.glob<string>('../../tools/despre-mine-template{,.ru}.md', { query: '?raw', import: 'default' })

async function projectFile(name: string): Promise<string> {
  const load =
    name === 'despre-mine'
      ? templates[`../../tools/despre-mine-template${lang === 'ru' ? '.ru' : ''}.md`]
      : projectFiles[`../../claude-project/${lang === 'ru' ? 'ru/' : ''}${name}.md`]
  return load ? load() : ''
}

function saveText(filename: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function AssistantCard() {
  const [copied, setCopied] = useState(false)
  const files = ['instructiuni', 'vocabular', 'gramatica', 'personaje']
  return (
    <div className="card">
      <h3>{t.settings.assistant}</h3>
      <p className="muted">{rich(t.settings.assistantText)}</p>
      <div className="row wrap">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(await projectFile('instructiuni'))
              setCopied(true)
              setTimeout(() => setCopied(false), 2500)
            } catch {
              saveText('instructiuni.md', await projectFile('instructiuni'))
            }
          }}
        >
          {copied ? t.settings.copiedInstructions : t.settings.copyInstructions}
        </button>
      </div>
      <div className="row wrap" style={{ marginTop: '0.6rem' }}>
        {files.map((f) => (
          <button key={f} className="ghost" onClick={async () => saveText(`${f}.md`, await projectFile(f))}>
            ⬇ {f}.md
          </button>
        ))}
        <button className="ghost" onClick={async () => saveText('despre-mine.md', await projectFile('despre-mine'))}>
          ⬇ {t.settings.aboutTemplate}
        </button>
      </div>
      <p className="muted small">{rich(t.settings.assistantUpdate)}</p>
      <p className="muted small">{rich(t.settings.assistantAbout)}</p>
    </div>
  )
}

function ThemeCard() {
  const [theme, set] = useState<Theme>(getTheme)
  return (
    <div className="card">
      <h3>{t.settings.theme}</h3>
      <div className="segmented" role="radiogroup" aria-label={t.settings.theme}>
        {(['auto', 'light', 'dark'] as Theme[]).map((x) => (
          <button
            key={x}
            role="radio"
            aria-checked={theme === x}
            className={theme === x ? 'on' : ''}
            onClick={() => {
              setTheme(x)
              set(x)
            }}
          >
            {t.settings.themes[x]}
          </button>
        ))}
      </div>
      <p className="muted small">{t.settings.themeText}</p>
    </div>
  )
}

function AppOfflineCard() {
  const { available, install } = useInstallPrompt()
  const { status, refresh, setStatus } = useAudioCacheStatus()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const installed = isInstalled()
  const complete = status && status.total > 0 && status.cached >= status.total
  const [auto, setAuto] = useState(getAutoAudio)

  return (
    <div className="card">
      <h3>{t.settings.app}</h3>
      {installed ? (
        <p className="good">{t.settings.installed}</p>
      ) : available ? (
        <p>
          <button onClick={install}>{t.settings.install}</button>
        </p>
      ) : (
        <p className="muted small">{rich(t.settings.installHelp)}</p>
      )}
      {offlineSupported() ? (
        <>
          <p className="muted small">{rich(t.settings.offlineText)}</p>
          {status && (
            <>
              <div className="row between small">
                <span>{t.settings.audioSaved}</span>
                <span>
                  {status.cached} / {status.total}
                </span>
              </div>
              <div className="bar" style={{ marginBottom: '0.8rem' }}>
                <div style={{ width: `${status.total ? (status.cached / status.total) * 100 : 0}%` }} />
              </div>
            </>
          )}
          <button
            className={complete ? 'ghost' : ''}
            disabled={busy || !!complete}
            onClick={async () => {
              setBusy(true)
              setNote(null)
              const { failed } = await downloadAllAudio((cached, total) => setStatus({ cached, total }))
              setBusy(false)
              setNote(failed ? t.settings.failed(failed) : t.settings.allSaved)
              refresh()
            }}
          >
            {busy ? t.settings.downloading : complete ? t.settings.audioComplete : t.settings.downloadAudio}
          </button>
          {note && <p className="small">{note}</p>}
          <label className="row" style={{ marginTop: '0.8rem' }}>
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => {
                setAutoAudio(e.target.checked)
                setAuto(e.target.checked)
              }}
            />
            <span>{t.settings.autoAudio}</span>
          </label>
          <p className="muted small">{t.settings.autoAudioText}</p>
        </>
      ) : (
        <p className="muted small">{t.settings.devOnly}</p>
      )}
    </div>
  )
}
import { getKeepAwake, setKeepAwake, wakeLockSupported } from '../lib/wakeLock'
import { exportProgress, importProgress, resetProgress, update, useProgress } from '../lib/store'

export function SettingsPage() {
  const p = useProgress()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [slowRate, setSlowRateState] = useState(getSlowRate)
  const [awake, setAwake] = useState(getKeepAwake)

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
      <h1>{t.settings.title}</h1>

      <div className="card">
        <h3>{t.settings.language}</h3>
        <p className="muted">{t.settings.languageText}</p>
        <div className="segmented" role="radiogroup" aria-label={t.settings.language}>
          {LANGS.map((l) => (
            <button key={l} role="radio" aria-checked={l === lang} className={l === lang ? 'on' : ''} onClick={() => setLang(l)}>
              {l === 'ro' ? 'Română' : 'Русский'}
            </button>
          ))}
        </div>
      </div>

      <ThemeCard />

      <AssistantCard />

      <AppOfflineCard />

      {wakeLockSupported() && (
        <div className="card">
          <h3>{t.settings.awake}</h3>
          <p className="muted">{t.settings.awakeText}</p>
          <label className="row">
            <input
              type="checkbox"
              checked={awake}
              onChange={(e) => {
                setKeepAwake(e.target.checked)
                setAwake(e.target.checked)
              }}
            />
            <span>{awake ? t.settings.on : t.settings.off}</span>
          </label>
        </div>
      )}

      <div className="card">
        <h3>{t.settings.backup}</h3>
        <p className="muted">{t.settings.backupText}</p>
        <div className="row wrap">
          <button onClick={download}>{t.settings.download}</button>
          <button className="ghost" onClick={() => file.current?.click()}>
            {t.settings.upload}
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
                setMsg(t.settings.loaded)
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
        <h3>{t.settings.start}</h3>
        <p className="muted">{t.settings.startText}</p>
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
        <h3>{t.settings.slow}</h3>
        <p className="muted">{t.settings.slowText}</p>
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
        <p className="muted small">{t.settings.slowSample}</p>
      </div>

      <div className="card danger-zone">
        <h3>{t.settings.reset}</h3>
        <p className="muted">{t.settings.resetText}</p>
        <button
          className="danger"
          onClick={() => {
            if (confirm(t.settings.resetConfirm)) resetProgress()
          }}
        >
          {t.settings.resetBtn}
        </button>
      </div>
    </div>
  )
}
