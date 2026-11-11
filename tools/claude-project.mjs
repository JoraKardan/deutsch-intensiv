#!/usr/bin/env node
// Generează fișierele pentru proiectul „Deutsch – Vorbire” din aplicația Claude:
//   claude-project/instructiuni.md   → se lipește în „Instructions” ale proiectului
//   claude-project/vocabular.md      → Knowledge: tot ce știe elevul, lecție cu lecție
//   claude-project/gramatica.md      → Knowledge: gramatica învățată + ce NU se folosește încă
//   claude-project/personaje.md      → Knowledge: personajele și povestea cursului
// Rulează după fiecare săptămână nouă: npm run claude-project
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'claude-project')
const curriculum = JSON.parse(readFileSync(join(ROOT, 'content', 'curriculum.json'), 'utf8'))
const dir = join(ROOT, 'content', 'lessons')
const lessons = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
const done = new Set(lessons.map((l) => l.id))
const last = lessons[lessons.length - 1]

const strip = (s) => s.replace(/\*\*/g, '')
mkdirSync(OUT, { recursive: true })

// ── vocabular.md ────────────────────────────────────────────────────────────
// Pentru fiecare lecție: expresiile (cu traducere) + cuvintele care apar PRIMA dată
// în lecția respectivă (din dialog, expresii, exemple de gramatică, pronunție).
const seen = new Set()
const wordsOf = (text) =>
  strip(text)
    .replace(/[„“”"«»().,!?;:…–—/]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w.length > 1 && /\p{L}/u.test(w) && !/\d/.test(w))

const voc = [
  `# Vocabularul cunoscut (până la ${last.id})`,
  '',
  'Tot ce a învățat elevul, în ordinea lecțiilor. Fiecare lecție are: tema de gramatică, expresiile de bază (cu traducere) și cuvintele care apar **pentru prima dată** în lecția respectivă. Un cuvânt dintr-o lecție este cunoscut doar dacă lecția are id-ul mai mic sau egal cu lecția curentă a elevului (ex.: w01-5 ≤ w02-1).',
  '',
]
for (const L of lessons) {
  const texts = [
    ...L.dialog.lines.map((d) => d.de),
    ...L.phrases.map((p) => p.de),
    ...L.grammar.examples.map((e) => e.de),
    ...(L.pronunciation?.items ?? []).map((i) => i.de),
  ]
  const fresh = []
  for (const w of texts.flatMap(wordsOf)) {
    const key = w.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    fresh.push(w)
  }
  voc.push(`## ${L.id} · ${L.title} (${L.titleRo})`, '')
  voc.push(`Gramatică: ${strip(L.grammar.title)}`, '')
  voc.push('Expresii:')
  for (const p of L.phrases) voc.push(`- ${strip(p.de)} = ${strip(p.ro)}`)
  voc.push('', `Cuvinte noi: ${fresh.join(', ')}`, '')
  voc.push(`Scenariu de vorbire: ${strip(L.speaking.scenario)}`, '')
}
writeFileSync(join(OUT, 'vocabular.md'), voc.join('\n'))

// ── gramatica.md ────────────────────────────────────────────────────────────
const gr = [
  `# Gramatica (situația la ${last.id})`,
  '',
  '## Învățat deja',
  '',
]
for (const L of lessons) {
  gr.push(`### ${L.id} · ${strip(L.grammar.title)}`, '')
  for (const p of L.grammar.explanation) gr.push(strip(p), '')
}
gr.push(
  '## NU a fost învățat încă',
  '',
  'Temele de mai jos vin în lecțiile următoare. Până la lecția respectivă, **nu le folosi** în replicile tale (sau doar ca expresie fixă, explicată). Dacă elevul are nevoie de ele, dă-i varianta simplă pe care o știe deja.',
  '',
)
for (const w of curriculum.weeks)
  for (const l of w.lessons) if (!done.has(l.id)) gr.push(`- ${l.id} (${w.phase}): ${l.focus}`)
writeFileSync(join(OUT, 'gramatica.md'), gr.join('\n') + '\n')

// ── personaje.md ────────────────────────────────────────────────────────────
const people = new Map()
for (const L of lessons)
  for (const s of Object.values(L.dialog.speakers)) if (!people.has(s.name)) people.set(s.name, L.id)
writeFileSync(
  join(OUT, 'personaje.md'),
  `# Personajele cursului

Povestea urmează viața reală a elevului (vezi despre-mine.md).

**Săptămâna 1 (Köln):** Andrei Popescu, din Moldova, e la ultimul lui proiect IT, la o firmă din Köln. Colegii de acolo: Lena (din Viena, locuiește în Bonn), Tom (din Hamburg), Sophie (marketing, din Leipzig), Herr Weber (șeful), Herr Krause (contabil), Frau Becker (HR). Apar doar rar de acum înainte (un telefon cu Lena sau Tom).

**Din săptămâna 2 (Flensburg):** Andrei lasă IT-ul și se mută cu soția lui la Flensburg. Lucrează în ture la fabrica de mezeluri Fördewurst GmbH (fictivă).

- **Andrei**: personajul principal (elevul se identifică cu el, dar în conversații vorbește despre sine).
- **Elena**: soția lui Andrei, asistentă medicală, cetățean român, își caută de lucru.
- **Jens Petersen**: șeful de tură, localnic, laconic, zice „Moin”.
- **Kasia**: colegă din Polonia, tot nou-venită, vorbește o germană simplă.
- **Ole**: coleg tânăr, fan metal, merge la Wacken.
- **Frau Hansen**: HR la fabrică.
- **Frau Jensen**: vecina în vârstă.

Personaje care au apărut în dialoguri (și prima lecție): ${[...people].map(([n, id]) => `${n} (${id})`).join(', ')}.

Personajele pot apărea în conversații (ex.: „Tom te întreabă la prânz…”), pentru continuitate.
`,
)

// ── instructiuni.md ────────────────────────────────────────────────────────
writeFileSync(join(OUT, 'instructiuni.md'), readFileSync(join(ROOT, 'tools', 'claude-project-instructions.md'), 'utf8'))

console.log(`✓ claude-project/ generat (${lessons.length} lecții, ${seen.size} cuvinte, până la ${last.id})`)
