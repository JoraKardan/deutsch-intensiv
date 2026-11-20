#!/usr/bin/env node
// Verifică lecțiile din content/lessons: câmpuri obligatorii, id-uri unice,
// referințe audio valide, goluri ↔ răspunsuri, legătura cu programa.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
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

  // `lit` e obligatoriu, cu excepția replicilor dintr-un cuvânt și a celor spuse pe litere („R – A – D – U”)
  const checkLit = (x, where) => {
    const w = x.de.trim().split(/\s+/).length
    if (x.lit === undefined) {
      if (w > 1 && !/\b[A-ZÄÖÜ] – [A-ZÄÖÜ]\b/.test(x.de)) err(f, `${where}: lipsește lit (traducerea mot-à-mot)`)
      return
    }
    const g = x.lit.split('|').length
    if (w !== g) err(f, `${where}: ${w} cuvinte în „${x.de}”, dar ${g} glose în lit`)
  }
  const ids = new Set()
  const add = (id, where) => {
    if (ids.has(id)) err(f, `id duplicat „${id}” (${where})`)
    ids.add(id)
  }
  for (const l of L.dialog.lines) {
    add(l.id, 'dialog')
    if (!L.dialog.speakers[l.speaker]) err(f, `replica ${l.id}: vorbitor necunoscut „${l.speaker}”`)
    if (!l.de || !l.ro) err(f, `replica ${l.id}: lipsește de/ro`)
    checkLit(l, `replica ${l.id}`)
  }
  for (const p of L.phrases) {
    add(p.id, 'expresii')
    checkLit(p, `expresia ${p.id}`)
  }
  for (const p of L.pronunciation?.items ?? []) add(p.id, 'pronunție')

  ;(L.grammar?.tables ?? []).forEach((t, ti) => {
    const where = `tabelul ${ti + 1}${t.caption ? ` („${t.caption}”)` : ''}`
    for (const r of t.rows) if (r.length !== t.headers.length) err(f, `${where}: rând cu ${r.length} celule, antet cu ${t.headers.length}`)
    const a = t.audio
    if (a === undefined || a === 'conjugation' || a === 'row') return
    if (!Array.isArray(a) || a.some((c) => !Number.isInteger(c) || c < 0 || c >= t.headers.length))
      err(f, `${where}: audio trebuie să fie "conjugation", "row" sau indici de coloane 0…${t.headers.length - 1}`)
  })

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
  checkTranslation(L, 'ru')
  console.log(`✓ ${L.id}: ${L.dialog.lines.length} replici, ${L.phrases.length} expresii, ${L.exercises.length} exerciții`)
}

