import { useRef, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string
  onChange: (v: string) => void
  keys?: boolean
}

const CHARS = ['ä', 'ö', 'ü', 'ß']

/** Câmp de text cu butoane pentru ä ö ü ß (se poate scrie și ae, oe, ue, ss). */
export function UmlautInput({ value, onChange, keys = true, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const insert = (ch: string) => {
    const el = ref.current
    if (!el) return onChange(value + ch)
    const s = el.selectionStart ?? value.length
    const e = el.selectionEnd ?? value.length
    onChange(value.slice(0, s) + ch + value.slice(e))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + 1, s + 1)
    })
  }
  return (
    <span className="umlaut-input">
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        {...rest}
      />
      {keys &&
        CHARS.map((c) => (
          <button key={c} type="button" className="key" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(c)}>
            {c}
          </button>
        ))}
    </span>
  )
}
