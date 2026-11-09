import { play } from '../lib/audio'

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
      <button className="icon" title="Ascultă" onClick={() => play(lessonId, id, text)}>
        ▶
      </button>
      {slowToo && (
        <button className="icon" title="Ascultă rar" onClick={() => play(lessonId, id, text, true)}>
          🐢
        </button>
      )}
    </span>
  )
}
