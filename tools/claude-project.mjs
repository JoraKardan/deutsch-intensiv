#!/usr/bin/env node
// Generează fișierele pentru proiectul de vorbire din aplicația Claude, în ambele limbi:
//   claude-project/        → română („Deutsch – Vorbire”)
//   claude-project/ru/     → rusă („Deutsch – Разговор”), din traducerile content/ru/
// În fiecare folder:
//   instructiuni.md   → se lipește în „Instructions” ale proiectului
//   vocabular.md      → Knowledge: tot ce știe elevul, lecție cu lecție
//   gramatica.md      → Knowledge: gramatica învățată + ce NU se folosește încă
//   personaje.md      → Knowledge: personajele și povestea cursului
// (despre-mine.md e personal, îl scrie fiecare elev; nu e în git.)
// Rulează după fiecare săptămână nouă: npm run claude-project
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localizeCurriculum, localizeLesson } from '../src/lib/localize.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const baseCurriculum = readJson(join(ROOT, 'content', 'curriculum.json'))
const dir = join(ROOT, 'content', 'lessons')
const baseLessons = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => readJson(join(dir, f)))

const strip = (s) => s.replace(/\*\*/g, '')
const wordsOf = (text) =>
  strip(text)
    .replace(/[„“”"«»().,!?;:…–—/]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w.length > 1 && /\p{L}/u.test(w) && !/\d/.test(w))

const TEXT = {
  ro: {
    vocTitle: (id) => `# Vocabularul cunoscut (până la ${id})`,
    vocIntro:
      'Tot ce a învățat elevul, în ordinea lecțiilor. Fiecare lecție are: tema de gramatică, expresiile de bază (cu traducere) și cuvintele care apar **pentru prima dată** în lecția respectivă. Un cuvânt dintr-o lecție este cunoscut doar dacă lecția are id-ul mai mic sau egal cu lecția curentă a elevului (ex.: w01-5 ≤ w02-1).',
    grammar: 'Gramatică',
    phrases: 'Expresii:',
    newWords: 'Cuvinte noi',
    scenario: 'Scenariu de vorbire',
    grTitle: (id) => `# Gramatica (situația la ${id})`,
    learned: '## Învățat deja',
    notYet: '## NU a fost învățat încă',
    notYetIntro:
      'Temele de mai jos vin în lecțiile următoare. Până la lecția respectivă, **nu le folosi** în replicile tale (sau doar ca expresie fixă, explicată). Dacă elevul are nevoie de ele, dă-i varianta simplă pe care o știe deja.',
    people: (list) => `# Personajele cursului

Povestea urmează viața reală a autorului cursului (vezi despre-mine.md, dacă există).

**Săptămâna 1 (Köln):** Radu Popescu, din Moldova, e la ultimul lui proiect IT, la o firmă din Köln. Colegii de acolo: Lena (din Viena, locuiește în Bonn), Tom (din Hamburg), Sophie (marketing, din Leipzig), Herr Weber (șeful), Herr Krause (contabil), Frau Becker (HR). Apar doar rar de acum înainte (un telefon cu Lena sau Tom).

**Din săptămâna 2 (Flensburg):** Radu lasă IT-ul și se mută cu soția lui la Flensburg. Lucrează în ture la fabrica de mezeluri Fördewurst GmbH (fictivă).

- **Radu**: personajul principal (elevul se identifică cu el, dar în conversații vorbește despre sine).
- **Valentina** („Valy”): soția lui Radu, cetățean român. Lucrează și ea la Fördewurst, la ambalare (Verpackung), adesea în altă tură decât Radu. (În săptămâna 1 se spune că e asistentă medicală: e meseria ei din Moldova.)
- **Jens Petersen**: șeful de tură, localnic, laconic, zice „Moin”.
- **Kasia**: colegă din Polonia, tot nou-venită, vorbește o germană simplă.
- **Ole**: coleg tânăr, fan metal, merge la Wacken.
- **Frau Hansen**: HR la fabrică.
- **Frau Jensen**: vecina în vârstă.

Personaje care au apărut în dialoguri (și prima lecție): ${list}.

Personajele pot apărea în conversații (ex.: „Tom te întreabă la prânz…”), pentru continuitate.
`,
    instructions: 'claude-project-instructions.md',
  },
  ru: {
    vocTitle: (id) => `# Известная лексика (до ${id})`,
    vocIntro:
      'Всё, что выучил ученик, в порядке уроков. У каждого урока есть: тема грамматики, основные выражения (с переводом) и слова, которые появляются в этом уроке **впервые**. Слово из урока считается известным, только если id урока меньше или равен текущему уроку ученика (напр.: w01-5 ≤ w02-1).',
    grammar: 'Грамматика',
    phrases: 'Выражения:',
    newWords: 'Новые слова',
    scenario: 'Сценарий разговора',
    grTitle: (id) => `# Грамматика (состояние на ${id})`,
    learned: '## Уже изучено',
    notYet: '## Ещё НЕ изучено',
    notYetIntro:
      'Темы ниже будут в следующих уроках. До соответствующего урока **не используй их** в своих репликах (или только как готовое выражение, с объяснением). Если ученику они нужны, дай ему простой вариант, который он уже знает.',
    people: (list) => `# Персонажи курса

**Неделя 1 (Кёльн):** Раду Попеску из Молдовы работает на последнем IT-проекте в фирме в Кёльне. Коллеги там: Лена (из Вены, живёт в Бонне), Том (из Гамбурга), Софи (маркетинг, из Лейпцига), Herr Weber (начальник), Herr Krause (бухгалтер), Frau Becker (отдел кадров). Дальше они появляются редко (звонок Лены или Тома).

**С недели 2 (Фленсбург):** Раду уходит из IT и переезжает с женой во Фленсбург. Работает посменно на колбасной фабрике Fördewurst GmbH (вымышленной).

- **Раду**: главный герой (ученик может узнавать в нём себя, но в разговорах говорит о себе).
- **Валентина** («Вали»): жена Раду, гражданка Румынии. Тоже работает на Fördewurst, на упаковке (Verpackung), часто в другую смену, чем Раду. (В неделе 1 сказано, что она медсестра: это её профессия в Молдове.)
- **Jens Petersen**: начальник смены, местный, немногословный, говорит «Moin».
- **Kasia**: коллега из Польши, тоже недавно приехала, говорит на простом немецком.
- **Ole**: молодой коллега, фанат метала, ездит на Wacken.
- **Frau Hansen**: отдел кадров на фабрике.
- **Frau Jensen**: пожилая соседка.

Персонажи, которые уже появлялись в диалогах (и первый урок): ${list}.

Персонажи могут появляться в разговорах (напр.: «Том спрашивает тебя за обедом…»), для связности.
`,
    instructions: 'claude-project-instructions.ru.md',
  },
}

function build(lang) {
  const T = TEXT[lang]
  const OUT = lang === 'ro' ? join(ROOT, 'claude-project') : join(ROOT, 'claude-project', lang)
  const tr = (sub) => {
    const p = join(ROOT, 'content', lang, sub)
    return lang !== 'ro' && existsSync(p) ? readJson(p) : undefined
  }
  const curriculum = localizeCurriculum(baseCurriculum, tr('curriculum.json'))
  const lessons = baseLessons.map((L) => localizeLesson(L, tr(join('lessons', `${L.id}.json`))))
  const done = new Set(lessons.map((l) => l.id))
  const last = lessons[lessons.length - 1]
  mkdirSync(OUT, { recursive: true })

  // ── vocabular.md: expresiile + cuvintele care apar PRIMA dată în fiecare lecție
  const seen = new Set()
  const voc = [T.vocTitle(last.id), '', T.vocIntro, '']
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
    voc.push(`${T.grammar}: ${strip(L.grammar.title)}`, '')
    voc.push(T.phrases)
    for (const p of L.phrases) voc.push(`- ${strip(p.de)} = ${strip(p.ro)}`)
    voc.push('', `${T.newWords}: ${fresh.join(', ')}`, '')
    voc.push(`${T.scenario}: ${strip(L.speaking.scenario)}`, '')
  }
  writeFileSync(join(OUT, 'vocabular.md'), voc.join('\n'))

  // ── gramatica.md
  const gr = [T.grTitle(last.id), '', T.learned, '']
  for (const L of lessons) {
    gr.push(`### ${L.id} · ${strip(L.grammar.title)}`, '')
    for (const p of L.grammar.explanation) gr.push(strip(p), '')
  }
  gr.push(T.notYet, '', T.notYetIntro, '')
  for (const w of curriculum.weeks)
    for (const l of w.lessons) if (!done.has(l.id)) gr.push(`- ${l.id} (${w.phase}): ${l.focus}`)
  writeFileSync(join(OUT, 'gramatica.md'), gr.join('\n') + '\n')

  // ── personaje.md
  const people = new Map()
  for (const L of lessons)
    for (const s of Object.values(L.dialog.speakers)) if (!people.has(s.name)) people.set(s.name, L.id)
  writeFileSync(join(OUT, 'personaje.md'), T.people([...people].map(([n, id]) => `${n} (${id})`).join(', ')))

  // ── instructiuni.md
  writeFileSync(join(OUT, 'instructiuni.md'), readFileSync(join(ROOT, 'tools', T.instructions), 'utf8'))

  console.log(`✓ ${OUT.replace(ROOT + '/', '')}/ generat (${lessons.length} lecții, ${seen.size} cuvinte, până la ${last.id})`)
}

build('ro')
build('ru')
