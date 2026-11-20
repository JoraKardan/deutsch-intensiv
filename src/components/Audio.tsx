import { play } from '../lib/audio'
import { t } from '../lib/i18n'

interface Props {
  lessonId: string
  id: string
  text: string
  slowToo?: boolean
}

/** Butoane ▶ (normal) și 🐢 (rar) pentru un fragment audio. */
export function AudioButtons({ lessonId, id, text, slowToo = true }: Props) {
  return (
    <span className="audio-btns">
      <button className="icon" title={t.audio.listen} onClick={() => play(lessonId, id, text)}>
        ▶
      </button>
      {slowToo && (
        <button className="icon" title={t.audio.slow} onClick={() => play(lessonId, id, text, true)}>
          🐢
        </button>
      )}
    </span>
  )
}
