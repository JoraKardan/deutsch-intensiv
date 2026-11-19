import { useEffect, useRef, useState } from 'react'
import type { Lesson } from '../lib/types'
import { play, stopAll } from '../lib/audio'
import { isSpelling, speechMatch, speechSimilarity } from '../lib/text'

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
  return (
    <div>
      <div className="card note">
        <strong>Cum faci shadowing:</strong>
        <ol>
          <li>Ascultă replica rar (🐢), apoi normal (▶).</li>
          <li>Repet-o cu voce tare, imitând intonația și ritmul, nu doar cuvintele. Fă asta de 3–5 ori.</li>
          <li>Înregistrează-te (🎙) și compară cu originalul.</li>
          <li>Opțional: „Verifică” transcrie ce ai spus. Dacă te înțelege calculatorul, te înțelege și un neamț.</li>
          <li>La final, încearcă să repeți <em>în același timp</em> cu audio-ul, fără să te uiți la text.</li>
        </ol>
      </div>
      {lesson.dialog.lines.map((l) => (
        <ShadowLine key={l.id} lessonId={lesson.id} id={l.id} de={l.de} ro={l.ro} />
      ))}
    </div>
  )
}

function ShadowLine({ lessonId, id, de, ro }: { lessonId: string; id: string; de: string; ro: string }) {
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
      }
      r.start()
      setRec(r)
      setErr(null)
    } catch {
      setErr('Nu am acces la microfon. Permite-l în browser.')
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
      if (sess.parts.length) setHeard(sess.parts.join(' '))
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
      if (e.error === 'no-speech') fatal = 'Nu s-a auzit nimic. Mai încearcă.'
      else if (e.error !== 'aborted') {
        fatal = `Eroare recunoaștere: ${e.error}`
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
    <div className="card shadow-line">
      <div className="de">{de}</div>
      <div className="muted small">{ro}</div>
      <div className="row wrap">
        <button className="ghost" onClick={() => play(lessonId, id, de, true)}>🐢 Rar</button>
        <button className="ghost" onClick={() => play(lessonId, id, de)}>▶ Normal</button>
        <button className={rec ? 'danger' : 'ghost'} onClick={toggleRecord}>
          {rec ? '⏹ Stop' : '🎙 Înregistrează'}
        </button>
        {mine && (
          <button className="ghost" onClick={() => new Audio(mine).play()}>
            ▶ Vocea mea
          </button>
        )}
        {RecognitionCtor && !isSpelling(de) && (
          <button className={listening ? 'danger' : 'ghost'} onClick={check}>
            {listening ? '⏹ Ascult…' : '🗣 Verifică'}
          </button>
        )}
      </div>
      {listening && partial && <p className="muted small">Am prins până acum: „{partial}“ … continuă</p>}
      {heard !== null && (
        <div className="explain">
          <div>
            Am înțeles: „<em>{heard}</em>“ — <strong className={score! >= 80 ? 'good' : score! >= 50 ? 'warn' : 'bad'}>{score}%</strong>
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
