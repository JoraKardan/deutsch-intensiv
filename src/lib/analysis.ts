// Citește analiza finală a unei conversații cu Claude (formatul din
// claude-project/instructiuni.md) și o transformă în fișe de repetiție.
//
//   1. ❌ „ich habe dreißig Jahre“ → ✅ „Ich bin dreißig Jahre alt.“ (= Am treizeci de ani.): vârsta cu sein
//   - „Wie sagt man …?“ = Cum se spune …?

export interface CustomItem {
  kind: 'fix' | 'phrase'
  de: string // varianta corectă / expresia
  ro: string // traducerea
  wrong?: string // ce am spus (doar la greșeli)
  why?: string // explicația
}

const QUOTED = /[„"“”«]([^„"“”«»]+?)[“”"»]/g

const clean = (s: string) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()

export function parseAnalysis(text: string): CustomItem[] {
  const out: CustomItem[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = clean(raw)
    if (!line) continue

    // greșeală: ❌ „…“ → ✅ „…“ (= …): …
    const x = line.indexOf('❌')
    const ok = line.indexOf('✅')
    if (x >= 0 && ok > x) {
      const wrong = [...line.slice(x, ok).matchAll(QUOTED)][0]?.[1]
      const rest = line.slice(ok + 1)
      const right = [...rest.matchAll(QUOTED)][0]
      if (!right) continue
      const after = rest.slice((right.index ?? 0) + right[0].length)
      const ro = after.match(/\(\s*=\s*([^)]+)\)/)?.[1]
      const why = after.replace(/\(\s*=\s*[^)]+\)/, '').replace(/^[\s:–—-]+/, '')
      out.push({ kind: 'fix', de: clean(right[1]), ro: clean(ro ?? ''), wrong: wrong && clean(wrong), why: why || undefined })
      continue
    }

    // expresie: - „Deutsch“ = română
    const m = line.match(/^[-•*\d.)\s]*[„"“]([^„"“”]+)[“”"]\s*[=:–—-]\s*(.+)$/)
    if (m) out.push({ kind: 'phrase', de: clean(m[1]), ro: clean(m[2]) })
  }
  // fără dubluri
  const seen = new Set<string>()
  return out.filter((i) => {
    const k = `${i.kind}:${i.de.toLowerCase()}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
