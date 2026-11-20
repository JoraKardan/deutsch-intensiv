// Audio „click pe text”: textul german e el însuși butonul (▶ mic în față), ca în tabelele de gramatică.
// Redarea rară (🐢) e un buton mic separat.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { play } from '../lib/audio'
import { t } from '../lib/i18n'

interface Props {
  lessonId: string
  id: string
  text: string
  children?: ReactNode
  className?: string
  /** evidențiat din afară (ex. replica redată de „Ascultă tot”) */
  active?: boolean
}

/** Textul german ca buton de redare. */
export function Say({ lessonId, id, text, children, className = '', active }: Props) {
  const [playing, setPlaying] = useState(false)
  const alive = useRef(true)
  useEffect(
    () => () => {
      alive.current = false
    },
    [],
  )
  const on = playing || active
  return (
    <button
      type="button"
      className={`say ${on ? 'playing' : ''} ${className}`}
      onClick={() => {
        setPlaying(true)
        play(lessonId, id, text).then(() => alive.current && setPlaying(false))
      }}
    >
      <span className="say-icon" aria-hidden="true">
        ▶
      </span>
      <span className="say-text">{children ?? text}</span>
    </button>
  )
}

/** Butonul mic pentru redarea rară. */
export function SlowButton({ lessonId, id, text }: { lessonId: string; id: string; text: string }) {
  return (
    <button type="button" className="slow-btn" title={t.audio.slow} aria-label={t.audio.slow} onClick={() => play(lessonId, id, text, true)}>
      🐢
    </button>
  )
}
