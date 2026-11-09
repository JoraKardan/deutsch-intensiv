#!/usr/bin/env node
// Generează audio pentru lecții cu vocile germane din macOS (`say` + `afconvert`).
//
//   npm run audio                 → toate lecțiile (sare peste fișierele deja generate)
//   npm run audio -- w01-1 w01-2  → doar lecțiile date
//   npm run audio -- --force      → regenerează tot
//
// Rezultat: public/audio/<lessonId>/<id>.m4a
// (Varianta rară 🐢 se obține în browser prin playbackRate — vocile Premium ignoră `say -r`.)
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LESSONS = join(ROOT, 'content', 'lessons')
const OUT = join(ROOT, 'public', 'audio')

const RATE_NORMAL = 165 // cuvinte/minut (vocea implicită ~185)
const DEFAULT_VOICE = 'Anna (Premium)'

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((a) => !a.startsWith('--'))

const installed = execFileSync('say', ['-v', '?'], { encoding: 'utf8' })
  .split('\n')
  .map((l) => l.match(/^(.+?)\s+de_DE\s/)?.[1]?.trim())
  .filter(Boolean)

// Dacă vocea cerută nu e instalată, alegem una apropiată.
function resolveVoice(v) {
  if (installed.includes(v)) return v
  const base = v.split(' (')[0]
  const alt = installed.find((x) => x.startsWith(base)) ?? installed.find((x) => /Premium|Enhanced/.test(x)) ?? 'Anna'
  if (!warned.has(v)) {
    console.warn(`⚠ Vocea „${v}” nu e instalată — folosesc „${alt}”.`)
    warned.add(v)
  }
  return alt
}
const warned = new Set()

const clean = (s) => s.replaceAll('**', '').replace(/\s+/g, ' ').trim()

function items(lesson) {
  const list = []
  for (const l of lesson.dialog.lines) {
    const sp = lesson.dialog.speakers[l.speaker]
    list.push({ id: l.id, text: l.de, voice: sp?.voice ?? DEFAULT_VOICE })
  }
  for (const p of lesson.phrases) list.push({ id: p.id, text: p.de, voice: DEFAULT_VOICE })
  for (const p of lesson.pronunciation?.items ?? []) list.push({ id: p.id, text: p.de, voice: DEFAULT_VOICE })
  lesson.grammar.examples.forEach((e, i) => list.push({ id: `g${i + 1}`, text: e.de, voice: DEFAULT_VOICE }))
  return list.map((x) => ({ ...x, text: clean(x.text) }))
}

function synth(text, voice, rate, file) {
  const tmp = join(tmpdir(), `deutsch-${process.pid}-${Math.random().toString(36).slice(2)}.aiff`)
  execFileSync('say', ['-v', voice, '-r', String(rate), '-o', tmp, '--', text])
  execFileSync('afconvert', [tmp, file, '-f', 'm4af', '-d', 'aac', '-b', '64000'])
  rmSync(tmp, { force: true })
}

const files = readdirSync(LESSONS).filter((f) => f.endsWith('.json'))
let made = 0
let skipped = 0
for (const f of files) {
  const lesson = JSON.parse(readFileSync(join(LESSONS, f), 'utf8'))
  if (only.length && !only.includes(lesson.id)) continue
  const dir = join(OUT, lesson.id)
  mkdirSync(dir, { recursive: true })
  const manifestPath = join(dir, 'manifest.json')
  const manifest = !force && existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
  const list = items(lesson)
  process.stdout.write(`${lesson.id}: `)
  for (const it of list) {
    const voice = resolveVoice(it.voice)
    const variants = [{ suffix: '', rate: RATE_NORMAL }]
    for (const v of variants) {
      const name = `${it.id}${v.suffix}`
      const hash = createHash('sha1').update(`${it.text}|${voice}|${v.rate}`).digest('hex').slice(0, 12)
      const file = join(dir, `${name}.m4a`)
      if (manifest[name] === hash && existsSync(file)) {
        skipped++
        continue
      }
      synth(it.text, voice, v.rate, file)
      manifest[name] = hash
      made++
      process.stdout.write('.')
    }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1))
  process.stdout.write(` ${list.length} fragmente\n`)
}
console.log(`Gata: ${made} fișiere noi, ${skipped} existente.`)
