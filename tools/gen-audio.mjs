#!/usr/bin/env node
// Generează audio pentru lecții.
//   - vocile `de-DE-…Neural` → Azure Speech (cheia în .env: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION; planul F0 ≈ 20 cereri/min)
//   - celelalte → vocile macOS (`say`)
// Rezultatul trece prin `afconvert` → .m4a (AAC 64 kbps).
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
const DEFAULT_VOICE = 'de-DE-SeraphinaMultilingualNeural'

if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'))
const AZ_KEY = process.env.AZURE_SPEECH_KEY
const AZ_REGION = process.env.AZURE_SPEECH_REGION
const isAzure = (v) => v.startsWith('de-DE-')

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((a) => !a.startsWith('--'))

const installed = execFileSync('say', ['-v', '?'], { encoding: 'utf8' })
  .split('\n')
  .map((l) => l.match(/^(.+?)\s+de_DE\s/)?.[1]?.trim())
  .filter(Boolean)

// Dacă vocea cerută nu e instalată, alegem una apropiată.
function resolveVoice(v) {
  if (isAzure(v)) {
    if (!AZ_KEY || !AZ_REGION) throw new Error(`Vocea Azure „${v}” are nevoie de AZURE_SPEECH_KEY și AZURE_SPEECH_REGION în .env`)
    return v
  }
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
let lastAzure = 0

async function azureWav(text, voice, file) {
  const ssml = `<speak version="1.0" xml:lang="de-DE"><voice name="${voice}"><lang xml:lang="de-DE">${xml(text)}</lang></voice></speak>`
  for (let attempt = 0; ; attempt++) {
    const wait = lastAzure + 3200 - Date.now() // F0: ~20 cereri/min
    if (wait > 0) await sleep(wait)
    lastAzure = Date.now()
    const res = await fetch(`https://${AZ_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZ_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
        'User-Agent': 'deutsch-intensiv',
      },
      body: ssml,
    })
    if (res.ok) return writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      process.stdout.write('⏳')
      await sleep(15000 * (attempt + 1))
      continue
    }
    throw new Error(`Azure ${res.status}: ${await res.text()}`)
  }
}

async function synth(text, voice, rate, file) {
  const tmp = join(tmpdir(), `deutsch-${process.pid}-${Math.random().toString(36).slice(2)}.${isAzure(voice) ? 'wav' : 'aiff'}`)
  if (isAzure(voice)) await azureWav(text, voice, tmp)
  else execFileSync('say', ['-v', voice, '-r', String(rate), '-o', tmp, '--', text])
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
      const hash = createHash('sha1').update(`${it.text}|${voice}|${isAzure(voice) ? 'az' : v.rate}`).digest('hex').slice(0, 12)
      const file = join(dir, `${name}.m4a`)
      if (manifest[name] === hash && existsSync(file)) {
        skipped++
        continue
      }
      await synth(it.text, voice, isAzure(voice) ? 0 : v.rate, file)
      manifest[name] = hash
      made++
      process.stdout.write('.')
    }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1))
  process.stdout.write(` ${list.length} fragmente\n`)
}
console.log(`Gata: ${made} fișiere noi, ${skipped} existente.`)
