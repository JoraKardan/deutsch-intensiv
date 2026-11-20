import { useEffect, useRef, useState } from 'react'
import type { Lesson } from '../lib/types'
import { play, stopAll } from '../lib/audio'
import { isSpelling, rich, speechMatch, speechSimilarity } from '../lib/text'
import { t } from '../lib/i18n'
import { recordShadow, useProgress } from '../lib/store'
import { hasRecognition, LINE_PASS, linePassed, shadowScore } from '../lib/rules'

// Recunoașterea vocală a browserului (Chrome / Safari), fără tipuri oficiale în TS.
type Recognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: (e: { results: { 0: { transcript: string } }[] }) => void
  onerror: (e: { error: string }) => void
  onend: () => void
  start: () => void
  stop: () => void
}
const RecognitionCtor: (new () => Recognition) | undefined =
  (window as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition

export function Shadowing({ lesson }: { lesson: Lesson }) {
  const lp = useProgress().lessons[lesson.id]
  const score = shadowScore(lesson, lp)
  return (
    <div>
      <p className={`small ${score.passed ? 'good' : ''}`}>{rich(t.shadow.progress(score.done, score.total, LINE_PASS))}</p>
      {!hasRecognition() && <div className="card note small">{t.shadow.noRecognition}</div>}
      <div className="card note">
        <strong>{t.shadow.how}</strong>
        <ol>
          {t.shadow.steps.map((x, i) => (
            <li key={i}>{rich(x)}</li>
          ))}
        </ol>
      </div>
      {lesson.dialog.lines.map((l) => (
        <ShadowLine key={l.id} lessonId={lesson.id} id={l.id} de={l.de} ro={l.ro} result={lp?.shadow?.[l.id]} />
      ))}
    </div>
  )
}

function ShadowLine({
  lessonId,
  id,
  de,
  ro,
  result,
}: {
  lessonId: string
  id: string
  de: string
  ro: string
  result?: { best?: number; rec?: boolean }
}) {
  const passed = linePassed(de, result)
  const [rec, setRec] = useState<MediaRecorder | null>(null)
  const [mine, setMine] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const recog = useRef<Recognition | null>(null)

  useEffect(() => () => {
    if (mine) URL.revokeObjectURL(mine)
  }, [mine])

  const toggleRecord = async () => {
    if (rec) {
      rec.stop()
      return
    }
    try {
      stopAll()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      const chunks: Blob[] = []
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setMine(URL.createObjectURL(new Blob(chunks, { type: r.mimeType })))
        setRec(null)
        recordShadow(lessonId, id, { rec: true })
      }
      r.start()
      setRec(r)
      setErr(null)
    } catch {
      setErr(t.shadow.noMic)
    }
  }

  // Recunoașterea browserului se oprește la prima pauză (ex. după „.”). Cât timp n-am prins
  // aproape toate cuvintele și n-a expirat timpul frazei, o repornim și lipim bucățile.
  const session = useRef<{ parts: string[]; userStop: boolean } | null>(null)
  const [partial, setPartial] = useState('')

  const check = () => {
    if (!RecognitionCtor) return
    if (listening) {
      if (session.current) session.current.userStop = true
      recog.current?.stop()
      return
    }
    stopAll()
    const expected = de.trim().split(/\s+/).length
    const deadline = Date.now() + Math.min(25000, 4000 + expected * 900)
    const sess = { parts: [] as string[], userStop: false }
    session.current = sess
    let fatal: string | null = null

    const finish = () => {
      if (session.current !== sess) return
      session.current = null
      setListening(false)
      setPartial('')
      if (sess.parts.length) {
        const said = sess.parts.join(' ')
        setHeard(said)
        recordShadow(lessonId, id, { score: Math.round(speechSimilarity(de, said, true) * 100) })
      }
      else if (fatal) setErr(fatal)
    }

    const r = new RecognitionCtor()
    r.lang = 'de-DE'
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = (e) => {
      const t = e.results[0][0].transcript.trim()
      if (!t) return
      sess.parts.push(t)
      setPartial(sess.parts.join(' '))
    }
    r.onerror = (e) => {
      if (e.error === 'no-speech') fatal = t.shadow.noSpeech
      else if (e.error !== 'aborted') {
        fatal = t.shadow.error(e.error)
        sess.userStop = true // erori ca „not-allowed”: nu mai repornim
      }
    }
    r.onend = () => {
      const got = sess.parts.join(' ').split(/\s+/).filter(Boolean).length
      const more = !sess.userStop && got < expected * 0.8 && Date.now() < deadline
      // după o pauză fără vorbire, dacă avem deja ceva, considerăm că ai terminat
      if (more && !(fatal && sess.parts.length)) {
        fatal = null
        try {
          r.start()
          return
        } catch {
          /* browserul nu permite repornirea – încheiem cu ce avem */
        }
      }
      finish()
    }
    recog.current = r
    setHeard(null)
    setErr(null)
    setPartial('')
    setListening(true)
    r.start()
  }

  const score = heard !== null ? Math.round(speechSimilarity(de, heard, true) * 100) : null

  return (
    <div className={`card shadow-line ${passed ? 'passed' : ''}`}>
      <div className="row between">
        <div className="de">{de}</div>
        {(result?.best !== undefined || passed) && (
          <span className={`best ${passed ? 'good' : 'muted'} small`}>
            {passed ? '✓ ' : ''}
            {result?.best !== undefined ? t.shadow.best(result.best) : t.shadow.recorded}
          </span>
        )}
      </div>
      {isSpelling(de) && <div className="muted small">{t.shadow.spelling}</div>}
      <div className="muted small">{ro}</div>
      <div className="row wrap">
        <button className="ghost" onClick={() => play(lessonId, id, de, true)}>{t.shadow.slow}</button>
        <button className="ghost" onClick={() => play(lessonId, id, de)}>{t.shadow.normal}</button>
        <button className={rec ? 'danger' : 'ghost'} onClick={toggleRecord}>
          {rec ? t.shadow.stop : t.shadow.record}
        </button>
        {mine && (
          <button className="ghost" onClick={() => new Audio(mine).play()}>
            {t.shadow.mine}
          </button>
        )}
        {RecognitionCtor && !isSpelling(de) && (
          <button className={listening ? 'danger' : 'ghost'} onClick={check}>
            {listening ? t.shadow.listening : t.shadow.check}
          </button>
        )}
      </div>
      {listening && partial && <p className="muted small">{t.shadow.partial(partial)}</p>}
      {heard !== null && (
        <div className="explain">
          <div>
            {t.shadow.heard} „<em>{heard}</em>“ — <strong className={score! >= 80 ? 'good' : score! >= 50 ? 'warn' : 'bad'}>{score}%</strong>
          </div>
          <div className="diff">
            {speechMatch(de, heard, true).map((w, i) => (
              <span key={i} className={w.skip ? '' : w.ok ? 'ok' : 'miss'}>
                {w.word}{' '}
              </span>
            ))}
          </div>
        </div>
      )}
      {err && <p className="bad small">{err}</p>}
    </div>
  )
}
