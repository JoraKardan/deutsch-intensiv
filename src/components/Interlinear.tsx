import { useState } from 'react'

const LIT_KEY = 'deutsch-intensiv-lit'

/** Preferința „Mot-à-mot” (comună pentru Dialog și Expresii). */
export function useLitPref(): [boolean, (v: boolean) => void] {
  const [lit, setLit] = useState(() => {
    try {
      return localStorage.getItem(LIT_KEY) !== '0'
    } catch {
      return true
    }
  })
  const set = (v: boolean) => {
    setLit(v)
    try {
      localStorage.setItem(LIT_KEY, v ? '1' : '0')
    } catch {
      /* stocare indisponibilă */
    }
  }
  return [lit, set]
}

/** Textul german cu traducerea mot-à-mot sub fiecare cuvânt (`lit`: glose separate prin „|”). */
export function splitLit(de: string, lit: string): { w: string; g: string }[] | null {
  const words = de.trim().split(/\s+/)
  const gl = lit.split('|').map((x) => x.trim())
  if (words.length !== gl.length) return null
  return words.map((w, i) => ({ w, g: gl[i] }))
}

export function Interlinear({ de, lit, className = 'de' }: { de: string; lit?: string; className?: string }) {
  const parts = lit ? splitLit(de, lit) : null
  if (!parts) return <div className={className}>{de}</div>
  return (
    <div className={`${className} interlinear`}>
      {parts.map((p, i) => (
        <span key={i} className="w">
          <span>{p.w}</span>
          <span className="gl">{p.g || ' '}</span>
        </span>
      ))}
    </div>
  )
}
