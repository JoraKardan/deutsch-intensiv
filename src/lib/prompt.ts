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

Începe tu, direct în rol${s.starter ? `, cu: „${s.starter}“` : ''}`
}
