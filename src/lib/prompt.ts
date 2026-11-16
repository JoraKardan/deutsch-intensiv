import type { Lesson } from './types'

/**
 * Scenariul pentru o conversație în proiectul „Deutsch – Vorbire” din aplicația Claude.
 * Regulile generale (limbi, vocabular, corecturi, analiza finală) sunt în instrucțiunile
 * proiectului (claude-project/instructiuni.md), aici e doar ce ține de lecție.
 */
export function buildSpeakingPrompt(lesson: Lesson): string {
  const s = lesson.speaking
  const vocab = lesson.phrases.map((p) => `- ${p.de} (${p.ro})`).join('\n')
  const tasks = s.tasks.map((t) => `- ${t}`).join('\n')
  return `Lecția: ${lesson.id} (nivel ${lesson.phase}, săptămâna ${lesson.week}, „${lesson.title}”). Cunosc tot vocabularul până la ${lesson.id} inclusiv.

SCENARIU: ${s.scenario}
ROLUL TĂU: ${s.claudeRole}

CE VREAU SĂ EXERSEZ:
${tasks}

EXPRESIILE LECȚIEI (folosește-le des):
${vocab}

GRAMATICA LECȚIEI: ${lesson.grammar.title}

LIMBA: doar germană și română, niciodată engleză sau rusă. Tot ce ține de lecție (replici, expresii, corecturi, exemple), inclusiv cifrele, orele, prețurile, literele și simbolurile (=, +, -, →, %) din ele, se spune obligatoriu în germană și în cuvinte, chiar și când e citat într-o explicație în română. În română rămân doar explicațiile și traducerile tale.

ANALIZA FINALĂ (la „stop” sau după ~12–15 replici): exact în formatul din instrucțiunile proiectului (secțiunea 6), cu ❌ → ✅, „=” și fiecare greșeală pe rândul ei, chiar și în modul vocal. O copiez în aplicație.

Începe tu, direct în rol${s.starter ? `, cu: „${s.starter}“` : ''}`
}
