// Mesaj jos pe ecran când un fișier audio nu se poate încărca (fără voce de rezervă a browserului).
import { useEffect, useState } from 'react'
import { onAudioError } from '../lib/audio'
import { t } from '../lib/i18n'

export function AudioToast() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let timer: number | undefined
    const off = onAudioError(() => {
      setVisible(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setVisible(false), 5000)
    })
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [])
  if (!visible) return null
  return (
    <div className="toast" role="alert" onClick={() => setVisible(false)}>
      {t.audio.error}
    </div>
  )
}
