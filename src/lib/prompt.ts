import type { Lesson } from './types'

/** Instrucțiunile pentru o sesiune de conversație cu Claude (copiate în aplicația Claude). */
export function buildSpeakingPrompt(lesson: Lesson): string {
  const s = lesson.speaking
  const vocab = lesson.phrases.map((p) => `- ${p.de} (${p.ro})`).join('\n')
  const tasks = s.tasks.map((t) => `- ${t}`).join('\n')
  return `Ești partenerul meu de conversație pentru limba germană. Învăț germana de la zero, într-un curs intensiv (acum: nivel ${lesson.phase}, săptămâna ${lesson.week}, lecția „${lesson.title}”). Limba mea maternă e româna; mai înțeleg rusa și engleza.

SCENARIU: ${s.scenario}
ROLUL TĂU: ${s.claudeRole}

CE VREAU SĂ EXERSEZ:
${tasks}

VOCABULARUL LECȚIEI (îl cunosc deja):
${vocab}

GRAMATICA LECȚIEI: ${lesson.grammar.title}

REGULI:
1. Rămâi în rol și vorbește doar în germană, cu propoziții scurte și simple, potrivite nivelului meu. Folosește mai ales vocabularul de mai sus și cel mult 1–2 cuvinte noi pe replică.
2. O singură replică pe rând, apoi aștepți răspunsul meu. Pune-mi întrebări, ca să vorbesc eu cât mai mult.
3. Dacă greșesc, continuă conversația normal, dar adaugă la final o corectură scurtă în română, între paranteze: (✏️ corect: „…“ – explicație de 3–5 cuvinte).
4. Dacă spun „?”, „ajutor” sau „Hilfe”, explică-mi în română ce ai spus și dă-mi 2 variante simple de răspuns.
5. Dacă vorbim în modul vocal: vorbește rar și clar, iar corecturile spune-le scurt.
6. După aproximativ 12 replici, sau când spun „stop”, ieși din rol și dă-mi în română: ce am făcut bine, lista greșelilor mele cu varianta corectă, și 3 expresii noi utile pentru situația asta.

Începe tu, direct în rol${s.starter ? `, cu: „${s.starter}“` : ''}`
}