// ── traducerile (content/<lang>/lessons/<id>.json, vezi LessonTranslation în src/lib/types.ts) ──
function checkTranslation(L, lang) {
  const f = `${lang}/${L.id}.json`
  const path = join(ROOT, 'content', lang, 'lessons', `${L.id}.json`)
  if (!existsSync(path)) return err(f, `lipsește traducerea (${lang})`)
  let T
  try {
    T = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    return err(f, `JSON invalid: ${e.message}`)
  }
  if (T.id !== L.id) err(f, `id „${T.id}” ≠ ${L.id}`)
  for (const k of ['titleTr', 'goals', 'intro', 'dialog', 'phrases', 'grammar', 'exercises', 'speaking'])
    if (T[k] === undefined) err(f, `lipsește câmpul „${k}”`)
  if (!T.dialog || !T.phrases || !T.grammar || !T.exercises || !T.speaking) return

  // nimic românesc scăpat netradus
  const ro = /[ăâîșțĂÂÎȘȚ]/
  const walk = (v, where) => {
    if (typeof v === 'string') {
      if (ro.test(v)) err(f, `${where}: text în română: „${v.slice(0, 60)}”`)
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`)
  }
  walk(T, 'traducere')

  const known = (map, ids, what) => {
    for (const id of Object.keys(map)) if (!ids.includes(id)) err(f, `${what}: id necunoscut „${id}”`)
  }
  const litOk = (de, lit, where) => {
    if (lit === undefined) {
      if (de.trim().split(/\s+/).length > 1 && !/\b[A-ZÄÖÜ] – [A-ZÄÖÜ]\b/.test(de)) err(f, `${where}: lipsește lit`)
      return
    }
    const w = de.trim().split(/\s+/).length
    const g = lit.split('|').length
    if (w !== g) err(f, `${where}: ${w} cuvinte în „${de}”, dar ${g} glose în lit`)
  }

  if (L.pronunciation) {
    const items = T.pronunciation?.items ?? {}
    if (!T.pronunciation) err(f, 'lipsește pronunciation')
    for (const it of L.pronunciation.items) if (!items[it.id]?.tip) err(f, `pronunția ${it.id}: lipsește tip`)
    known(items, L.pronunciation.items.map((x) => x.id), 'pronunție')
  }
  if (!T.dialog.situation) err(f, 'lipsește dialog.situation')
  for (const l of L.dialog.lines) {
    const x = T.dialog.lines?.[l.id]
    if (!x?.tr) err(f, `replica ${l.id}: lipsește tr`)
    else litOk(l.de, x.lit, `replica ${l.id}`)
  }
  known(T.dialog.lines ?? {}, L.dialog.lines.map((x) => x.id), 'dialog')
  for (const p of L.phrases) {
    const x = T.phrases[p.id]
    if (!x?.tr) err(f, `expresia ${p.id}: lipsește tr`)
    else {
      litOk(p.de, x.lit, `expresia ${p.id}`)
      if (p.note && !x.note) err(f, `expresia ${p.id}: lipsește note`)
    }
  }
  known(T.phrases, L.phrases.map((x) => x.id), 'expresii')

  const g = T.grammar
  if (!g.title || !g.explanation?.length) err(f, 'gramatica: lipsește title / explanation')
  if (g.examples?.length !== L.grammar.examples.length) err(f, `gramatica: ${g.examples?.length} exemple, în bază ${L.grammar.examples.length}`)
  if (L.grammar.tip && !g.tip) err(f, 'gramatica: lipsește tip')
  const bare = (s) => s.replaceAll('**', '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
  ;(L.grammar.tables ?? []).forEach((tb, i) => {
    const x = g.tables?.[i]
    const where = `tabelul ${i + 1}`
    if (!x) return err(f, `${where}: lipsește (pune {} dacă nu e nimic de tradus)`)
    if (tb.caption && !x.caption) err(f, `${where}: lipsește caption`)
    if (x.headers && x.headers.length !== tb.headers.length) err(f, `${where}: ${x.headers.length} anteturi, în bază ${tb.headers.length}`)
    if (x.rows && x.rows.length !== tb.rows.length) err(f, `${where}: ${x.rows.length} rânduri, în bază ${tb.rows.length}`)
    // celulele cu audio sunt în germană: traducerea le poate schimba doar în paranteze
    const audioCol = (c) => tb.audio === 'row' || (tb.audio === 'conjugation' && c > 0) || (Array.isArray(tb.audio) && tb.audio.includes(c))
    tb.rows.forEach((r, ri) =>
      r.forEach((c, ci) => {
        const y = x.rows?.[ri]?.[ci]
        if (y != null && audioCol(ci) && bare(y) !== bare(c)) err(f, `${where} r${ri + 1}c${ci + 1}: celulă germană schimbată („${y}”)`)
      }),
    )
  })

  for (const e of L.exercises) {
    const x = T.exercises[e.id]
    const where = `exercițiul ${e.id}`
    if (e.type === 'mcq') {
      if (!x?.question) err(f, `${where}: lipsește question`)
      if (x?.options && x.options.length !== e.options.length) err(f, `${where}: ${x.options.length} opțiuni, în bază ${e.options.length}`)
      if (e.explain && !x?.explain) err(f, `${where}: lipsește explain`)
    } else {
      if (e.ro && !x?.tr) err(f, `${where}: lipsește tr`)
      if (e.type === 'gap') {
        if (e.hint && !x?.hint) err(f, `${where}: lipsește hint`)
        if (x?.text && x.text.split('___').length !== e.text.split('___').length) err(f, `${where}: alt număr de goluri în text`)
      }
    }
  }
  known(T.exercises, L.exercises.map((x) => x.id), 'exerciții')

  const sp = T.speaking
  if (!sp.scenario || !sp.claudeRole || sp.tasks?.length < 1) err(f, 'speaking incomplet')
  if (L.external?.length && T.external?.length !== L.external.length) err(f, 'external: alt număr de note')
}

// programa tradusă
{
  const path = join(ROOT, 'content', 'ru', 'curriculum.json')
  if (!existsSync(path)) err('ru/curriculum.json', 'lipsește')
  else {
    const T = JSON.parse(readFileSync(path, 'utf8'))
    for (const w of curriculum.weeks) {
      const tw = T.weeks?.[String(w.week)]
      if (!tw?.titleTr) err('ru/curriculum.json', `săptămâna ${w.week}: lipsește titleTr`)
      for (const l of w.lessons) if (!tw?.lessons?.[l.id]?.titleTr || !tw.lessons[l.id].focus) err('ru/curriculum.json', `${l.id}: lipsește titleTr / focus`)
    }
  }
}
if (errors) {
  console.error(`\n${errors} erori.`)
  process.exit(1)
}
