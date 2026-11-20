import type { Lesson } from './types'
import { lang } from './lang'

/**
 * Scenariul pentru o conversație în proiectul din aplicația Claude
 * („Deutsch – Vorbire” în română, „Deutsch – Разговор” în rusă).
 * Regulile generale (limbi, vocabular, corecturi, analiza finală) sunt în instrucțiunile
 * proiectului (claude-project/[ru/]instructiuni.md), aici e doar ce ține de lecție.
 */
export function buildSpeakingPrompt(lesson: Lesson): string {
  const s = lesson.speaking
  const vocab = lesson.phrases.map((p) => `- ${p.de} (${p.ro})`).join('\n')
  const tasks = s.tasks.map((t) => `- ${t}`).join('\n')

  if (lang === 'ru')
    return `Урок: ${lesson.id} (уровень ${lesson.phase}, неделя ${lesson.week}, «${lesson.title}»). Я знаю всю лексику до ${lesson.id} включительно.

СЦЕНАРИЙ: ${s.scenario}
ТВОЯ РОЛЬ: ${s.claudeRole}

ЧТО Я ХОЧУ ОТРАБОТАТЬ:
${tasks}

ВЫРАЖЕНИЯ УРОКА (используй их часто):
${vocab}

ГРАММАТИКА УРОКА: ${lesson.grammar.title}

ЯЗЫК: только немецкий и русский, никогда английский или румынский. Всё, что относится к уроку (реплики, выражения, исправления, примеры), включая цифры, время, цены, буквы и символы (=, +, -, →, %) в них, обязательно говорится по-немецки и словами, даже когда цитируется внутри объяснения на русском. На русском остаются только твои объяснения и переводы.

ИТОГОВЫЙ РАЗБОР (по команде «стоп» или после ~12–15 реплик): точно в формате из инструкций проекта (раздел 6), с ❌ → ✅, «=» и каждой ошибкой на отдельной строке, даже в голосовом режиме. Я копирую его в приложение.

Начни ты, сразу в роли${s.starter ? `, с: «${s.starter}»` : ''}`

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
