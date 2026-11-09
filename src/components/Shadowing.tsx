import { useEffect, useRef, useState } from 'react'
import type { Lesson } from '../lib/types'
import { play, stopAll } from '../lib/audio'
import { matchWords, similarity } from '../lib/text'

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

  const check = () => {
    if (!RecognitionCtor) return
    if (listening) {
      recog.current?.stop()
      return
    }
    stopAll()
    const r = new RecognitionCtor()
    r.lang = 'de-DE'
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = (e) => setHeard(e.results[0][0].transcript)
    r.onerror = (e) => setErr(e.error === 'no-speech' ? 'Nu s-a auzit nimic. Mai încearcă.' : `Eroare recunoaștere: ${e.error}`)
    r.onend = () => setListening(false)
    recog.current = r
    setHeard(null)
    setErr(null)
    setListening(true)
    r.start()
  }

  const score = heard !== null ? Math.round(similarity(de, heard) * 100) : null

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
        {RecognitionCtor && (
          <button className={listening ? 'danger' : 'ghost'} onClick={check}>
            {listening ? '⏹ Ascult…' : '🗣 Verifică'}
          </button>
        )}
      </div>
      {heard !== null && (
        <div className="explain">
          <div>
            Am înțeles: „<em>{heard}</em>“ — <strong className={score! >= 80 ? 'good' : score! >= 50 ? 'warn' : 'bad'}>{score}%</strong>
          </div>
          <div className="diff">
            {matchWords(de, heard).map((w, i) => (
              <span key={i} className={w.ok ? 'ok' : 'miss'}>
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
