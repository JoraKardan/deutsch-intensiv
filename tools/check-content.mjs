#!/usr/bin/env node
// Verifică lecțiile din content/lessons: câmpuri obligatorii, id-uri unice,
// referințe audio valide, goluri ↔ răspunsuri, legătura cu programa.
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const curriculum = JSON.parse(readFileSync(join(ROOT, 'content', 'curriculum.json'), 'utf8'))
const meta = new Map(curriculum.weeks.flatMap((w) => w.lessons.map((l, i) => [l.id, { ...l, week: w.week, phase: w.phase, day: i + 1 }])))

const dir = join(ROOT, 'content', 'lessons')
let errors = 0
const err = (f, m) => {
  errors++
  console.error(`✗ ${f}: ${m}`)
}

for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  let L
  try {
    L = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  } catch (e) {
    err(f, `JSON invalid: ${e.message}`)
    continue
  }
  if (f !== `${L.id}.json`) err(f, `numele fișierului trebuie să fie ${L.id}.json`)
  const m = meta.get(L.id)
  if (!m) err(f, `id „${L.id}” nu există în curriculum.json`)
  else {
    if (m.week !== L.week) err(f, `week=${L.week}, dar în programă e ${m.week}`)
    if (m.day !== L.day) err(f, `day=${L.day}, dar în programă e ${m.day}`)
    if (m.phase !== L.phase) err(f, `phase=${L.phase}, dar în programă e ${m.phase}`)
  }
  for (const k of ['title', 'titleRo', 'intro', 'goals', 'dialog', 'phrases', 'grammar', 'exercises', 'speaking'])
    if (L[k] === undefined) err(f, `lipsește câmpul „${k}”`)
  if (!L.dialog || !L.phrases || !L.exercises) continue

  const ids = new Set()
  const add = (id, where) => {
    if (ids.has(id)) err(f, `id duplicat „${id}” (${where})`)
    ids.add(id)
  }
  for (const l of L.dialog.lines) {
    add(l.id, 'dialog')
    if (!L.dialog.speakers[l.speaker]) err(f, `replica ${l.id}: vorbitor necunoscut „${l.speaker}”`)
    if (!l.de || !l.ro) err(f, `replica ${l.id}: lipsește de/ro`)
  }
  for (const p of L.phrases) add(p.id, 'expresii')
  for (const p of L.pronunciation?.items ?? []) add(p.id, 'pronunție')

  const exIds = new Set()
  for (const e of L.exercises) {
    if (exIds.has(e.id)) err(f, `exercițiu duplicat „${e.id}”`)
    exIds.add(e.id)
    if (e.audio && !ids.has(e.audio)) err(f, `exercițiul ${e.id}: audio „${e.audio}” inexistent`)
    if (e.type === 'mcq' && !(e.answer >= 0 && e.answer < e.options.length)) err(f, `exercițiul ${e.id}: answer în afara opțiunilor`)
    if (e.type === 'gap') {
      const n = e.text.split('___').length - 1
      if (n !== e.answers.length) err(f, `exercițiul ${e.id}: ${n} goluri, dar ${e.answers.length} răspunsuri`)
    }
    if (e.type === 'dictation') {
      const src = [...L.dialog.lines, ...L.phrases, ...(L.pronunciation?.items ?? [])].find((x) => x.id === e.audio)
      if (src && src.de !== e.text) err(f, `exercițiul ${e.id}: textul dictării diferă de audio („${src.de}”)`)
    }
  }
  console.log(`✓ ${L.id}: ${L.dialog.lines.length} replici, ${L.phrases.length} expresii, ${L.exercises.length} exerciții`)
}
if (errors) {
  console.error(`\n${errors} erori.`)
  process.exit(1)
}
